// Point d'entrée du Worker. Deux portes, deux serrures :
//  - la page et l'API (/api/*) : derrière Cloudflare Access, et le Worker revérifie le jeton d'Access ;
//  - le connecteur Claude (/mcp) : un jeton OAuth, délivré par ce Worker lui-même (bibliothèque
//    @cloudflare/workers-oauth-provider) après qu'Adrien a consenti sur /authorize, page qui reste
//    derrière Access. Voir docs/decisions/003-connecteur-claude.md.
// Les routes sont écrites avec Hono (l'équivalent des contrôleurs ASP.NET minimal API). La page
// (public/) est servie par Cloudflare sans passer par ce code.
import { AuthorizationError, CimdFetchError, OAuthProvider, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { createRemoteJWKSet } from 'jose';
import { Hono, type Context } from 'hono';
import { jetonAccessValide } from './acces/jeton-access';
import { echapper, pageConsentement } from './connecteur/page-consentement';
import { repondreMcp } from './connecteur/serveur-mcp';
import { archiverElement, restaurerElement } from './domaine/archiver-element';
import { creerElement } from './domaine/creer-element';
import { ErreurDomaine } from './domaine/erreur-domaine';
import { CHAMPS_MODIFIABLES, modifierElement, type ChangementsElement, type ContexteParent } from './domaine/modifier-element';
import { relations } from './api/relations';
import { DepotElements } from './infra/depot-elements';
import { DepotRelations } from './infra/depot-relations';

/** Ce que Cloudflare donne au Worker : la base et les variables de wrangler.jsonc. */
interface Env {
  DB: D1Database;
  /** L'équipe Access, par exemple https://equipe.cloudflareaccess.com (c'est aussi l'émetteur des jetons). */
  TEAM_DOMAIN: string;
  /** L'audience de l'application Access, passée au déploiement. Vide : tout est refusé. */
  AUD?: string;
  /** L'adresse publique du site, sans « / » final (https://crazybrain.dekermadec.net ; en test, l'adresse locale). */
  ORIGINE: string;
  /** Où la bibliothèque OAuth range clients, autorisations et jetons (ces derniers seulement hachés). */
  OAUTH_KV: KVNamespace;
  /** Les outils OAuth (lire la demande d'autorisation, la conclure), posés par la bibliothèque. */
  OAUTH_PROVIDER: OAuthHelpers;
}

type Ctx = Context<{ Bindings: Env }>;

const app = new Hono<{ Bindings: Env }>();

// Les clés publiques d'Access, téléchargées une fois puis gardées en mémoire (jose les rafraîchit
// quand Cloudflare les change). Une entrée par équipe, en pratique une seule.
const clesParEquipe = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function clesAccess(equipe: string): ReturnType<typeof createRemoteJWKSet> {
  let cles = clesParEquipe.get(equipe);
  if (!cles) {
    cles = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', equipe));
    clesParEquipe.set(equipe, cles);
  }
  return cles;
}

function connecteParAccess(c: Ctx): Promise<boolean> {
  return jetonAccessValide(c.req.header('Cf-Access-Jwt-Assertion'), clesAccess(c.env.TEAM_DOMAIN), {
    audience: c.env.AUD ?? '',
    emetteur: c.env.TEAM_DOMAIN,
  });
}

// Deuxième serrure : toute route /api/* et la page d'autorisation du connecteur exigent un jeton
// Access valide, sinon 403.
const exigerAccess = async (c: Ctx, suite: () => Promise<void>): Promise<Response | void> => {
  if (!(await connecteParAccess(c))) {
    return c.json({ erreur: 'Accès refusé : connexion Cloudflare Access requise.' }, 403);
  }
  await suite();
};
app.use('/api/*', exigerAccess);
app.use('/authorize', exigerAccess);

// Seul Adrien passe Access : l'autorisation est donc la sienne. Pas d'adresse e-mail rangée.
const UTILISATEUR = 'adrien';

function texte(message: string, statut: 400 | 403): Response {
  return new Response(echapper(message), { status: statut, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

/** Les erreurs prévues de l'autorisation : renvoyées au client si son adresse est sûre, sinon affichées ici. */
function erreurAutorisation(erreur: unknown): Response {
  if (erreur instanceof AuthorizationError && erreur.redirectTo) {
    return Response.redirect(erreur.redirectTo, 302);
  }
  if (erreur instanceof AuthorizationError) {
    return texte(`Demande d'autorisation invalide : ${erreur.description ?? erreur.message}`, 400);
  }
  if (erreur instanceof CimdFetchError) {
    return texte("Ce client n'a pas pu être vérifié.", 400);
  }
  throw erreur;
}

// Étape 1 : la demande de claude.ai arrive (Adrien vient de passer Access) : on montre le consentement.
app.get('/authorize', async (c) => {
  try {
    const oauth = c.env.OAUTH_PROVIDER;
    const demande = await oauth.parseAuthRequest(c.req.raw);
    const details = await oauth.describeConsent(demande);
    const consentement = await oauth.beginConsent(demande);
    consentement.headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(pageConsentement(details, consentement.handle), { headers: consentement.headers });
  } catch (erreur) {
    return erreurAutorisation(erreur);
  }
});

// Étape 2 : Adrien a cliqué. La demande est relue côté serveur (jamais depuis le formulaire).
app.post('/authorize', async (c) => {
  try {
    const oauth = c.env.OAUTH_PROVIDER;
    const formulaire = await c.req.raw.formData();
    const poignee = String(formulaire.get('poignee') ?? '');
    if (formulaire.get('decision') !== 'autoriser') {
      const refus = await oauth.denyConsent(c.req.raw, poignee);
      return new Response(null, { status: 302, headers: refus.headers });
    }
    const accord = await oauth.approveConsent(c.req.raw, poignee);
    const { redirectTo } = await oauth.completeAuthorization({
      request: accord.request,
      userId: UTILISATEUR,
      metadata: {},
      scope: accord.request.scope,
      props: { utilisateur: UTILISATEUR },
    });
    accord.headers.set('location', redirectTo);
    return new Response(null, { status: 302, headers: accord.headers });
  } catch (erreur) {
    return erreurAutorisation(erreur);
  }
});

app.get('/api/elements', async (c) => {
  const elements = await new DepotElements(c.env.DB).lister();
  return c.json({ elements: elements.map((e) => e.instantane()) });
});

// Créer une tâche : le titre, et si on veut, les autres champs dès le départ (type, parent, échéance…).
app.post('/api/elements', async (c) => {
  const corps: unknown = await c.req.json().catch(() => null);
  const lu = lireChangements(corps);
  if (typeof lu === 'string') return c.json({ erreur: lu }, 400);
  const { titre, ...champs } = lu;
  if (typeof titre !== 'string') return c.json({ erreur: 'Le corps doit contenir au moins {"titre": "..."}.' }, 400);
  const depot = new DepotElements(c.env.DB);
  const contexte = await contexteDesChangements(depot, champs);
  if (typeof contexte === 'string') return c.json({ erreur: contexte }, 400);
  const { element, evenement } = creerElement({
    idElement: crypto.randomUUID(),
    idEvenement: crypto.randomUUID(),
    titre,
    champs,
    ...contexte,
    auteur: 'adrien', // Les appels de la page viennent d'Adrien ; Claude passera par le connecteur (étape 2).
    maintenant: new Date(),
  });
  await depot.enregistrerCreation(element, evenement);
  return c.json({ element: element.instantane() }, 201);
});

app.get('/api/types', async (c) => c.json({ types: await new DepotElements(c.env.DB).types() }));

// Lire un élément, avec ses liens (où il est source ou cible), ses tags et ses commentaires.
app.get('/api/elements/:id', async (c) => {
  const id = c.req.param('id');
  const element = await new DepotElements(c.env.DB).lire(id);
  if (!element) return c.json({ erreur: 'Tâche inconnue.' }, 404);
  const depot = new DepotRelations(c.env.DB);
  const [liens, tags, commentaires] = await Promise.all([depot.liensDe(id), depot.tagsDe(id), depot.commentairesDe(id)]);
  return c.json({ element: element.instantane(), liens, tags, commentaires });
});

// Supprimer une tâche : elle est archivée (sort de la liste, se restaure). 204 : rien à rendre.
app.delete('/api/elements/:id', async (c) => {
  const depot = new DepotElements(c.env.DB);
  const actuel = await depot.lire(c.req.param('id'));
  if (!actuel) return c.json({ erreur: 'Tâche inconnue.' }, 404);
  const { element, evenement } = archiverElement({ element: actuel, idEvenement: crypto.randomUUID(), auteur: 'adrien', maintenant: new Date() });
  await depot.enregistrerModification(element, evenement);
  return c.body(null, 204);
});

app.post('/api/elements/:id/restaurer', async (c) => {
  const depot = new DepotElements(c.env.DB);
  const actuel = await depot.lire(c.req.param('id'));
  if (!actuel) return c.json({ erreur: 'Tâche inconnue.' }, 404);
  const { element, evenement } = restaurerElement({ element: actuel, idEvenement: crypto.randomUUID(), auteur: 'adrien', maintenant: new Date() });
  await depot.enregistrerModification(element, evenement);
  return c.json({ element: element.instantane() });
});

app.route('/api', relations);

// Modifier une tâche : seuls les champs envoyés changent. Si deux modifications se croisent, la
// dernière gagne (Adrien est seul utilisateur).
app.patch('/api/elements/:id', async (c) => {
  const changements = lireChangements(await c.req.json().catch(() => null));
  if (typeof changements === 'string') return c.json({ erreur: changements }, 400);
  const depot = new DepotElements(c.env.DB);
  const actuel = await depot.lire(c.req.param('id'));
  if (!actuel) return c.json({ erreur: 'Tâche inconnue.' }, 404);
  const contexte = await contexteDesChangements(depot, changements);
  if (typeof contexte === 'string') return c.json({ erreur: contexte }, 400);
  const { element, evenement } = modifierElement({
    element: actuel,
    changements,
    ...contexte,
    idEvenement: crypto.randomUUID(),
    auteur: 'adrien',
    maintenant: new Date(),
  });
  if (evenement) await depot.enregistrerModification(element, evenement);
  return c.json({ element: element.instantane() });
});

/** Les champs facultatifs, qu'on vide avec null ; les nombres ; les autres sont du texte. */
const CHAMPS_NULLABLES = new Set<string>(['parent', 'description', 'priorite', 'echeance', 'jourPlanifie', 'heurePlanifiee', 'estimation', 'rang']);
const CHAMPS_NOMBRES = new Set<string>(['estimation', 'rang']);

/**
 * Vérifie la forme d'un corps de création ou de modification (le domaine vérifiera les valeurs) :
 * un objet qui n'a que des champs connus, chacun du bon genre (texte, nombre, ou null s'il est
 * facultatif). Rend les changements, ou le message d'erreur.
 */
function lireChangements(corps: unknown): ChangementsElement | string {
  const attendu = `Le corps doit être un objet avec ces champs : ${CHAMPS_MODIFIABLES.join(', ')}.`;
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) return attendu;
  const champs = corps as Record<string, unknown>;
  const connus: readonly string[] = CHAMPS_MODIFIABLES;
  const inconnus = Object.keys(champs).filter((cle) => !connus.includes(cle));
  if (inconnus.length > 0) return `Champ inconnu : ${inconnus.join(', ')}. ${attendu}`;
  for (const [cle, valeur] of Object.entries(champs)) {
    if (valeur === null && CHAMPS_NULLABLES.has(cle)) continue;
    const genre = CHAMPS_NOMBRES.has(cle) ? 'number' : 'string';
    if (typeof valeur !== genre) {
      return `Le champ ${cle} doit être ${genre === 'number' ? 'un nombre' : 'du texte'}${CHAMPS_NULLABLES.has(cle) ? ' ou null' : ''}.`;
    }
  }
  return champs as ChangementsElement;
}

/**
 * Ce que les changements demandent de vérifier en base : que le type existe, que le parent existe,
 * et ses ancêtres (pour que le domaine refuse une boucle). Rend le contexte, ou le message d'erreur.
 */
async function contexteDesChangements(
  depot: DepotElements,
  changements: ChangementsElement,
): Promise<{ contexteParent?: ContexteParent } | string> {
  if (typeof changements.type === 'string' && /^[a-z][a-z0-9_]*$/.test(changements.type) && !(await depot.typeExiste(changements.type))) {
    return `Type inconnu : « ${changements.type} ». Les types : ${(await depot.types()).map((t) => t.code).join(', ')}.`;
  }
  if (typeof changements.parent !== 'string') return {};
  const ancetresDuParent = await depot.lignee(changements.parent);
  if (ancetresDuParent.length === 0) return `Parent inconnu : « ${changements.parent} ».`;
  return { contexteParent: { ancetresDuParent } };
}

app.onError((erreur, c) => {
  if (erreur instanceof ErreurDomaine) {
    return c.json({ erreur: erreur.message }, 400);
  }
  console.error(erreur);
  return c.json({ erreur: 'Erreur interne.' }, 500);
});

app.notFound((c) => c.json({ erreur: 'Adresse inconnue.' }, 404));

// Le serveur OAuth et la ressource protégée /mcp. La bibliothèque sert elle-même la découverte
// (/.well-known/...), l'enregistrement des clients (/register) et l'échange des jetons (/token) ;
// elle refuse /mcp sans jeton valide (401) et passe le reste à l'application Hono ci-dessus.
// Construit une fois par adresse publique (une seule en production ; l'adresse locale en test).
const fournisseurs = new Map<string, OAuthProvider<Env>>();
function fournisseur(origine: string): OAuthProvider<Env> {
  let f = fournisseurs.get(origine);
  if (!f) {
    f = new OAuthProvider<Env>({
      apiRoute: '/mcp',
      apiHandler: { fetch: (requete, env) => repondreMcp(requete, { compterTaches: () => new DepotElements(env.DB).compter() }) },
      defaultHandler: { fetch: (requete, env, ctx) => app.fetch(requete, env, ctx) },
      authorizeEndpoint: '/authorize',
      tokenEndpoint: '/token',
      clientRegistrationEndpoint: '/register',
      resourceMetadata: {
        resource: `${origine}/mcp`,
        authorization_servers: [origine],
        resource_name: 'Crazybrain',
      },
    });
    fournisseurs.set(origine, f);
  }
  return f;
}

export default {
  fetch: (requete, env, ctx) => fournisseur(env.ORIGINE).fetch(requete, env, ctx),
} satisfies ExportedHandler<Env>;

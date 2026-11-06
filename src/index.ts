// Point d'entrée du Worker. Deux portes, deux serrures :
//  - la page et l'API (/api/*) : derrière Cloudflare Access, et le Worker revérifie le jeton d'Access ;
//  - le connecteur Claude (/mcp) : un jeton OAuth, délivré par ce Worker lui-même (bibliothèque
//    @cloudflare/workers-oauth-provider) après qu'Adrien a consenti sur /authorize, page qui reste
//    derrière Access. Voir docs/decisions/003-connecteur-claude.md.
// Les routes sont écrites avec Hono (l'équivalent des contrôleurs ASP.NET minimal API). La page
// (dist/, construite depuis ui/) est servie par Cloudflare sans passer par ce code.
import { AuthorizationError, CimdFetchError, OAuthProvider, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { createRemoteJWKSet } from 'jose';
import { Hono, type Context } from 'hono';
import { jetonAccessValide } from './acces/jeton-access';
import { api } from './api/routes';
import { ErreurConflit, ErreurIntrouvable } from './application/erreurs';
import { ServiceElements } from './application/service-elements';
import { aJournaliser, appelantDe, cleJournal, DUREE_JOURNAL_SECONDES, erreurOAuth, type EntreeJournal } from './connecteur/journal-oauth';
import { echapper, pageConsentement } from './connecteur/page-consentement';
import { repondreMcp } from './connecteur/serveur-mcp';
import { ErreurDomaine } from './domaine/erreur-domaine';

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

app.route('/api', api);

app.onError((erreur, c) => {
  if (erreur instanceof ErreurDomaine) return c.json({ erreur: erreur.message }, 400);
  if (erreur instanceof ErreurIntrouvable) return c.json({ erreur: erreur.message }, 404);
  if (erreur instanceof ErreurConflit) return c.json({ erreur: erreur.message }, 409);
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
      apiHandler: { fetch: (requete, env) => repondreMcp(requete, new ServiceElements(env.DB)) },
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

/**
 * Note dans le journal du connecteur un appel aux adresses OAuth (voir connecteur/journal-oauth.ts) :
 * jamais de jeton, de code ni d'identifiant, seulement la réponse et l'erreur. Ne retarde pas la réponse.
 */
async function journaliser(requete: Request, typeDemande: string | undefined, reponse: Response, env: Env): Promise<void> {
  const chemin = new URL(requete.url).pathname;
  let erreur: string | undefined;
  if (reponse.status >= 400) {
    const corps = await reponse.clone().text().catch(() => '');
    erreur = erreurOAuth(corps) ?? (corps.slice(0, 300) || undefined);
  } else if (reponse.status >= 300) {
    // Une redirection d'erreur porte ?error=… ; une redirection réussie porte le code : on ne garde que l'erreur.
    const lieu = reponse.headers.get('location');
    const parametres = lieu ? new URL(lieu, env.ORIGINE).searchParams : null;
    const code = parametres?.get('error');
    if (code) erreur = `${code}${parametres?.get('error_description') ? ` : ${parametres.get('error_description')}` : ''}`;
  }
  const quand = new Date().toISOString();
  const appelant = appelantDe(requete.headers.get('user-agent'));
  const entree: EntreeJournal = {
    quand, methode: requete.method, chemin, statut: reponse.status,
    ...(typeDemande ? { typeDemande } : {}), ...(erreur ? { erreur } : {}),
    ...(appelant ? { appelant } : {}),
  };
  const hasard = crypto.randomUUID().slice(0, 8);
  await env.OAUTH_KV.put(cleJournal(quand, hasard), JSON.stringify(entree), { expirationTtl: DUREE_JOURNAL_SECONDES });
}

/** Pour /token : la sorte de demande (authorization_code, refresh_token), lue sur une copie du corps. */
async function typeDeDemande(requete: Request): Promise<string | undefined> {
  if (requete.method !== 'POST' || new URL(requete.url).pathname !== '/token') return undefined;
  try {
    const valeur = (await requete.clone().formData()).get('grant_type');
    return typeof valeur === 'string' ? valeur.slice(0, 40) : undefined;
  } catch {
    return undefined;
  }
}

export default {
  fetch: async (requete, env, ctx) => {
    const typeDemande = await typeDeDemande(requete);
    const reponse = await fournisseur(env.ORIGINE).fetch(requete, env, ctx);
    if (aJournaliser(new URL(requete.url).pathname, reponse.status)) {
      ctx.waitUntil(journaliser(requete, typeDemande, reponse, env).catch((e: unknown) => console.error('journal du connecteur', e)));
    }
    return reponse;
  },
} satisfies ExportedHandler<Env>;

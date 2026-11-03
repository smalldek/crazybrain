// Point d'entrée du Worker : les routes de l'API, avec Hono (l'équivalent des contrôleurs ASP.NET
// minimal API). La page (public/) est servie par Cloudflare sans passer par ce code.
import { createRemoteJWKSet } from 'jose';
import { Hono } from 'hono';
import { jetonAccessValide } from './acces/jeton-access';
import { creerElement } from './domaine/creer-element';
import { ErreurDomaine } from './domaine/erreur-domaine';
import { DepotElements } from './infra/depot-elements';

/** Ce que Cloudflare donne au Worker : la base et les variables de wrangler.jsonc. */
interface Env {
  DB: D1Database;
  /** L'équipe Access, par exemple https://equipe.cloudflareaccess.com (c'est aussi l'émetteur des jetons). */
  TEAM_DOMAIN: string;
  /** L'audience de l'application Access, passée au déploiement. Vide : tout est refusé. */
  AUD?: string;
}

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

// Deuxième serrure : toute route /api/* exige un jeton Access valide, sinon 403.
app.use('/api/*', async (c, suite) => {
  const valide = await jetonAccessValide(c.req.header('Cf-Access-Jwt-Assertion'), clesAccess(c.env.TEAM_DOMAIN), {
    audience: c.env.AUD ?? '',
    emetteur: c.env.TEAM_DOMAIN,
  });
  if (!valide) {
    return c.json({ erreur: 'Accès refusé : connexion Cloudflare Access requise.' }, 403);
  }
  await suite();
});

app.get('/api/elements', async (c) => {
  const elements = await new DepotElements(c.env.DB).lister();
  return c.json({ elements: elements.map((e) => e.instantane()) });
});

app.post('/api/elements', async (c) => {
  const corps: unknown = await c.req.json().catch(() => null);
  const titre = typeof corps === 'object' && corps !== null && 'titre' in corps ? corps.titre : undefined;
  if (typeof titre !== 'string') {
    return c.json({ erreur: 'Le corps doit être {"titre": "..."}.' }, 400);
  }
  const { element, evenement } = creerElement({
    idElement: crypto.randomUUID(),
    idEvenement: crypto.randomUUID(),
    titre,
    auteur: 'adrien', // Les appels de la page viennent d'Adrien ; Claude passera par le connecteur (étape 2).
    maintenant: new Date(),
  });
  await new DepotElements(c.env.DB).enregistrerCreation(element, evenement);
  return c.json({ element: element.instantane() }, 201);
});

app.onError((erreur, c) => {
  if (erreur instanceof ErreurDomaine) {
    return c.json({ erreur: erreur.message }, 400);
  }
  console.error(erreur);
  return c.json({ erreur: 'Erreur interne.' }, 500);
});

app.notFound((c) => c.json({ erreur: 'Adresse inconnue.' }, 404));

export default app;

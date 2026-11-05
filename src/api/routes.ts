// Les routes de l'API de la page (/api/...), montées par index.ts derrière la serrure Access.
// Chaque route lit la requête, appelle le service d'application, et met le résultat en JSON. Les
// erreurs (ErreurDomaine, ErreurIntrouvable, ErreurConflit) sont traduites en 400, 404, 409 par
// index.ts. L'auteur est toujours Adrien : seul lui passe Access ; Claude passe par le connecteur.
import { Hono, type Context } from 'hono';
import { ServiceElements } from '../application/service-elements';
import { CHAMPS_MODIFIABLES, type ChangementsElement } from '../domaine/modifier-element';

type Liaisons = { Bindings: { DB: D1Database } };
type Ctx = Context<Liaisons>;

export const api = new Hono<Liaisons>();

const service = (c: Ctx): ServiceElements => new ServiceElements(c.env.DB);

/** Lit un corps JSON qui doit être un objet ; null sinon. */
async function objet(c: Ctx): Promise<Record<string, unknown> | null> {
  const corps: unknown = await c.req.json().catch(() => null);
  return typeof corps === 'object' && corps !== null && !Array.isArray(corps) ? (corps as Record<string, unknown>) : null;
}

api.get('/elements', async (c) => c.json({ elements: await service(c).lister() }));

// Créer une tâche : le titre, et si on veut, les autres champs dès le départ (type, parent, échéance…).
api.post('/elements', async (c) => {
  const lu = lireChangements(await objet(c));
  if (typeof lu === 'string') return c.json({ erreur: lu }, 400);
  const { titre, ...champs } = lu;
  if (typeof titre !== 'string') return c.json({ erreur: 'Le corps doit contenir au moins {"titre": "..."}.' }, 400);
  const { element } = await service(c).creer({ titre, ...champs }, 'adrien');
  return c.json({ element }, 201);
});

api.get('/types', async (c) => c.json({ types: await service(c).types() }));

// Lire un élément, avec ses liens (où il est source ou cible), ses tags et ses commentaires.
api.get('/elements/:id', async (c) => c.json(await service(c).lire(c.req.param('id'))));

// Modifier une tâche : seuls les champs envoyés changent. Si deux modifications se croisent, la
// dernière gagne (Adrien est seul utilisateur).
api.patch('/elements/:id', async (c) => {
  const changements = lireChangements(await objet(c));
  if (typeof changements === 'string') return c.json({ erreur: changements }, 400);
  return c.json({ element: await service(c).modifier(c.req.param('id'), changements, 'adrien') });
});

// Supprimer une tâche : elle est archivée (sort de la liste, se restaure). 204 : rien à rendre.
api.delete('/elements/:id', async (c) => {
  await service(c).supprimer(c.req.param('id'), 'adrien');
  return c.body(null, 204);
});

api.post('/elements/:id/restaurer', async (c) => c.json({ element: await service(c).restaurer(c.req.param('id'), 'adrien') }));

// Lier deux éléments. La source est l'élément de l'adresse : POST /api/elements/<tache>/liens
// {"cible": "<projet>", "type": "appartient_a"} rattache la tâche au projet.
api.post('/elements/:id/liens', async (c) => {
  const corps = await objet(c);
  if (!corps || typeof corps.cible !== 'string' || typeof corps.type !== 'string') {
    return c.json({ erreur: 'Le corps doit être {"cible": "<id>", "type": "appartient_a | bloque | duplique | lie_a"}.' }, 400);
  }
  return c.json({ lien: await service(c).lier(c.req.param('id'), corps.cible, corps.type, 'adrien') }, 201);
});

api.delete('/liens/:id', async (c) => {
  await service(c).delier(c.req.param('id'), 'adrien');
  return c.body(null, 204);
});

// Poser un tag : {"tag": "cle:valeur"} ou {"cle": "...", "valeur": "..."}. Le reposer ne change rien (200).
api.post('/elements/:id/tags', async (c) => {
  const corps = await objet(c);
  const texte = typeof corps?.tag === 'string' ? corps.tag
    : typeof corps?.cle === 'string' && (corps.valeur === undefined || typeof corps.valeur === 'string')
      ? (corps.valeur ? `${corps.cle}:${corps.valeur}` : corps.cle) : undefined;
  if (texte === undefined) return c.json({ erreur: 'Le corps doit être {"tag": "cle:valeur"} ou {"cle": "...", "valeur": "..."}.' }, 400);
  const { tag, ajoute } = await service(c).tagger(c.req.param('id'), texte, 'adrien');
  return c.json({ tag }, ajoute ? 201 : 200);
});

// Tous les tags posés, pour l'écran : la complétion, les couloirs et les filtres.
api.get('/tags', async (c) => c.json({ tags: await service(c).tousLesTags() }));

// Retirer un tag : DELETE /api/elements/<id>/tags/<cle:valeur> (le texte du tag, encodé dans l'adresse).
api.delete('/elements/:id/tags/:tag', async (c) => {
  await service(c).detagger(c.req.param('id'), decodeURIComponent(c.req.param('tag')), 'adrien');
  return c.body(null, 204);
});

api.post('/elements/:id/commentaires', async (c) => {
  const corps = await objet(c);
  if (!corps || typeof corps.texte !== 'string') return c.json({ erreur: 'Le corps doit être {"texte": "..."}.' }, 400);
  return c.json({ commentaire: await service(c).commenter(c.req.param('id'), corps.texte, 'adrien') }, 201);
});

/** Les champs facultatifs, qu'on vide avec null ; les nombres ; les autres sont du texte. */
const CHAMPS_NULLABLES = new Set<string>(['parent', 'description', 'priorite', 'echeance', 'jourPlanifie', 'heurePlanifiee', 'estimation', 'rang']);
const CHAMPS_NOMBRES = new Set<string>(['estimation', 'rang']);

/**
 * Vérifie la forme d'un corps de création ou de modification (le domaine vérifiera les valeurs) :
 * un objet qui n'a que des champs connus, chacun du bon genre (texte, nombre, ou null s'il est
 * facultatif). Rend les changements, ou le message d'erreur.
 */
function lireChangements(champs: Record<string, unknown> | null): ChangementsElement | string {
  const attendu = `Le corps doit être un objet avec ces champs : ${CHAMPS_MODIFIABLES.join(', ')}.`;
  if (!champs) return attendu;
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

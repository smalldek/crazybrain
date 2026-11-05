// Les routes des liens, tags et commentaires d'un élément (tâche 1.3). Montées sous /api par
// index.ts, donc derrière la même serrure Access que le reste de l'API.
import { Hono, type Context } from 'hono';
import { creerCommentaire } from '../domaine/commentaire';
import { evenementDe } from '../domaine/evenement';
import { creerLien, lireTypeLien } from '../domaine/lien';
import { Tag, type InstantaneTag } from '../domaine/tag';
import { DepotElements } from '../infra/depot-elements';
import { DepotRelations } from '../infra/depot-relations';

type Ctx = Context<{ Bindings: { DB: D1Database } }>;

export const relations = new Hono<{ Bindings: { DB: D1Database } }>();

/** Lit un corps JSON qui doit être un objet ; null sinon. */
async function objet(c: Ctx): Promise<Record<string, unknown> | null> {
  const corps: unknown = await c.req.json().catch(() => null);
  return typeof corps === 'object' && corps !== null && !Array.isArray(corps) ? (corps as Record<string, unknown>) : null;
}

async function existe(c: Ctx, id: string): Promise<boolean> {
  return (await new DepotElements(c.env.DB).lire(id)) !== null;
}

// Lier deux éléments. La source est l'élément de l'adresse : POST /api/elements/<tache>/liens
// {"cible": "<projet>", "type": "appartient_a"} rattache la tâche au projet.
relations.post('/elements/:id/liens', async (c) => {
  const corps = await objet(c);
  if (!corps || typeof corps.cible !== 'string' || typeof corps.type !== 'string') {
    return c.json({ erreur: 'Le corps doit être {"cible": "<id>", "type": "appartient_a | bloque | duplique | lie_a"}.' }, 400);
  }
  const source = c.req.param('id');
  if (!(await existe(c, source))) return c.json({ erreur: 'Élément inconnu.' }, 404);
  if (!(await existe(c, corps.cible))) return c.json({ erreur: `Cible inconnue : « ${corps.cible} ».` }, 400);
  const maintenant = new Date();
  const lien = creerLien({ id: crypto.randomUUID(), source, cible: corps.cible, type: corps.type, maintenant });
  const depot = new DepotRelations(c.env.DB);
  if (await depot.lienExiste(lien.source, lien.cible, lireTypeLien(lien.type))) {
    return c.json({ erreur: 'Ce lien existe déjà.' }, 409);
  }
  await depot.ajouterLien(lien, evenementDe({
    id: crypto.randomUUID(), elementId: source, type: 'lien_ajoute', avant: null, apres: lien, auteur: 'adrien', maintenant,
  }));
  return c.json({ lien }, 201);
});

relations.delete('/liens/:id', async (c) => {
  const depot = new DepotRelations(c.env.DB);
  const lien = await depot.lien(c.req.param('id'));
  if (!lien) return c.json({ erreur: 'Lien inconnu.' }, 404);
  await depot.retirerLien(lien.id, evenementDe({
    id: crypto.randomUUID(), elementId: lien.source, type: 'lien_retire', avant: lien, apres: null, auteur: 'adrien', maintenant: new Date(),
  }));
  return c.body(null, 204);
});

/** Lit {"tag": "cle:valeur"} ou {"cle": "...", "valeur": "..."}. */
function lireTag(corps: Record<string, unknown> | null): Tag | string {
  const attendu = 'Le corps doit être {"tag": "cle:valeur"} ou {"cle": "...", "valeur": "..."}.';
  if (!corps) return attendu;
  if (typeof corps.tag === 'string') return Tag.lire(corps.tag);
  if (typeof corps.cle === 'string' && (corps.valeur === undefined || typeof corps.valeur === 'string')) {
    return Tag.creer(corps.cle, corps.valeur);
  }
  return attendu;
}

// Poser un tag. Le reposer ne change rien (200, pas d'événement).
relations.post('/elements/:id/tags', async (c) => {
  const lu = lireTag(await objet(c));
  if (typeof lu === 'string') return c.json({ erreur: lu }, 400);
  const elementId = c.req.param('id');
  if (!(await existe(c, elementId))) return c.json({ erreur: 'Élément inconnu.' }, 404);
  const tag: InstantaneTag = { elementId, cle: lu.cle, valeur: lu.valeur };
  const depot = new DepotRelations(c.env.DB);
  if (await depot.tagExiste(tag)) return c.json({ tag }, 200);
  await depot.ajouterTag(tag, evenementDe({
    id: crypto.randomUUID(), elementId, type: 'tag_ajoute', avant: null, apres: tag, auteur: 'adrien', maintenant: new Date(),
  }));
  return c.json({ tag }, 201);
});

// Retirer un tag : DELETE /api/elements/<id>/tags/<cle:valeur> (le texte du tag, encodé dans l'adresse).
relations.delete('/elements/:id/tags/:tag', async (c) => {
  const lu = Tag.lire(decodeURIComponent(c.req.param('tag')));
  const tag: InstantaneTag = { elementId: c.req.param('id'), cle: lu.cle, valeur: lu.valeur };
  const depot = new DepotRelations(c.env.DB);
  if (!(await depot.tagExiste(tag))) return c.json({ erreur: 'Tag absent de cet élément.' }, 404);
  await depot.retirerTag(tag, evenementDe({
    id: crypto.randomUUID(), elementId: tag.elementId, type: 'tag_retire', avant: tag, apres: null, auteur: 'adrien', maintenant: new Date(),
  }));
  return c.body(null, 204);
});

relations.post('/elements/:id/commentaires', async (c) => {
  const corps = await objet(c);
  if (!corps || typeof corps.texte !== 'string') return c.json({ erreur: 'Le corps doit être {"texte": "..."}.' }, 400);
  const elementId = c.req.param('id');
  if (!(await existe(c, elementId))) return c.json({ erreur: 'Élément inconnu.' }, 404);
  const maintenant = new Date();
  const commentaire = creerCommentaire({ id: crypto.randomUUID(), elementId, texte: corps.texte, auteur: 'adrien', maintenant });
  await new DepotRelations(c.env.DB).ajouterCommentaire(commentaire, evenementDe({
    id: crypto.randomUUID(), elementId, type: 'commentaire_ajoute', avant: null, apres: commentaire, auteur: 'adrien', maintenant,
  }));
  return c.json({ commentaire }, 201);
});

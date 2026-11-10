// Les appels à l'API du Worker (/api/...), et les formes de données qu'elle rend.
// Les types viennent du domaine (import de type seulement : aucun code du Worker n'arrive dans la page).
import type { InstantaneCommentaire } from '../src/domaine/commentaire';
import type { InstantaneElement } from '../src/domaine/element';
import type { InstantaneLien } from '../src/domaine/lien';
import type { InstantaneTag } from '../src/domaine/tag';
import { ErreurConnexion } from './connexion';

export type Element = InstantaneElement;
export type Lien = InstantaneLien;
export type Tag = InstantaneTag;
export type Commentaire = InstantaneCommentaire;
/** Un lien « appartient à » : la tâche (source) fait partie du projet (cible). */
export interface Appartenance {
  readonly source: string;
  readonly cible: string;
}

/** Un élément avec tout ce qui s'y rattache, tel que GET /api/elements/:id le rend. */
export interface ElementComplet {
  readonly element: Element;
  readonly liens: Lien[];
  readonly tags: Tag[];
  readonly commentaires: Commentaire[];
}

/** Un type d'élément (tache, projet, epic…) et son nom à l'écran. */
export interface TypeElement {
  readonly code: string;
  readonly libelle: string;
}

/** Les champs qu'on peut envoyer pour créer ou modifier un élément (null vide un champ facultatif). */
export type Changements = Partial<Pick<Element,
  'titre' | 'statut' | 'type' | 'parent' | 'description' | 'priorite' | 'echeance' |
  'jourPlanifie' | 'heurePlanifiee' | 'estimation' | 'rang' | 'poids' | 'avancement' | 'rappel' | 'recurrence' | 'horizon'>>;

/**
 * Appelle l'API. Si la connexion Access a expiré, la réponse n'est pas du JSON (page de connexion,
 * ou redirection que le navigateur bloque), ou le Worker répond 401 ou 403 : on lève ErreurConnexion,
 * que l'appli traite en se reconnectant (tâche 5.2) au lieu de rester vide.
 */
async function appeler<T>(chemin: string, options?: RequestInit): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(chemin, options);
  } catch {
    throw new ErreurConnexion('Connexion perdue ou expirée.');
  }
  if (reponse.status === 401 || reponse.status === 403) throw new ErreurConnexion('Connexion expirée.');
  if (reponse.status === 204) return undefined as T;
  const type = reponse.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new ErreurConnexion('Connexion expirée.');
  const corps = (await reponse.json()) as T & { erreur?: string };
  if (!reponse.ok) throw new Error(corps.erreur ?? `Erreur ${reponse.status}`);
  return corps;
}

const json = (methode: string, corps: unknown): RequestInit => ({
  method: methode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(corps),
});

const adresse = (id: string): string => `/api/elements/${encodeURIComponent(id)}`;

/** Une requête enregistrée par Claude (tâche 4.2). */
export interface Requete {
  readonly id: string;
  readonly nom: string;
  readonly description: string | null;
  readonly sql: string;
}

/** Ce que rend une requête : ses colonnes, ses lignes (500 au plus), et si c'est coupé. */
export interface ResultatRequete {
  readonly colonnes: string[];
  readonly lignes: Record<string, unknown>[];
  readonly tronque: boolean;
}

/** Un envoi de rappel, pour mesurer le retard (tâche 5.5). */
export interface EnvoiRappel {
  readonly id: string;
  readonly elementId: string | null;
  readonly titre: string;
  readonly prevuLe: string;
  readonly envoyeLe: string;
  readonly statutHttp: number | null;
  readonly recuLe: string | null;
}

export const api = {
  lire: (id: string): Promise<ElementComplet> => appeler<ElementComplet>(adresse(id)),
  types: async (): Promise<TypeElement[]> => (await appeler<{ types: TypeElement[] }>('/api/types')).types,
  lister: async (): Promise<Element[]> => (await appeler<{ elements: Element[] }>('/api/elements')).elements,
  creer: async (champs: Changements & { titre: string }): Promise<Element> =>
    (await appeler<{ element: Element }>('/api/elements', json('POST', champs))).element,
  modifier: async (id: string, changements: Changements): Promise<Element> =>
    (await appeler<{ element: Element }>(adresse(id), json('PATCH', changements))).element,
  supprimer: (id: string): Promise<void> => appeler<void>(adresse(id), { method: 'DELETE' }),
  tags: async (): Promise<Tag[]> => (await appeler<{ tags: Tag[] }>('/api/tags')).tags,
  appartenances: async (): Promise<Appartenance[]> =>
    (await appeler<{ appartenances: Appartenance[] }>('/api/appartenances')).appartenances,
  tagger: (id: string, texte: string): Promise<unknown> => appeler(`${adresse(id)}/tags`, json('POST', { tag: texte })),
  detagger: (id: string, texte: string): Promise<void> =>
    appeler<void>(`${adresse(id)}/tags/${encodeURIComponent(texte)}`, { method: 'DELETE' }),
  commenter: async (id: string, texte: string): Promise<Commentaire> =>
    (await appeler<{ commentaire: Commentaire }>(`${adresse(id)}/commentaires`, json('POST', { texte }))).commentaire,
  lier: async (source: string, cible: string, type: string): Promise<Lien> =>
    (await appeler<{ lien: Lien }>(`${adresse(source)}/liens`, json('POST', { cible, type }))).lien,
  delier: (idLien: string): Promise<void> =>
    appeler<void>(`/api/liens/${encodeURIComponent(idLien)}`, { method: 'DELETE' }),
  clePush: async (): Promise<string | null> => (await appeler<{ cle: string | null }>('/api/push/cle')).cle,
  abonner: (abonnement: unknown): Promise<void> =>
    appeler<void>('/api/push/abonnements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abonnement) }),
  desabonner: (endpoint: string): Promise<void> =>
    appeler<void>('/api/push/abonnements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) }),
  essaiPush: async (): Promise<number> => (await appeler<{ envois: number }>('/api/push/essai', { method: 'POST' })).envois,
  envoisPush: async (): Promise<EnvoiRappel[]> => (await appeler<{ envois: EnvoiRappel[] }>('/api/push/envois')).envois,
  requetes: async (): Promise<Requete[]> => (await appeler<{ requetes: Requete[] }>('/api/requetes')).requetes,
  lignesRequete: async (id: string): Promise<ResultatRequete> =>
    (await appeler<{ resultat: ResultatRequete }>(`/api/requetes/${encodeURIComponent(id)}/lignes`)).resultat,
  restaurer: async (id: string): Promise<Element> =>
    (await appeler<{ element: Element }>(`${adresse(id)}/restaurer`, { method: 'POST' })).element,
};

// Les appels à l'API du Worker (/api/...), et les formes de données qu'elle rend.
// Les types viennent du domaine (import de type seulement : aucun code du Worker n'arrive dans la page).
import type { InstantaneElement } from '../src/domaine/element';

export type Element = InstantaneElement;

/** Les champs qu'on peut envoyer pour créer ou modifier un élément (null vide un champ facultatif). */
export type Changements = Partial<Pick<Element,
  'titre' | 'statut' | 'type' | 'parent' | 'description' | 'priorite' | 'echeance' |
  'jourPlanifie' | 'heurePlanifiee' | 'estimation' | 'rang'>>;

/**
 * Appelle l'API. Si la connexion Access a expiré, la réponse n'est pas du JSON (page de connexion,
 * ou redirection que le navigateur bloque) : on le dit au lieu de rester vide.
 */
async function appeler<T>(chemin: string, options?: RequestInit): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(chemin, options);
  } catch {
    throw new Error('Connexion perdue ou expirée : recharger la page.');
  }
  if (reponse.status === 204) return undefined as T;
  const type = reponse.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new Error('Connexion expirée : recharger la page.');
  }
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

export const api = {
  lister: async (): Promise<Element[]> => (await appeler<{ elements: Element[] }>('/api/elements')).elements,
  creer: async (champs: Changements & { titre: string }): Promise<Element> =>
    (await appeler<{ element: Element }>('/api/elements', json('POST', champs))).element,
  modifier: async (id: string, changements: Changements): Promise<Element> =>
    (await appeler<{ element: Element }>(adresse(id), json('PATCH', changements))).element,
  supprimer: (id: string): Promise<void> => appeler<void>(adresse(id), { method: 'DELETE' }),
  restaurer: async (id: string): Promise<Element> =>
    (await appeler<{ element: Element }>(`${adresse(id)}/restaurer`, { method: 'POST' })).element,
};

// Les règles du kanban, sans React : testées seules (tests/unitaires/interface-kanban.test.ts).
// Une colonne par statut ; dans une colonne, l'ordre choisi à la main (`rang`, plus petit = plus
// haut), puis les éléments sans rang, les plus récents en haut.
import type { Element } from './api';

export const COLONNES = [
  { statut: 'a_faire', titre: 'À faire' },
  { statut: 'en_cours', titre: 'En cours' },
  { statut: 'fait', titre: 'Fait' },
] as const;

export type StatutColonne = (typeof COLONNES)[number]['statut'];

/** L'écart entre deux rangs posés par le kanban : de la place pour en glisser d'autres plus tard. */
export const PAS_DE_RANG = 1000;

function comparer(a: Element, b: Element): number {
  if (a.rang !== null && b.rang !== null) return a.rang - b.rang;
  if (a.rang !== null) return -1;
  if (b.rang !== null) return 1;
  return b.creeLe.localeCompare(a.creeLe);
}

/** Les ids de chaque colonne, dans l'ordre d'affichage. */
export function colonnesDe(elements: readonly Element[]): Record<StatutColonne, string[]> {
  const colonnes: Record<StatutColonne, Element[]> = { a_faire: [], en_cours: [], fait: [] };
  for (const e of elements) colonnes[e.statut].push(e);
  return {
    a_faire: colonnes.a_faire.sort(comparer).map((e) => e.id),
    en_cours: colonnes.en_cours.sort(comparer).map((e) => e.id),
    fait: colonnes.fait.sort(comparer).map((e) => e.id),
  };
}

/**
 * Les nouveaux rangs d'une colonne une fois rangée dans cet ordre : 1000, 2000, 3000…, et seulement
 * pour les éléments dont le rang change (on n'envoie au serveur que ce qui bouge).
 */
export function rangsAPoser(ordre: readonly string[], elements: readonly Element[]): { id: string; rang: number }[] {
  const rangs = new Map(elements.map((e) => [e.id, e.rang]));
  return ordre
    .map((id, i) => ({ id, rang: (i + 1) * PAS_DE_RANG }))
    .filter(({ id, rang }) => rangs.get(id) !== rang);
}

/** La colonne qui contient cet id (une carte), ou cet id lui-même s'il nomme une colonne. */
export function colonneDe(id: string, colonnes: Record<StatutColonne, string[]>): StatutColonne | null {
  const statut = COLONNES.find((c) => c.statut === id)?.statut;
  if (statut) return statut;
  return COLONNES.find((c) => colonnes[c.statut].includes(id))?.statut ?? null;
}

/**
 * Déplace une carte au-dessus d'une autre carte, ou à la fin d'une colonne (si `sur` nomme une
 * colonne). Rend les nouvelles colonnes, sans toucher aux anciennes.
 */
export function deplacer(
  colonnes: Record<StatutColonne, string[]>,
  carte: string,
  sur: string,
): Record<StatutColonne, string[]> {
  const depart = colonneDe(carte, colonnes);
  const arrivee = colonneDe(sur, colonnes);
  if (!depart || !arrivee || carte === sur) return colonnes;
  const nouvelles = { ...colonnes, [depart]: colonnes[depart].filter((id) => id !== carte) };
  const cible = [...nouvelles[arrivee]];
  const position = cible.indexOf(sur);
  if (position === -1) cible.push(carte);
  else {
    // Dans la même colonne, en descendant, la carte se pose après celle qu'on survole.
    const descend = depart === arrivee && colonnes[depart].indexOf(carte) < colonnes[depart].indexOf(sur);
    cible.splice(descend ? position + 1 : position, 0, carte);
  }
  return { ...nouvelles, [arrivee]: cible };
}

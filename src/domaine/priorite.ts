import { ErreurDomaine } from './erreur-domaine';

/** Les priorités, de la plus basse à la plus haute. Pas de priorité : null (« pas encore décidé »). */
export const PRIORITES = ['basse', 'normale', 'haute', 'urgente'] as const;
export type Priorite = (typeof PRIORITES)[number];

export function lirePriorite(texte: string): Priorite {
  const priorite = PRIORITES.find((p) => p === texte);
  if (!priorite) {
    throw new ErreurDomaine(`Priorité inconnue : « ${texte} » (attendu : ${PRIORITES.join(', ')}).`);
  }
  return priorite;
}

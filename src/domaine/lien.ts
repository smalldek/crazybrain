import { ErreurDomaine } from './erreur-domaine';

/**
 * Les sortes de liens entre deux éléments (décision 002) :
 * - appartient_a : la source fait partie du projet cible (une tâche peut appartenir à plusieurs projets) ;
 * - bloque : la source empêche la cible d'avancer ;
 * - duplique : la source est un doublon de la cible ;
 * - lie_a : un rapport sans plus de précision.
 */
export const TYPES_LIEN = ['appartient_a', 'bloque', 'duplique', 'lie_a'] as const;
export type TypeLien = (typeof TYPES_LIEN)[number];

export function lireTypeLien(texte: string): TypeLien {
  const type = TYPES_LIEN.find((t) => t === texte);
  if (!type) {
    throw new ErreurDomaine(`Type de lien inconnu : « ${texte} » (attendu : ${TYPES_LIEN.join(', ')}).`);
  }
  return type;
}

/** Un lien, en données simples (pour l'API et le journal). */
export interface InstantaneLien {
  readonly id: string;
  readonly source: string;
  readonly cible: string;
  readonly type: TypeLien;
  readonly creeLe: string;
}

/** Un lien d'un élément vers lui-même n'a pas de sens. */
export function creerLien(params: { id: string; source: string; cible: string; type: string; maintenant: Date }): InstantaneLien {
  if (params.source === params.cible) {
    throw new ErreurDomaine('Un élément ne peut pas être lié à lui-même.');
  }
  return {
    id: params.id,
    source: params.source,
    cible: params.cible,
    type: lireTypeLien(params.type),
    creeLe: params.maintenant.toISOString(),
  };
}

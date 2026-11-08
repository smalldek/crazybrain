import { ErreurDomaine } from './erreur-domaine';

/** Au-delà, un poids n'a plus de sens face à ses frères : la part des autres serait invisible. */
export const POIDS_MAX = 1_000_000;

/**
 * Objet-valeur « poids » : ce que pèse un élément parmi ses frères, pour la vue en cercles. Sa part
 * dans son parent est son poids divisé par la somme des poids de ses frères (voir cercles.ts). Un
 * élément sans poids compte pour 1.
 */
export class Poids {
  private constructor(public readonly valeur: number) {}

  static creer(valeur: number): Poids {
    if (!Number.isFinite(valeur) || valeur <= 0 || valeur > POIDS_MAX) {
      throw new ErreurDomaine(`Poids invalide : ${valeur} (un nombre plus grand que 0, au plus ${POIDS_MAX}).`);
    }
    return new Poids(valeur);
  }
}

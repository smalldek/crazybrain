import { ErreurDomaine } from './erreur-domaine';

/** Longueur maximale d'un titre, en caractères. Au-delà, c'est une description, pas un titre. */
export const TITRE_LONGUEUR_MAX = 200;

/**
 * Objet-valeur « titre » : immuable, toujours valide, comparé par sa valeur.
 * On ne peut l'obtenir que par `Titre.creer`, qui applique les règles (constructeur privé, comme en C#).
 */
export class Titre {
  private constructor(public readonly valeur: string) {}

  static creer(texte: string): Titre {
    const nettoye = texte.trim();
    if (nettoye.length === 0) {
      throw new ErreurDomaine('Le titre ne peut pas être vide.');
    }
    // [...texte] découpe en caractères (un émoji compte pour un), .length compterait des demi-caractères.
    if ([...nettoye].length > TITRE_LONGUEUR_MAX) {
      throw new ErreurDomaine(`Le titre dépasse ${TITRE_LONGUEUR_MAX} caractères.`);
    }
    return new Titre(nettoye);
  }

  egale(autre: Titre): boolean {
    return this.valeur === autre.valeur;
  }
}

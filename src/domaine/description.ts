import { ErreurDomaine } from './erreur-domaine';

/** Longueur maximale d'une description, en caractères : de quoi écrire plusieurs pages. */
export const DESCRIPTION_LONGUEUR_MAX = 20_000;

/**
 * Objet-valeur « description » : un texte en Markdown, jamais vide (une description vide, c'est
 * pas de description : null). Les espaces de fin sont retirés, la mise en forme intérieure gardée.
 */
export class Description {
  private constructor(public readonly valeur: string) {}

  /** Rend null pour un texte vide ou fait d'espaces. */
  static creer(texte: string): Description | null {
    const nettoye = texte.trimEnd().replace(/^\s*\n/, '');
    if (nettoye.trim().length === 0) return null;
    if ([...nettoye].length > DESCRIPTION_LONGUEUR_MAX) {
      throw new ErreurDomaine(`La description dépasse ${DESCRIPTION_LONGUEUR_MAX} caractères.`);
    }
    return new Description(nettoye);
  }
}

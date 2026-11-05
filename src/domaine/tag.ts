import { ErreurDomaine } from './erreur-domaine';

const CLE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const TAG_VALEUR_LONGUEUR_MAX = 100;

/**
 * Objet-valeur « tag » clé:valeur (`composant:pxe`, `release:v1`). Une étiquette simple est une clé
 * sans valeur (`urgent`). La clé est en minuscules sans accent, pour que les filtres la retrouvent ;
 * la valeur est libre. Le projet n'est pas un tag : c'est un lien « appartient à » (décision 002).
 */
export class Tag {
  private constructor(
    public readonly cle: string,
    /** Vide pour une étiquette simple. */
    public readonly valeur: string,
  ) {}

  static creer(cle: string, valeur = ''): Tag {
    const c = cle.trim().toLowerCase();
    if (!CLE.test(c)) {
      throw new ErreurDomaine(`Clé de tag invalide : « ${cle} » (minuscules, chiffres, - et _, sans accent ni espace).`);
    }
    if (c === 'projet') {
      throw new ErreurDomaine('« projet » n’est pas un tag : rattacher l’élément au projet par un lien « appartient_a ».');
    }
    const v = valeur.trim();
    if ([...v].length > TAG_VALEUR_LONGUEUR_MAX) {
      throw new ErreurDomaine(`La valeur du tag dépasse ${TAG_VALEUR_LONGUEUR_MAX} caractères.`);
    }
    return new Tag(c, v);
  }

  /** Lit « cle:valeur » ou « cle » (le premier « : » sépare ; la valeur peut en contenir d'autres). */
  static lire(texte: string): Tag {
    const i = texte.indexOf(':');
    return i < 0 ? Tag.creer(texte) : Tag.creer(texte.slice(0, i), texte.slice(i + 1));
  }

  texte(): string {
    return this.valeur === '' ? this.cle : `${this.cle}:${this.valeur}`;
  }
}

/** Un tag posé sur un élément, en données simples (pour l'API et le journal). */
export interface InstantaneTag {
  readonly elementId: string;
  readonly cle: string;
  readonly valeur: string;
}

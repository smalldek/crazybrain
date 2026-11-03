import { Titre } from './titre';

/** Statuts d'un élément. Un seul pour le squelette ; les autres viendront avec les types (étape 3). */
export type Statut = 'a_faire';

/**
 * Instantané d'un élément : ses valeurs en données simples (texte, dates ISO), sans règles.
 * C'est la forme qu'on range dans le journal et qu'on relit de la base, comme un DTO en .NET.
 */
export interface InstantaneElement {
  readonly id: string;
  readonly titre: string;
  readonly statut: Statut;
  readonly creeLe: string;
  readonly modifieLe: string;
}

/** Entité « élément » : une identité (id) qui ne change pas, des valeurs qui évoluent. */
export class Element {
  private constructor(
    public readonly id: string,
    public readonly titre: Titre,
    public readonly statut: Statut,
    public readonly creeLe: Date,
    public readonly modifieLe: Date,
  ) {}

  /** Un nouvel élément. L'id et l'heure viennent de l'appelant : le domaine reste prévisible à tester. */
  static creer(params: { id: string; titre: Titre; maintenant: Date }): Element {
    return new Element(params.id, params.titre, 'a_faire', params.maintenant, params.maintenant);
  }

  /** Reconstitue un élément relu en base ; le titre repasse par ses règles. */
  static depuisInstantane(etat: InstantaneElement): Element {
    return new Element(etat.id, Titre.creer(etat.titre), etat.statut, new Date(etat.creeLe), new Date(etat.modifieLe));
  }

  instantane(): InstantaneElement {
    return {
      id: this.id,
      titre: this.titre.valeur,
      statut: this.statut,
      creeLe: this.creeLe.toISOString(),
      modifieLe: this.modifieLe.toISOString(),
    };
  }
}

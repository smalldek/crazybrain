import { Echeance } from './echeance';
import { ErreurDomaine } from './erreur-domaine';
import { Titre } from './titre';

/** Statuts d'un élément. Trois pour l'instant ; les statuts propres à chaque type viendront avec les types (tâche 1.3). */
export const STATUTS = ['a_faire', 'en_cours', 'fait'] as const;
export type Statut = (typeof STATUTS)[number];

/** Lit un statut venu de l'extérieur (API, base) : refuse ce qui n'en est pas un. */
export function lireStatut(texte: string): Statut {
  const statut = STATUTS.find((s) => s === texte);
  if (!statut) {
    throw new ErreurDomaine(`Statut inconnu : « ${texte} » (attendu : ${STATUTS.join(', ')}).`);
  }
  return statut;
}

/**
 * Instantané d'un élément : ses valeurs en données simples (texte, dates ISO), sans règles.
 * C'est la forme qu'on range dans le journal et qu'on relit de la base, comme un DTO en .NET.
 */
export interface InstantaneElement {
  readonly id: string;
  readonly titre: string;
  readonly statut: Statut;
  /** Jour AAAA-MM-JJ, ou null. */
  readonly echeance: string | null;
  /** Date ISO du passage à « fait », ou null. */
  readonly faitLe: string | null;
  readonly creeLe: string;
  readonly modifieLe: string;
}

/**
 * Entité « élément » : une identité (id) qui ne change pas, des valeurs qui évoluent.
 * Elle est immuable : chaque changement rend un nouvel élément (comme un `record` C# et son `with`),
 * ce qui garde l'ancien intact pour écrire l'« avant » du journal.
 */
export class Element {
  private constructor(
    public readonly id: string,
    public readonly titre: Titre,
    public readonly statut: Statut,
    public readonly echeance: Echeance | null,
    public readonly faitLe: Date | null,
    public readonly creeLe: Date,
    public readonly modifieLe: Date,
  ) {}

  /** Un nouvel élément. L'id et l'heure viennent de l'appelant : le domaine reste prévisible à tester. */
  static creer(params: { id: string; titre: Titre; maintenant: Date }): Element {
    return new Element(params.id, params.titre, 'a_faire', null, null, params.maintenant, params.maintenant);
  }

  /** Reconstitue un élément relu en base ; chaque valeur repasse par ses règles. */
  static depuisInstantane(etat: InstantaneElement): Element {
    return new Element(
      etat.id,
      Titre.creer(etat.titre),
      lireStatut(etat.statut),
      etat.echeance === null ? null : Echeance.creer(etat.echeance),
      etat.faitLe === null ? null : new Date(etat.faitLe),
      new Date(etat.creeLe),
      new Date(etat.modifieLe),
    );
  }

  renommer(titre: Titre, maintenant: Date): Element {
    return new Element(this.id, titre, this.statut, this.echeance, this.faitLe, this.creeLe, maintenant);
  }

  /** Passer à « fait » note quand ; quitter « fait » l'efface. Rester « fait » garde la date d'origine. */
  changerStatut(statut: Statut, maintenant: Date): Element {
    const faitLe = statut !== 'fait' ? null : this.statut === 'fait' ? this.faitLe : maintenant;
    return new Element(this.id, this.titre, statut, this.echeance, faitLe, this.creeLe, maintenant);
  }

  changerEcheance(echeance: Echeance | null, maintenant: Date): Element {
    return new Element(this.id, this.titre, this.statut, echeance, this.faitLe, this.creeLe, maintenant);
  }

  instantane(): InstantaneElement {
    return {
      id: this.id,
      titre: this.titre.valeur,
      statut: this.statut,
      echeance: this.echeance?.valeur ?? null,
      faitLe: this.faitLe?.toISOString() ?? null,
      creeLe: this.creeLe.toISOString(),
      modifieLe: this.modifieLe.toISOString(),
    };
  }
}

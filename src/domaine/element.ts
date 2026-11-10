import { Avancement } from './avancement';
import { CodeType, TYPE_PAR_DEFAUT } from './code-type';
import { Description } from './description';
import { ErreurDomaine } from './erreur-domaine';
import { Estimation } from './estimation';
import { Heure } from './heure';
import { Jour } from './jour';
import { Poids } from './poids';
import { Horizon } from './horizon';
import { Recurrence } from './recurrence';
import { lirePriorite, type Priorite } from './priorite';
import { Titre } from './titre';

/** Statuts d'un élément. Trois pour l'instant ; des statuts propres à chaque type pourront venir avec le kanban (étape 3). */
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
 * Instantané d'un élément : ses valeurs en données simples (texte, nombres, dates ISO), sans règles.
 * C'est la forme qu'on range dans le journal et qu'on relit de la base, comme un DTO en .NET.
 */
export interface InstantaneElement {
  readonly id: string;
  /** Code du type : tache, projet, epic… */
  readonly type: string;
  /** Id de l'élément qui le contient, ou null. */
  readonly parent: string | null;
  readonly titre: string;
  /** Markdown, ou null. */
  readonly description: string | null;
  readonly statut: Statut;
  readonly priorite: Priorite | null;
  /** Jour AAAA-MM-JJ, ou null. */
  readonly echeance: string | null;
  /** Le jour où Adrien prévoit de le faire, AAAA-MM-JJ, ou null. */
  readonly jourPlanifie: string | null;
  /** Une heure HH:MM sur ce jour, pour le mode journée ; seulement s'il y a un jour planifié. */
  readonly heurePlanifiee: string | null;
  /** Temps prévu, en minutes, ou null. */
  readonly estimation: number | null;
  /** Ordre choisi à la main (plus petit = plus haut), ou null. */
  readonly rang: number | null;
  /** Ce qu'il pèse parmi ses frères, pour la vue en cercles (plus de 0) ; null compte pour 1. */
  readonly poids: number | null;
  /** Avancement saisi, de 0 à 100, ou null. Celui d'un élément qui a des enfants se calcule. */
  readonly avancement: number | null;
  /** Date ISO (UTC) où le téléphone doit sonner (tâche 5.5), ou null. */
  readonly rappel: string | null;
  /** La règle de récurrence (tâche 5.6), sous sa forme rangée (« chaque lundi »), ou null. */
  readonly recurrence: string | null;
  /** L'horizon (étape 7) sous sa forme rangée (« 2026-S46 », « 2027 », « vie »), ou null. */
  readonly horizon: string | null;
  /** Date ISO du passage à « fait », ou null. */
  readonly faitLe: string | null;
  /** Date ISO de l'archivage (une tâche « supprimée »), ou null. */
  readonly archiveLe: string | null;
  readonly creeLe: string;
  readonly modifieLe: string;
}

/** Les valeurs d'un élément, déjà validées. */
interface Valeurs {
  readonly id: string;
  readonly type: CodeType;
  readonly parent: string | null;
  readonly titre: Titre;
  readonly description: Description | null;
  readonly statut: Statut;
  readonly priorite: Priorite | null;
  readonly echeance: Jour | null;
  readonly jourPlanifie: Jour | null;
  readonly heurePlanifiee: Heure | null;
  readonly estimation: Estimation | null;
  readonly rang: number | null;
  readonly poids: Poids | null;
  readonly avancement: Avancement | null;
  readonly rappel: Date | null;
  readonly recurrence: Recurrence | null;
  readonly horizon: Horizon | null;
  readonly faitLe: Date | null;
  readonly archiveLe: Date | null;
  readonly creeLe: Date;
  readonly modifieLe: Date;
}

/**
 * Entité « élément » (une tâche, un projet, un objectif…) : une identité (id) qui ne change pas,
 * des valeurs qui évoluent. Elle est immuable : chaque changement rend un nouvel élément (comme un
 * `record` C# et son `with`), ce qui garde l'ancien intact pour écrire l'« avant » du journal.
 */
export class Element {
  private constructor(private readonly v: Valeurs) {}

  get id(): string { return this.v.id; }
  get type(): CodeType { return this.v.type; }
  get parent(): string | null { return this.v.parent; }
  get titre(): Titre { return this.v.titre; }
  get description(): Description | null { return this.v.description; }
  get statut(): Statut { return this.v.statut; }
  get priorite(): Priorite | null { return this.v.priorite; }
  get echeance(): Jour | null { return this.v.echeance; }
  get jourPlanifie(): Jour | null { return this.v.jourPlanifie; }
  get heurePlanifiee(): Heure | null { return this.v.heurePlanifiee; }
  get estimation(): Estimation | null { return this.v.estimation; }
  get rang(): number | null { return this.v.rang; }
  get poids(): Poids | null { return this.v.poids; }
  get avancement(): Avancement | null { return this.v.avancement; }
  get rappel(): Date | null { return this.v.rappel; }
  get recurrence(): Recurrence | null { return this.v.recurrence; }
  get horizon(): Horizon | null { return this.v.horizon; }
  get faitLe(): Date | null { return this.v.faitLe; }
  get archiveLe(): Date | null { return this.v.archiveLe; }
  get creeLe(): Date { return this.v.creeLe; }
  get modifieLe(): Date { return this.v.modifieLe; }

  /** Un nouvel élément « à faire ». L'id et l'heure viennent de l'appelant : le domaine reste prévisible à tester. */
  static creer(params: { id: string; titre: Titre; maintenant: Date; type?: CodeType }): Element {
    return new Element({
      id: params.id,
      type: params.type ?? CodeType.creer(TYPE_PAR_DEFAUT),
      parent: null,
      titre: params.titre,
      description: null,
      statut: 'a_faire',
      priorite: null,
      echeance: null,
      jourPlanifie: null,
      heurePlanifiee: null,
      estimation: null,
      rang: null,
      poids: null,
      avancement: null,
      rappel: null,
      recurrence: null,
      horizon: null,
      faitLe: null,
      archiveLe: null,
      creeLe: params.maintenant,
      modifieLe: params.maintenant,
    });
  }

  /**
   * Reconstitue un élément relu en base ou dans le journal ; chaque valeur repasse par ses règles.
   * Un instantané d'une forme plus ancienne (sans les champs récents) se lit avec ces champs vides.
   */
  static depuisInstantane(etat: Partial<InstantaneElement> & Pick<InstantaneElement, 'id' | 'titre' | 'statut' | 'creeLe' | 'modifieLe'>): Element {
    return new Element({
      id: etat.id,
      type: CodeType.creer(etat.type ?? TYPE_PAR_DEFAUT),
      parent: etat.parent ?? null,
      titre: Titre.creer(etat.titre),
      description: etat.description == null ? null : Description.creer(etat.description),
      statut: lireStatut(etat.statut),
      priorite: etat.priorite == null ? null : lirePriorite(etat.priorite),
      echeance: etat.echeance == null ? null : Jour.creer(etat.echeance),
      jourPlanifie: etat.jourPlanifie == null ? null : Jour.creer(etat.jourPlanifie),
      heurePlanifiee: etat.heurePlanifiee == null ? null : Heure.creer(etat.heurePlanifiee),
      estimation: etat.estimation == null ? null : Estimation.creer(etat.estimation),
      rang: etat.rang ?? null,
      poids: etat.poids == null ? null : Poids.creer(etat.poids),
      avancement: etat.avancement == null ? null : Avancement.creer(etat.avancement),
      rappel: etat.rappel == null ? null : new Date(etat.rappel),
      recurrence: etat.recurrence == null ? null : Recurrence.lire(etat.recurrence),
      horizon: etat.horizon == null ? null : Horizon.depuisRangee(etat.horizon),
      faitLe: etat.faitLe == null ? null : new Date(etat.faitLe),
      archiveLe: etat.archiveLe == null ? null : new Date(etat.archiveLe),
      creeLe: new Date(etat.creeLe),
      modifieLe: new Date(etat.modifieLe),
    });
  }

  renommer(titre: Titre, maintenant: Date): Element {
    return this.avec({ titre }, maintenant);
  }

  /** Passer à « fait » note quand ; quitter « fait » l'efface. Rester « fait » garde la date d'origine. */
  changerStatut(statut: Statut, maintenant: Date): Element {
    const faitLe = statut !== 'fait' ? null : this.statut === 'fait' ? this.faitLe : maintenant;
    return this.avec({ statut, faitLe }, maintenant);
  }

  changerEcheance(echeance: Jour | null, maintenant: Date): Element {
    return this.avec({ echeance }, maintenant);
  }

  /** Un élément ne peut pas être son propre parent. Les boucles plus longues se vérifient avec ses ancêtres (modifierElement). */
  changerParent(parent: string | null, maintenant: Date): Element {
    if (parent === this.id) {
      throw new ErreurDomaine('Un élément ne peut pas être son propre parent.');
    }
    return this.avec({ parent }, maintenant);
  }

  /** Planifier un jour, avec une heure facultative. Sans jour, pas d'heure. */
  planifier(jour: Jour | null, heure: Heure | null, maintenant: Date): Element {
    if (jour === null && heure !== null) {
      throw new ErreurDomaine('Une heure planifiée demande un jour planifié.');
    }
    return this.avec({ jourPlanifie: jour, heurePlanifiee: heure }, maintenant);
  }

  /** Programmer (ou retirer, null) le rappel : le téléphone sonnera à cet instant. */
  programmerRappel(rappel: Date | null, maintenant: Date): Element {
    return this.avec({ rappel }, maintenant);
  }

  /** Poser (ou retirer, null) la règle de récurrence. */
  changerRecurrence(recurrence: Recurrence | null, maintenant: Date): Element {
    return this.avec({ recurrence }, maintenant);
  }

  /** Placer (ou retirer, null) l'élément dans un horizon. */
  changerHorizon(horizon: Horizon | null, maintenant: Date): Element {
    return this.avec({ horizon }, maintenant);
  }

  /** Les champs sans règle entre eux (type, description, priorité, estimation, rang, poids, avancement). */
  changer(
    champs: Partial<Pick<Valeurs, 'type' | 'description' | 'priorite' | 'estimation' | 'rang' | 'poids' | 'avancement'>>,
    maintenant: Date,
  ): Element {
    if (champs.rang !== undefined && champs.rang !== null && !Number.isFinite(champs.rang)) {
      throw new ErreurDomaine('Le rang doit être un nombre.');
    }
    return this.avec(champs, maintenant);
  }

  /**
   * Supprimer une tâche l'archive : elle sort des listes, mais reste en base avec son histoire, et se
   * restaure. Une suppression définitive viendra seulement si le besoin s'en fait sentir.
   */
  archiver(maintenant: Date): Element {
    if (this.archiveLe) throw new ErreurDomaine('Cet élément est déjà supprimé.');
    return this.avec({ archiveLe: maintenant }, maintenant);
  }

  restaurer(maintenant: Date): Element {
    if (!this.archiveLe) throw new ErreurDomaine("Cet élément n'est pas supprimé.");
    return this.avec({ archiveLe: null }, maintenant);
  }

  private avec(champs: Partial<Valeurs>, maintenant: Date): Element {
    return new Element({ ...this.v, ...champs, modifieLe: maintenant });
  }

  instantane(): InstantaneElement {
    return {
      id: this.id,
      type: this.type.valeur,
      parent: this.parent,
      titre: this.titre.valeur,
      description: this.description?.valeur ?? null,
      statut: this.statut,
      priorite: this.priorite,
      echeance: this.echeance?.valeur ?? null,
      jourPlanifie: this.jourPlanifie?.valeur ?? null,
      heurePlanifiee: this.heurePlanifiee?.valeur ?? null,
      estimation: this.estimation?.minutes ?? null,
      rang: this.rang,
      poids: this.poids?.valeur ?? null,
      avancement: this.avancement?.pourcent ?? null,
      rappel: this.rappel?.toISOString() ?? null,
      recurrence: this.recurrence?.texte ?? null,
      horizon: this.horizon?.texte ?? null,
      faitLe: this.faitLe?.toISOString() ?? null,
      archiveLe: this.archiveLe?.toISOString() ?? null,
      creeLe: this.creeLe.toISOString(),
      modifieLe: this.modifieLe.toISOString(),
    };
  }
}

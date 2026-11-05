import type { InstantaneCommentaire } from './commentaire';
import type { InstantaneElement } from './element';
import type { InstantaneLien } from './lien';
import type { InstantaneTag } from './tag';

/** Qui a fait la modification. */
export type Auteur = 'adrien' | 'claude';

/** Les sortes d'événements, et ce que chacune garde dans `avant` / `apres`. */
interface FormesEvenement {
  element_cree: InstantaneElement;
  element_modifie: InstantaneElement;
  lien_ajoute: InstantaneLien;
  lien_retire: InstantaneLien;
  tag_ajoute: InstantaneTag;
  tag_retire: InstantaneTag;
  commentaire_ajoute: InstantaneCommentaire;
}
export type TypeEvenement = keyof FormesEvenement;

/**
 * Une ligne du journal (décision 002) : on garde le résultat (avant, après), jamais l'ordre donné,
 * pour pouvoir annuler, rejouer ou voir ce que Claude a changé. `elementId` est l'élément concerné
 * (pour un lien : sa source). Le type dit la forme de `avant` et `apres` (une union discriminée,
 * comme une hiérarchie de records en C#).
 */
export type Evenement = {
  [T in TypeEvenement]: {
    readonly id: string;
    readonly elementId: string;
    readonly type: T;
    /** Version de la forme de `avant` / `apres` : si les champs changent un jour, on sait lire les anciens. */
    readonly versionForme: number;
    readonly avant: FormesEvenement[T] | null;
    readonly apres: FormesEvenement[T] | null;
    readonly auteur: Auteur;
    /** Date ISO 8601, en UTC. */
    readonly date: string;
  };
}[TypeEvenement];

/**
 * Version actuelle de la forme des instantanés d'élément.
 * 1 : id, titre, statut, creeLe, modifieLe (03/11/2026).
 * 2 : ajoute echeance et faitLe (tâche 1.2, 05/11/2026).
 * 3 : ajoute type, parent, description, priorite, jourPlanifie, heurePlanifiee, estimation, rang (tâche 1.3).
 * Un instantané d'une forme plus ancienne se lit avec les champs qui lui manquent à null (type : tache).
 * Les liens, tags et commentaires sont en forme 1 depuis leur création ; leurs événements portent la
 * version courante, qui ne change que si leur forme change.
 */
export const VERSION_FORME = 3;

/** Fabrique l'événement d'un ajout ou d'un retrait (lien, tag, commentaire). */
export function evenementDe<T extends Exclude<TypeEvenement, 'element_cree' | 'element_modifie'>>(params: {
  id: string;
  elementId: string;
  type: T;
  avant: FormesEvenement[T] | null;
  apres: FormesEvenement[T] | null;
  auteur: Auteur;
  maintenant: Date;
}): Evenement {
  return {
    id: params.id,
    elementId: params.elementId,
    type: params.type,
    versionForme: VERSION_FORME,
    avant: params.avant,
    apres: params.apres,
    auteur: params.auteur,
    date: params.maintenant.toISOString(),
  } as Evenement;
}

import type { InstantaneElement } from './element';

/** Qui a fait la modification. */
export type Auteur = 'adrien' | 'claude';

/** Les sortes d'événements. */
export type TypeEvenement = 'element_cree' | 'element_modifie';

/**
 * Une ligne du journal (décision 002) : on garde le résultat (avant, après), jamais l'ordre donné,
 * pour pouvoir annuler, rejouer ou voir ce que Claude a changé.
 */
export interface Evenement {
  readonly id: string;
  readonly elementId: string;
  readonly type: TypeEvenement;
  /** Version de la forme de `avant` / `apres` : si les champs changent un jour, on sait lire les anciens. */
  readonly versionForme: number;
  readonly avant: InstantaneElement | null;
  readonly apres: InstantaneElement | null;
  readonly auteur: Auteur;
  /** Date ISO 8601, en UTC. */
  readonly date: string;
}

/**
 * Version actuelle de la forme des instantanés.
 * 1 : id, titre, statut, creeLe, modifieLe (03/11/2026).
 * 2 : ajoute echeance et faitLe (tâche 1.2, 05/11/2026).
 * 3 : ajoute type, parent, description, priorite, jourPlanifie, heurePlanifiee, estimation, rang (tâche 1.3).
 * Un instantané d'une forme plus ancienne se lit avec les champs qui lui manquent à null (type : tache).
 */
export const VERSION_FORME = 3;

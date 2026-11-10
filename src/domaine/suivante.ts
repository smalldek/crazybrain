// La tâche suivante d'une tâche récurrente (tâche 5.6), quand on coche celle-ci.
import type { Element } from './element';
import { Jour } from './jour';
import type { ChangementsElement } from './modifier-element';
import { aParis } from './rappel';

/**
 * Les champs de la suivante, en valeurs brutes (comme une demande de création) ; null si l'élément
 * n'est pas récurrent. Elle reprend le titre, le type, le parent, la description, la priorité,
 * l'estimation, le poids et la règle ; l'avancement repart de zéro.
 *
 * Sa date :
 * - à date fixe, la prochaine date de la règle, sur le même champ que la tâche cochée (l'échéance, ou
 *   le jour prévu s'il n'y avait que lui ; l'échéance s'il n'y avait aucune date) ;
 * - après achèvement, le jour prévu (le jour où elle « se réveille »), sans échéance.
 * Un rappel suit, à la même heure de Paris, le jour de la suivante.
 */
export function champsDeLaSuivante(avant: Element, aujourdhui: Jour): (ChangementsElement & { titre: string }) | null {
  const regle = avant.recurrence;
  if (!regle) return null;
  const base = avant.echeance ?? avant.jourPlanifie ?? aujourdhui;
  const jour = regle.prochaine(base, aujourdhui).valeur;
  const surLeJourPrevu = regle.apresFait || (avant.echeance === null && avant.jourPlanifie !== null);
  return {
    titre: avant.titre.valeur,
    type: avant.type.valeur,
    ...(avant.parent ? { parent: avant.parent } : {}),
    ...(avant.description ? { description: avant.description.valeur } : {}),
    ...(avant.priorite ? { priorite: avant.priorite } : {}),
    ...(avant.estimation ? { estimation: avant.estimation.minutes } : {}),
    ...(avant.poids ? { poids: avant.poids.valeur } : {}),
    recurrence: regle.texte,
    ...(surLeJourPrevu
      ? { jourPlanifie: jour, ...(!regle.apresFait && avant.heurePlanifiee ? { heurePlanifiee: avant.heurePlanifiee.valeur } : {}) }
      : { echeance: jour }),
    ...(avant.rappel ? { rappel: `${jour} ${aParis(avant.rappel).heure}` } : {}),
  };
}

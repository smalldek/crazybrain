import type { Element } from './element';
import { evenementDe, type Auteur, type Evenement } from './evenement';

export interface CommandeArchiverElement {
  readonly element: Element;
  readonly idEvenement: string;
  readonly auteur: Auteur;
  readonly maintenant: Date;
}

/** Cas d'usage « supprimer une tâche » : elle est archivée, et l'événement garde l'avant et l'après. */
export function archiverElement(commande: CommandeArchiverElement): { element: Element; evenement: Evenement } {
  const apres = commande.element.archiver(commande.maintenant);
  return { element: apres, evenement: evenement('element_archive', commande, apres) };
}

/** Cas d'usage « restaurer une tâche supprimée ». */
export function restaurerElement(commande: CommandeArchiverElement): { element: Element; evenement: Evenement } {
  const apres = commande.element.restaurer(commande.maintenant);
  return { element: apres, evenement: evenement('element_restaure', commande, apres) };
}

function evenement(type: 'element_archive' | 'element_restaure', commande: CommandeArchiverElement, apres: Element): Evenement {
  return evenementDe({
    id: commande.idEvenement,
    elementId: apres.id,
    type,
    avant: commande.element.instantane(),
    apres: apres.instantane(),
    auteur: commande.auteur,
    maintenant: commande.maintenant,
  });
}

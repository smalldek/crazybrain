import { Echeance } from './echeance';
import { Element, lireStatut } from './element';
import { ErreurDomaine } from './erreur-domaine';
import { VERSION_FORME, type Auteur, type Evenement } from './evenement';
import { Titre } from './titre';

/**
 * Les changements demandés. Un champ absent ne change pas ; `echeance: null` retire l'échéance.
 * Les valeurs arrivent en texte brut (de l'API, plus tard du connecteur) : le domaine les valide.
 */
export interface ChangementsElement {
  readonly titre?: string;
  readonly statut?: string;
  readonly echeance?: string | null;
}

export interface CommandeModifierElement {
  /** L'élément tel qu'il est en base. */
  readonly element: Element;
  readonly changements: ChangementsElement;
  readonly idEvenement: string;
  readonly auteur: Auteur;
  readonly maintenant: Date;
}

/**
 * Cas d'usage « modifier un élément » : rend le nouvel élément et l'événement qui raconte le
 * changement (avant, après). Si rien ne change vraiment, pas d'événement : le journal ne garde que
 * de vraies modifications. L'appelant enregistre les deux dans la même transaction.
 */
export function modifierElement(commande: CommandeModifierElement): { element: Element; evenement: Evenement | null } {
  const { changements, maintenant } = commande;
  if (changements.titre === undefined && changements.statut === undefined && changements.echeance === undefined) {
    throw new ErreurDomaine('Rien à modifier : donner au moins titre, statut ou echeance.');
  }

  // Tout se valide d'abord : une demande à moitié fausse est refusée en entier.
  const titre = changements.titre === undefined ? undefined : Titre.creer(changements.titre);
  const statut = changements.statut === undefined ? undefined : lireStatut(changements.statut);
  const echeance =
    changements.echeance === undefined ? undefined : changements.echeance === null ? null : Echeance.creer(changements.echeance);

  const avant = commande.element;
  let apres = avant;
  if (titre && !titre.egale(apres.titre)) apres = apres.renommer(titre, maintenant);
  if (statut && statut !== apres.statut) apres = apres.changerStatut(statut, maintenant);
  if (echeance !== undefined && !memeEcheance(echeance, apres.echeance)) apres = apres.changerEcheance(echeance, maintenant);

  if (apres === avant) {
    return { element: avant, evenement: null };
  }
  return {
    element: apres,
    evenement: {
      id: commande.idEvenement,
      elementId: avant.id,
      type: 'element_modifie',
      versionForme: VERSION_FORME,
      avant: avant.instantane(),
      apres: apres.instantane(),
      auteur: commande.auteur,
      date: maintenant.toISOString(),
    },
  };
}

function memeEcheance(a: Echeance | null, b: Echeance | null): boolean {
  return a === null || b === null ? a === b : a.egale(b);
}

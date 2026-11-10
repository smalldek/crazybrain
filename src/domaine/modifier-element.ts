import { Avancement } from './avancement';
import { CodeType } from './code-type';
import { Description } from './description';
import { Element, lireStatut } from './element';
import { ErreurDomaine } from './erreur-domaine';
import { Estimation } from './estimation';
import { VERSION_FORME, type Auteur, type Evenement } from './evenement';
import { Heure } from './heure';
import { Jour } from './jour';
import { Poids } from './poids';
import { lireRappel } from './rappel';
import { lirePriorite } from './priorite';
import { Titre } from './titre';

/**
 * Les changements demandés, en valeurs brutes (de l'API, du connecteur) : le domaine les valide.
 * Un champ absent ne change pas ; `null` vide un champ facultatif.
 */
export interface ChangementsElement {
  readonly titre?: string;
  readonly statut?: string;
  readonly type?: string;
  readonly parent?: string | null;
  readonly description?: string | null;
  readonly priorite?: string | null;
  readonly echeance?: string | null;
  readonly jourPlanifie?: string | null;
  readonly heurePlanifiee?: string | null;
  readonly estimation?: number | null;
  readonly rang?: number | null;
  /** Le poids parmi ses frères (vue en cercles), plus de 0 ; null : compte pour 1. */
  readonly poids?: number | null;
  /** L'avancement saisi, entier de 0 à 100 ; null l'efface. */
  readonly avancement?: number | null;
  /** L'heure du rappel : ISO avec fuseau, ou « AAAA-MM-JJ HH:MM » à l'heure de Paris ; null le retire. */
  readonly rappel?: string | null;
}

/** Les noms des champs modifiables, pour vérifier un corps de requête. */
export const CHAMPS_MODIFIABLES = [
  'titre', 'statut', 'type', 'parent', 'description', 'priorite', 'echeance',
  'jourPlanifie', 'heurePlanifiee', 'estimation', 'rang', 'poids', 'avancement', 'rappel',
] as const satisfies readonly (keyof ChangementsElement)[];

/**
 * Ce que le domaine ne peut pas savoir seul : les ancêtres du nouveau parent (son parent, le parent
 * de son parent…), lus en base par l'appelant, pour refuser une boucle.
 */
export interface ContexteParent {
  readonly ancetresDuParent: readonly string[];
}

export interface CommandeModifierElement {
  /** L'élément tel qu'il est en base. */
  readonly element: Element;
  readonly changements: ChangementsElement;
  readonly idEvenement: string;
  readonly auteur: Auteur;
  readonly maintenant: Date;
  /** Obligatoire quand on change le parent pour un autre élément. */
  readonly contexteParent?: ContexteParent;
}

/**
 * Cas d'usage « modifier un élément » : rend le nouvel élément et l'événement qui raconte le
 * changement (avant, après). Si rien ne change vraiment, pas d'événement : le journal ne garde que
 * de vraies modifications. L'appelant enregistre les deux dans la même transaction.
 */
export function modifierElement(commande: CommandeModifierElement): { element: Element; evenement: Evenement | null } {
  if (CHAMPS_MODIFIABLES.every((champ) => commande.changements[champ] === undefined)) {
    throw new ErreurDomaine(`Rien à modifier : donner au moins un de ces champs : ${CHAMPS_MODIFIABLES.join(', ')}.`);
  }
  const avant = commande.element;
  if (avant.archiveLe) {
    throw new ErreurDomaine('Cet élément est supprimé : le restaurer avant de le modifier.');
  }
  const apres = appliquerChangements(avant, commande.changements, commande.maintenant, commande.contexteParent);
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
      date: commande.maintenant.toISOString(),
    },
  };
}

/**
 * Applique des changements bruts à un élément : valide tout d'abord (une demande à moitié fausse est
 * refusée en entier), puis ne touche que ce qui change vraiment. Rend le même objet si rien ne change.
 * Sert aussi à la création, pour les champs donnés dès le départ.
 */
export function appliquerChangements(
  element: Element,
  changements: ChangementsElement,
  maintenant: Date,
  contexteParent?: ContexteParent,
): Element {
  const c = changements;
  const titre = c.titre === undefined ? undefined : Titre.creer(c.titre);
  const statut = c.statut === undefined ? undefined : lireStatut(c.statut);
  const type = c.type === undefined ? undefined : CodeType.creer(c.type);
  const description = c.description === undefined ? undefined : c.description === null ? null : Description.creer(c.description);
  const priorite = c.priorite === undefined ? undefined : c.priorite === null ? null : lirePriorite(c.priorite);
  const echeance = c.echeance === undefined ? undefined : c.echeance === null ? null : Jour.creer(c.echeance);
  const jourPlanifie = c.jourPlanifie === undefined ? undefined : c.jourPlanifie === null ? null : Jour.creer(c.jourPlanifie);
  const heurePlanifiee = c.heurePlanifiee === undefined ? undefined : c.heurePlanifiee === null ? null : Heure.creer(c.heurePlanifiee);
  const estimation = c.estimation === undefined ? undefined : c.estimation === null ? null : Estimation.creer(c.estimation);
  const poids = c.poids === undefined ? undefined : c.poids === null ? null : Poids.creer(c.poids);
  const avancement = c.avancement === undefined ? undefined : c.avancement === null ? null : Avancement.creer(c.avancement);
  const rappel = c.rappel === undefined ? undefined : c.rappel === null ? null : lireRappel(c.rappel);
  if (c.rang !== undefined && c.rang !== null && !Number.isFinite(c.rang)) {
    throw new ErreurDomaine('Le rang doit être un nombre.');
  }
  if (c.parent !== undefined && c.parent !== null && c.parent !== element.parent) {
    if (c.parent === element.id) throw new ErreurDomaine('Un élément ne peut pas être son propre parent.');
    if (!contexteParent) throw new Error('Changer de parent demande les ancêtres du nouveau parent.');
    if (contexteParent.ancetresDuParent.includes(element.id)) {
      throw new ErreurDomaine('Ce parent ferait une boucle : il est déjà contenu dans cet élément.');
    }
  }

  let e = element;
  if (titre && titre.valeur !== e.titre.valeur) e = e.renommer(titre, maintenant);
  if (statut && statut !== e.statut) e = e.changerStatut(statut, maintenant);
  if (c.parent !== undefined && c.parent !== e.parent) e = e.changerParent(c.parent, maintenant);
  if (echeance !== undefined && echeance?.valeur !== e.echeance?.valeur) e = e.changerEcheance(echeance, maintenant);

  // Jour et heure planifiés vont ensemble : retirer le jour retire l'heure.
  const jour = jourPlanifie === undefined ? e.jourPlanifie : jourPlanifie;
  const heure = heurePlanifiee === undefined ? (jour === null ? null : e.heurePlanifiee) : heurePlanifiee;
  if (jour?.valeur !== e.jourPlanifie?.valeur || heure?.valeur !== e.heurePlanifiee?.valeur) {
    e = e.planifier(jour, heure, maintenant);
  }

  const simples: Parameters<Element['changer']>[0] = {
    ...(type !== undefined && type.valeur !== e.type.valeur ? { type } : {}),
    ...(description !== undefined && description?.valeur !== e.description?.valeur ? { description } : {}),
    ...(priorite !== undefined && priorite !== e.priorite ? { priorite } : {}),
    ...(estimation !== undefined && estimation?.minutes !== e.estimation?.minutes ? { estimation } : {}),
    ...(c.rang !== undefined && c.rang !== e.rang ? { rang: c.rang } : {}),
    ...(poids !== undefined && poids?.valeur !== e.poids?.valeur ? { poids } : {}),
    ...(avancement !== undefined && avancement?.pourcent !== e.avancement?.pourcent ? { avancement } : {}),
  };
  if (Object.keys(simples).length > 0) e = e.changer(simples, maintenant);
  if (rappel !== undefined && rappel?.getTime() !== e.rappel?.getTime()) e = e.programmerRappel(rappel, maintenant);
  return e;
}

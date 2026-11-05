import { Element } from './element';
import { appliquerChangements, type ChangementsElement, type ContexteParent } from './modifier-element';
import { VERSION_FORME, type Auteur, type Evenement } from './evenement';
import { Titre } from './titre';

/** Ce qu'il faut pour créer un élément. Les ids et l'heure sont fournis : le domaine ne tire rien au hasard. */
export interface CommandeCreerElement {
  readonly idElement: string;
  readonly idEvenement: string;
  readonly titre: string;
  readonly auteur: Auteur;
  readonly maintenant: Date;
  /** Les autres champs, donnés dès la création (type, parent, échéance…). Mêmes règles qu'une modification. */
  readonly champs?: Omit<ChangementsElement, 'titre'>;
  /** Obligatoire quand `champs.parent` est donné. */
  readonly contexteParent?: ContexteParent;
}

/**
 * Cas d'usage « créer un élément » : rend l'élément et l'événement qui le raconte.
 * L'appelant enregistre les deux dans la même transaction (tout ou rien).
 */
export function creerElement(commande: CommandeCreerElement): { element: Element; evenement: Evenement } {
  const nouveau = Element.creer({
    id: commande.idElement,
    titre: Titre.creer(commande.titre),
    maintenant: commande.maintenant,
  });
  const element = appliquerChangements(nouveau, commande.champs ?? {}, commande.maintenant, commande.contexteParent);
  const evenement: Evenement = {
    id: commande.idEvenement,
    elementId: element.id,
    type: 'element_cree',
    versionForme: VERSION_FORME,
    avant: null,
    apres: element.instantane(),
    auteur: commande.auteur,
    date: commande.maintenant.toISOString(),
  };
  return { element, evenement };
}

// Modifier un élément rend le nouvel élément ET l'événement qui raconte le changement (avant, après).
import { describe, expect, it } from 'vitest';
import { Element } from '../../src/domaine/element';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { modifierElement, type CommandeModifierElement } from '../../src/domaine/modifier-element';
import { Titre } from '../../src/domaine/titre';

const cree = new Date('2026-11-03T08:30:00.000Z');
const maintenant = new Date('2026-11-05T18:00:00.000Z');
const element = Element.creer({ id: 'el-1', titre: Titre.creer('Acheter du pain'), maintenant: cree });

function commande(changements: CommandeModifierElement['changements']): CommandeModifierElement {
  return { element, changements, idEvenement: 'ev-2', auteur: 'adrien', maintenant };
}

describe('modifierElement', () => {
  it('renomme, et l’événement « element_modifie » garde l’avant et l’après', () => {
    const resultat = modifierElement(commande({ titre: '  Acheter du pain complet ' }));

    expect(resultat.element.titre.valeur).toBe('Acheter du pain complet');
    expect(resultat.evenement).toEqual({
      id: 'ev-2',
      elementId: 'el-1',
      type: 'element_modifie',
      versionForme: 2,
      avant: element.instantane(),
      apres: resultat.element.instantane(),
      auteur: 'adrien',
      date: '2026-11-05T18:00:00.000Z',
    });
  });

  it('change le statut, l’échéance et le titre d’un coup, en un seul événement', () => {
    const { element: apres, evenement } = modifierElement(
      commande({ titre: 'Pain', statut: 'fait', echeance: '2026-11-12' }),
    );

    expect(apres.instantane()).toMatchObject({ titre: 'Pain', statut: 'fait', echeance: '2026-11-12', faitLe: maintenant.toISOString() });
    expect(evenement?.type).toBe('element_modifie');
  });

  it('retire l’échéance avec null', () => {
    const date = modifierElement(commande({ echeance: '2026-11-12' })).element;
    const { element: sans } = modifierElement({ ...commande({ echeance: null }), element: date });

    expect(sans.echeance).toBeNull();
  });

  it('n’écrit pas d’événement quand rien ne change', () => {
    const resultat = modifierElement(commande({ titre: 'Acheter du pain', statut: 'a_faire', echeance: null }));

    expect(resultat.evenement).toBeNull();
    expect(resultat.element).toBe(element);
  });

  it('refuse une demande vide', () => {
    expect(() => modifierElement(commande({}))).toThrow(ErreurDomaine);
  });

  it('refuse un titre vide, un statut inconnu, une échéance invalide', () => {
    expect(() => modifierElement(commande({ titre: '  ' }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ statut: 'termine' }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ echeance: '2026-02-30' }))).toThrow(ErreurDomaine);
  });
});

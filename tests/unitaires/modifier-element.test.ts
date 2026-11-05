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
      versionForme: 3,
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

describe('modifierElement : le reste du modèle (tâche 1.3)', () => {
  it('change type, description, priorité, estimation, rang et planification en un seul événement', () => {
    const { element: apres, evenement } = modifierElement({
      ...commande({
        type: 'epic',
        description: '## Contexte\n\nDu *Markdown*.',
        priorite: 'haute',
        estimation: 90,
        rang: 1.5,
        jourPlanifie: '2026-11-10',
        heurePlanifiee: '14:00',
      }),
    });

    expect(apres.instantane()).toMatchObject({
      type: 'epic',
      description: '## Contexte\n\nDu *Markdown*.',
      priorite: 'haute',
      estimation: 90,
      rang: 1.5,
      jourPlanifie: '2026-11-10',
      heurePlanifiee: '14:00',
    });
    expect(evenement?.type).toBe('element_modifie');
  });

  it('une description vide, c’est pas de description', () => {
    const decrit = modifierElement(commande({ description: 'Du texte' })).element;
    const { element: vide } = modifierElement({ ...commande({ description: '   ' }), element: decrit });

    expect(vide.description).toBeNull();
  });

  it('retirer le jour planifié retire l’heure', () => {
    const planifie = modifierElement(commande({ jourPlanifie: '2026-11-10', heurePlanifiee: '14:00' })).element;
    const { element: libre } = modifierElement({ ...commande({ jourPlanifie: null }), element: planifie });

    expect(libre.jourPlanifie).toBeNull();
    expect(libre.heurePlanifiee).toBeNull();
  });

  it('range sous un parent, en vérifiant ses ancêtres', () => {
    const { element: range } = modifierElement({
      ...commande({ parent: 'projet-1' }),
      contexteParent: { ancetresDuParent: ['projet-1'] },
    });

    expect(range.parent).toBe('projet-1');
  });

  it('refuse un parent qui ferait une boucle', () => {
    // el-1 contient sous-1, qui contient sous-2 : sous-2 ne peut pas devenir le parent de el-1.
    expect(() =>
      modifierElement({ ...commande({ parent: 'sous-2' }), contexteParent: { ancetresDuParent: ['sous-2', 'sous-1', 'el-1'] } }),
    ).toThrow(ErreurDomaine);
  });

  it('refuse d’être son propre parent', () => {
    expect(() =>
      modifierElement({ ...commande({ parent: 'el-1' }), contexteParent: { ancetresDuParent: ['el-1'] } }),
    ).toThrow(ErreurDomaine);
  });

  it('refuse les valeurs invalides', () => {
    expect(() => modifierElement(commande({ priorite: 'critique' }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ estimation: 0 }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ estimation: 2.5 }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ heurePlanifiee: '25:00' }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ type: 'Tâche' }))).toThrow(ErreurDomaine);
    expect(() => modifierElement(commande({ heurePlanifiee: '09:00' }))).toThrow(ErreurDomaine); // pas de jour planifié
  });
});

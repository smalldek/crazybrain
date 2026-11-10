// La règle de récurrence (tâche 5.6).
import { describe, expect, it } from 'vitest';
import { Jour } from '../../src/domaine/jour';
import { Recurrence, ajouter } from '../../src/domaine/recurrence';

const j = (t: string): Jour => Jour.creer(t);
const prochaine = (regle: string, base: string, aujourdhui: string): string => Recurrence.lire(regle).prochaine(j(base), j(aujourdhui)).valeur;

describe('lire une règle', () => {
  it('comprend les façons courantes de la dire, et la range sous une seule forme', () => {
    const cas: [string, string][] = [
      ['chaque lundi', 'chaque lundi'], ['tous les lundis', 'chaque lundi'], ['Le Vendredi', 'chaque vendredi'],
      ['le 1er du mois', 'le 1er du mois'], ['le 15 de chaque mois', 'le 15 du mois'], ['chaque mois le 3', 'le 3 du mois'],
      ['tous les 2 mois', 'tous les 2 mois'], ['toutes les 3 semaines', 'toutes les 3 semaines'], ['tous les 10 jours', 'tous les 10 jours'],
      ['chaque semaine', 'chaque semaine'], ['tous les ans', 'chaque année'], ['chaque année', 'chaque année'],
      ['3 mois après fait', '3 mois après fait'], ["3 mois après l'avoir faite", '3 mois après fait'],
      ['90j apres fait', '90 jours après fait'], ['1 an après fait', '1 an après fait'], ['2 semaines apres', '2 semaines après fait'],
    ];
    for (const [texte, range] of cas) expect(Recurrence.lire(texte).texte, texte).toBe(range);
    expect(Recurrence.lire('3 mois après fait').apresFait).toBe(true);
    expect(Recurrence.lire('chaque lundi').apresFait).toBe(false);
  });

  it('refuse ce qu’elle ne comprend pas, en donnant des exemples', () => {
    for (const faux of ['de temps en temps', 'chaque 0 mois', 'le 32 du mois', 'tous les 0 jours', '']) {
      expect(() => Recurrence.lire(faux), faux).toThrow(/Récurrence/);
    }
  });
});

describe('la date de la suivante', () => {
  it('à date fixe : la prochaine date de la règle après celle de la tâche', () => {
    expect(prochaine('chaque lundi', '2026-11-09', '2026-11-09')).toBe('2026-11-16'); // lundi → lundi suivant
    expect(prochaine('le 1er du mois', '2026-11-01', '2026-11-01')).toBe('2026-12-01');
    expect(prochaine('le 15 du mois', '2026-11-03', '2026-11-03')).toBe('2026-11-15');
    expect(prochaine('tous les 2 mois', '2026-11-10', '2026-11-10')).toBe('2027-01-10');
  });

  it('cochée en retard : la première date après aujourd’hui', () => {
    expect(prochaine('le 1er du mois', '2026-10-01', '2026-11-10')).toBe('2026-12-01');
    expect(prochaine('chaque lundi', '2026-10-05', '2026-11-10')).toBe('2026-11-16');
  });

  it('après achèvement : le délai compté depuis le jour où on coche', () => {
    expect(prochaine('3 mois après fait', '2026-01-01', '2026-11-10')).toBe('2027-02-10');
    expect(prochaine('10 jours après fait', '2026-01-01', '2026-11-10')).toBe('2026-11-20');
  });

  it('un 31 garde le dernier jour des mois plus courts', () => {
    expect(ajouter(j('2027-01-31'), 1, 'mois').valeur).toBe('2027-02-28');
    expect(prochaine('le 31 du mois', '2027-01-31', '2027-01-31')).toBe('2027-02-28');
    expect(ajouter(j('2028-02-29'), 1, 'an').valeur).toBe('2029-02-28');
  });
});

describe('la suivante d’une tâche cochée', async () => {
  const { Element } = await import('../../src/domaine/element');
  const { modifierElement } = await import('../../src/domaine/modifier-element');
  const { champsDeLaSuivante } = await import('../../src/domaine/suivante');
  const { Titre } = await import('../../src/domaine/titre');
  const maintenant = new Date('2026-11-10T10:00:00Z');
  const tache = (champs: Record<string, unknown>) => modifierElement({
    element: Element.creer({ id: 'a', titre: Titre.creer('Sortir les poubelles'), maintenant }),
    changements: champs, idEvenement: 'e', auteur: 'adrien', maintenant,
  }).element;

  it('à date fixe : la même tâche, à la prochaine échéance, avec son rappel à la même heure', () => {
    const t = tache({ recurrence: 'chaque lundi', echeance: '2026-11-09', priorite: 'haute', rappel: '2026-11-09 19:30' });
    expect(champsDeLaSuivante(t, j('2026-11-10'))).toEqual({
      titre: 'Sortir les poubelles', type: 'tache', priorite: 'haute', recurrence: 'chaque lundi', echeance: '2026-11-16', rappel: '2026-11-16 19:30',
    });
  });

  it('sur le jour prévu s’il n’y avait que lui, avec son heure', () => {
    const t = tache({ recurrence: 'chaque semaine', jourPlanifie: '2026-11-10', heurePlanifiee: '08:00' });
    expect(champsDeLaSuivante(t, j('2026-11-10'))).toMatchObject({ jourPlanifie: '2026-11-17', heurePlanifiee: '08:00' });
  });

  it('après achèvement : prévue au réveil, sans échéance', () => {
    const t = tache({ recurrence: '3 mois après fait', echeance: '2026-10-01' });
    const s = champsDeLaSuivante(t, j('2026-11-10'));
    expect(s).toMatchObject({ jourPlanifie: '2027-02-10', recurrence: '3 mois après fait' });
    expect(s).not.toHaveProperty('echeance');
  });

  it('cocher la tâche lui retire sa règle (elle passe à la suivante), l’événement le dit', () => {
    const t = tache({ recurrence: 'chaque lundi' });
    const { element, evenement } = modifierElement({ element: t, changements: { statut: 'fait' }, idEvenement: 'e2', auteur: 'adrien', maintenant });
    expect(element.recurrence).toBeNull();
    expect((evenement?.avant as { recurrence: string }).recurrence).toBe('chaque lundi');
    expect(champsDeLaSuivante(tache({ priorite: 'basse' }), j('2026-11-10'))).toBeNull();
  });
});

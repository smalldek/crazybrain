// Les règles de la liste de l'interface : l'ordre d'affichage, et le changement montré avant la réponse du serveur.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { aujourdhui } from '../../ui/dates';
import { appliquer, ordonner } from '../../ui/liste';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

describe('ordonner', () => {
  it("garde l'ordre des tâches à faire et met les faites après, la plus récemment faite en premier", () => {
    const liste = [
      element('fait-hier', { statut: 'fait', faitLe: '2026-11-04T08:00:00.000Z' }),
      element('a'),
      element('fait-ce-matin', { statut: 'fait', faitLe: '2026-11-05T08:00:00.000Z' }),
      element('b', { statut: 'en_cours' }),
    ];
    expect(ordonner(liste).map((e) => e.id)).toEqual(['a', 'b', 'fait-ce-matin', 'fait-hier']);
  });
});

describe('appliquer', () => {
  it('passer à « fait » note la date, quitter « fait » l’efface', () => {
    const fait = appliquer(element('x'), { statut: 'fait' });
    expect(fait.statut).toBe('fait');
    expect(fait.faitLe).not.toBeNull();
    expect(appliquer(fait, { statut: 'a_faire' }).faitLe).toBeNull();
  });

  it('rester « fait » garde la date d’origine', () => {
    const fait = element('x', { statut: 'fait', faitLe: '2026-11-01T00:00:00.000Z' });
    expect(appliquer(fait, { statut: 'fait' }).faitLe).toBe('2026-11-01T00:00:00.000Z');
  });

  it('ne touche que les champs donnés', () => {
    const apres = appliquer(element('x', { echeance: '2026-12-01' }), { titre: 'Nouveau' });
    expect(apres.titre).toBe('Nouveau');
    expect(apres.echeance).toBe('2026-12-01');
  });
});

describe('aujourdhui', () => {
  it('donne le jour local au format AAAA-MM-JJ', () => {
    expect(aujourdhui(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

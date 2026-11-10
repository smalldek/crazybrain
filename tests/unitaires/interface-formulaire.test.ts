// Le formulaire du panneau de détail et les adresses des éléments.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { adresseElement, adresseVue, elementDeLAdresse, vueDe } from '../../ui/chemins';
import { brouillonDe, changementsDepuis, parentsPossibles } from '../../ui/formulaire';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

describe('changementsDepuis', () => {
  it("n'envoie rien quand rien n'a changé", () => {
    const e = element('x', { priorite: 'haute', estimation: 30, description: 'texte' });
    expect(changementsDepuis(e, brouillonDe(e))).toEqual({});
  });

  it("n'envoie que les champs changés, et vide un champ effacé par null", () => {
    const e = element('x', { echeance: '2026-12-01', priorite: 'haute' });
    const b = { ...brouillonDe(e), echeance: '', estimation: '45', titre: '  Nouveau titre ' };
    expect(changementsDepuis(e, b)).toEqual({ echeance: null, estimation: 45, titre: 'Nouveau titre' });
  });

  it('refuse un titre vide et une estimation qui n’est pas un nombre entier de minutes', () => {
    const e = element('x');
    expect(changementsDepuis(e, { ...brouillonDe(e), titre: '   ' })).toBe('Le titre ne peut pas être vide.');
    expect(changementsDepuis(e, { ...brouillonDe(e), estimation: '1.5' })).toMatch(/entier de minutes/);
    expect(changementsDepuis(e, { ...brouillonDe(e), estimation: '0' })).toMatch(/entier de minutes/);
  });

  it('une description faite seulement d’espaces se vide', () => {
    const e = element('x', { description: 'avant' });
    expect(changementsDepuis(e, { ...brouillonDe(e), description: '  \n ' })).toEqual({ description: null });
  });
});

describe('parentsPossibles', () => {
  it("écarte l'élément lui-même et tout ce qu'il contient, et met les projets en tête", () => {
    const liste = [
      element('moi'),
      element('enfant', { parent: 'moi' }),
      element('petit-enfant', { parent: 'enfant' }),
      element('Zèbre'),
      element('Abeille'),
      element('Maison', { type: 'projet' }),
    ];
    expect(parentsPossibles('moi', liste).map((e) => e.id)).toEqual(['Maison', 'Abeille', 'Zèbre']);
  });
});

describe("l'adresse d'un élément", () => {
  it('va et revient', () => {
    expect(elementDeLAdresse(adresseElement('abc-123'))).toBe('abc-123');
    expect(elementDeLAdresse('/e/abc-123/')).toBe('abc-123');
  });

  it("ne trouve rien ailleurs ou sur une adresse cassée", () => {
    expect(elementDeLAdresse('/')).toBeNull();
    expect(elementDeLAdresse('/e/')).toBeNull();
    expect(elementDeLAdresse('/e/a/b')).toBeNull();
    expect(elementDeLAdresse('/e/%E0%A4%A')).toBeNull();
  });
});

describe('les vues', () => {
  it("le kanban a ses propres adresses, panneau compris", () => {
    expect(vueDe('/')).toBe('liste');
    expect(vueDe('/e/abc')).toBe('liste');
    expect(vueDe('/kanban')).toBe('kanban');
    expect(vueDe('/kanban/e/abc')).toBe('kanban');
    expect(vueDe('/kanbanx')).toBe('liste');
    expect(adresseElement('abc', 'kanban')).toBe('/kanban/e/abc');
    expect(elementDeLAdresse('/kanban/e/abc')).toBe('abc');
    expect(adresseVue('liste')).toBe('/');
    expect(adresseVue('kanban')).toBe('/kanban');
    expect(vueDe('/backlog/e/abc')).toBe('backlog');
    expect(elementDeLAdresse('/backlog/e/abc')).toBe('abc');
    expect(vueDe('/projets')).toBe('projets');
    expect(adresseElement('abc', 'projets')).toBe('/projets/e/abc');
    expect(elementDeLAdresse('/projets/e/abc')).toBe('abc');
  });
});

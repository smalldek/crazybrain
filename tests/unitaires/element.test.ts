// Règles de l'entité Element (une tâche, plus tard aussi un projet, un objectif…).
import { describe, expect, it } from 'vitest';
import { Echeance } from '../../src/domaine/echeance';
import { Element, lireStatut } from '../../src/domaine/element';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { Titre } from '../../src/domaine/titre';

const maintenant = new Date('2026-11-03T08:30:00.000Z');
const plusTard = new Date('2026-11-05T18:00:00.000Z');

function pain(): Element {
  return Element.creer({ id: 'el-1', titre: Titre.creer('Acheter du pain'), maintenant });
}

describe('Element', () => {
  it('se crée « à faire », sans échéance, créé et modifié maintenant', () => {
    const element = pain();

    expect(element.id).toBe('el-1');
    expect(element.titre.valeur).toBe('Acheter du pain');
    expect(element.statut).toBe('a_faire');
    expect(element.echeance).toBeNull();
    expect(element.faitLe).toBeNull();
    expect(element.creeLe).toEqual(maintenant);
    expect(element.modifieLe).toEqual(maintenant);
  });

  it('donne son instantané, une photo en données simples', () => {
    expect(pain().instantane()).toEqual({
      id: 'el-1',
      titre: 'Acheter du pain',
      statut: 'a_faire',
      echeance: null,
      faitLe: null,
      creeLe: '2026-11-03T08:30:00.000Z',
      modifieLe: '2026-11-03T08:30:00.000Z',
    });
  });

  it('se reconstitue depuis son instantané (relu en base)', () => {
    const element = pain().changerEcheance(Echeance.creer('2026-11-12'), plusTard).changerStatut('fait', plusTard);

    expect(Element.depuisInstantane(element.instantane()).instantane()).toEqual(element.instantane());
  });

  it('se renomme, et note l’heure de la modification', () => {
    const renomme = pain().renommer(Titre.creer('Acheter du pain complet'), plusTard);

    expect(renomme.titre.valeur).toBe('Acheter du pain complet');
    expect(renomme.modifieLe).toEqual(plusTard);
    expect(renomme.creeLe).toEqual(maintenant);
  });

  it('ne se modifie pas en place : chaque changement rend un nouvel élément', () => {
    const element = pain();
    element.renommer(Titre.creer('Autre chose'), plusTard);

    expect(element.titre.valeur).toBe('Acheter du pain');
  });

  it('passé à « fait », note quand ; revenu à « à faire », l’oublie', () => {
    const fait = pain().changerStatut('fait', plusTard);
    expect(fait.statut).toBe('fait');
    expect(fait.faitLe).toEqual(plusTard);

    const rouvert = fait.changerStatut('a_faire', new Date('2026-11-06T09:00:00.000Z'));
    expect(rouvert.statut).toBe('a_faire');
    expect(rouvert.faitLe).toBeNull();
  });

  it('« en cours » n’est pas « fait »', () => {
    const enCours = pain().changerStatut('en_cours', plusTard);

    expect(enCours.statut).toBe('en_cours');
    expect(enCours.faitLe).toBeNull();
  });

  it('reçoit une échéance, puis la perd', () => {
    const date = pain().changerEcheance(Echeance.creer('2026-11-12'), plusTard);
    expect(date.echeance?.valeur).toBe('2026-11-12');

    expect(date.changerEcheance(null, plusTard).echeance).toBeNull();
  });
});

describe('lireStatut', () => {
  it('reconnaît les trois statuts', () => {
    expect(lireStatut('a_faire')).toBe('a_faire');
    expect(lireStatut('en_cours')).toBe('en_cours');
    expect(lireStatut('fait')).toBe('fait');
  });

  it('refuse un statut inconnu', () => {
    expect(() => lireStatut('termine')).toThrow(ErreurDomaine);
  });
});

// Règles de l'entité Element (une tâche, plus tard aussi un projet, un objectif…).
import { describe, expect, it } from 'vitest';
import { Jour } from '../../src/domaine/jour';
import { Element, lireStatut } from '../../src/domaine/element';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { Heure } from '../../src/domaine/heure';
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
      type: 'tache',
      parent: null,
      titre: 'Acheter du pain',
      description: null,
      statut: 'a_faire',
      priorite: null,
      echeance: null,
      jourPlanifie: null,
      heurePlanifiee: null,
      estimation: null,
      rang: null,
      poids: null,
      avancement: null,
      faitLe: null,
      archiveLe: null,
      creeLe: '2026-11-03T08:30:00.000Z',
      modifieLe: '2026-11-03T08:30:00.000Z',
    });
  });

  it('se reconstitue depuis son instantané (relu en base)', () => {
    const element = pain().changerEcheance(Jour.creer('2026-11-12'), plusTard).changerStatut('fait', plusTard);

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
    const date = pain().changerEcheance(Jour.creer('2026-11-12'), plusTard);
    expect(date.echeance?.valeur).toBe('2026-11-12');

    expect(date.changerEcheance(null, plusTard).echeance).toBeNull();
  });
});

describe('Element : le reste du modèle (tâche 1.3)', () => {
  it('relit un instantané d’une forme ancienne, sans les champs récents', () => {
    const ancien = { id: 'el-1', titre: 'Vieux', statut: 'a_faire' as const, creeLe: maintenant.toISOString(), modifieLe: maintenant.toISOString() };

    const relu = Element.depuisInstantane(ancien).instantane();

    expect(relu).toMatchObject({ type: 'tache', parent: null, echeance: null, rang: null, faitLe: null });
  });

  it('refuse d’être son propre parent', () => {
    expect(() => pain().changerParent('el-1', plusTard)).toThrow(ErreurDomaine);
  });

  it('refuse une heure planifiée sans jour planifié', () => {
    expect(() => pain().planifier(null, Heure.creer('09:30'), plusTard)).toThrow(ErreurDomaine);
  });

  it('se planifie un jour, avec ou sans heure', () => {
    const planifie = pain().planifier(Jour.creer('2026-11-10'), Heure.creer('09:30'), plusTard);

    expect(planifie.instantane()).toMatchObject({ jourPlanifie: '2026-11-10', heurePlanifiee: '09:30' });
  });

  it('refuse un rang qui n’est pas un nombre fini', () => {
    expect(() => pain().changer({ rang: Number.NaN }, plusTard)).toThrow(ErreurDomaine);
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

describe('Element : archiver (tâche 1.5)', () => {
  it('s’archive en notant quand, et se restaure', () => {
    const archive = pain().archiver(plusTard);
    expect(archive.archiveLe).toEqual(plusTard);
    expect(archive.instantane().archiveLe).toBe(plusTard.toISOString());

    const restaure = archive.restaurer(new Date('2026-11-06T09:00:00.000Z'));
    expect(restaure.archiveLe).toBeNull();
  });

  it('refuse d’archiver deux fois, ou de restaurer ce qui ne l’est pas', () => {
    expect(() => pain().archiver(plusTard).archiver(plusTard)).toThrow(ErreurDomaine);
    expect(() => pain().restaurer(plusTard)).toThrow(ErreurDomaine);
  });
});

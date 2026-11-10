// Les filtres de l'écran et le backlog.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { avecFiltre, backlog, filtrer, idsDeRequete, lireFiltres, nombreDeFiltres, parModification } from '../../ui/filtres';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

const ids = (liste: readonly Element[]): string[] => liste.map((e) => e.id);

describe('les filtres dans l’adresse', () => {
  it('se lisent, ignorent le vide et les inconnus, et se changent un par un', () => {
    const p = new URLSearchParams('tag=composant:pxe&priorite=&inconnu=x&couloirs=parent');
    expect(lireFiltres(p)).toEqual({ tag: 'composant:pxe' });
    const q = avecFiltre(p, 'type', 'projet');
    expect(lireFiltres(q)).toEqual({ tag: 'composant:pxe', type: 'projet' });
    expect(q.get('couloirs')).toBe('parent');
    expect(lireFiltres(avecFiltre(q, 'tag', null))).toEqual({ type: 'projet' });
    expect(nombreDeFiltres({ texte: 'x', tag: 'a', type: 'b' })).toBe(2);
  });
});

describe('filtrer', () => {
  const elements = [
    element('pxe', { titre: 'Flasher le PXE', priorite: 'haute' }),
    element('dns', { titre: 'Régler le DNS', description: 'Éléphant rose' }),
    element('projet', { type: 'projet', titre: 'Réseau' }),
    element('sous', { type: 'projet', parent: 'projet' }),
    element('profond', { parent: 'sous', echeance: '2026-11-01' }),
    element('bientot', { echeance: '2026-11-10' }),
    element('fini', { statut: 'fait', echeance: '2026-10-01' }),
  ];
  const tags = new Map<string, string[]>([['pxe', ['composant:pxe']], ['dns', ['composant:dns', 'urgent']]]);
  const passe = (f: Parameters<typeof filtrer>[1]): string[] => ids(filtrer(elements, f, tags, '2026-11-05'));

  it('par tag : la clé seule prend toutes les valeurs, cle:valeur est exact', () => {
    expect(passe({ tag: 'composant:pxe' })).toEqual(['pxe']);
    expect(passe({ tag: 'composant' })).toEqual(['pxe', 'dns']);
    expect(passe({ tag: 'urgent' })).toEqual(['dns']);
  });

  it('par texte, sans majuscules ni accents, dans le titre et la description', () => {
    expect(passe({ texte: 'reseau' })).toEqual(['projet']);
    expect(passe({ texte: 'ELEPHANT' })).toEqual(['dns']);
  });

  it('par type, statut, priorité (aucune comprise)', () => {
    expect(passe({ type: 'projet' })).toEqual(['projet', 'sous']);
    expect(passe({ statut: 'fait' })).toEqual(['fini']);
    expect(passe({ priorite: 'haute' })).toEqual(['pxe']);
    expect(passe({ priorite: 'aucune' })).not.toContain('pxe');
  });

  it('dans un élément : tout ce qu’il contient, à toute profondeur, sans lui-même', () => {
    expect(passe({ dans: 'projet' })).toEqual(['sous', 'profond']);
  });

  it('par échéance : en retard, d’ici une semaine, sans ; une tâche faite n’est jamais en retard', () => {
    expect(passe({ echeance: 'en_retard' })).toEqual(['profond']);
    expect(passe({ echeance: 'semaine' })).toEqual(['profond', 'bientot']);
    expect(passe({ echeance: 'sans' })).toEqual(['pxe', 'dns', 'projet', 'sous']);
  });

  it('les filtres se cumulent', () => {
    expect(passe({ tag: 'composant', priorite: 'haute' })).toEqual(['pxe']);
  });
});

describe('backlog', () => {
  it('ni fait ni planifié, par priorité, puis échéance, puis du plus ancien', () => {
    const liste = [
      element('sans-prio-ancien', { creeLe: '2026-11-01T00:00:00.000Z' }),
      element('sans-prio-recent', { creeLe: '2026-11-04T00:00:00.000Z' }),
      element('basse', { priorite: 'basse' }),
      element('urgente-loin', { priorite: 'urgente', echeance: '2026-12-01' }),
      element('urgente-proche', { priorite: 'urgente', echeance: '2026-11-07' }),
      element('planifiee', { priorite: 'urgente', jourPlanifie: '2026-11-06' }),
      element('faite', { priorite: 'urgente', statut: 'fait' }),
    ];
    expect(ids(backlog(liste))).toEqual(['urgente-proche', 'urgente-loin', 'basse', 'sans-prio-ancien', 'sans-prio-recent']);
  });
});

describe('le tri « modifié récemment » (tâche 3.9)', () => {
  it('met le plus récemment modifié en haut, et à égalité le plus récemment créé', () => {
    const liste = [
      element('neuve', { creeLe: '2026-11-08T08:00:00.000Z', modifieLe: '2026-11-08T08:00:00.000Z' }),
      element('jumelle', { creeLe: '2026-11-02T08:00:00.000Z', modifieLe: '2026-11-08T08:00:00.000Z' }),
      element('ancienne', { creeLe: '2026-11-01T08:00:00.000Z', modifieLe: '2026-11-09T08:00:00.000Z' }),
    ];
    expect(ids(parModification(liste))).toEqual(['ancienne', 'neuve', 'jumelle']);
    expect(ids(liste)).toEqual(['neuve', 'jumelle', 'ancienne']); // la liste reçue n'est pas touchée
  });

  it('vit dans l’adresse sans compter comme un filtre ni rien cacher', () => {
    const f = lireFiltres(new URLSearchParams('tri=modifie&tag=a'));
    expect(f).toEqual({ tri: 'modifie', tag: 'a' });
    expect(nombreDeFiltres(f)).toBe(1);
    expect(ids(filtrer([element('x')], { tri: 'modifie' }, new Map(), '2026-11-10'))).toEqual(['x']);
  });
});

describe('le filtre « Requête de Claude » (tâche 4.3)', () => {
  const liste = [element('a'), element('b'), element('c')];

  it('garde les éléments dont la requête rend l’id, et compte comme un filtre', () => {
    const f = lireFiltres(new URLSearchParams('requete=r1'));
    expect(nombreDeFiltres(f)).toBe(1);
    expect(ids(filtrer(liste, f, new Map(), '2026-11-10', new Set(['a', 'c', 'inconnu'])))).toEqual(['a', 'c']);
  });

  it('ne filtre pas tant que les lignes ne sont pas lues', () => {
    expect(ids(filtrer(liste, { requete: 'r1' }, new Map(), '2026-11-10', null))).toEqual(['a', 'b', 'c']);
  });

  it('lit la colonne id ; sans elle, la requête ne choisit pas d’éléments', () => {
    expect(idsDeRequete({ colonnes: ['id', 'titre'], lignes: [{ id: 'a', titre: 'A' }, { id: 7, titre: 'x' }], tronque: false })).toEqual(new Set(['a']));
    expect(idsDeRequete({ colonnes: ['n'], lignes: [{ n: 3 }], tronque: false })).toBeNull();
    expect(idsDeRequete({ colonnes: [], lignes: [], tronque: false })).toEqual(new Set());
  });
});

// Liens, tags et commentaires (tâche 1.3) : leurs règles propres.
import { describe, expect, it } from 'vitest';
import { creerCommentaire } from '../../src/domaine/commentaire';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { evenementDe } from '../../src/domaine/evenement';
import { creerLien } from '../../src/domaine/lien';
import { Tag } from '../../src/domaine/tag';

const maintenant = new Date('2026-11-05T22:00:00.000Z');

describe('Lien', () => {
  it('relie deux éléments par un type connu', () => {
    expect(creerLien({ id: 'l-1', source: 't-1', cible: 'p-1', type: 'appartient_a', maintenant })).toEqual({
      id: 'l-1', source: 't-1', cible: 'p-1', type: 'appartient_a', creeLe: '2026-11-05T22:00:00.000Z',
    });
  });

  it('refuse un type inconnu et un lien vers soi-même', () => {
    expect(() => creerLien({ id: 'l-1', source: 't-1', cible: 'p-1', type: 'parent_de', maintenant })).toThrow(ErreurDomaine);
    expect(() => creerLien({ id: 'l-1', source: 't-1', cible: 't-1', type: 'lie_a', maintenant })).toThrow(ErreurDomaine);
  });
});

describe('Tag', () => {
  it('lit « cle:valeur », la clé en minuscules', () => {
    const tag = Tag.lire('Composant:PXE');
    expect([tag.cle, tag.valeur]).toEqual(['composant', 'PXE']);
    expect(tag.texte()).toBe('composant:PXE');
  });

  it('une étiquette simple est une clé sans valeur', () => {
    expect(Tag.lire('urgent').texte()).toBe('urgent');
  });

  it('la valeur peut contenir des « : »', () => {
    expect(Tag.lire('heure:10:30').valeur).toBe('10:30');
  });

  it('refuse une clé avec espace ou accent, et « projet » (c’est un lien)', () => {
    expect(() => Tag.lire('mon tag:x')).toThrow(ErreurDomaine);
    expect(() => Tag.lire('équipe:a')).toThrow(ErreurDomaine);
    expect(() => Tag.lire('projet:maison')).toThrow(ErreurDomaine);
  });
});

describe('Commentaire', () => {
  it('garde le texte nettoyé, l’auteur et la date', () => {
    expect(creerCommentaire({ id: 'c-1', elementId: 't-1', texte: '  Fait **à moitié**. ', auteur: 'claude', maintenant })).toEqual({
      id: 'c-1', elementId: 't-1', texte: 'Fait **à moitié**.', auteur: 'claude', creeLe: '2026-11-05T22:00:00.000Z',
    });
  });

  it('refuse un commentaire vide', () => {
    expect(() => creerCommentaire({ id: 'c-1', elementId: 't-1', texte: '  ', auteur: 'adrien', maintenant })).toThrow(ErreurDomaine);
  });
});

describe('evenementDe', () => {
  it('raconte un ajout : avant vide, après la donnée', () => {
    const tag = { elementId: 't-1', cle: 'release', valeur: 'v1' };
    expect(evenementDe({ id: 'e-1', elementId: 't-1', type: 'tag_ajoute', avant: null, apres: tag, auteur: 'adrien', maintenant }))
      .toEqual({ id: 'e-1', elementId: 't-1', type: 'tag_ajoute', versionForme: 6, avant: null, apres: tag, auteur: 'adrien', date: '2026-11-05T22:00:00.000Z' });
  });
});

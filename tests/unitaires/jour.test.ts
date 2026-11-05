// Règles de l'objet-valeur Jour : un jour du calendrier, sans heure (échéance, jour planifié).
import { describe, expect, it } from 'vitest';
import { Jour } from '../../src/domaine/jour';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';

describe('Jour', () => {
  it('garde un jour au format AAAA-MM-JJ', () => {
    expect(Jour.creer('2026-11-12').valeur).toBe('2026-11-12');
  });

  it('accepte le 29 février d’une année bissextile', () => {
    expect(Jour.creer('2028-02-29').valeur).toBe('2028-02-29');
  });

  it('refuse un jour qui n’existe pas', () => {
    expect(() => Jour.creer('2026-02-30')).toThrow(ErreurDomaine);
    expect(() => Jour.creer('2026-13-01')).toThrow(ErreurDomaine);
  });

  it('refuse un autre format (heure comprise)', () => {
    expect(() => Jour.creer('12/11/2026')).toThrow(ErreurDomaine);
    expect(() => Jour.creer('2026-11-12T08:00:00Z')).toThrow(ErreurDomaine);
    expect(() => Jour.creer('')).toThrow(ErreurDomaine);
  });

  it('se compare par sa valeur', () => {
    expect(Jour.creer('2026-11-12').egale(Jour.creer('2026-11-12'))).toBe(true);
    expect(Jour.creer('2026-11-12').egale(Jour.creer('2026-11-13'))).toBe(false);
  });
});

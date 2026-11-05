// Règles de l'objet-valeur Echeance : un jour du calendrier, sans heure.
import { describe, expect, it } from 'vitest';
import { Echeance } from '../../src/domaine/echeance';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';

describe('Echeance', () => {
  it('garde un jour au format AAAA-MM-JJ', () => {
    expect(Echeance.creer('2026-11-12').valeur).toBe('2026-11-12');
  });

  it('accepte le 29 février d’une année bissextile', () => {
    expect(Echeance.creer('2028-02-29').valeur).toBe('2028-02-29');
  });

  it('refuse un jour qui n’existe pas', () => {
    expect(() => Echeance.creer('2026-02-30')).toThrow(ErreurDomaine);
    expect(() => Echeance.creer('2026-13-01')).toThrow(ErreurDomaine);
  });

  it('refuse un autre format (heure comprise)', () => {
    expect(() => Echeance.creer('12/11/2026')).toThrow(ErreurDomaine);
    expect(() => Echeance.creer('2026-11-12T08:00:00Z')).toThrow(ErreurDomaine);
    expect(() => Echeance.creer('')).toThrow(ErreurDomaine);
  });

  it('se compare par sa valeur', () => {
    expect(Echeance.creer('2026-11-12').egale(Echeance.creer('2026-11-12'))).toBe(true);
    expect(Echeance.creer('2026-11-12').egale(Echeance.creer('2026-11-13'))).toBe(false);
  });
});

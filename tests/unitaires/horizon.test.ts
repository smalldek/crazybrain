// L'horizon : lu en forme rangée ou en français, ses bornes, et la période d'à côté.
import { describe, expect, it } from 'vitest';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { Horizon } from '../../src/domaine/horizon';

const AUJ = '2026-11-10'; // un mardi, semaine 46
const lu = (texte: string): string => Horizon.lire(texte, AUJ).texte;

describe('Horizon.lire', () => {
  it('lit les formes rangées', () => {
    expect(lu('2026-11-10')).toBe('2026-11-10');
    expect(lu('2026-S46')).toBe('2026-S46');
    expect(lu('2026-w3')).toBe('2026-S03');
    expect(lu('2026-11')).toBe('2026-11');
    expect(lu('2026-T4')).toBe('2026-T4');
    expect(lu('2026-q1')).toBe('2026-T1');
    expect(lu('2027')).toBe('2027');
    expect(lu('2030-2039')).toBe('2030-2039');
    expect(lu('vie')).toBe('vie');
  });

  it('lit le français, sans majuscules ni accents', () => {
    expect(lu('Semaine 45')).toBe('2026-S45');
    expect(lu('s2 2027')).toBe('2027-S02');
    expect(lu('Novembre')).toBe('2026-11');
    expect(lu('février 2027')).toBe('2027-02');
    expect(lu('T4')).toBe('2026-T4');
    expect(lu('1er trimestre 2027')).toBe('2027-T1');
    expect(lu('années 2030')).toBe('2030-2039');
    expect(lu('2020s')).toBe('2020-2029');
    expect(lu('Un jour')).toBe('vie');
  });

  it('compte les formes relatives depuis aujourd’hui', () => {
    expect(lu('demain')).toBe('2026-11-11');
    expect(lu('cette semaine')).toBe('2026-S46');
    expect(lu('la semaine prochaine')).toBe('2026-S47');
    expect(lu('le mois prochain')).toBe('2026-12');
    expect(lu('trimestre prochain')).toBe('2027-T1');
    expect(lu("l'an prochain")).toBe('2027');
    expect(lu('cette décennie')).toBe('2020-2029');
  });

  it('refuse ce qui n’existe pas ou ne se comprend pas', () => {
    for (const faux of ['2026-02-30', '2026-13', '2026-S54', 'semaine 0', 'bientôt', '2026-T5']) {
      expect(() => Horizon.lire(faux, AUJ), faux).toThrow(ErreurDomaine);
    }
    expect(lu('2026-S53')).toBe('2026-S53'); // 2026 a 53 semaines ISO
    expect(() => Horizon.lire('2027-S53', AUJ)).toThrow(ErreurDomaine);
  });
});

describe('semaines ISO', () => {
  it('la semaine d’un jour suit son jeudi, même à cheval sur deux années', () => {
    expect(Horizon.contenant('semaine', '2027-01-01').texte).toBe('2026-S53');
    expect(Horizon.contenant('semaine', '2024-12-30').texte).toBe('2025-S01');
    expect(Horizon.lire('2025-S01', AUJ).debut).toBe('2024-12-30');
  });
});

describe('debut, decaler, libelle', () => {
  it('donne le premier jour, la période d’à côté, et le texte lisible', () => {
    const t = Horizon.lire('2026-T4', AUJ);
    expect(t.debut).toBe('2026-10-01');
    expect(t.decaler(1).texte).toBe('2027-T1');
    expect(t.decaler(-4).texte).toBe('2025-T4');
    expect(t.libelle).toBe('4e trimestre 2026');
    expect(Horizon.lire('2026-S53', AUJ).decaler(1).texte).toBe('2027-S01');
    expect(Horizon.lire('2026-12', AUJ).decaler(1).libelle).toBe('janvier 2027');
    expect(Horizon.lire('2020-2029', AUJ).decaler(1).libelle).toBe('années 2030');
    expect(Horizon.lire('semaine 46', AUJ).libelle).toBe('semaine 46 (2026)');
    expect(Horizon.lire('vie', AUJ).decaler(3).libelle).toBe('un jour');
    expect(Horizon.lire('2026-11-10', AUJ).libelle).toBe('10 novembre 2026');
  });
});

// Le journal des échanges de connexion du connecteur : ce qu'il garde, et surtout ce qu'il ne garde pas.
import { describe, expect, it } from 'vitest';
import { aJournaliser, appelantDe, cleJournal, erreurOAuth } from '../../src/connecteur/journal-oauth';

describe('aJournaliser', () => {
  it('note les adresses OAuth et la découverte, toujours', () => {
    for (const chemin of ['/token', '/register', '/authorize', '/.well-known/oauth-authorization-server']) {
      expect(aJournaliser(chemin, 200)).toBe(true);
    }
  });

  it('ne note /mcp que quand il refuse, et jamais la page ni l’API', () => {
    expect(aJournaliser('/mcp', 200)).toBe(false);
    expect(aJournaliser('/mcp', 401)).toBe(true);
    expect(aJournaliser('/api/elements', 500)).toBe(false);
    expect(aJournaliser('/', 200)).toBe(false);
  });
});

describe('erreurOAuth', () => {
  it('garde le code et la description de l’erreur, rien d’autre', () => {
    expect(erreurOAuth('{"error":"invalid_grant","error_description":"Grant not found","access_token":"x"}'))
      .toBe('invalid_grant : Grant not found');
    expect(erreurOAuth('{"error":"invalid_client"}')).toBe('invalid_client');
  });

  it('ne rend rien pour un corps qui n’est pas une erreur OAuth', () => {
    expect(erreurOAuth('{"access_token":"secret"}')).toBeUndefined();
    expect(erreurOAuth('<html>')).toBeUndefined();
  });
});

describe('appelantDe et cleJournal', () => {
  it('garde le premier mot du User-Agent, coupé', () => {
    expect(appelantDe('python-httpx/0.27.0 extra')).toBe('python-httpx/0.27.0');
    expect(appelantDe(null)).toBeUndefined();
    expect(appelantDe('x'.repeat(100))).toHaveLength(60);
  });

  it('range les lignes par date', () => {
    expect(cleJournal('2026-11-06T22:00:00.000Z', 'ab12')).toBe('journal:2026-11-06T22:00:00.000Z:ab12');
  });
});

// « Aujourd'hui » se compte au jour de Paris, pas au jour UTC du Worker.
import { describe, expect, it } from 'vitest';
import { aujourdhuiAParis } from '../../src/application/aujourdhui';

describe('aujourdhuiAParis', () => {
  it('à 23 h 30 UTC en hiver, il est déjà le lendemain à Paris', () => {
    expect(aujourdhuiAParis(new Date('2026-11-05T23:30:00Z'))).toBe('2026-11-06');
  });

  it('à 22 h 30 UTC en été, il est déjà le lendemain à Paris (UTC+2)', () => {
    expect(aujourdhuiAParis(new Date('2026-07-14T22:30:00Z'))).toBe('2026-07-15');
  });

  it('en journée, même jour', () => {
    expect(aujourdhuiAParis(new Date('2026-11-05T12:00:00Z'))).toBe('2026-11-05');
  });
});

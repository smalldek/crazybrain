// La reprise après expiration de la connexion Access (tâche 5.2).
import { describe, expect, it } from 'vitest';
import { DELAI_SANS_BOUCLE_MS, quoiFaire } from '../../ui/connexion';

describe('quoiFaire après un échec de connexion', () => {
  it('recharge la page si aucun rechargement automatique récent', () => {
    expect(quoiFaire(null, 1_000_000)).toBe('recharger');
    expect(quoiFaire(1_000_000 - DELAI_SANS_BOUCLE_MS, 1_000_000)).toBe('recharger');
  });

  it('propose un bouton si on vient de recharger : pas de boucle', () => {
    expect(quoiFaire(1_000_000 - 5_000, 1_000_000)).toBe('proposer');
  });
});

// La reprise après expiration de la connexion Cloudflare Access (tâche 5.2), sans React : testée
// seule (tests/unitaires/interface-connexion.test.ts).
//
// Quand la session Access expire, les appels à l'API ne rendent plus de données : Access répond par
// sa page de connexion, ou une redirection que le navigateur bloque, ou le Worker par un 403. La
// page ne peut pas se reconnecter par un simple appel : il faut que le navigateur recharge la page,
// Access fait alors la connexion Google (souvent sans rien demander) et revient. On recharge donc
// tout seul, une fois ; si ça échoue encore juste après, on ne boucle pas : on propose un bouton.

/** L'API ne rend plus de données parce que la connexion Access a expiré (ou le réseau manque). */
export class ErreurConnexion extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurConnexion';
  }
}

/** Le délai sous lequel un second échec, après un rechargement automatique, ne recharge plus. */
export const DELAI_SANS_BOUCLE_MS = 60_000;

/** Ce qu'on fait d'un échec de connexion, selon le dernier rechargement automatique (en ms, ou null). */
export function quoiFaire(dernierRechargement: number | null, maintenant: number): 'recharger' | 'proposer' {
  return dernierRechargement !== null && maintenant - dernierRechargement < DELAI_SANS_BOUCLE_MS ? 'proposer' : 'recharger';
}

const CLE = 'crazybrain:rechargement-connexion';

/** Lit et écrit l'heure du dernier rechargement automatique (sessionStorage peut manquer : on fait sans). */
export const memoire = {
  lire(): number | null {
    try {
      const v = sessionStorage.getItem(CLE);
      return v === null ? null : Number(v);
    } catch {
      return null;
    }
  },
  ecrire(quand: number): void {
    try { sessionStorage.setItem(CLE, String(quand)); } catch { /* sans mémoire, on rechargera au plus une fois par échec */ }
  },
};

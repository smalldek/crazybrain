// Le journal des échanges de connexion du connecteur (OAuth) : pour comprendre, sans les journaux de
// Cloudflare, pourquoi claude.ai perd la connexion. Chaque appel aux adresses OAuth (et chaque refus
// de /mcp) laisse une ligne dans l'espace KV du connecteur, gardée 7 jours, lue par le flux
// « Lire le journal du connecteur » (.github/workflows/journal-connecteur.yml).
// Le dépôt et ses journaux d'Actions sont publics : une ligne ne garde ni jeton, ni code, ni
// identifiant de client, ni adresse IP. Seulement : quand, quoi, la réponse, et l'erreur OAuth.

/** Une ligne du journal. */
export interface EntreeJournal {
  readonly quand: string;
  readonly methode: string;
  readonly chemin: string;
  readonly statut: number;
  /** Pour /token : authorization_code ou refresh_token. */
  readonly typeDemande?: string;
  /** Le code d'erreur OAuth (invalid_grant…) et sa description, quand la réponse est un refus. */
  readonly erreur?: string;
  /** Qui appelle, en gros : le premier mot de l'en-tête User-Agent (« python-httpx/0.27 », « Mozilla/5.0 »). */
  readonly appelant?: string;
}

/** Durée de vie d'une ligne : 7 jours. */
export const DUREE_JOURNAL_SECONDES = 7 * 24 * 3600;

const CHEMINS_OAUTH = ['/token', '/register', '/authorize'];

/**
 * Faut-il noter cet appel ? Les adresses OAuth toujours ; la découverte (/.well-known/…) toujours ;
 * /mcp seulement quand il refuse (un 401 dit que claude.ai n'a pas, ou plus, de jeton valable).
 */
export function aJournaliser(chemin: string, statut: number): boolean {
  if (CHEMINS_OAUTH.includes(chemin) || chemin.startsWith('/.well-known/')) return true;
  return (chemin === '/mcp' || chemin.startsWith('/mcp/')) && statut >= 400;
}

/** L'erreur OAuth d'un corps de réponse JSON (`{"error": "...", "error_description": "..."}`), sans le reste. */
export function erreurOAuth(corps: string): string | undefined {
  try {
    const lu: unknown = JSON.parse(corps);
    if (typeof lu !== 'object' || lu === null) return undefined;
    const { error, error_description: description } = lu as { error?: unknown; error_description?: unknown };
    if (typeof error !== 'string') return undefined;
    return typeof description === 'string' ? `${error} : ${description.slice(0, 300)}` : error;
  } catch {
    return undefined;
  }
}

/** Le premier mot d'un User-Agent, coupé à 60 caractères. */
export function appelantDe(userAgent: string | null): string | undefined {
  const mot = userAgent?.trim().split(/\s+/)[0];
  return mot ? mot.slice(0, 60) : undefined;
}

/** Une clé triée par date, unique : `journal:<date ISO>:<hasard>`. */
export function cleJournal(quand: string, hasard: string): string {
  return `journal:${quand}:${hasard}`;
}

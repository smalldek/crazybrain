// Un faux claude.ai : il fait, contre le Worker local, ce que fait le connecteur de claude.ai
// (enregistrement dynamique, autorisation avec PKCE, échange du code, appels MCP).
import { createHash, randomBytes } from 'node:crypto';

/** L'adresse de retour que claude.ai enregistre pour ses connecteurs. */
export const RETOUR_CLAUDE = 'https://claude.ai/api/mcp/auth_callback';

function base64url(octets: Buffer): string {
  return octets.toString('base64url');
}

export class ClientOAuth {
  /**
   * PKCE (« Proof Key for Code Exchange ») : le client invente un secret (le vérificateur), n'envoie
   * à /authorize que son empreinte SHA-256 (le défi), puis le secret lui-même à /token. Quelqu'un
   * qui intercepterait le code ne pourrait pas l'échanger sans ce secret.
   */
  readonly verificateur = base64url(randomBytes(32));
  readonly etat = base64url(randomBytes(16));
  code: string | undefined;

  private constructor(private readonly adresse: string, readonly idClient: string) {}

  static async enregistrer(adresse: string): Promise<ClientOAuth> {
    const reponse = await fetch(`${adresse}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Claude (test)',
        redirect_uris: [RETOUR_CLAUDE],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });
    const corps = (await reponse.json()) as { client_id?: string };
    if (reponse.status !== 201 || !corps.client_id) {
      throw new Error(`Enregistrement refusé (${reponse.status}) : ${JSON.stringify(corps)}`);
    }
    return new ClientOAuth(adresse, corps.client_id);
  }

  get ressource(): string {
    return `${this.adresse}/mcp`;
  }

  adresseAutorisation(): string {
    const defi = base64url(createHash('sha256').update(this.verificateur).digest());
    const parametres = new URLSearchParams({
      response_type: 'code',
      client_id: this.idClient,
      redirect_uri: RETOUR_CLAUDE,
      code_challenge: defi,
      code_challenge_method: 'S256',
      state: this.etat,
      resource: this.ressource,
    });
    return `${this.adresse}/authorize?${parametres}`;
  }

  /** Échange le code reçu au retour de /authorize contre un jeton d'accès. */
  async echangerCode(): Promise<string> {
    if (!this.code) throw new Error("Pas de code d'autorisation à échanger.");
    const reponse = await fetch(`${this.adresse}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: this.code,
        redirect_uri: RETOUR_CLAUDE,
        client_id: this.idClient,
        code_verifier: this.verificateur,
        resource: this.ressource,
      }),
    });
    const corps = (await reponse.json()) as { access_token?: string };
    if (reponse.status !== 200 || !corps.access_token) {
      throw new Error(`Échange refusé (${reponse.status}) : ${JSON.stringify(corps)}`);
    }
    return corps.access_token;
  }
}

/** Les cookies posés par une réponse, prêts à être renvoyés (« nom=valeur; nom=valeur »). */
export function cookiesDe(reponse: Response): string {
  return reponse.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

/** Un appel JSON-RPC au serveur MCP, comme le fait claude.ai. */
export async function appelMcp(
  adresse: string,
  jeton: string | undefined,
  methode: string,
  parametres: Record<string, unknown> = {},
): Promise<Response> {
  const entetes: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (jeton) entetes.authorization = `Bearer ${jeton}`;
  return fetch(`${adresse}/mcp`, {
    method: 'POST',
    headers: entetes,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: methode, params: parametres }),
  });
}

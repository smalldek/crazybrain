// Une fausse équipe Cloudflare Access pour les tests : une paire de clés créée à chaque lancement,
// et un petit serveur local qui publie la clé publique là où le Worker va la chercher.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

export const AUDIENCE_DE_TEST = 'aud-de-test';
const KID = 'cle-de-test';

type ClePrivee = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

export class SerrureDeTest {
  private constructor(
    private readonly serveur: Server,
    private readonly clePrivee: ClePrivee,
    /** L'adresse de la fausse équipe, passée au Worker comme TEAM_DOMAIN (c'est aussi l'émetteur des jetons). */
    public readonly emetteur: string,
  ) {}

  static async demarrer(): Promise<SerrureDeTest> {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const publique = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256', use: 'sig' };
    const serveur = createServer((requete, reponse) => {
      if (requete.url === '/cdn-cgi/access/certs') {
        reponse.writeHead(200, { 'content-type': 'application/json' });
        reponse.end(JSON.stringify({ keys: [publique] }));
      } else {
        reponse.writeHead(404).end();
      }
    });
    await new Promise<void>((pret) => serveur.listen(0, '127.0.0.1', pret));
    const { port } = serveur.address() as AddressInfo;
    return new SerrureDeTest(serveur, privateKey, `http://127.0.0.1:${port}`);
  }

  /** Un jeton comme celui qu'Access transmet après la connexion Google. */
  jeton(cle: ClePrivee = this.clePrivee): Promise<string> {
    return new SignJWT({ email: 'personne@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuer(this.emetteur)
      .setAudience(AUDIENCE_DE_TEST)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(cle);
  }

  /** Un jeton bien formé, mais signé par une clé que l'équipe ne publie pas. */
  async jetonEtranger(): Promise<string> {
    const { privateKey } = await generateKeyPair('RS256');
    return this.jeton(privateKey);
  }

  arreter(): Promise<void> {
    return new Promise((fini) => this.serveur.close(() => fini()));
  }
}

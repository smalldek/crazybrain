// La deuxième serrure : le Worker n'accepte que les jetons signés par Cloudflare Access pour cette application.
// Les jetons sont signés ici par une fausse paire de clés, créée pour le test.
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { jetonAccessValide } from '../../src/acces/jeton-access';

const EMETTEUR = 'https://equipe-de-test.cloudflareaccess.com';
const AUDIENCE = 'aud-de-test';

type Cle = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let clePrivee: Cle;
let autreClePrivee: Cle;
let cles: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const paire = await generateKeyPair('RS256');
  clePrivee = paire.privateKey;
  autreClePrivee = (await generateKeyPair('RS256')).privateKey;
  const publique: JWK = { ...(await exportJWK(paire.publicKey)), kid: 'cle-1', alg: 'RS256' };
  cles = createLocalJWKSet({ keys: [publique] });
});

function jeton(options: { audience?: string; emetteur?: string; expireDans?: string; cle?: Cle } = {}) {
  return new SignJWT({ email: 'personne@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'cle-1' })
    .setIssuer(options.emetteur ?? EMETTEUR)
    .setAudience(options.audience ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(options.expireDans ?? '5m')
    .sign(options.cle ?? clePrivee);
}

const attendu = { audience: AUDIENCE, emetteur: EMETTEUR };

describe('jetonAccessValide', () => {
  it('accepte un jeton signé, pour la bonne audience, non expiré', async () => {
    expect(await jetonAccessValide(await jeton(), cles, attendu)).toBe(true);
  });

  it('refuse l’absence de jeton', async () => {
    expect(await jetonAccessValide(undefined, cles, attendu)).toBe(false);
    expect(await jetonAccessValide('', cles, attendu)).toBe(false);
  });

  it('refuse un texte qui n’est pas un jeton', async () => {
    expect(await jetonAccessValide('pas-un-jeton', cles, attendu)).toBe(false);
  });

  it('refuse un jeton d’une autre application (audience)', async () => {
    expect(await jetonAccessValide(await jeton({ audience: 'autre-aud' }), cles, attendu)).toBe(false);
  });

  it('refuse un jeton d’une autre équipe Access (émetteur)', async () => {
    const etranger = await jeton({ emetteur: 'https://autre.cloudflareaccess.com' });
    expect(await jetonAccessValide(etranger, cles, attendu)).toBe(false);
  });

  it('refuse un jeton expiré', async () => {
    expect(await jetonAccessValide(await jeton({ expireDans: '-1m' }), cles, attendu)).toBe(false);
  });

  it('refuse un jeton signé par une autre clé', async () => {
    expect(await jetonAccessValide(await jeton({ cle: autreClePrivee }), cles, attendu)).toBe(false);
  });

  it('refuse un jeton sans date d’expiration', async () => {
    const sansExpiration = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'cle-1' })
      .setIssuer(EMETTEUR)
      .setAudience(AUDIENCE)
      .sign(clePrivee);
    expect(await jetonAccessValide(sansExpiration, cles, attendu)).toBe(false);
  });

  it('refuse tout si l’audience attendue n’est pas réglée', async () => {
    expect(await jetonAccessValide(await jeton({ audience: '' }), cles, { ...attendu, audience: '' })).toBe(false);
  });
});

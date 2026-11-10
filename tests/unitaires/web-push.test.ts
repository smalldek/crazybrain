// Le chiffrement et la signature de Web Push, vérifiés par une autre implémentation : http_ece (la
// bibliothèque de Mozilla qui déchiffre comme le fait le navigateur) et le module crypto de Node.
import { createECDH, createPublicKey, randomBytes, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { chiffrer, depuisBase64url, enteteVapid, nouvellesClesVapid, requetePush, versBase64url } from '../../src/infra/web-push';
import ece from 'http_ece';

/** Un « téléphone » : sa paire de clés ECDH et son secret, comme les tire le navigateur à l'abonnement. */
function telephone() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, auth, abonnement: { endpoint: 'https://push.exemple.org/abc', p256dh: versBase64url(ecdh.getPublicKey()), auth: versBase64url(auth) } };
}

describe('le chiffrement du message (RFC 8291)', () => {
  it('le téléphone le déchiffre avec ses clés', async () => {
    const t = telephone();
    const chiffre = await chiffrer(new TextEncoder().encode('{"titre":"Payer la cantine"}'), t.abonnement);
    const clair = ece.decrypt(Buffer.from(chiffre), { version: 'aes128gcm', privateKey: t.ecdh, authSecret: t.auth });
    expect(clair.toString()).toBe('{"titre":"Payer la cantine"}');
  });

  it('un autre téléphone ne le déchiffre pas', async () => {
    const t = telephone();
    const autre = telephone();
    const chiffre = await chiffrer(new TextEncoder().encode('secret'), t.abonnement);
    expect(() => ece.decrypt(Buffer.from(chiffre), { version: 'aes128gcm', privateKey: autre.ecdh, authSecret: autre.auth })).toThrow();
  });
});

describe('la signature VAPID (RFC 8292)', () => {
  it('un jeton pour le service, signé par la clé du Worker, avec sa clé publique', async () => {
    const cles = { ...(await nouvellesClesVapid()), contact: 'https://exemple.org' };
    const entete = await enteteVapid('https://fcm.googleapis.com/fcm/send/xyz', cles, new Date('2026-11-10T12:00:00Z'));
    const trouve = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(entete);
    expect(trouve).not.toBeNull();
    const [, tete, charge, signature, k] = trouve as unknown as string[];
    expect(k).toBe(cles.publique);
    expect(JSON.parse(Buffer.from(depuisBase64url(charge ?? '')).toString())).toEqual({
      aud: 'https://fcm.googleapis.com', exp: Date.parse('2026-11-10T12:00:00Z') / 1000 + 12 * 3600, sub: 'https://exemple.org',
    });
    const { d: _privee, ...publiqueJwk } = cles.privee;
    const publique = createPublicKey({ key: publiqueJwk, format: 'jwk' });
    const valide = verify('sha256', Buffer.from(`${tete}.${charge}`), { key: publique, dsaEncoding: 'ieee-p1363' }, Buffer.from(depuisBase64url(signature ?? '')));
    expect(valide).toBe(true);
  });

  it('la requête porte les en-têtes de la norme', async () => {
    const cles = { ...(await nouvellesClesVapid()), contact: 'https://exemple.org' };
    const r = await requetePush(telephone().abonnement, { titre: 'x' }, cles, new Date());
    expect(r.method).toBe('POST');
    expect(r.headers.get('Content-Encoding')).toBe('aes128gcm');
    expect(r.headers.get('TTL')).toBe('3600');
    expect(r.headers.get('Authorization')).toMatch(/^vapid t=/);
  });
});

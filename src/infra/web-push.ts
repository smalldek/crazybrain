// Envoyer une notification à un téléphone par Web Push (tâche 5.5), sans bibliothèque : tout se fait
// avec WebCrypto, présent dans le Worker comme dans Node.
//
// Deux normes :
// - VAPID (RFC 8292) : le Worker signe un petit jeton (JWT) avec sa clé privée. Le service de
//   notification (Google, pour Chrome sur Android) sait ainsi que les messages viennent toujours du
//   même serveur, celui dont le téléphone a reçu la clé publique en s'abonnant.
// - Le chiffrement du message (RFC 8291, « aes128gcm ») : le service de notification transporte le
//   message sans pouvoir le lire. Le téléphone a donné deux clés en s'abonnant (p256dh, auth) ; on en
//   tire, avec une clé jetable du Worker, la clé AES qui chiffre le message.

/** Un téléphone abonné, tel que le navigateur le donne (PushSubscription.toJSON()). */
export interface Abonnement {
  readonly endpoint: string;
  /** La clé publique du navigateur (P-256, 65 octets), en base64url. */
  readonly p256dh: string;
  /** Le secret partagé (16 octets), en base64url. */
  readonly auth: string;
}

/** Les clés VAPID du Worker : la privée en JWK (secret du Worker), la publique en base64url (65 octets). */
export interface ClesVapid {
  readonly privee: CleJwk;
  readonly publique: string;
  /** Qui contacter : une adresse https ou mailto (exigée par la norme). */
  readonly contact: string;
}

// Les types de WebCrypto diffèrent entre le Worker (types de Cloudflare) et Node (les tests) : on
// nomme ici ce dont on a besoin, d'une façon qui vaut des deux côtés.
type Cle = Parameters<typeof crypto.subtle.exportKey>[1];
/** Une paire de clés (CryptoKeyPair). */
export interface Paire { readonly publicKey: Cle; readonly privateKey: Cle }
/** Une clé au format JWK (JSON Web Key), comme la rend exportKey('jwk'). */
export interface CleJwk { readonly kty: string; readonly crv?: string; readonly x?: string; readonly y?: string; readonly d?: string }

const encodeur = new TextEncoder();

export function versBase64url(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function depuisBase64url(texte: string): Uint8Array {
  const b64 = texte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texte.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function concat(...morceaux: Uint8Array[]): Uint8Array {
  const tout = new Uint8Array(morceaux.reduce((n, m) => n + m.length, 0));
  let i = 0;
  for (const m of morceaux) { tout.set(m, i); i += m.length; }
  return tout;
}

async function hmac(cle: Uint8Array, donnees: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, donnees));
}

/** HKDF en une passe (on ne demande jamais plus de 32 octets) : extraire, puis étendre. */
async function hkdf(sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, longueur: number): Promise<Uint8Array> {
  const prk = await hmac(sel, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, longueur);
}

/**
 * Chiffre le message pour ce téléphone (RFC 8291). `jetable` et `sel` ne se passent que dans les
 * tests ; sinon ils sont tirés au hasard à chaque envoi.
 */
export async function chiffrer(
  message: Uint8Array, abonnement: Abonnement,
  jetable?: Paire, sel: Uint8Array = crypto.getRandomValues(new Uint8Array(16)),
): Promise<Uint8Array> {
  const clesServeur = jetable ?? (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as Paire);
  const publiqueServeur = new Uint8Array(await crypto.subtle.exportKey('raw', clesServeur.publicKey) as ArrayBuffer);
  const publiqueTelephone = depuisBase64url(abonnement.p256dh);
  const cleTelephone = await crypto.subtle.importKey('raw', publiqueTelephone, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const partage = new Uint8Array(await crypto.subtle.deriveBits(
    // Les types de Cloudflare nomment ce champ « $public » ; le moteur, comme la norme, lit « public ».
    { name: 'ECDH', public: cleTelephone } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0], clesServeur.privateKey, 256));

  const ikm = await hkdf(depuisBase64url(abonnement.auth), partage,
    concat(encodeur.encode('WebPush: info\0'), publiqueTelephone, publiqueServeur), 32);
  const cek = await hkdf(sel, ikm, encodeur.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sel, ikm, encodeur.encode('Content-Encoding: nonce\0'), 12);

  // Un seul bloc : le message, puis l'octet 2 qui dit « dernier bloc ».
  const cleAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cleAes, concat(message, new Uint8Array([2]))));

  // L'en-tête : le sel, la taille de bloc (4096), puis la clé publique jetable du Worker.
  const taille = new Uint8Array(4);
  new DataView(taille.buffer).setUint32(0, 4096);
  return concat(sel, taille, new Uint8Array([publiqueServeur.length]), publiqueServeur, chiffre);
}

/** L'en-tête Authorization de VAPID : un JWT signé ES256, valable 12 heures, pour ce service. */
export async function enteteVapid(endpoint: string, cles: ClesVapid, maintenant: Date): Promise<string> {
  const audience = new URL(endpoint).origin;
  const json = (o: unknown): string => versBase64url(encodeur.encode(JSON.stringify(o)));
  const aSigner = `${json({ typ: 'JWT', alg: 'ES256' })}.${json({ aud: audience, exp: Math.floor(maintenant.getTime() / 1000) + 12 * 3600, sub: cles.contact })}`;
  const privee = await crypto.subtle.importKey('jwk', cles.privee, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto rend la signature brute r‖s (64 octets) : c'est la forme qu'attend un JWT.
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privee, encodeur.encode(aSigner)));
  return `vapid t=${aSigner}.${versBase64url(signature)}, k=${cles.publique}`;
}

/** La requête à envoyer au service de notification : un message chiffré, urgent, gardé une heure au plus. */
export async function requetePush(abonnement: Abonnement, message: unknown, cles: ClesVapid, maintenant: Date): Promise<Request> {
  const corps = await chiffrer(encodeur.encode(JSON.stringify(message)), abonnement);
  return new Request(abonnement.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await enteteVapid(abonnement.endpoint, cles, maintenant),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'high',
    },
    body: corps,
  });
}

/** Une paire de clés VAPID neuve (pour l'outil de déploiement et les tests). */
export async function nouvellesClesVapid(): Promise<{ privee: CleJwk; publique: string }> {
  const paire = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as Paire;
  return {
    privee: await crypto.subtle.exportKey('jwk', paire.privateKey) as CleJwk,
    publique: versBase64url(new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey) as ArrayBuffer)),
  };
}

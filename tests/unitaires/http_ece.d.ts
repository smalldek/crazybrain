// La bibliothèque http_ece (Mozilla) n'a pas de types : ce que les tests en utilisent.
declare module 'http_ece' {
  import type { ECDH } from 'node:crypto';
  const ece: {
    decrypt(contenu: Buffer, params: { version: 'aes128gcm'; privateKey: ECDH; authSecret: Buffer }): Buffer;
  };
  export default ece;
}

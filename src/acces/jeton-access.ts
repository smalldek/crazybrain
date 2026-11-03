import { jwtVerify, type JWTVerifyGetKey } from 'jose';

/** Ce que le jeton doit annoncer : pour quelle application (audience), émis par quelle équipe Access. */
export interface AttenduAccess {
  readonly audience: string;
  readonly emetteur: string;
}

/**
 * Vrai si le jeton transmis par Cloudflare Access (en-tête `Cf-Access-Jwt-Assertion`) est signé par
 * l'une des clés de l'équipe (RS256), pour la bonne audience, par le bon émetteur, et pas expiré.
 * Le moindre doute rend faux : on refuse.
 */
export async function jetonAccessValide(
  jeton: string | undefined,
  cles: JWTVerifyGetKey,
  attendu: AttenduAccess,
): Promise<boolean> {
  if (!jeton || !attendu.audience || !attendu.emetteur) {
    return false;
  }
  try {
    await jwtVerify(jeton, cles, {
      algorithms: ['RS256'],
      audience: attendu.audience,
      issuer: attendu.emetteur,
      requiredClaims: ['exp'],
    });
    return true;
  } catch {
    return false;
  }
}

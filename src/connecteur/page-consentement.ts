// La page où Adrien autorise (ou refuse) qu'un client OAuth, claude.ai en pratique, utilise
// Crazybrain en son nom. Elle est obligatoire : n'importe qui peut enregistrer un client, puis
// envoyer à Adrien un lien vers /authorize ; sans cette page, un simple clic donnerait un jeton
// à l'inconnu. La page montre donc le nom du client et, surtout, où le jeton sera envoyé.
import type { ConsentDescription } from '@cloudflare/workers-oauth-provider';

/** Neutralise le HTML : le nom du client et ses adresses viennent du client, donc d'un inconnu. */
export function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function pageConsentement(details: ConsentDescription, poignee: string): string {
  const nom = echapper(details.clientName);
  const local = details.redirectIsLoopback
    ? '<p class="alerte">Le jeton irait à une application de cet ordinateur. Continuez seulement si vous venez de lancer la connexion depuis elle.</p>'
    : '';
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autoriser ${nom} — Crazybrain</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; padding: 0 16px; line-height: 1.5; }
  .alerte { font-weight: bold; }
  button { font: inherit; padding: 10px 18px; margin-right: 8px; border-radius: 8px; }
</style>
</head>
<body>
<h1>Autoriser « ${nom} » à utiliser Crazybrain ?</h1>
<p>Ce client s'est enregistré lui-même : son nom n'est pas vérifié.</p>
<p>Le jeton d'accès sera envoyé à <strong>${echapper(details.redirectHost)}</strong>.
Pour le connecteur de claude.ai, c'est <strong>claude.ai</strong>.</p>
${local}
<form method="post">
  <input type="hidden" name="poignee" value="${echapper(poignee)}">
  <button name="decision" value="autoriser">Autoriser</button>
  <button name="decision" value="refuser">Refuser</button>
</form>
</body>
</html>`;
}

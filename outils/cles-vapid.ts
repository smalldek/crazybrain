// Tire une paire de clés VAPID neuve pour les rappels (tâche 5.5) et l'écrit, au format de
// `wrangler secret bulk`, dans le fichier donné : {"VAPID_PRIVEE": "<JWK>", "VAPID_PUBLIQUE": "…"}.
// Lancé par le déploiement seulement quand le Worker n'a pas encore ces secrets ; rien n'est affiché.
// Usage : npx tsx outils/cles-vapid.ts <fichier.json>
import { writeFileSync } from 'node:fs';
import { nouvellesClesVapid } from '../src/infra/web-push';

const fichier = process.argv[2];
if (!fichier) throw new Error('Usage : npx tsx outils/cles-vapid.ts <fichier.json>');
const cles = await nouvellesClesVapid();
writeFileSync(fichier, JSON.stringify({ VAPID_PRIVEE: JSON.stringify(cles.privee), VAPID_PUBLIQUE: cles.publique }), { mode: 0o600 });

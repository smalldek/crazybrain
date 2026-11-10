// Les phrases des rappels (features/rappels.feature). Un faux service de notification (un petit
// serveur HTTP local) reçoit les messages Web Push ; chaque « téléphone » a ses vraies clés, et
// déchiffre avec http_ece, la bibliothèque de Mozilla, comme le ferait le navigateur.
import { strict as assert } from 'node:assert';
import { createECDH, createPublicKey, randomBytes, verify, type ECDH } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { Given, Then, When } from '@cucumber/cucumber';
import ece from 'http_ece';
import { depuisBase64url, versBase64url } from '../../src/infra/web-push';
import type { Monde } from '../support/monde';

interface Recu { chemin: string; autorisation: string; message: { titre: string; corps: string; url: string; envoi: string } | null; corps: Buffer }
interface Telephone { ecdh: ECDH; auth: Buffer; endpoint: string; chemin: string }

// Le faux service : un seul pour toute la suite, qui garde tout ce qu'il reçoit.
let service: { serveur: Server; adresse: string; recus: Recu[] } | undefined;
const telephones = new Map<string, Telephone>();

Given("un faux service de notification écoute", async function () {
  if (service) return;
  const recus: Recu[] = [];
  const serveur = createServer((requete, reponse) => {
    const morceaux: Buffer[] = [];
    requete.on('data', (m: Buffer) => morceaux.push(m));
    requete.on('end', () => {
      const chemin = requete.url ?? '';
      recus.push({ chemin, autorisation: String(requete.headers.authorization ?? ''), message: null, corps: Buffer.concat(morceaux) });
      // Un téléphone « mort » : le service dit que l'abonnement n'existe plus (410 Gone).
      reponse.statusCode = chemin.includes('/mort') ? 410 : 201;
      reponse.end();
    });
  });
  await new Promise<void>((r) => serveur.listen(0, '127.0.0.1', r));
  const adresse = serveur.address();
  if (typeof adresse !== 'object' || !adresse) throw new Error('Faux service sans adresse.');
  service = { serveur, adresse: `http://127.0.0.1:${adresse.port}`, recus };
  serveur.unref();
});

function serviceLance(): NonNullable<typeof service> {
  if (!service) throw new Error('Le faux service de notification n’est pas lancé.');
  return service;
}

Given("un téléphone {string} est abonné aux rappels", async function (this: Monde, nom: string) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  const chemin = `/${nom}-${randomBytes(4).toString('hex')}`;
  const t = { ecdh, auth, chemin, endpoint: serviceLance().adresse + chemin };
  telephones.set(nom, t);
  await this.appeler('/api/push/abonnements', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: t.endpoint, keys: { p256dh: versBase64url(ecdh.getPublicKey()), auth: versBase64url(auth) } }),
  });
  assert.equal(this.reponse?.status, 204, JSON.stringify(this.corps));
});

async function creerAvecRappel(monde: Monde, titre: string, rappel: string): Promise<string> {
  await monde.appeler('/api/elements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ titre, rappel }) });
  assert.equal(monde.reponse?.status, 201, JSON.stringify(monde.corps));
  const id = (monde.corps as { element: { id: string } }).element.id;
  ids.set(titre, id);
  return id;
}
const ids = new Map<string, string>();

Given("la tâche {string} a un rappel il y a une minute", async function (this: Monde, titre: string) {
  await creerAvecRappel(this, titre, new Date(Date.now() - 60_000).toISOString());
});

Given("la tâche {string} a un rappel dans une heure", async function (this: Monde, titre: string) {
  await creerAvecRappel(this, titre, new Date(Date.now() + 3_600_000).toISOString());
});

Given("la tâche {string} existe par l'API", async function (this: Monde, titre: string) {
  await this.appeler('/api/elements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ titre }) });
  ids.set(titre, (this.corps as { element: { id: string } }).element.id);
});

async function modifier(monde: Monde, titre: string, champs: Record<string, unknown>): Promise<void> {
  await monde.appeler(`/api/elements/${ids.get(titre) ?? 'inconnu'}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(champs),
  });
  assert.equal(monde.reponse?.status, 200, JSON.stringify(monde.corps));
}

Given("la tâche {string} est faite", async function (this: Monde, titre: string) {
  await modifier(this, titre, { statut: 'fait' });
});

When("la tâche {string} reçoit un nouveau rappel il y a 30 secondes", async function (this: Monde, titre: string) {
  await modifier(this, titre, { rappel: new Date(Date.now() - 30_000).toISOString() });
});

When("je programme le rappel de {string} à {string}", async function (this: Monde, titre: string, heure: string) {
  await modifier(this, titre, { rappel: heure });
});

Then("la tâche {string} a le rappel {string}", function (this: Monde, _titre: string, attendu: string) {
  assert.equal((this.corps as { element: { rappel: string } }).element.rappel, attendu);
});

// Ce que fait Cloudflare chaque minute ; wrangler dev le déclenche à la demande (--test-scheduled).
When("la tâche planifiée tourne", async function (this: Monde) {
  const reponse = await fetch(`${this.worker.adresse}/cdn-cgi/local/scheduled?cron=*+*+*+*+*`);
  // Une page HTML voudrait dire que l'adresse est tombée sur la page de l'appli, pas sur la tâche planifiée.
  assert.equal(reponse.status, 200);
  assert.ok(!(reponse.headers.get('content-type') ?? '').includes('text/html'), await reponse.text());
  // Le Worker finit ses envois après avoir répondu (waitUntil) : on laisse le temps aux messages d'arriver.
  await new Promise((r) => setTimeout(r, 1500));
});

When("j'envoie un rappel d'essai", async function (this: Monde) {
  await this.appeler('/api/push/essai', { method: 'POST' });
  assert.equal(this.reponse?.status, 200, JSON.stringify(this.corps));
});

/** Les messages reçus par ce téléphone, déchiffrés avec ses clés. */
function messagesDe(nom: string): Recu[] {
  const t = telephones.get(nom);
  if (!t) throw new Error(`Pas de téléphone « ${nom} ».`);
  return serviceLance().recus.filter((r) => r.chemin === t.chemin).map((r) => ({
    ...r,
    message: JSON.parse(ece.decrypt(r.corps, { version: 'aes128gcm', privateKey: t.ecdh, authSecret: t.auth }).toString()) as Recu['message'],
  }));
}

async function attendre<T>(lire: () => T | undefined): Promise<T> {
  const limite = Date.now() + 10_000;
  for (;;) {
    const v = lire();
    if (v !== undefined) return v;
    if (Date.now() > limite) throw new Error('Rien reçu en 10 secondes.');
    await new Promise((r) => setTimeout(r, 200));
  }
}

const derniersEnvois = new Map<string, string>();

Then("le téléphone {string} reçoit la notification {string}, signée par le Worker", async function (this: Monde, nom: string, titre: string) {
  const recu = await attendre(() => messagesDe(nom).find((r) => r.message?.titre === titre));
  // La signature VAPID : un JWT signé par la clé privée du Worker, vérifié avec sa clé publique.
  await this.appeler('/api/push/cle');
  const cle = (this.corps as { cle: string }).cle;
  const trouve = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(recu.autorisation);
  assert.ok(trouve, recu.autorisation);
  assert.equal(trouve[4], cle);
  const brute = depuisBase64url(cle);
  const publique = createPublicKey({
    key: { kty: 'EC', crv: 'P-256', x: versBase64url(brute.slice(1, 33)), y: versBase64url(brute.slice(33, 65)) }, format: 'jwk',
  });
  assert.ok(verify('sha256', Buffer.from(`${trouve[1]}.${trouve[2]}`), { key: publique, dsaEncoding: 'ieee-p1363' }, Buffer.from(depuisBase64url(trouve[3] ?? ''))));
  if (recu.message) derniersEnvois.set(nom, recu.message.envoi);
});

When("le téléphone {string} signale l'avoir reçue", async function (this: Monde, nom: string) {
  await this.appeler(`/api/push/recu/${derniersEnvois.get(nom) ?? 'inconnu'}`, { method: 'POST' });
  assert.equal(this.reponse?.status, 204);
});

Then("les envois montrent {string} reçu", async function (this: Monde, titre: string) {
  await this.appeler('/api/push/envois');
  const envois = (this.corps as { envois: { titre: string; statutHttp: number; recuLe: string | null }[] }).envois.filter((e) => e.titre === titre);
  assert.ok(envois.some((e) => e.statutHttp === 201 && e.recuLe !== null), JSON.stringify(envois));
});

Then("le téléphone {string} a reçu {string} une seule fois", function (this: Monde, nom: string, titre: string) {
  assert.equal(messagesDe(nom).filter((r) => r.message?.titre === titre).length, 1);
});

Then("le téléphone {string} a reçu {string} {int} fois", async function (this: Monde, nom: string, titre: string, fois: number) {
  await attendre(() => (messagesDe(nom).filter((r) => r.message?.titre === titre).length >= fois ? true : undefined));
  assert.equal(messagesDe(nom).filter((r) => r.message?.titre === titre).length, fois);
});

Then("le téléphone {string} n'a rien reçu pour {string}", function (this: Monde, nom: string, titre: string) {
  assert.equal(messagesDe(nom).filter((r) => r.message?.titre === titre).length, 0);
});

Then("le téléphone {string} n'est plus abonné", async function (this: Monde, nom: string) {
  const t = telephones.get(nom);
  await attendre(() => (serviceLance().recus.some((r) => r.chemin === t?.chemin) ? true : undefined));
  const lignes = await this.worker.requete<{ n: number }>(`SELECT COUNT(*) AS n FROM abonnements_push WHERE endpoint = '${t?.endpoint ?? ''}'`);
  assert.equal(lignes[0]?.n, 0);
});

Then("le tableau propose d'activer les rappels", async function (this: Monde) {
  if (!this.page) throw new Error('Pas de navigateur.');
  const { expect } = await import('playwright/test');
  await expect(this.page.getByRole('region', { name: 'Rappels' }).getByRole('button', { name: 'Activer les rappels' })).toBeVisible();
});

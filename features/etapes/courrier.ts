// Les phrases du mail → tâche (features/courrier.feature). Le mail est remis au Worker local par la
// porte de test de wrangler (/cdn-cgi/local/email), comme le ferait Email Routing.
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { Then, When } from '@cucumber/cucumber';
import { ADRESSE_ADRIEN_DE_TEST, AUTHSERV_DE_TEST, type Monde } from '../support/monde';

const DESTINATAIRE = 'nouvelle@taches.exemple.fr';
const statuts = new WeakMap<Monde, { statut: number; texte: string }>();

/** Un mail brut (RFC 5322) en UTF-8, avec l'en-tête d'authentification posé par le serveur qui l'a reçu. */
function mailBrut(champs: { de: string; sujet: string; texte: string; resultats: string }): string {
  return [
    `Authentication-Results: ${champs.resultats}`,
    `From: Adrien <${champs.de}>`,
    `To: ${DESTINATAIRE}`,
    `Subject: =?UTF-8?B?${Buffer.from(champs.sujet).toString('base64')}?=`,
    `Message-ID: <${randomUUID()}@exemple.fr>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    champs.texte.replace(/\\n/g, '\r\n'),
  ].join('\r\n');
}

const resultats = (serveur: string, domaine: string, dkim = 'pass'): string =>
  `${serveur}; dkim=${dkim} header.d=${domaine} header.s=s1; spf=pass smtp.mailfrom=${domaine}; dmarc=pass header.from=${domaine}`;

async function envoyer(monde: Monde, enveloppe: string, brut: string): Promise<void> {
  const adresse = `${monde.worker.adresse}/cdn-cgi/local/email?from=${encodeURIComponent(enveloppe)}&to=${encodeURIComponent(DESTINATAIRE)}`;
  const reponse = await fetch(adresse, { method: 'POST', body: brut });
  statuts.set(monde, { statut: reponse.status, texte: await reponse.text() });
}

const domaineAdrien = ADRESSE_ADRIEN_DE_TEST.split('@')[1] ?? '';

When('Adrien envoie le mail {string} avec le texte {string}', async function (this: Monde, sujet: string, texte: string) {
  await envoyer(this, ADRESSE_ADRIEN_DE_TEST, mailBrut({ de: ADRESSE_ADRIEN_DE_TEST, sujet, texte, resultats: resultats(AUTHSERV_DE_TEST, domaineAdrien) }));
});

When('{string} envoie le mail {string} avec le texte {string}', async function (this: Monde, de: string, sujet: string, texte: string) {
  await envoyer(this, de, mailBrut({ de, sujet, texte, resultats: resultats(AUTHSERV_DE_TEST, de.split('@')[1] ?? '') }));
});

When("quelqu'un envoie au nom d'Adrien le mail {string} avec un résultat d'authentification écrit par {string}", async function (this: Monde, sujet: string, serveur: string) {
  await envoyer(this, ADRESSE_ADRIEN_DE_TEST, mailBrut({ de: ADRESSE_ADRIEN_DE_TEST, sujet, texte: 'Faux.', resultats: resultats(serveur, domaineAdrien) }));
});

When('Adrien envoie le mail {string} sans signature DKIM valide', async function (this: Monde, sujet: string) {
  await envoyer(this, ADRESSE_ADRIEN_DE_TEST, mailBrut({ de: ADRESSE_ADRIEN_DE_TEST, sujet, texte: 'x', resultats: resultats(AUTHSERV_DE_TEST, domaineAdrien, 'fail') }));
});

Then('le mail est accepté', function (this: Monde) {
  const s = statuts.get(this);
  assert.equal(s?.statut, 200, s?.texte);
});

Then('le mail est refusé', function (this: Monde) {
  const s = statuts.get(this);
  assert.equal(s?.statut, 400, s?.texte);
  assert.match(s.texte, /Mail refusé par Crazybrain/);
});

interface Lu { id: string; titre: string; description: string | null }

async function parTitre(monde: Monde, titre: string): Promise<Lu[]> {
  await monde.appeler('/api/elements');
  return (monde.corps as { elements: Lu[] }).elements.filter((e) => e.titre === titre);
}

Then('la tâche {string} existe avec la description {string} et le tag {string}', async function (this: Monde, titre: string, description: string, tag: string) {
  const trouvees = await parTitre(this, titre);
  assert.equal(trouvees.length, 1, `une seule tâche « ${titre} »`);
  assert.equal(trouvees[0]?.description, description.replace(/\\n/g, '\n'));
  await this.appeler(`/api/elements/${trouvees[0]?.id ?? ''}`);
  const tags = (this.corps as { tags: { cle: string; valeur: string | null }[] }).tags.map((t) => (t.valeur ? `${t.cle}:${t.valeur}` : t.cle));
  assert.deepEqual(tags, [tag]);
});

Then("aucune tâche {string} n'existe", async function (this: Monde, titre: string) {
  assert.equal((await parTitre(this, titre)).length, 0);
});

interface MailNote { accepte: boolean; raison: string | null; authserv: string | null; sujet: string | null }

async function dernierMail(monde: Monde): Promise<MailNote> {
  await monde.appeler('/api/mails');
  const mail = (monde.corps as { mails: MailNote[] }).mails[0];
  assert.ok(mail, 'aucun mail noté');
  return mail;
}

Then('le dernier mail reçu est noté accepté, signé par {string}', async function (this: Monde, serveur: string) {
  const m = await dernierMail(this);
  assert.equal(m.accepte, true);
  assert.equal(m.authserv, serveur);
});

Then('le dernier mail reçu est noté refusé : {string}', async function (this: Monde, raison: string) {
  const m = await dernierMail(this);
  assert.equal(m.accepte, false);
  assert.equal(m.raison, raison);
});

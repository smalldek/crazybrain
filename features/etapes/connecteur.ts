// Les phrases du connecteur Claude (features/connecteur.feature).
import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { appelMcp, ClientOAuth, cookiesDe, RETOUR_CLAUDE } from '../support/client-oauth';
import type { Monde } from '../support/monde';

function client(monde: Monde): ClientOAuth {
  assert.ok(monde.clientOAuth, "Claude ne s'est pas enregistré dans ce scénario.");
  return monde.clientOAuth;
}

function entetesAdrien(monde: Monde): Record<string, string> {
  return monde.jeton ? { 'Cf-Access-Jwt-Assertion': monde.jeton } : {};
}

When('Claude appelle le connecteur sans jeton', async function (this: Monde) {
  this.reponse = await appelMcp(this.worker.adresse, undefined, 'tools/list');
});

When('Claude appelle le connecteur avec le jeton {string}', async function (this: Monde, jeton: string) {
  this.reponse = await appelMcp(this.worker.adresse, jeton, 'tools/list');
});

Then('le connecteur répond {int}', function (this: Monde, statut: number) {
  assert.equal(this.reponse?.status, statut);
});

Then("la réponse indique l'adresse de découverte {string}", function (this: Monde, chemin: string) {
  const defi = this.reponse?.headers.get('www-authenticate') ?? '';
  assert.match(defi, /^Bearer /);
  assert.ok(defi.includes(`resource_metadata="${this.worker.adresse}${chemin}"`), defi);
});

When('Claude lit la description de la ressource protégée', async function (this: Monde) {
  const reponse = await fetch(`${this.worker.adresse}/.well-known/oauth-protected-resource/mcp`);
  assert.equal(reponse.status, 200);
  this.corps = await reponse.json();
});

Then('elle désigne le Worker comme serveur d\'autorisation', function (this: Monde) {
  const description = this.corps as { resource: string; authorization_servers: string[] };
  assert.equal(description.resource, `${this.worker.adresse}/mcp`);
  assert.deepEqual(description.authorization_servers, [this.worker.adresse]);
});

Then(
  'la description du serveur d\'autorisation annonce {string}, {string} et {string}',
  async function (this: Monde, autorisation: string, jeton: string, enregistrement: string) {
    const reponse = await fetch(`${this.worker.adresse}/.well-known/oauth-authorization-server`);
    assert.equal(reponse.status, 200);
    const d = (await reponse.json()) as Record<string, unknown>;
    assert.equal(d.issuer, this.worker.adresse);
    assert.equal(d.authorization_endpoint, this.worker.adresse + autorisation);
    assert.equal(d.token_endpoint, this.worker.adresse + jeton);
    assert.equal(d.registration_endpoint, this.worker.adresse + enregistrement);
    assert.deepEqual(d.code_challenge_methods_supported, ['S256']);
  },
);

Given("Claude s'est enregistré comme client OAuth", async function (this: Monde) {
  this.clientOAuth = await ClientOAuth.enregistrer(this.worker.adresse);
});

When("j'ouvre la page d'autorisation", async function (this: Monde) {
  this.reponse = await fetch(client(this).adresseAutorisation(), { headers: entetesAdrien(this), redirect: 'manual' });
});

When("j'autorise Claude sur la page de consentement", async function (this: Monde) {
  const c = client(this);
  const page = await fetch(c.adresseAutorisation(), { headers: entetesAdrien(this), redirect: 'manual' });
  const html = await page.text();
  assert.equal(page.status, 200, html);
  assert.ok(html.includes('claude.ai'), "La page doit dire où part le jeton.");
  const poignee = /name="poignee" value="([^"]+)"/.exec(html)?.[1];
  assert.ok(poignee, 'Pas de poignée dans la page de consentement.');

  const accord = await fetch(`${this.worker.adresse}/authorize`, {
    method: 'POST',
    headers: { ...entetesAdrien(this), cookie: cookiesDe(page), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ poignee, decision: 'autoriser' }),
    redirect: 'manual',
  });
  assert.equal(accord.status, 302, await accord.text());
  const retour = new URL(accord.headers.get('location') ?? '');
  assert.equal(`${retour.origin}${retour.pathname}`, RETOUR_CLAUDE);
  assert.equal(retour.searchParams.get('state'), c.etat);
  c.code = retour.searchParams.get('code') ?? undefined;
});

When('Claude échange le code contre un jeton', async function (this: Monde) {
  this.jetonOAuth = await client(this).echangerCode();
});

When("Claude présente ce jeton à l'API de la page", async function (this: Monde) {
  this.reponse = await fetch(`${this.worker.adresse}/api/elements`, {
    headers: { authorization: `Bearer ${this.jetonOAuth ?? ''}` },
  });
});

interface ReponseJsonRpc {
  result?: { tools?: { name: string }[]; content?: { type: string; text: string }[] };
  error?: unknown;
}

async function mcp(monde: Monde, methode: string, parametres: Record<string, unknown> = {}): Promise<ReponseJsonRpc> {
  const reponse = await appelMcp(monde.worker.adresse, monde.jetonOAuth, methode, parametres);
  const corps = await reponse.text();
  assert.equal(reponse.status, 200, corps);
  const lu = JSON.parse(corps) as ReponseJsonRpc;
  assert.equal(lu.error, undefined, corps);
  return lu;
}

Then("l'outil {string} est proposé par le connecteur", async function (this: Monde, outil: string) {
  const { result } = await mcp(this, 'tools/list');
  assert.deepEqual(result?.tools?.map((t) => t.name), [outil]);
});

Then(
  "l'outil {string} répond par un message qui commence par {string} et compte les tâches",
  async function (this: Monde, outil: string, debut: string) {
    const [ligne] = await this.worker.requete<{ nombre: number }>('SELECT COUNT(*) AS nombre FROM elements');
    const { result } = await mcp(this, 'tools/call', { name: outil, arguments: {} });
    const message = result?.content?.[0]?.text ?? '';
    assert.ok(message.startsWith(debut), message);
    assert.ok(message.includes(`${ligne?.nombre ?? '?'} tâche`), message);
  },
);

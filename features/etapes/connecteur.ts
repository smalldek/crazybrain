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

/** Adrien passe la page de consentement et clique « Autoriser » ; Claude reçoit son code. */
async function autoriser(monde: Monde): Promise<void> {
  const c = client(monde);
  const page = await fetch(c.adresseAutorisation(), { headers: entetesAdrien(monde), redirect: 'manual' });
  const html = await page.text();
  assert.equal(page.status, 200, html);
  assert.ok(html.includes('claude.ai'), "La page doit dire où part le jeton.");
  const poignee = /name="poignee" value="([^"]+)"/.exec(html)?.[1];
  assert.ok(poignee, 'Pas de poignée dans la page de consentement.');

  const accord = await fetch(`${monde.worker.adresse}/authorize`, {
    method: 'POST',
    headers: { ...entetesAdrien(monde), cookie: cookiesDe(page), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ poignee, decision: 'autoriser' }),
    redirect: 'manual',
  });
  assert.equal(accord.status, 302, await accord.text());
  const retour = new URL(accord.headers.get('location') ?? '');
  assert.equal(`${retour.origin}${retour.pathname}`, RETOUR_CLAUDE);
  assert.equal(retour.searchParams.get('state'), c.etat);
  c.code = retour.searchParams.get('code') ?? undefined;
}

When("j'autorise Claude sur la page de consentement", async function (this: Monde) {
  await autoriser(this);
});

// Tout le parcours d'un coup, pour les scénarios des outils : Adrien connecté, Claude enregistré,
// autorisé, et muni de son jeton.
Given('Claude est branché sur Crazybrain par le connecteur', async function (this: Monde) {
  this.jeton = await this.serrure.jeton();
  this.clientOAuth = await ClientOAuth.enregistrer(this.worker.adresse);
  await autoriser(this);
  this.jetonOAuth = await client(this).echangerCode();
});

Given('Claude parle la version {string} du protocole MCP', function (this: Monde, version: string) {
  this.versionMcp = version;
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
  const reponse = await appelMcp(monde.worker.adresse, monde.jetonOAuth, methode, parametres, monde.versionMcp);
  const corps = await reponse.text();
  assert.equal(reponse.status, 200, corps);
  const lu = JSON.parse(corps) as ReponseJsonRpc;
  assert.equal(lu.error, undefined, corps);
  return lu;
}

Then("l'outil {string} est proposé par le connecteur", async function (this: Monde, outil: string) {
  const { result } = await mcp(this, 'tools/list');
  assert.ok(result?.tools?.map((t) => t.name).includes(outil), JSON.stringify(result?.tools?.map((t) => t.name)));
});

Then('le connecteur propose les outils {string}', async function (this: Monde, liste: string) {
  const { result } = await mcp(this, 'tools/list');
  assert.deepEqual(result?.tools?.map((t) => t.name).sort(), liste.split(', ').sort());
});

// --- Les outils de l'étape 2 ---

interface ResultatOutil { texte: string; erreur: boolean; json: unknown }
const resultats = new WeakMap<Monde, ResultatOutil>();
// Les ids des éléments créés par Claude dans le scénario, par titre.
const idsParTitre = new WeakMap<Monde, Map<string, string>>();

function ids(monde: Monde): Map<string, string> {
  let m = idsParTitre.get(monde);
  if (!m) idsParTitre.set(monde, (m = new Map()));
  return m;
}

/** Remplace « {id:Titre} » par l'id de l'élément créé sous ce titre dans le scénario. */
function avecIds(monde: Monde, texteJson: string): string {
  return texteJson.replace(/\{id:([^}]+)\}/g, (_, titre: string) => {
    const id = ids(monde).get(titre);
    assert.ok(id, `aucun élément « ${titre} » créé par Claude dans ce scénario`);
    return id;
  });
}

async function outil(monde: Monde, nom: string, args: unknown): Promise<ResultatOutil> {
  const { result } = await mcp(monde, 'tools/call', { name: nom, arguments: args });
  const brut = result as { content?: { text: string }[]; isError?: boolean } | undefined;
  const t = brut?.content?.[0]?.text ?? '';
  let json: unknown = null;
  try { json = JSON.parse(t); } catch { json = null; }
  const r = { texte: t, erreur: brut?.isError === true, json };
  resultats.set(monde, r);
  // Retient les ids des éléments créés.
  const crees = (json as { crees?: { id: string; titre: string }[] } | null)?.crees ?? [];
  for (const e of crees) ids(monde).set(e.titre, e.id);
  return r;
}

function dernier(monde: Monde): ResultatOutil {
  const r = resultats.get(monde);
  assert.ok(r, "aucun outil appelé");
  return r;
}

When('Claude appelle {string} avec {}', async function (this: Monde, nom: string, args: string) {
  await outil(this, nom, JSON.parse(avecIds(this, args)) as unknown);
});

When('Claude appelle {string}', async function (this: Monde, nom: string) {
  await outil(this, nom, {});
});

Then("l'outil répond sans erreur", function (this: Monde) {
  assert.equal(dernier(this).erreur, false, dernier(this).texte);
});

Then("l'outil refuse en disant {string}", function (this: Monde, morceau: string) {
  const r = dernier(this);
  assert.equal(r.erreur, true, r.texte);
  assert.ok(r.texte.includes(morceau), r.texte);
});

Then("l'outil a créé {int} éléments", function (this: Monde, nombre: number) {
  assert.equal(((dernier(this).json as { crees: unknown[] }).crees).length, nombre, dernier(this).texte);
});

Then('la recherche trouve exactement {string}', function (this: Monde, titres: string) {
  const trouves = ((dernier(this).json as { elements: { titre: string }[] }).elements).map((e) => e.titre).sort();
  assert.deepEqual(trouves, titres === '' ? [] : titres.split(', ').sort(), dernier(this).texte);
});

Then('la recherche trouve {string} et pas {string}', function (this: Monde, oui: string, non: string) {
  const trouves = ((dernier(this).json as { elements: { titre: string }[] }).elements).map((e) => e.titre);
  for (const t of oui.split(', ')) assert.ok(trouves.includes(t), `« ${t} » absent : ${JSON.stringify(trouves)}`);
  for (const t of non.split(', ')) assert.ok(!trouves.includes(t), `« ${t} » présent à tort`);
});

Then("l'élément lu a {string} égal à {}", function (this: Monde, champ: string, valeur: string) {
  const lu = dernier(this).json as Record<string, unknown>;
  assert.deepEqual(lu[champ], JSON.parse(avecIds(this, valeur)), dernier(this).texte);
});

Then('le journal de {string} ne contient que des événements de {string}', async function (this: Monde, titre: string, auteur: string) {
  const id = ids(this).get(titre);
  assert.ok(id);
  const lignes = await this.worker.requete<{ auteur: string }>(`SELECT auteur FROM evenements WHERE element_id = '${id}'`);
  assert.ok(lignes.length > 0);
  assert.deepEqual([...new Set(lignes.map((l) => l.auteur))], [auteur]);
});

Then('la page, connectée par Access, montre {string}', async function (this: Monde, titre: string) {
  const reponse = await fetch(`${this.worker.adresse}/api/elements`, { headers: entetesAdrien(this) });
  const { elements } = (await reponse.json()) as { elements: { titre: string }[] };
  assert.ok(elements.some((e) => e.titre === titre), `« ${titre} » absent de la liste de la page`);
});

Then(
  "l'outil {string} répond par un message qui commence par {string} et compte les tâches",
  async function (this: Monde, outil: string, debut: string) {
    const [ligne] = await this.worker.requete<{ nombre: number }>('SELECT COUNT(*) AS nombre FROM elements WHERE archive_le IS NULL');
    const { result } = await mcp(this, 'tools/call', { name: outil, arguments: {} });
    const message = result?.content?.[0]?.text ?? '';
    assert.ok(message.startsWith(debut), message);
    assert.ok(message.includes(`${ligne?.nombre ?? '?'} tâche`), message);
  },
);

// --- Les requêtes (tâche 4.2) ---

interface RequeteLue { id: string; nom: string }

async function requetesDeLaPage(monde: Monde): Promise<RequeteLue[]> {
  const reponse = await fetch(`${monde.worker.adresse}/api/requetes`, { headers: entetesAdrien(monde) });
  assert.equal(reponse.status, 200);
  return ((await reponse.json()) as { requetes: RequeteLue[] }).requetes;
}

Then('la page, connectée par Access, a la requête {string}', async function (this: Monde, nom: string) {
  assert.ok((await requetesDeLaPage(this)).some((r) => r.nom === nom), `« ${nom} » absente des requêtes de la page`);
});

Then('la page, connectée par Access, rejoue {string} et trouve {int} ligne(s)', async function (this: Monde, nom: string, nombre: number) {
  const requete = (await requetesDeLaPage(this)).find((r) => r.nom === nom);
  assert.ok(requete, `« ${nom} » absente`);
  const reponse = await fetch(`${this.worker.adresse}/api/requetes/${requete.id}/lignes`, { headers: entetesAdrien(this) });
  assert.equal(reponse.status, 200);
  const { resultat } = (await reponse.json()) as { resultat: { lignes: unknown[] } };
  assert.equal(resultat.lignes.length, nombre);
});

Then('le journal de la requête {string} contient {string} par {string}', async function (this: Monde, nom: string, types: string, auteur: string) {
  const lignes = await this.worker.requete<{ type: string; auteur: string }>(
    `SELECT type, auteur FROM evenements WHERE type LIKE 'requete_%' AND json_extract(coalesce(apres, avant), '$.nom') = '${nom.replace(/'/g, "''")}' ORDER BY date`,
  );
  assert.deepEqual(lignes.map((l) => l.type), types.split(', '));
  assert.deepEqual([...new Set(lignes.map((l) => l.auteur))], [auteur]);
});

Then('la liste des requêtes ne contient ni {string} ni {string}', function (this: Monde, a: string, b: string) {
  const noms = (dernier(this).json as RequeteLue[]).map((r) => r.nom);
  assert.ok(!noms.includes(a) && !noms.includes(b), JSON.stringify(noms));
});

// Étape 9 : Claude trouve un retour écrit depuis une page, par le connecteur, et y répond.
When('Claude répond {string} au retour {string}', async function (this: Monde, reponse: string, titre: string) {
  const trouves = await outil(this, 'chercher_elements', { types: ['retour'], statuts: ['a_faire', 'en_cours'], texte: titre });
  assert.equal(trouves.erreur, false, trouves.texte);
  const retour = ((trouves.json as { elements: { id: string; titre: string }[] }).elements).find((e) => e.titre === titre);
  assert.ok(retour, `retour « ${titre} » introuvable : ${trouves.texte}`);
  const r = await outil(this, 'commenter_element', { id: retour.id, texte: reponse });
  assert.equal(r.erreur, false, r.texte);
});

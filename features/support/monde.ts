// Le « monde » de Cucumber : l'état partagé par les étapes d'un scénario (comme le contexte d'un
// scénario SpecFlow/Reqnroll en .NET). Le Worker et la serrure sont lancés une fois pour tous les scénarios.
import { AfterAll, BeforeAll, setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import { AUDIENCE_DE_TEST, SerrureDeTest } from './serrure-de-test';
import { WorkerLocal } from './worker-local';
import { nouvellesClesVapid } from '../../src/infra/web-push';
import type { ClientOAuth } from './client-oauth';
import type { BrowserContext, Page } from 'playwright';

setDefaultTimeout(30_000);

/** L'adresse d'Adrien dans les tests (inventée) et le serveur qui signe les résultats d'authentification. */
export const ADRESSE_ADRIEN_DE_TEST = 'adrien.essai@exemple.fr';
export const AUTHSERV_DE_TEST = 'mx.essai.local';

let serrure: SerrureDeTest | undefined;
let worker: WorkerLocal | undefined;

BeforeAll({ timeout: 180_000 }, async () => {
  serrure = await SerrureDeTest.demarrer();
  // Des clés VAPID de test, tirées à chaque lancement (en production : des secrets du Worker).
  const vapid = await nouvellesClesVapid();
  worker = await WorkerLocal.demarrer({
    TEAM_DOMAIN: serrure.emetteur, AUD: AUDIENCE_DE_TEST, VAPID_PRIVEE: JSON.stringify(vapid.privee), VAPID_PUBLIQUE: vapid.publique,
    // Le mail → tâche (étape 8) : une adresse inventée, et le nom du serveur qui signe les résultats.
    COURRIER_EXPEDITEURS: ADRESSE_ADRIEN_DE_TEST, COURRIER_AUTHSERV: AUTHSERV_DE_TEST,
  });
});

AfterAll({ timeout: 30_000 }, async () => {
  await worker?.arreter();
  await serrure?.arreter();
});

export class Monde extends World {
  jeton: string | undefined;
  reponse: Response | undefined;
  corps: unknown;
  /** Le client OAuth que « Claude » a enregistré dans ce scénario, et ce qu'il a obtenu. */
  clientOAuth: ClientOAuth | undefined;
  jetonOAuth: string | undefined;
  /** La version du protocole MCP que Claude annonce dans ses appels (en-tête mcp-protocol-version), si on la fixe. */
  versionMcp: string | undefined;
  /** Le navigateur des scénarios @navigateur (voir navigateur.ts). */
  contexte: BrowserContext | undefined;
  page: Page | undefined;

  get serrure(): SerrureDeTest {
    if (!serrure) throw new Error('Serrure de test non démarrée.');
    return serrure;
  }

  get worker(): WorkerLocal {
    if (!worker) throw new Error('Worker local non démarré.');
    return worker;
  }

  /** Appelle l'API comme la page le ferait, avec le jeton du scénario s'il y en a un. */
  async appeler(chemin: string, init: RequestInit = {}): Promise<Response> {
    const entetes = new Headers(init.headers);
    if (this.jeton) entetes.set('Cf-Access-Jwt-Assertion', this.jeton);
    this.reponse = await fetch(this.worker.adresse + chemin, { ...init, headers: entetes });
    const texte = await this.reponse.text();
    try {
      this.corps = JSON.parse(texte) as unknown;
    } catch {
      this.corps = texte;
    }
    return this.reponse;
  }
}

setWorldConstructor(Monde);

// Lance le vrai Worker en local (`wrangler dev`), avec une base D1 locale neuve, migrations appliquées.
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const executer = promisify(execFile);
const WRANGLER = join('node_modules', '.bin', 'wrangler');
// Pas d'envoi de statistiques, pas de question interactive.
const ENV = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' };

export class WorkerLocal {
  private constructor(
    private readonly processus: ChildProcess,
    private readonly dossierBase: string,
    public readonly adresse: string,
  ) {}

  static async demarrer(variables: Record<string, string>): Promise<WorkerLocal> {
    const dossierBase = await mkdtemp(join(tmpdir(), 'crazybrain-d1-'));
    await executer(WRANGLER, ['d1', 'migrations', 'apply', 'crazybrain', '--local', '--persist-to', dossierBase], { env: ENV });

    const port = await portLibre();
    const adresse = `http://127.0.0.1:${port}`;
    // L'identité OAuth du connecteur : l'adresse locale, au lieu de l'adresse publique.
    variables = { ORIGINE: adresse, ...variables };
    const options = ['dev', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', dossierBase,
      '--inspector-port', String(await portLibre()), '--show-interactive-dev-session=false',
      // Sans ceci, wrangler présente au Worker l'adresse de la route (crazybrain.dekermadec.net), pas l'adresse locale.
      '--local-upstream', `127.0.0.1:${port}`];
    for (const [nom, valeur] of Object.entries(variables)) {
      options.push('--var', `${nom}:${valeur}`);
    }
    const processus = spawn(WRANGLER, options, { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    let journal = '';
    processus.stdout?.on('data', (morceau: Buffer) => { journal += morceau.toString(); });
    processus.stderr?.on('data', (morceau: Buffer) => { journal += morceau.toString(); });

    const limite = Date.now() + 60_000;
    while (!journal.includes('Ready on')) {
      if (processus.exitCode !== null || Date.now() > limite) {
        processus.kill();
        throw new Error(`Le Worker local n'a pas démarré :\n${journal}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return new WorkerLocal(processus, dossierBase, adresse);
  }

  /** Lit la base locale directement, comme on regarderait la base dans un test d'intégration .NET. */
  async requete<T>(sql: string): Promise<T[]> {
    const { stdout } = await executer(WRANGLER,
      ['d1', 'execute', 'crazybrain', '--local', '--persist-to', this.dossierBase, '--json', '--command', sql], { env: ENV });
    const resultats = JSON.parse(stdout) as { results: T[] }[];
    return resultats[0]?.results ?? [];
  }

  async arreter(): Promise<void> {
    const fini = new Promise((r) => this.processus.once('exit', r));
    this.processus.kill('SIGTERM');
    await fini;
    await rm(this.dossierBase, { recursive: true, force: true });
  }
}

function portLibre(): Promise<number> {
  return new Promise((trouve, echec) => {
    const serveur = createServer();
    serveur.once('error', echec);
    serveur.listen(0, '127.0.0.1', () => {
      const adresse = serveur.address();
      const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
      serveur.close(() => trouve(port));
    });
  });
}

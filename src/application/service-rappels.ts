// Les rappels (tâche 5.5) : le téléphone s'abonne aux notifications ; chaque minute, une tâche
// planifiée du Worker (Cron Trigger) envoie les rappels échus ; chaque envoi est noté pour mesurer
// le retard sur plusieurs jours.
import { ErreurDomaine } from '../domaine/erreur-domaine';
import { DepotRappels, type Envoi, type RappelEchu } from '../infra/depot-rappels';
import { requetePush, type Abonnement, type ClesVapid } from '../infra/web-push';

/** Ce qu'on envoie au service de notification : la requête part par ce chemin (fetch, ou un faux en test). */
export type Envoyer = (requete: Request) => Promise<Response>;

/** Le message que lit le service worker du téléphone. */
export interface MessageRappel {
  readonly titre: string;
  readonly corps: string;
  /** La page à ouvrir quand on touche la notification. */
  readonly url: string;
  /** L'id de l'envoi, que le téléphone renvoie pour dire qu'il l'a reçu. */
  readonly envoi: string;
}

export class ServiceRappels {
  private readonly depot: DepotRappels;

  constructor(
    db: D1Database,
    private readonly cles: ClesVapid | null,
    private readonly envoyer: Envoyer,
    private readonly horloge: () => Date = () => new Date(),
    private readonly nouvelId: () => string = () => crypto.randomUUID(),
  ) {
    this.depot = new DepotRappels(db);
  }

  /** La clé publique que le téléphone donne en s'abonnant ; null si les rappels ne sont pas configurés. */
  clePublique(): string | null {
    return this.cles?.publique ?? null;
  }

  async abonner(corps: Record<string, unknown>): Promise<void> {
    const cles = corps.keys as Record<string, unknown> | undefined;
    const a = { endpoint: corps.endpoint, p256dh: cles?.p256dh, auth: cles?.auth };
    if (typeof a.endpoint !== 'string' || !/^https?:\/\//.test(a.endpoint) || typeof a.p256dh !== 'string' || typeof a.auth !== 'string') {
      throw new ErreurDomaine('Abonnement illisible : il faut {"endpoint": "https://…", "keys": {"p256dh": "…", "auth": "…"}}.');
    }
    const appareil = typeof corps.appareil === 'string' ? corps.appareil.slice(0, 100) : null;
    await this.depot.abonner({ endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth }, appareil, this.horloge());
  }

  desabonner(endpoint: string): Promise<void> {
    return this.depot.desabonner(endpoint);
  }

  /** Envoie les rappels échus. Rend le nombre de rappels partis. */
  async envoyerEchus(): Promise<number> {
    const maintenant = this.horloge();
    const echus = await this.depot.echus(maintenant);
    if (echus.length === 0 || !this.cles) return 0;
    const abonnements = await this.depot.abonnements();
    for (const rappel of echus) {
      const envois = await this.diffuser(abonnements, rappel.titre, 'Rappel', `/e/${encodeURIComponent(rappel.elementId)}`, rappel.rappel, rappel);
      await this.depot.noterEnvois(envois, rappel);
    }
    return echus.length;
  }

  /** Un rappel d'essai, tout de suite, sur tous les téléphones abonnés. */
  async essai(): Promise<{ envois: number }> {
    if (!this.cles) throw new ErreurDomaine("Les rappels ne sont pas configurés sur ce serveur (clés VAPID absentes).");
    const abonnements = await this.depot.abonnements();
    if (abonnements.length === 0) throw new ErreurDomaine("Aucun téléphone abonné : activer d'abord les rappels sur le téléphone.");
    const envois = await this.diffuser(abonnements, 'Rappel d’essai', 'Si tu lis ceci, les rappels marchent.', '/tableau', this.horloge().toISOString(), null);
    await this.depot.noterEnvois(envois, null);
    return { envois: envois.length };
  }

  recu(id: string): Promise<boolean> {
    return this.depot.noterReception(id, this.horloge());
  }

  envois(): Promise<Envoi[]> {
    return this.depot.envois();
  }

  /** Envoie un message à chaque téléphone ; un abonnement que le service dit mort (404, 410) est retiré. */
  private async diffuser(abonnements: readonly Abonnement[], titre: string, corps: string, url: string, prevuLe: string, rappel: RappelEchu | null): Promise<Envoi[]> {
    const cles = this.cles;
    if (!cles) return [];
    const envois: Envoi[] = [];
    for (const abonnement of abonnements) {
      const id = this.nouvelId();
      const message: MessageRappel = { titre, corps, url, envoi: id };
      const maintenant = this.horloge();
      let statut: number | null = null;
      try {
        statut = (await this.envoyer(await requetePush(abonnement, message, cles, maintenant))).status;
      } catch (erreur) {
        console.error('envoi Web Push', erreur);
      }
      if (statut === 404 || statut === 410) await this.depot.desabonner(abonnement.endpoint);
      envois.push({ id, elementId: rappel?.elementId ?? null, titre, prevuLe, envoyeLe: maintenant.toISOString(), statutHttp: statut, recuLe: null });
    }
    // Sans aucun téléphone, on note quand même le rappel comme parti (une ligne sans statut), pour
    // ne pas le renvoyer chaque minute.
    if (envois.length === 0) {
      envois.push({ id: this.nouvelId(), elementId: rappel?.elementId ?? null, titre, prevuLe, envoyeLe: this.horloge().toISOString(), statutHttp: null, recuLe: null });
    }
    return envois;
  }
}

/** Les clés VAPID lues dans les secrets du Worker ; null si elles manquent ou sont illisibles. */
export function clesVapid(privee: string | undefined, publique: string | undefined): ClesVapid | null {
  if (!privee || !publique) return null;
  try {
    const jwk = JSON.parse(privee) as ClesVapid['privee'];
    return { privee: jwk, publique, contact: 'https://github.com/smalldek/crazybrain' };
  } catch {
    console.error('VAPID_PRIVEE illisible : un JSON (JWK) est attendu.');
    return null;
  }
}

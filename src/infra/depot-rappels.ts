import type { Abonnement } from './web-push';

/** Un rappel à envoyer : l'élément dont l'heure est passée. */
export interface RappelEchu {
  readonly elementId: string;
  readonly titre: string;
  readonly rappel: string;
}

/** Un envoi, pour mesurer le retard (hypothèse « Web Push est assez fiable sur Android »). */
export interface Envoi {
  readonly id: string;
  readonly elementId: string | null;
  readonly titre: string;
  readonly prevuLe: string;
  readonly envoyeLe: string;
  readonly statutHttp: number | null;
  readonly recuLe: string | null;
}

/**
 * Dépôt des rappels : les téléphones abonnés et les envois. Ce sont des données techniques (pas des
 * modifications d'Adrien) : elles n'écrivent pas d'événement au journal. Seule la date « envoyé »
 * de l'élément change, et elle n'entre pas dans son instantané.
 */
export class DepotRappels {
  constructor(private readonly db: D1Database) {}

  async abonner(a: Abonnement, appareil: string | null, maintenant: Date): Promise<void> {
    await this.db.prepare(`INSERT INTO abonnements_push (endpoint, p256dh, auth, appareil, cree_le) VALUES (?1, ?2, ?3, ?4, ?5)
                           ON CONFLICT (endpoint) DO UPDATE SET p256dh = ?2, auth = ?3, appareil = ?4`)
      .bind(a.endpoint, a.p256dh, a.auth, appareil, maintenant.toISOString()).run();
  }

  async desabonner(endpoint: string): Promise<void> {
    await this.db.prepare('DELETE FROM abonnements_push WHERE endpoint = ?').bind(endpoint).run();
  }

  async abonnements(): Promise<Abonnement[]> {
    const { results } = await this.db.prepare('SELECT endpoint, p256dh, auth FROM abonnements_push ORDER BY cree_le').all<Abonnement>();
    return results;
  }

  /** Les rappels dont l'heure est passée, pas encore envoyés, sur des éléments ni faits ni supprimés. */
  async echus(maintenant: Date): Promise<RappelEchu[]> {
    const { results } = await this.db
      .prepare(`SELECT id, titre, rappel FROM elements
                WHERE rappel IS NOT NULL AND rappel_envoye_le IS NULL AND rappel <= ? AND archive_le IS NULL AND statut <> 'fait'
                ORDER BY rappel LIMIT 50`)
      .bind(maintenant.toISOString())
      .all<{ id: string; titre: string; rappel: string }>();
    return results.map((r) => ({ elementId: r.id, titre: r.titre, rappel: r.rappel }));
  }

  /** Note l'envoi, et marque le rappel parti (seulement s'il n'a pas changé entre-temps). */
  async noterEnvois(envois: readonly Envoi[], rappel: RappelEchu | null): Promise<void> {
    const instructions = envois.map((e) => this.db
      .prepare('INSERT INTO envois_push (id, element_id, titre, prevu_le, envoye_le, statut_http) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(e.id, e.elementId, e.titre, e.prevuLe, e.envoyeLe, e.statutHttp));
    if (rappel) {
      instructions.push(this.db.prepare('UPDATE elements SET rappel_envoye_le = ? WHERE id = ? AND rappel = ?')
        .bind(envois[0]?.envoyeLe ?? new Date().toISOString(), rappel.elementId, rappel.rappel));
    }
    if (instructions.length > 0) await this.db.batch(instructions);
  }

  /** Le téléphone signale qu'il a reçu la notification (la première fois seulement). */
  async noterReception(id: string, maintenant: Date): Promise<boolean> {
    const r = await this.db.prepare('UPDATE envois_push SET recu_le = ? WHERE id = ? AND recu_le IS NULL').bind(maintenant.toISOString(), id).run();
    return (r.meta.changes ?? 0) > 0;
  }

  /** Les derniers envois, du plus récent au plus ancien. */
  async envois(limite = 50): Promise<Envoi[]> {
    const { results } = await this.db
      .prepare('SELECT id, element_id, titre, prevu_le, envoye_le, statut_http, recu_le FROM envois_push ORDER BY envoye_le DESC, id LIMIT ?')
      .bind(limite)
      .all<{ id: string; element_id: string | null; titre: string; prevu_le: string; envoye_le: string; statut_http: number | null; recu_le: string | null }>();
    return results.map((r) => ({
      id: r.id, elementId: r.element_id, titre: r.titre, prevuLe: r.prevu_le, envoyeLe: r.envoye_le, statutHttp: r.statut_http, recuLe: r.recu_le,
    }));
  }
}

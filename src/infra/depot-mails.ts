// Les mails reçus (étape 8) : une ligne par mail, accepté ou refusé. Donnée technique, sans
// événement au journal (la tâche créée, elle, a le sien).
export interface MailRecu {
  readonly id: string;
  readonly recuLe: string;
  readonly expediteur: string;
  readonly sujet: string | null;
  readonly accepte: boolean;
  readonly raison: string | null;
  readonly authserv: string | null;
  readonly elementId: string | null;
}

export class DepotMails {
  constructor(private readonly db: D1Database) {}

  async noter(m: MailRecu): Promise<void> {
    await this.db.prepare(`INSERT INTO mails_recus (id, recu_le, expediteur, sujet, accepte, raison, authserv, element_id)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(m.id, m.recuLe, m.expediteur, m.sujet, m.accepte ? 1 : 0, m.raison, m.authserv, m.elementId).run();
  }

  async derniers(nombre: number): Promise<MailRecu[]> {
    const { results } = await this.db.prepare(`SELECT id, recu_le, expediteur, sujet, accepte, raison, authserv, element_id
                                               FROM mails_recus ORDER BY recu_le DESC LIMIT ?`).bind(nombre)
      .all<{ id: string; recu_le: string; expediteur: string; sujet: string | null; accepte: number; raison: string | null; authserv: string | null; element_id: string | null }>();
    return results.map((l) => ({ id: l.id, recuLe: l.recu_le, expediteur: l.expediteur, sujet: l.sujet, accepte: l.accepte === 1,
      raison: l.raison, authserv: l.authserv, elementId: l.element_id }));
  }
}

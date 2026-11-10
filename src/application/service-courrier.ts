// Un mail reçu devient une tâche (étape 8) : lire le mail, décider (domaine/courrier.ts), créer la
// tâche avec le tag source:mail, et noter le mail reçu, accepté ou refusé.
import { tacheDuCourrier, verdictCourrier, lireResultats } from '../domaine/courrier';
import { lireMail } from '../infra/courrier';
import { DepotMails, type MailRecu } from '../infra/depot-mails';
import { ServiceElements } from './service-elements';

export interface ReglagesCourrier {
  /** Les adresses d'Adrien, séparées par des virgules (secret du Worker). */
  readonly expediteurs: string | undefined;
  /** Le nom du serveur de Cloudflare qui signe le résultat d'authentification. */
  readonly authserv: string | undefined;
}

export type Issue = { readonly accepte: true; readonly elementId: string } | { readonly accepte: false; readonly raison: string };

export class ServiceCourrier {
  private readonly mails: DepotMails;

  constructor(private readonly db: D1Database, private readonly reglages: ReglagesCourrier,
    private readonly horloge: () => Date = () => new Date()) {
    this.mails = new DepotMails(db);
  }

  async recevoir(enveloppe: string, brut: ReadableStream<Uint8Array> | ArrayBuffer | string): Promise<Issue> {
    const mail = await lireMail(brut);
    const verdict = verdictCourrier({
      enveloppe, de: mail.de, resultats: mail.resultats,
      autorises: (this.reglages.expediteurs ?? '').split(','),
      authserv: this.reglages.authserv?.trim() || null,
    });
    const note: Omit<MailRecu, 'accepte' | 'raison' | 'elementId'> = {
      id: crypto.randomUUID(), recuLe: this.horloge().toISOString(), expediteur: enveloppe.slice(0, 320),
      sujet: mail.sujet?.slice(0, 300) ?? null, authserv: mail.resultats === null ? null : lireResultats(mail.resultats)?.authserv ?? null,
    };
    if (!verdict.accepte) {
      await this.mails.noter({ ...note, accepte: false, raison: verdict.raison, elementId: null });
      return verdict;
    }
    const { titre, description } = tacheDuCourrier(mail.sujet, mail.texte);
    const { element } = await new ServiceElements(this.db, this.horloge).creer({ titre, description, tags: ['source:mail'] }, 'adrien');
    await this.mails.noter({ ...note, accepte: true, raison: null, elementId: element.id });
    return { accepte: true, elementId: element.id };
  }

  derniers(): Promise<MailRecu[]> {
    return this.mails.derniers(10);
  }
}

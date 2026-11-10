// Les mesures des rappels (tâche 5.5), sans React : testées seules (tests/unitaires/interface-rappels.test.ts).
import type { EnvoiRappel } from './api';

/** Le retard d'un envoi : au départ du serveur, et à la réception par le téléphone (null : pas signalée). */
export interface Retard {
  readonly depart: number;
  readonly reception: number | null;
}

/** En secondes, depuis l'heure prévue. */
export function retardDe(e: EnvoiRappel): Retard {
  const prevu = Date.parse(e.prevuLe);
  return {
    depart: Math.round((Date.parse(e.envoyeLe) - prevu) / 1000),
    reception: e.recuLe === null ? null : Math.round((Date.parse(e.recuLe) - prevu) / 1000),
  };
}

/** Un retard lisible : « 12 s », « 3 min », « 2 h 05 ». */
export function duree(secondes: number): string {
  const s = Math.max(0, secondes);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600);
  return `${h} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')}`;
}

/**
 * Le bilan des envois : combien sont partis, combien le téléphone a signalé reçus, et le retard de
 * réception médian et le pire. C'est ce qui dira si Web Push suffit (étape 5, décision 5.7).
 */
export function bilan(envois: readonly EnvoiRappel[]): { envoyes: number; recus: number; median: number | null; pire: number | null } {
  const receptions = envois.map((e) => retardDe(e).reception).filter((r): r is number => r !== null).sort((a, b) => a - b);
  const milieu = Math.floor(receptions.length / 2);
  const median = receptions.length === 0 ? null
    : receptions.length % 2 === 1 ? (receptions[milieu] ?? null) : Math.round(((receptions[milieu - 1] ?? 0) + (receptions[milieu] ?? 0)) / 2);
  return { envoyes: envois.length, recus: receptions.length, median, pire: receptions.at(-1) ?? null };
}

/** La clé publique VAPID (base64url) en octets, comme l'attend pushManager.subscribe. */
export function octetsDeCle(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

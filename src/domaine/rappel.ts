// L'heure d'un rappel (tâche 5.5) : un instant précis, rangé en UTC (« 2026-11-12T08:30:00.000Z »).
import { ErreurDomaine } from './erreur-domaine';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const LOCALE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;

/**
 * Lit l'heure d'un rappel. Deux écritures : un instant ISO avec son fuseau (« …Z », « …+01:00 »),
 * ce qu'envoie l'écran ; ou une heure de Paris sans fuseau, « AAAA-MM-JJ HH:MM », ce qu'écrit Claude.
 */
export function lireRappel(texte: string): Date {
  const t = texte.trim();
  const locale = LOCALE.exec(t);
  const date = locale ? depuisHeureDeParis(locale.slice(1).map(Number) as [number, number, number, number, number]) : ISO.test(t) ? new Date(t) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new ErreurDomaine(`Rappel « ${texte} » illisible : écrire AAAA-MM-JJ HH:MM (heure de Paris).`);
  }
  return date;
}

/** L'instant d'une heure de Paris : l'écart avec UTC (1 h ou 2 h selon l'heure d'été) se lit dans Intl. */
function depuisHeureDeParis([a, mo, j, h, mi]: [number, number, number, number, number]): Date | null {
  const commeUtc = Date.UTC(a, mo - 1, j, h, mi);
  const verif = new Date(commeUtc);
  if (verif.getUTCMonth() !== mo - 1 || verif.getUTCDate() !== j || h > 23 || mi > 59) return null;
  // Deux passes : l'écart pris à l'heure devinée, puis à l'heure corrigée (changement d'heure).
  let instant = commeUtc - ecartParis(commeUtc);
  instant = commeUtc - ecartParis(instant);
  return new Date(instant);
}

/** L'avance de Paris sur UTC à cet instant, en millisecondes. */
function ecartParis(instant: number): number {
  const morceaux = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(instant));
  const v = (type: string): number => Number(morceaux.find((m) => m.type === type)?.value);
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute')) - Math.floor(instant / 60000) * 60000;
}

/** Le jour et l'heure de Paris d'un instant : « 2026-11-12 », « 08:30 ». */
export function aParis(instant: Date): { jour: string; heure: string } {
  const texte = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(instant);
  return { jour: texte.slice(0, 10), heure: texte.slice(11, 16) };
}

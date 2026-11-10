// L'horizon d'un élément (étape 7, décision 007) : la période où on veut l'avoir fait, à la
// Timestripe. Sept échelles : un jour, une semaine, un mois, un trimestre, une année, une décennie,
// et « un jour » (la vie, sans date). Ce n'est pas une échéance : « 2027 » dit l'année visée, pas
// le dernier jour.
//
// Chaque horizon a une forme rangée unique, qui se trie et se cherche en SQL :
//   2026-11-10 (jour), 2026-S46 (semaine ISO), 2026-11 (mois), 2026-T4 (trimestre), 2026 (année),
//   2020-2029 (décennie), vie.
// Il se saisit aussi en français : « semaine 46 », « novembre 2026 », « T4 », « l'an prochain »,
// « années 2030 », « un jour ». Les formes relatives se comptent au jour de Paris.
import { ErreurDomaine } from './erreur-domaine';

export type Echelle = 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee' | 'decennie' | 'vie';

export const ECHELLES: readonly Echelle[] = ['jour', 'semaine', 'mois', 'trimestre', 'annee', 'decennie', 'vie'];

const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MOIS_LISIBLES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const AIDE = 'écrire par exemple « 2026-11-10 », « semaine 46 », « novembre 2026 », « T4 2026 », « 2027 », « années 2030 » ou « un jour »';

const deux = (n: number): string => String(n).padStart(2, '0');
const enDate = (jour: string): Date => new Date(`${jour}T00:00:00Z`);
const versJour = (d: Date): string => d.toISOString().slice(0, 10);

/** Sans accents ni majuscules, espaces simples. */
function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
}

/** La semaine ISO d'un jour : l'année de la semaine (celle de son jeudi) et son numéro. */
function semaineIso(jour: string): { annee: number; numero: number } {
  const d = enDate(jour);
  const jeudi = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);
  const annee = jeudi.getUTCFullYear();
  const premier = Date.UTC(annee, 0, 1);
  return { annee, numero: Math.floor((jeudi.getTime() - premier) / (7 * 86_400_000)) + 1 };
}

/** Le lundi de la semaine ISO `numero` de `annee`. */
function lundiDe(annee: number, numero: number): string {
  const quatre = new Date(Date.UTC(annee, 0, 4)); // le 4 janvier est toujours en semaine 1
  const lundi1 = quatre.getTime() - ((quatre.getUTCDay() + 6) % 7) * 86_400_000;
  return versJour(new Date(lundi1 + (numero - 1) * 7 * 86_400_000));
}

function semainesDansAnnee(annee: number): number {
  return semaineIso(`${annee}-12-28`).numero; // le 28 décembre est toujours dans la dernière semaine
}

function jourValide(a: number, m: number, j: number): boolean {
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

/** Objet-valeur « horizon » : une échelle et sa période, écrite sous sa forme rangée. */
export class Horizon {
  private constructor(public readonly echelle: Echelle, public readonly texte: string) {}

  /** L'horizon de cette échelle qui contient ce jour (AAAA-MM-JJ) ; pour la vie, toujours « vie ». */
  static contenant(echelle: Echelle, jour: string): Horizon {
    const a = Number(jour.slice(0, 4));
    const m = Number(jour.slice(5, 7));
    switch (echelle) {
      case 'jour': return new Horizon('jour', jour);
      case 'semaine': { const s = semaineIso(jour); return new Horizon('semaine', `${s.annee}-S${deux(s.numero)}`); }
      case 'mois': return new Horizon('mois', jour.slice(0, 7));
      case 'trimestre': return new Horizon('trimestre', `${a}-T${Math.ceil(m / 3)}`);
      case 'annee': return new Horizon('annee', String(a));
      case 'decennie': { const d = a - (a % 10); return new Horizon('decennie', `${d}-${d + 9}`); }
      case 'vie': return new Horizon('vie', 'vie');
    }
  }

  /** Lit un horizon écrit sous sa forme rangée ou en français ; `aujourdhui` sert aux formes relatives. */
  static lire(texte: string, aujourdhui: string): Horizon {
    const t = simplifier(texte);
    const annee = Number(aujourdhui.slice(0, 4));
    const refus = (): never => { throw new ErreurDomaine(`Horizon non compris : « ${texte} » (${AIDE}).`); };
    let m: RegExpExecArray | null;

    // Les formes rangées.
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) {
      if (!jourValide(Number(m[1]), Number(m[2]), Number(m[3]))) refus();
      return new Horizon('jour', t);
    }
    if ((m = /^(\d{4})-[sw](\d{1,2})$/.exec(t))) return Horizon.semaine(Number(m[1]), Number(m[2]), texte);
    if ((m = /^(\d{4})-(\d{2})$/.exec(t))) {
      const mois = Number(m[2]);
      if (mois < 1 || mois > 12) refus();
      return new Horizon('mois', t);
    }
    if ((m = /^(\d{4})-[tq]([1-4])$/.exec(t))) return new Horizon('trimestre', `${m[1]}-T${m[2]}`);
    if ((m = /^(\d{4})$/.exec(t))) return new Horizon('annee', t);
    if ((m = /^(\d{3})0-(\d{3})9$/.exec(t)) && m[1] === m[2]) return Horizon.contenant('decennie', `${m[1]}0-01-01`);
    if (/^(?:vie|un jour(?: peut etre)?|plus tard|someday|ma vie|dans la vie)$/.test(t)) return new Horizon('vie', 'vie');

    // Les formes relatives.
    const relatif: Record<string, [Echelle, number]> = {
      'aujourd hui': ['jour', 0], 'demain': ['jour', 1],
      'cette semaine': ['semaine', 0], 'semaine prochaine': ['semaine', 1], 'la semaine prochaine': ['semaine', 1],
      'ce mois': ['mois', 0], 'ce mois ci': ['mois', 0], 'mois prochain': ['mois', 1], 'le mois prochain': ['mois', 1],
      'ce trimestre': ['trimestre', 0], 'trimestre prochain': ['trimestre', 1], 'le trimestre prochain': ['trimestre', 1],
      'cette annee': ['annee', 0], 'annee prochaine': ['annee', 1], 'l annee prochaine': ['annee', 1], 'l an prochain': ['annee', 1],
      'cette decennie': ['decennie', 0], 'decennie prochaine': ['decennie', 1], 'la decennie prochaine': ['decennie', 1],
    };
    const r = relatif[t];
    if (r) return Horizon.contenant(r[0], aujourdhui).decaler(r[1]);

    // « semaine 46 », « s46 2027 »
    if ((m = /^(?:semaine|sem|s) ?(\d{1,2})(?: (\d{4}))?$/.exec(t))) {
      return Horizon.semaine(m[2] ? Number(m[2]) : semaineIso(aujourdhui).annee, Number(m[1]), texte);
    }
    // « novembre », « novembre 2026 »
    if ((m = /^([a-z]+)(?: (\d{4}))?$/.exec(t)) && MOIS.includes(m[1] ?? '')) {
      return new Horizon('mois', `${m[2] ?? annee}-${deux(MOIS.indexOf(m[1] ?? '') + 1)}`);
    }
    // « T4 », « T4 2026 », « Q4 2026 », « 4e trimestre 2026 », « trimestre 4 »
    if ((m = /^(?:[tq]([1-4])|([1-4])(?:e|er|eme) trimestre|trimestre ([1-4]))(?: (\d{4}))?$/.exec(t))) {
      return new Horizon('trimestre', `${m[4] ?? annee}-T${m[1] ?? m[2] ?? m[3]}`);
    }
    // « années 2030 », « 2030s », « décennie 2030 »
    if ((m = /^(?:annees |decennie )?(\d{3})0s?$/.exec(t))) return Horizon.contenant('decennie', `${m[1]}0-01-01`);
    return refus();
  }

  /** Relit un horizon rangé (venu de la base ou d'un instantané) : sa forme ne dépend pas du jour. */
  static depuisRangee(texte: string): Horizon {
    return Horizon.lire(texte, '2000-01-01');
  }

  private static semaine(annee: number, numero: number, texte: string): Horizon {
    if (numero < 1 || numero > semainesDansAnnee(annee)) {
      throw new ErreurDomaine(`Horizon non compris : « ${texte} » (l'année ${annee} n'a pas de semaine ${numero}).`);
    }
    return new Horizon('semaine', `${annee}-S${deux(numero)}`);
  }

  /** Le premier jour de la période (AAAA-MM-JJ) ; null pour la vie. */
  get debut(): string | null {
    const t = this.texte;
    switch (this.echelle) {
      case 'jour': return t;
      case 'semaine': return lundiDe(Number(t.slice(0, 4)), Number(t.slice(6)));
      case 'mois': return `${t}-01`;
      case 'trimestre': return `${t.slice(0, 4)}-${deux((Number(t.slice(6)) - 1) * 3 + 1)}-01`;
      case 'annee': return `${t}-01-01`;
      case 'decennie': return `${t.slice(0, 4)}-01-01`;
      case 'vie': return null;
    }
  }

  /** La période d'à côté de la même échelle : -1 la précédente, 1 la suivante. La vie reste la vie. */
  decaler(n: number): Horizon {
    const debut = this.debut;
    if (debut === null || n === 0) return this;
    const d = enDate(debut);
    const a = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    switch (this.echelle) {
      case 'jour': return Horizon.contenant('jour', versJour(new Date(d.getTime() + n * 86_400_000)));
      case 'semaine': return Horizon.contenant('semaine', versJour(new Date(d.getTime() + n * 7 * 86_400_000)));
      case 'mois': return Horizon.contenant('mois', versJour(new Date(Date.UTC(a, mo + n, 1))));
      case 'trimestre': return Horizon.contenant('trimestre', versJour(new Date(Date.UTC(a, mo + 3 * n, 1))));
      case 'annee': return Horizon.contenant('annee', `${a + n}-01-01`);
      case 'decennie': return Horizon.contenant('decennie', `${a + 10 * n}-01-01`);
      case 'vie': return this;
    }
  }

  /** En français, pour l'écran : « semaine 46 (2026) », « novembre 2026 », « 4e trimestre 2026 »… */
  get libelle(): string {
    const t = this.texte;
    switch (this.echelle) {
      case 'jour': { const d = enDate(t); return `${d.getUTCDate()} ${MOIS_LISIBLES[d.getUTCMonth()] ?? ''} ${d.getUTCFullYear()}`; }
      case 'semaine': return `semaine ${Number(t.slice(6))} (${t.slice(0, 4)})`;
      case 'mois': return `${MOIS_LISIBLES[Number(t.slice(5)) - 1] ?? ''} ${t.slice(0, 4)}`;
      case 'trimestre': { const q = Number(t.slice(6)); return `${q}${q === 1 ? 'er' : 'e'} trimestre ${t.slice(0, 4)}`; }
      case 'annee': return t;
      case 'decennie': return `années ${t.slice(0, 4)}`;
      case 'vie': return 'un jour';
    }
  }

  egale(autre: Horizon): boolean { return this.texte === autre.texte; }
}

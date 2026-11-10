// La règle de récurrence d'une tâche (tâche 5.6). Cocher une tâche récurrente crée la suivante.
//
// Deux modes :
// - à date fixe : « chaque lundi », « le 1er du mois », « tous les 2 mois ». La suivante tombe à la
//   prochaine date de la règle après la date de la tâche (et après aujourd'hui, si on l'a cochée en
//   retard) ;
// - après achèvement : « 3 mois après fait ». La suivante se réveille ce délai après le jour où la
//   tâche est cochée : elle est prévue ce jour-là, sans échéance (Adrien, 07/11/2026 : l'entretien
//   des chaussures de randonnée).
import { ErreurDomaine } from './erreur-domaine';
import { Jour } from './jour';

export type Unite = 'jour' | 'semaine' | 'mois' | 'an';

type Regle =
  | { readonly mode: 'intervalle'; readonly nombre: number; readonly unite: Unite }
  | { readonly mode: 'jour_semaine'; readonly jour: number }
  | { readonly mode: 'jour_mois'; readonly jour: number }
  | { readonly mode: 'apres_fait'; readonly nombre: number; readonly unite: Unite };

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const UNITES: Record<string, Unite> = {
  j: 'jour', jour: 'jour', jours: 'jour',
  s: 'semaine', sem: 'semaine', semaine: 'semaine', semaines: 'semaine',
  m: 'mois', mois: 'mois',
  a: 'an', an: 'an', ans: 'an', annee: 'an', annees: 'an',
};
const AIDE = 'écrire par exemple « chaque lundi », « le 1er du mois », « tous les 2 mois », « 3 mois après fait »';

/** Sans accents ni majuscules, espaces simples : « Après » et « apres » se lisent pareil. */
function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Objet-valeur « récurrence » : la règle, et son texte rangé sous une forme unique. */
export class Recurrence {
  private constructor(private readonly regle: Regle) {}

  get apresFait(): boolean { return this.regle.mode === 'apres_fait'; }

  /** Lit une règle écrite en français ; refuse ce qu'elle ne comprend pas. */
  static lire(texte: string): Recurrence {
    const t = simplifier(texte);
    let m: RegExpExecArray | null;
    // « 3 mois après fait », « 3 mois après l'avoir faite », « 90j apres fait »
    if ((m = /^(\d+) ?([a-z]+) (?:apres|plus tard)(?: (?:fait|faite|l avoir faite?|achevement|l avoir fait))?$/.exec(t)) && UNITES[m[2] ?? '']) {
      return Recurrence.verifier({ mode: 'apres_fait', nombre: Number(m[1]), unite: UNITES[m[2] ?? ''] as Unite }, texte);
    }
    // « chaque jour », « chaque semaine », « chaque mois », « chaque annee », « tous les ans »
    if ((m = /^(?:chaque|tous les|toutes les) ([a-z]+)$/.exec(t)) && UNITES[m[1] ?? ''] && !JOURS.includes(m[1] ?? '')) {
      return new Recurrence({ mode: 'intervalle', nombre: 1, unite: UNITES[m[1] ?? ''] as Unite });
    }
    // « tous les 2 mois », « toutes les 3 semaines », « tous les 10 jours »
    if ((m = /^(?:tous les|toutes les|chaque|tou(?:te)?s? les) (\d+) ?([a-z]+)$/.exec(t)) && UNITES[m[2] ?? '']) {
      return Recurrence.verifier({ mode: 'intervalle', nombre: Number(m[1]), unite: UNITES[m[2] ?? ''] as Unite }, texte);
    }
    // « chaque lundi », « tous les lundis », « le lundi »
    if ((m = /^(?:chaque|tous les|le) ([a-z]+?)s?$/.exec(t)) && JOURS.includes(m[1] ?? '')) {
      return new Recurrence({ mode: 'jour_semaine', jour: JOURS.indexOf(m[1] ?? '') });
    }
    // « le 1er du mois », « le 15 de chaque mois », « chaque mois le 15 »
    if ((m = /^(?:le (\d+)(?:er|e)? (?:du|de chaque) mois|chaque mois le (\d+)(?:er|e)?)$/.exec(t))) {
      const jour = Number(m[1] ?? m[2]);
      if (jour < 1 || jour > 31) throw new ErreurDomaine(`Récurrence « ${texte} » : le jour du mois va de 1 à 31.`);
      return new Recurrence({ mode: 'jour_mois', jour });
    }
    throw new ErreurDomaine(`Récurrence « ${texte} » incomprise : ${AIDE}.`);
  }

  private static verifier(regle: Regle & { nombre: number }, texte: string): Recurrence {
    if (!Number.isInteger(regle.nombre) || regle.nombre < 1 || regle.nombre > 1000) {
      throw new ErreurDomaine(`Récurrence « ${texte} » : le nombre va de 1 à 1000.`);
    }
    return new Recurrence(regle);
  }

  /** Le texte rangé, une seule forme par règle : « tous les 2 mois », « chaque lundi », « 3 mois après fait ». */
  get texte(): string {
    const r = this.regle;
    switch (r.mode) {
      case 'intervalle':
        if (r.nombre === 1) return { jour: 'chaque jour', semaine: 'chaque semaine', mois: 'chaque mois', an: 'chaque année' }[r.unite];
        return `${r.unite === 'semaine' ? 'toutes les' : 'tous les'} ${r.nombre} ${pluriel(r.nombre, r.unite)}`;
      case 'jour_semaine':
        return `chaque ${JOURS[r.jour] ?? ''}`;
      case 'jour_mois':
        return `le ${r.jour === 1 ? '1er' : r.jour} du mois`;
      case 'apres_fait':
        return `${r.nombre} ${pluriel(r.nombre, r.unite)} après fait`;
    }
  }

  /**
   * Le jour de la suivante.
   * - Date fixe : la première date de la règle après `base` (la date de la tâche), et après
   *   `aujourdhui` si on a coché en retard.
   * - Après achèvement : `aujourdhui` (le jour où on coche) plus le délai.
   */
  prochaine(base: Jour, aujourdhui: Jour): Jour {
    const r = this.regle;
    if (r.mode === 'apres_fait') return ajouter(aujourdhui, r.nombre, r.unite);
    let jour = suivant(r, base);
    while (jour.valeur <= aujourdhui.valeur) jour = suivant(r, jour);
    return jour;
  }
}

function pluriel(n: number, unite: Unite): string {
  if (unite === 'mois') return 'mois';
  return n > 1 ? `${unite}s` : unite;
}

function suivant(r: Exclude<Regle, { mode: 'apres_fait' }>, depuis: Jour): Jour {
  if (r.mode === 'intervalle') return ajouter(depuis, r.nombre, r.unite);
  const d = enDate(depuis);
  if (r.mode === 'jour_semaine') {
    const ecart = ((r.jour - d.getUTCDay() + 7) % 7) || 7;
    return ajouter(depuis, ecart, 'jour');
  }
  // Le N du mois : ce mois-ci s'il est encore à venir, sinon le mois suivant (le 31 devient le dernier jour).
  const ceMois = jourDuMois(d.getUTCFullYear(), d.getUTCMonth(), r.jour);
  if (ceMois.valeur > depuis.valeur) return ceMois;
  return jourDuMois(d.getUTCFullYear(), d.getUTCMonth() + 1, r.jour);
}

function enDate(j: Jour): Date {
  return new Date(`${j.valeur}T00:00:00Z`);
}

function versJour(d: Date): Jour {
  return Jour.creer(d.toISOString().slice(0, 10));
}

/** Le jour voulu du mois, ou le dernier jour du mois s'il est plus court (le 31 février devient le 28 ou 29). */
function jourDuMois(annee: number, mois: number, jour: number): Jour {
  const dernier = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  return versJour(new Date(Date.UTC(annee, mois, Math.min(jour, dernier))));
}

/** Ajoute des jours, semaines, mois ou années ; un 31 plus un mois reste dans le mois suivant. */
export function ajouter(j: Jour, nombre: number, unite: Unite): Jour {
  const d = enDate(j);
  if (unite === 'jour' || unite === 'semaine') {
    return versJour(new Date(d.getTime() + nombre * (unite === 'semaine' ? 7 : 1) * 86_400_000));
  }
  const mois = unite === 'mois' ? nombre : nombre * 12;
  return jourDuMois(d.getUTCFullYear(), d.getUTCMonth() + mois, d.getUTCDate());
}

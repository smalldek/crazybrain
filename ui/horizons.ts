// La vue horizons (tâche 7.2), à la Timestripe : une colonne par échelle (jour, semaine, mois,
// trimestre, année, décennie, un jour), chacune sur sa période en cours, qu'on peut avancer ou
// reculer. Un élément paraît dans la colonne de son horizon. Ici, le calcul, sans React.
import { ECHELLES, Horizon, type Echelle } from '../src/domaine/horizon';
import type { Element } from './api';

export const NOMS_ECHELLES: Record<Echelle, string> = {
  jour: 'Jour', semaine: 'Semaine', mois: 'Mois', trimestre: 'Trimestre', annee: 'Année', decennie: 'Décennie', vie: 'Un jour',
};

export interface Colonne {
  readonly echelle: Echelle;
  readonly horizon: Horizon;
  /** 0 : la période en cours ; 1 la suivante, -1 la précédente… */
  readonly decalage: number;
  readonly elements: readonly Element[];
}

/** Le texte lisible d'un horizon rangé (« semaine 46 (2026) ») ; le texte tel quel s'il ne se lit pas. */
export function libelleHorizon(texte: string): string {
  try {
    return Horizon.depuisRangee(texte).libelle;
  } catch {
    return texte;
  }
}

/** Pas faits d'abord, puis le rang, puis le titre. */
function ordonner(liste: readonly Element[]): Element[] {
  return [...liste].sort((a, b) => Number(a.statut === 'fait') - Number(b.statut === 'fait')
    || (a.rang ?? Infinity) - (b.rang ?? Infinity) || a.titre.localeCompare(b.titre, 'fr'));
}

/** Les sept colonnes, chacune sur sa période (celle d'aujourd'hui, décalée), avec ses éléments. */
export function colonnes(elements: readonly Element[], aujourdhui: string, decalages: Partial<Record<Echelle, number>> = {}): Colonne[] {
  return ECHELLES.map((echelle) => {
    const decalage = decalages[echelle] ?? 0;
    const horizon = Horizon.contenant(echelle, aujourdhui).decaler(decalage);
    return { echelle, horizon, decalage, elements: ordonner(elements.filter((e) => e.horizon === horizon.texte && e.archiveLe === null)) };
  });
}

/**
 * Les éléments dont l'horizon est passé sans qu'ils soient faits : la période suivante a déjà
 * commencé. Du plus ancien au plus récent.
 */
export function depasses(elements: readonly Element[], aujourdhui: string): Element[] {
  const fin = new Map<string, string | null>();
  const passe = (texte: string): boolean => {
    if (!fin.has(texte)) {
      try { fin.set(texte, Horizon.depuisRangee(texte).decaler(1).debut); } catch { fin.set(texte, null); }
    }
    const suivante = fin.get(texte);
    return suivante !== null && suivante !== undefined && suivante <= aujourdhui;
  };
  return elements
    .filter((e) => e.horizon !== null && e.statut !== 'fait' && e.archiveLe === null && passe(e.horizon))
    .sort((a, b) => debutDe(a.horizon).localeCompare(debutDe(b.horizon)) || a.titre.localeCompare(b.titre, 'fr'));
}

/** Le premier jour d'un horizon rangé, pour trier dans le temps à travers les échelles. */
function debutDe(texte: string | null): string {
  try {
    return texte === null ? '9999' : Horizon.depuisRangee(texte).debut ?? '9999';
  } catch {
    return '9999';
  }
}

/** Les décalages des colonnes dans l'adresse : « semaine:1,annee:-1 » ; ce qui ne se lit pas est ignoré. */
export function lireDecalages(texte: string | null): Partial<Record<Echelle, number>> {
  const lus: Partial<Record<Echelle, number>> = {};
  for (const morceau of (texte ?? '').split(',')) {
    const [cle, valeur] = morceau.split(':');
    const n = Number(valeur);
    if ((ECHELLES as readonly string[]).includes(cle ?? '') && Number.isInteger(n) && n !== 0) lus[cle as Echelle] = n;
  }
  return lus;
}

export function ecrireDecalages(decalages: Partial<Record<Echelle, number>>): string {
  return ECHELLES.filter((e) => (decalages[e] ?? 0) !== 0).map((e) => `${e}:${decalages[e] ?? 0}`).join(',');
}

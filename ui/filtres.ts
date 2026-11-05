// Les filtres et le backlog, sans React : testés seuls (tests/unitaires/interface-filtres.test.ts).
// Les filtres vivent dans l'adresse (`?tag=composant:pxe&priorite=haute`) : une vue filtrée se
// garde, se recharge et se partage. Ils s'appliquent à toutes les vues.
import type { Element } from './api';

/** Les filtres possibles ; un champ absent ne filtre pas. */
export interface Filtres {
  /** Un morceau du titre ou de la description, sans tenir compte des majuscules ni des accents. */
  readonly texte?: string;
  readonly type?: string;
  readonly statut?: string;
  /** Une priorité, ou `aucune`. */
  readonly priorite?: string;
  /** `cle` (n'importe quelle valeur) ou `cle:valeur`. */
  readonly tag?: string;
  /** Un élément : on garde ce qu'il contient, à toute profondeur (un projet et ses sous-projets). */
  readonly dans?: string;
  /** `en_retard`, `semaine` (d'ici 7 jours, retard compris), `sans`. */
  readonly echeance?: string;
}

export const CLES_FILTRES = ['texte', 'type', 'statut', 'priorite', 'tag', 'dans', 'echeance'] as const;

export function lireFiltres(p: URLSearchParams): Filtres {
  const f: Record<string, string> = {};
  for (const cle of CLES_FILTRES) {
    const v = p.get(cle);
    if (v !== null && v.trim() !== '') f[cle] = v;
  }
  return f;
}

/** Les paramètres de l'adresse une fois ce filtre changé (les autres paramètres restent). */
export function avecFiltre(p: URLSearchParams, cle: (typeof CLES_FILTRES)[number], valeur: string | null): URLSearchParams {
  const copie = new URLSearchParams(p);
  if (valeur === null || valeur.trim() === '') copie.delete(cle);
  else copie.set(cle, valeur);
  return copie;
}

export function nombreDeFiltres(f: Filtres): number {
  return CLES_FILTRES.filter((c) => c !== 'texte' && f[c] !== undefined).length;
}

/** Pour comparer sans majuscules ni accents : « Éléphant » et « elephant » se trouvent. */
function simple(texte: string): string {
  return texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr');
}

/** Le jour AAAA-MM-JJ, `n` jours plus tard. */
function plusJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Les ids de l'élément et de tout ce qu'il contient, à toute profondeur. */
function contenus(racine: string, elements: readonly Element[]): Set<string> {
  const enfants = new Map<string, string[]>();
  for (const e of elements) if (e.parent) enfants.set(e.parent, [...(enfants.get(e.parent) ?? []), e.id]);
  const vus = new Set<string>();
  const aVoir = [...(enfants.get(racine) ?? [])];
  while (aVoir.length > 0) {
    const id = aVoir.pop() ?? '';
    if (vus.has(id)) continue;
    vus.add(id);
    aVoir.push(...(enfants.get(id) ?? []));
  }
  return vus;
}

/**
 * Les éléments qui passent tous les filtres. `tags` : les tags de chaque élément, en texte ;
 * `aujourdhui` : le jour AAAA-MM-JJ, pour les échéances.
 */
export function filtrer(
  elements: readonly Element[], f: Filtres, tags: ReadonlyMap<string, readonly string[]>, aujourdhui: string,
): Element[] {
  const dans = f.dans ? contenus(f.dans, elements) : null;
  const texte = f.texte ? simple(f.texte.trim()) : '';
  return elements.filter((e) => {
    if (texte && !simple(`${e.titre} ${e.description ?? ''}`).includes(texte)) return false;
    if (f.type && e.type !== f.type) return false;
    if (f.statut && e.statut !== f.statut) return false;
    if (f.priorite && (f.priorite === 'aucune' ? e.priorite !== null : e.priorite !== f.priorite)) return false;
    if (f.tag) {
      const siens = tags.get(e.id) ?? [];
      const avecValeur = f.tag.includes(':');
      if (!siens.some((t) => (avecValeur ? t === f.tag : t === f.tag || t.startsWith(`${f.tag}:`)))) return false;
    }
    if (dans && !dans.has(e.id)) return false;
    if (f.echeance === 'sans' && e.echeance !== null) return false;
    if (f.echeance === 'en_retard' && !(e.echeance !== null && e.echeance < aujourdhui && e.statut !== 'fait')) return false;
    if (f.echeance === 'semaine' && !(e.echeance !== null && e.echeance <= plusJours(aujourdhui, 7) && e.statut !== 'fait')) return false;
    return true;
  });
}

const POIDS_PRIORITE: Record<string, number> = { urgente: 0, haute: 1, normale: 2, basse: 3 };

/**
 * Le backlog : ce qui n'est ni fait ni planifié (pas de jour prévu), trié par priorité (sans
 * priorité en dernier), puis par échéance (la plus proche d'abord), puis du plus ancien au plus récent.
 */
export function backlog(elements: readonly Element[]): Element[] {
  return elements
    .filter((e) => e.statut !== 'fait' && e.jourPlanifie === null)
    .sort((a, b) =>
      (POIDS_PRIORITE[a.priorite ?? ''] ?? 9) - (POIDS_PRIORITE[b.priorite ?? ''] ?? 9)
      || (a.echeance ?? '9999').localeCompare(b.echeance ?? '9999')
      || a.creeLe.localeCompare(b.creeLe));
}

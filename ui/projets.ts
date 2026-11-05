// Les projets et les releases, sans React : testés seuls (tests/unitaires/interface-projets.test.ts).
// Un projet est un élément de type « projet » ; un sous-projet a un projet pour parent (à n'importe
// quelle profondeur). Une release est un tag `release:<nom>` : elle groupe ce qui doit sortir ensemble.
import type { Element } from './api';

/** Où en est un ensemble d'éléments : combien sont faits, sur combien. */
export interface Avancement {
  readonly faits: number;
  readonly total: number;
}

/** Une ligne de l'arbre des projets : le projet, sa profondeur (0 en haut), son avancement. */
export interface LigneProjet {
  readonly projet: Element;
  readonly profondeur: number;
  readonly avancement: Avancement;
}

function enfantsParParent(elements: readonly Element[]): Map<string, Element[]> {
  const enfants = new Map<string, Element[]>();
  for (const e of elements) if (e.parent) enfants.set(e.parent, [...(enfants.get(e.parent) ?? []), e]);
  return enfants;
}

/**
 * L'avancement d'un projet : les éléments qu'il contient, à toute profondeur, sauf les sous-projets
 * eux-mêmes (on compte le travail, pas les dossiers).
 */
function avancementDe(id: string, enfants: ReadonlyMap<string, readonly Element[]>): Avancement {
  let faits = 0;
  let total = 0;
  const vus = new Set<string>([id]);
  const aVoir = [...(enfants.get(id) ?? [])];
  while (aVoir.length > 0) {
    const e = aVoir.pop();
    if (!e || vus.has(e.id)) continue;
    vus.add(e.id);
    if (e.type !== 'projet') {
      total += 1;
      if (e.statut === 'fait') faits += 1;
    }
    aVoir.push(...(enfants.get(e.id) ?? []));
  }
  return { faits, total };
}

/**
 * Les projets en arbre, dans l'ordre de lecture : un projet, puis ses sous-projets en retrait,
 * par ordre alphabétique à chaque niveau. Un projet rangé sous une tâche (permis) part à la racine
 * de l'arbre, pour ne pas disparaître.
 */
export function arbreProjets(elements: readonly Element[]): LigneProjet[] {
  const enfants = enfantsParParent(elements);
  const projets = elements.filter((e) => e.type === 'projet');
  const ids = new Set(projets.map((p) => p.id));
  const parTitre = (a: Element, b: Element): number => a.titre.localeCompare(b.titre, 'fr');
  const lignes: LigneProjet[] = [];
  const vus = new Set<string>();
  const descendre = (p: Element, profondeur: number): void => {
    if (vus.has(p.id)) return;
    vus.add(p.id);
    lignes.push({ projet: p, profondeur, avancement: avancementDe(p.id, enfants) });
    for (const sous of (enfants.get(p.id) ?? []).filter((e) => e.type === 'projet').sort(parTitre)) descendre(sous, profondeur + 1);
  };
  for (const p of projets.filter((p) => !p.parent || !ids.has(p.parent)).sort(parTitre)) descendre(p, 0);
  return lignes;
}

/** Une release : son nom, et l'avancement des éléments qui portent son tag. */
export interface Release {
  readonly nom: string;
  readonly avancement: Avancement;
}

/**
 * Les releases, d'après les tags `release:<nom>` posés (`tags` : les tags de chaque élément, en
 * texte). Les releases encore ouvertes d'abord, puis celles où tout est fait ; par nom à l'intérieur.
 */
export function releases(elements: readonly Element[], tags: ReadonlyMap<string, readonly string[]>): Release[] {
  const parNom = new Map<string, { faits: number; total: number }>();
  for (const e of elements) {
    for (const t of tags.get(e.id) ?? []) {
      if (!t.startsWith('release:') || t.length === 'release:'.length) continue;
      const nom = t.slice('release:'.length);
      const a = parNom.get(nom) ?? { faits: 0, total: 0 };
      a.total += 1;
      if (e.statut === 'fait') a.faits += 1;
      parNom.set(nom, a);
    }
  }
  const finie = (a: Avancement): number => Number(a.faits === a.total);
  return [...parNom]
    .map(([nom, avancement]) => ({ nom, avancement }))
    .sort((a, b) => finie(a.avancement) - finie(b.avancement) || a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
}

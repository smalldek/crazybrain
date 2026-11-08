// La vue en cercles, sans React : quel élément au centre, quelles parts autour, à quels angles.
// Testé seul (tests/unitaires/interface-cercles.test.ts). Les règles de poids et d'avancement
// viennent du domaine (src/domaine/cercles.ts), les mêmes que côté serveur.
import { avancementDeRacines, avancementsCalcules, parts } from '../src/domaine/cercles';
import type { Element } from './api';

/** Le nombre d'anneaux montrés, par défaut et au plus. */
export const ANNEAUX_PAR_DEFAUT = 3;
export const ANNEAUX_MAX = 6;
/** Le nombre de couleurs de branche (styles.css : .branche-0 à .branche-7). */
export const COULEURS = 8;

/** Une part dessinée : l'élément, son anneau (1 = le plus proche du centre), ses angles en radians. */
export interface Part {
  readonly element: Element;
  readonly anneau: number;
  readonly debut: number;
  readonly fin: number;
  /** Sa part dans son parent, entre 0 et 1. */
  readonly part: number;
  /** De 0 à 100. */
  readonly avancement: number;
  /** L'avancement est-il calculé (l'élément a des enfants) ? */
  readonly calcule: boolean;
  /** La couleur de sa branche (0 à COULEURS − 1), celle de son ancêtre du premier anneau. */
  readonly couleur: number;
}

/** Le dessin entier : le centre (null : « Tout »), son avancement, et les parts. */
export interface Disposition {
  readonly centre: Element | null;
  readonly avancementCentre: number;
  readonly parts: readonly Part[];
}

/** L'ordre des sœurs : le rang choisi à la main d'abord (plus petit en premier), puis la plus ancienne. */
export function ordreDesSoeurs(a: Element, b: Element): number {
  const ra = a.rang ?? Number.POSITIVE_INFINITY;
  const rb = b.rang ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra < rb ? -1 : 1;
  return a.creeLe.localeCompare(b.creeLe) || a.id.localeCompare(b.id);
}

/** Les enfants de chaque élément, dans l'ordre des sœurs. */
export function enfantsParParent(elements: readonly Element[]): Map<string, Element[]> {
  const enfants = new Map<string, Element[]>();
  for (const e of elements) if (e.parent) enfants.set(e.parent, [...(enfants.get(e.parent) ?? []), e]);
  for (const liste of enfants.values()) liste.sort(ordreDesSoeurs);
  return enfants;
}

/**
 * Le premier anneau autour de « Tout » : les éléments sans parent (ou dont le parent n'est pas
 * chargé), sauf les tâches seules. Une tâche qui a des sous-éléments y est.
 */
export function racines(elements: readonly Element[], enfants = enfantsParParent(elements)): Element[] {
  const ids = new Set(elements.map((e) => e.id));
  return elements
    .filter((e) => (!e.parent || !ids.has(e.parent)) && (e.type !== 'tache' || enfants.has(e.id)))
    .sort(ordreDesSoeurs);
}

/** Les sous-éléments du centre (null : « Tout »). */
export function enfantsDe(centre: string | null, elements: readonly Element[], enfants = enfantsParParent(elements)): Element[] {
  return centre === null ? racines(elements, enfants) : enfants.get(centre) ?? [];
}

/**
 * Dispose les parts autour du centre sur `anneaux` niveaux. Chaque fratrie se partage l'angle de
 * son parent selon les parts (poids) ; le premier anneau se partage le tour entier. Les poids de
 * `apercu` remplacent ceux des éléments (le curseur d'importance, avant d'enregistrer).
 */
export function disposer(
  tous: readonly Element[], centre: string | null, anneaux: number, apercu?: ReadonlyMap<string, number>,
): Disposition {
  const elements = apercu?.size ? tous.map((e) => (apercu.has(e.id) ? { ...e, poids: apercu.get(e.id) ?? e.poids } : e)) : tous;
  const enfants = enfantsParParent(elements);
  const avancements = avancementsCalcules(elements);
  const elementCentre = centre === null ? null : elements.find((e) => e.id === centre) ?? null;
  const premiers = enfantsDe(elementCentre?.id ?? null, elements, enfants);
  const avancementCentre = elementCentre
    ? avancements.get(elementCentre.id) ?? 0
    : avancementDeRacines(premiers, avancements);
  const lesParts: Part[] = [];
  const vus = new Set<string>(elementCentre ? [elementCentre.id] : []);
  const poser = (freres: readonly Element[], anneau: number, debut: number, fin: number, couleur: number | null): void => {
    if (anneau > anneaux || freres.length === 0) return;
    const p = parts(freres);
    let angle = debut;
    freres.forEach((e, i) => {
      if (vus.has(e.id)) return; // une boucle de parents ne se dessine pas deux fois
      vus.add(e.id);
      const part = p[i] ?? 0;
      const finPart = angle + (fin - debut) * part;
      const sienne = couleur ?? i % COULEURS;
      const siens = enfants.get(e.id) ?? [];
      lesParts.push({
        element: e, anneau, debut: angle, fin: finPart, part,
        avancement: avancements.get(e.id) ?? 0, calcule: siens.length > 0 && e.statut !== 'fait', couleur: sienne,
      });
      poser(siens, anneau + 1, angle, finPart, sienne);
      angle = finPart;
    });
  };
  poser(premiers, 1, 0, 2 * Math.PI, null);
  return { centre: elementCentre, avancementCentre, parts: lesParts };
}

/** Le fil d'Ariane jusqu'au centre : ses ancêtres, du plus haut au centre lui-même (vide pour « Tout »). */
export function filAriane(elements: readonly Element[], centre: string | null): Element[] {
  const parId = new Map(elements.map((e) => [e.id, e]));
  const fil: Element[] = [];
  const vus = new Set<string>();
  let courant = centre === null ? undefined : parId.get(centre);
  while (courant && !vus.has(courant.id)) {
    vus.add(courant.id);
    fil.unshift(courant);
    courant = courant.parent ? parId.get(courant.parent) : undefined;
  }
  return fil;
}

/** Lit le nombre d'anneaux de l'adresse : un entier de 1 à ANNEAUX_MAX, sinon la valeur par défaut. */
export function lireAnneaux(texte: string | null): number {
  const n = Number(texte);
  return Number.isInteger(n) && n >= 1 && n <= ANNEAUX_MAX ? n : ANNEAUX_PAR_DEFAUT;
}

// Le dessin (un SVG de 200 sur 200, centré en 0,0) : le disque du centre, puis les anneaux.
export const RAYON_CENTRE = 24;
export const RAYON_EXTERIEUR = 98;

/** Les rayons intérieur et extérieur d'un anneau. */
export function rayons(anneau: number, anneaux: number): { interieur: number; exterieur: number } {
  const largeur = (RAYON_EXTERIEUR - RAYON_CENTRE) / anneaux;
  return { interieur: RAYON_CENTRE + (anneau - 1) * largeur, exterieur: RAYON_CENTRE + anneau * largeur };
}

/** Un point à l'angle donné (0 en haut, dans le sens des aiguilles d'une montre). */
export function point(rayon: number, angle: number): { x: number; y: number } {
  return { x: rayon * Math.sin(angle), y: -rayon * Math.cos(angle) };
}

const arrondi = (n: number): string => String(Math.round(n * 1000) / 1000);

/**
 * Le chemin SVG d'un morceau d'anneau, entre deux rayons et deux angles. Un tour complet se dessine
 * en deux moitiés (un arc SVG ne sait pas aller d'un point à lui-même).
 */
export function chemin(interieur: number, exterieur: number, debut: number, fin: number): string {
  if (fin - debut >= 2 * Math.PI - 1e-9) {
    const milieu = debut + Math.PI;
    return `${chemin(interieur, exterieur, debut, milieu)} ${chemin(interieur, exterieur, milieu, debut + 2 * Math.PI)}`;
  }
  const grand = fin - debut > Math.PI ? 1 : 0;
  const a = point(exterieur, debut);
  const b = point(exterieur, fin);
  const c = point(interieur, fin);
  const d = point(interieur, debut);
  const p = (q: { x: number; y: number }): string => `${arrondi(q.x)} ${arrondi(q.y)}`;
  if (interieur <= 0) return `M 0 0 L ${p(a)} A ${arrondi(exterieur)} ${arrondi(exterieur)} 0 ${grand} 1 ${p(b)} Z`;
  return `M ${p(a)} A ${arrondi(exterieur)} ${arrondi(exterieur)} 0 ${grand} 1 ${p(b)} L ${p(c)} `
    + `A ${arrondi(interieur)} ${arrondi(interieur)} 0 ${grand} 0 ${p(d)} Z`;
}

/**
 * Le titre tel qu'il tient dans une part (coupé avec « … »), ou null s'il n'y tient pas : la place est
 * la longueur de l'arc au milieu de l'anneau, et un caractère prend environ 0,55 fois la taille du texte.
 */
export function etiquette(titre: string, rayonMilieu: number, angle: number, taille: number): string | null {
  const place = rayonMilieu * angle * 0.85;
  const max = Math.floor(place / (taille * 0.55));
  if (max < 3) return null;
  return titre.length <= max ? titre : `${titre.slice(0, max - 1).trimEnd()}…`;
}

/** « 33 % », sans décimale. */
export function pourcent(fraction0a1: number): string {
  return `${Math.round(fraction0a1 * 100)} %`;
}

// Le plan de la vue en cercles, sans React : la même arborescence en liste, et ce que devient l'arbre
// quand on y glisse une ligne. Testé seul (tests/unitaires/interface-plan.test.ts).
import { avancementsCalcules, parts } from '../src/domaine/cercles';
import type { Element } from './api';
import { enfantsDe, enfantsParParent } from './cercles';

/** Une ligne du plan : l'élément, son niveau (1 sous le centre), sa part dans son parent, son avancement. */
export interface LignePlan {
  readonly element: Element;
  readonly niveau: number;
  readonly part: number;
  readonly avancement: number;
  readonly aDesEnfants: boolean;
  readonly replie: boolean;
}

/**
 * Les lignes du plan sous le centre (null : « Tout »), dans l'ordre de lecture : un élément, puis
 * ses sous-éléments en retrait, sauf s'il est replié.
 */
export function lignesDuPlan(elements: readonly Element[], centre: string | null, replies: ReadonlySet<string>): LignePlan[] {
  const enfants = enfantsParParent(elements);
  const avancements = avancementsCalcules(elements);
  const lignes: LignePlan[] = [];
  const vus = new Set<string>(centre ? [centre] : []);
  const descendre = (freres: readonly Element[], niveau: number): void => {
    const p = parts(freres);
    freres.forEach((e, i) => {
      if (vus.has(e.id)) return;
      vus.add(e.id);
      const siens = enfants.get(e.id) ?? [];
      const replie = replies.has(e.id);
      lignes.push({ element: e, niveau, part: p[i] ?? 0, avancement: avancements.get(e.id) ?? 0, aDesEnfants: siens.length > 0, replie });
      if (!replie) descendre(siens, niveau + 1);
    });
  };
  descendre(enfantsDe(centre, elements, enfants), 1);
  return lignes;
}

/** Où poser une ligne glissée : juste avant la cible, juste après, ou dedans (à la fin de ses sous-éléments). */
export type Position = 'avant' | 'apres' | 'dans';

/** La position d'après la hauteur du point de dépôt dans la ligne visée (0 en haut, 1 en bas). */
export function positionDans(hauteur0a1: number): Position {
  if (hauteur0a1 < 0.3) return 'avant';
  if (hauteur0a1 > 0.7) return 'apres';
  return 'dans';
}

/** Le résultat d'un glissement : le nouveau parent de l'élément, et l'ordre complet de sa nouvelle fratrie. */
export interface Deplacement {
  readonly parent: string | null;
  readonly ordre: readonly string[];
}

/** Est-ce que `id` est `ancetre` ou l'un de ses descendants ? */
function estDans(id: string, ancetre: string, elements: readonly Element[]): boolean {
  const parId = new Map(elements.map((e) => [e.id, e]));
  const vus = new Set<string>();
  let courant: Element | undefined = parId.get(id);
  while (courant && !vus.has(courant.id)) {
    if (courant.id === ancetre) return true;
    vus.add(courant.id);
    courant = courant.parent ? parId.get(courant.parent) : undefined;
  }
  return false;
}

/**
 * Glisser l'élément `id` par rapport à la ligne `cible`. Rend le déplacement, null s'il ne change
 * rien, ou un message s'il est impossible (ranger un élément dans lui-même ou dans son descendant).
 * Au niveau du centre, le parent est le centre (null pour « Tout »).
 */
export function deplacement(
  elements: readonly Element[], centre: string | null, id: string, cible: string, position: Position,
): Deplacement | string | null {
  if (id === cible) return null;
  const visee = elements.find((e) => e.id === cible);
  const element = elements.find((e) => e.id === id);
  if (!visee || !element) return null;
  const enfants = enfantsParParent(elements);
  let parent: string | null;
  let freres: string[];
  if (position === 'dans') {
    parent = visee.id;
    freres = (enfants.get(visee.id) ?? []).map((e) => e.id).filter((x) => x !== id);
    freres.push(id);
  } else {
    // Une sœur de la cible : son parent, ou le centre si la cible est au premier niveau.
    const premiers = enfantsDe(centre, elements, enfants);
    const auPremierNiveau = premiers.some((e) => e.id === visee.id);
    parent = auPremierNiveau ? centre : visee.parent;
    freres = (auPremierNiveau ? premiers : enfants.get(visee.parent ?? '') ?? []).map((e) => e.id).filter((x) => x !== id);
    const i = freres.indexOf(visee.id);
    freres.splice(position === 'avant' ? i : i + 1, 0, id);
  }
  if (parent !== null && estDans(parent, id, elements)) {
    return 'Impossible : un élément ne peut pas être rangé dans lui-même ni dans ce qu’il contient.';
  }
  const anciens = (parent === element.parent ? enfants.get(parent ?? '') ?? enfantsDe(centre, elements, enfants) : []).map((e) => e.id);
  if (parent === element.parent && anciens.join() === freres.join()) return null;
  return { parent, ordre: freres };
}

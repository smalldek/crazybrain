// Les calculs de la vue en cercles (étape 3b), sur des données simples : la part de chaque élément
// dans son parent, le poids à écrire pour donner une part voulue, et l'avancement qui remonte des
// feuilles jusqu'au centre. Sans base ni écran : la page et le serveur s'en servent pareil.
import type { Statut } from './element';

/** Ce dont les calculs ont besoin d'un élément. */
export interface NoeudCercle {
  readonly id: string;
  readonly parent: string | null;
  readonly statut: Statut;
  /** Null : compte pour 1. */
  readonly poids: number | null;
  /** Avancement saisi, 0 à 100, ou null. */
  readonly avancement: number | null;
}

/** Le poids qui compte : celui donné, sinon 1. */
export function poidsEffectif(poids: number | null): number {
  return poids ?? 1;
}

/**
 * La part de chacun parmi des frères, entre 0 et 1, dans le même ordre : son poids sur la somme des
 * poids. Les parts font toujours 1 (100 %) ensemble.
 */
export function parts(freres: readonly { readonly poids: number | null }[]): number[] {
  const total = freres.reduce((somme, f) => somme + poidsEffectif(f.poids), 0);
  return freres.map((f) => poidsEffectif(f.poids) / total);
}

/**
 * Le poids à écrire sur un élément pour qu'il pèse `part` (entre 0 et 1, bornes exclues) parmi ses
 * frères, sans toucher aux poids des autres : ils gardent leurs proportions entre eux et se
 * partagent le reste. Il faut au moins un autre frère (seul, un élément fait toujours 100 %).
 */
export function poidsPourPart(part: number, poidsDesAutres: readonly (number | null)[]): number {
  if (poidsDesAutres.length === 0) throw new Error('Un élément seul fait toujours 100 % : rien à régler.');
  if (!(part > 0 && part < 1)) throw new Error(`Part impossible : ${part} (attendu entre 0 et 1, bornes exclues).`);
  const autres = poidsDesAutres.reduce<number>((somme, p) => somme + poidsEffectif(p), 0);
  return (part / (1 - part)) * autres;
}

/**
 * L'avancement de chaque élément, de 0 à 100 (non arrondi). Une feuille (sans enfant) : 100 si elle
 * est faite, sinon son avancement saisi, sinon 0. Un élément avec enfants : 100 s'il est fait, sinon
 * la moyenne des avancements de ses enfants pondérée par leurs parts. Ainsi l'avancement remonte
 * jusqu'au centre. Une boucle de parents (que l'écriture refuse) ne fait pas tourner le calcul sans fin.
 */
export function avancementsCalcules(noeuds: readonly NoeudCercle[]): Map<string, number> {
  const enfants = new Map<string, NoeudCercle[]>();
  for (const n of noeuds) if (n.parent !== null) enfants.set(n.parent, [...(enfants.get(n.parent) ?? []), n]);
  const resultat = new Map<string, number>();
  const enCours = new Set<string>();
  const calculer = (n: NoeudCercle): number => {
    const connu = resultat.get(n.id);
    if (connu !== undefined) return connu;
    if (enCours.has(n.id)) return 0;
    enCours.add(n.id);
    const siens = enfants.get(n.id) ?? [];
    let valeur: number;
    if (n.statut === 'fait') valeur = 100;
    else if (siens.length === 0) valeur = n.avancement ?? 0;
    else {
      const p = parts(siens);
      valeur = siens.reduce((somme, e, i) => somme + (p[i] ?? 0) * calculer(e), 0);
    }
    enCours.delete(n.id);
    resultat.set(n.id, valeur);
    return valeur;
  };
  for (const n of noeuds) calculer(n);
  return resultat;
}

/** L'avancement d'un ensemble de racines (le centre « Tout »), pondéré par leurs parts. */
export function avancementDeRacines(racines: readonly NoeudCercle[], avancements: ReadonlyMap<string, number>): number {
  if (racines.length === 0) return 0;
  const p = parts(racines);
  return racines.reduce((somme, r, i) => somme + (p[i] ?? 0) * (avancements.get(r.id) ?? 0), 0);
}

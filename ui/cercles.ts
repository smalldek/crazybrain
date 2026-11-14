// La vue en cercles, sans React : quel élément au centre, quelles parts autour, à quels angles.
// Testé seul (tests/unitaires/interface-cercles.test.ts et interface-complements-cercles.test.ts). Les règles de poids et d'avancement
// viennent du domaine (src/domaine/cercles.ts), les mêmes que côté serveur.
import { avancementDeRacines, avancementsCalcules, parts, poidsEffectif, poidsPourPart } from '../src/domaine/cercles';
import type { Appartenance, Element } from './api';

/** Le nombre d'anneaux montrés, par défaut et au plus. */
export const ANNEAUX_PAR_DEFAUT = 3;
export const ANNEAUX_MAX = 6;
/** Les teintes des branches, dans l'ordre des classes de styles.css (.branche-0 à .branche-7). */
export const TEINTES = ['bleu', 'orange', 'vert', 'violet', 'jaune', 'turquoise', 'rose', 'gris'] as const;
export const COULEURS = TEINTES.length;

/**
 * Les couleurs choisies à la main, d'après les tags `couleur:<teinte>` (les tags de chaque élément, en
 * texte) : l'id de l'élément et le numéro de sa teinte. Une teinte inconnue est ignorée.
 */
export function couleursChoisies(tags: ReadonlyMap<string, readonly string[]>): Map<string, number> {
  const choisies = new Map<string, number>();
  for (const [id, siens] of tags) {
    for (const t of siens) {
      if (!t.startsWith('couleur:')) continue;
      const i = (TEINTES as readonly string[]).indexOf(t.slice('couleur:'.length));
      if (i >= 0) choisies.set(id, i);
    }
  }
  return choisies;
}

/**
 * Les éléments tels que les cercles les rangent : une tâche rangée nulle part (pas de parent, ou un
 * parent qui n'est pas chargé) mais rattachée à un projet par un lien « appartient à » y est
 * rangée, comme si elle en était un sous-élément. Rattachée à plusieurs : sous le premier lien.
 * Un rattachement qui ferait une boucle (le projet est lui-même dans la tâche) est ignoré.
 */
export function rattacher(elements: readonly Element[], appartenances: readonly Appartenance[]): Element[] {
  const parId = new Map(elements.map((e) => [e.id, e]));
  const premier = new Map<string, string>();
  for (const a of appartenances) {
    if (!premier.has(a.source) && parId.has(a.cible) && a.cible !== a.source) premier.set(a.source, a.cible);
  }
  if (premier.size === 0) return [...elements];
  const parentDe = (id: string): string | null => {
    const e = parId.get(id);
    if (!e) return null;
    if (e.parent && parId.has(e.parent)) return e.parent;
    return premier.get(id) ?? null;
  };
  // Une boucle : en remontant depuis le projet, on retombe sur la tâche.
  const boucle = (id: string, cible: string): boolean => {
    const vus = new Set<string>();
    for (let c: string | null = cible; c !== null && !vus.has(c); c = parentDe(c)) {
      if (c === id) return true;
      vus.add(c);
    }
    return false;
  };
  return elements.map((e) => {
    if (e.parent && parId.has(e.parent)) return e;
    const cible = premier.get(e.id);
    return cible && !boucle(e.id, cible) ? { ...e, parent: cible } : e;
  });
}

/** Une part dessinée : l'élément, son anneau (1 = le plus proche du centre), ses angles en radians. */
export interface Part {
  readonly element: Element;
  readonly anneau: number;
  readonly debut: number;
  readonly fin: number;
  /** Sa part dans son parent, entre 0 et 1. */
  readonly part: number;
  /** Sa part du centre (le produit des parts, du centre jusqu'à elle), entre 0 et 1. */
  readonly absolue: number;
  /** De 0 à 100. */
  readonly avancement: number;
  /** L'avancement est-il calculé (l'élément a des enfants) ? */
  readonly calcule: boolean;
  /**
   * Sa couleur (0 à COULEURS − 1) : celle choisie pour elle, sinon celle de son parent, sinon une par
   * sœur, dans l'ordre. Une part seule à son niveau (un seul projet, comme Sport le 11/11) ne donne pas
   * sa couleur à ses enfants : ils en prennent une chacun, sinon tout serait d'une seule teinte.
   */
  readonly couleur: number;
  /** La nuance (0 à NUANCES − 1) qui distingue des sœurs de même couleur : la claire, puis deux plus soutenues. */
  readonly nuance: number;
}

/** Le nombre de nuances d'une même couleur (classes .nuance-0 à .nuance-2 de styles.css). */
export const NUANCES = 3;

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
  choisies: ReadonlyMap<string, number> = new Map(),
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
      const choisie = choisies.get(e.id);
      const sienne = choisie ?? couleur ?? i % COULEURS;
      const siens = enfants.get(e.id) ?? [];
      lesParts.push({
        element: e, anneau, debut: angle, fin: finPart, part, absolue: (finPart - angle) / (2 * Math.PI),
        avancement: avancements.get(e.id) ?? 0, calcule: siens.length > 0 && e.statut !== 'fait', couleur: sienne,
        // Des sœurs qui héritent toutes la même couleur se distinguent par la nuance.
        nuance: choisie === undefined && couleur !== null ? i % NUANCES : 0,
      });
      // Seule à son niveau et sans couleur choisie, elle laisse ses enfants prendre une couleur chacun.
      poser(siens, anneau + 1, angle, finPart, choisie !== undefined || freres.length > 1 ? sienne : null);
      angle = finPart;
    });
  };
  poser(premiers, 1, 0, 2 * Math.PI, elementCentre ? choisies.get(elementCentre.id) ?? null : null);
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

/** Les rayons intérieur et extérieur d'un anneau, autour d'un centre de rayon `centre`. */
export function rayons(anneau: number, anneaux: number, centre = RAYON_CENTRE): { interieur: number; exterieur: number } {
  const largeur = (RAYON_EXTERIEUR - centre) / anneaux;
  return { interieur: centre + (anneau - 1) * largeur, exterieur: centre + anneau * largeur };
}

/** Une bande du centre en oignon : un ancêtre, ou le centre lui-même (la dernière). */
export interface BandeOignon {
  readonly interieur: number;
  readonly exterieur: number;
}

/** Le plus grand rayon que prend le centre en oignon, pour laisser la place aux anneaux. */
export const RAYON_OIGNON_MAX = 46;

/**
 * Le centre en oignon (11/11, Adrien : « je devrais voir les cercles intérieurs des parents comme un
 * oignon ») : au milieu, le disque de « Tout » ; autour, une bande par ancêtre, du plus haut au plus
 * proche ; puis la bande du centre lui-même, plus large pour son titre. `profondeur` est la longueur
 * du fil d'Ariane (0 : on est sur « Tout », le disque seul fait le centre, comme avant).
 */
export function oignon(profondeur: number): { racine: number; bandes: BandeOignon[]; rayon: number } {
  if (profondeur <= 0) return { racine: RAYON_CENTRE, bandes: [], rayon: RAYON_CENTRE };
  const racine = 11;
  const sienne = 13;
  const ancetres = profondeur - 1;
  const largeur = ancetres === 0 ? 0 : Math.min(7, (RAYON_OIGNON_MAX - racine - sienne) / ancetres);
  const bandes: BandeOignon[] = [];
  let r = racine;
  for (let i = 0; i < ancetres; i++) { bandes.push({ interieur: r, exterieur: r + largeur }); r += largeur; }
  bandes.push({ interieur: r, exterieur: r + sienne });
  return { racine, bandes, rayon: r + sienne };
}

/** Un point à l'angle donné (0 en haut, dans le sens des aiguilles d'une montre). */
export function point(rayon: number, angle: number): { x: number; y: number } {
  return { x: rayon * Math.sin(angle), y: -rayon * Math.cos(angle) };
}

const arrondi = (n: number): string => String(Math.round(n * 1000) / 1000);

/**
 * Le chemin SVG d'un morceau d'anneau, entre deux rayons et deux angles. Un tour complet se dessine
 * en deux cercles entiers, sans trait du centre vers le bord : sinon son contour montre deux coutures,
 * en haut et en bas, et l'anneau a l'air coupé en deux moitiés.
 */
export function chemin(interieur: number, exterieur: number, debut: number, fin: number): string {
  if (fin - debut >= 2 * Math.PI - 1e-9) {
    // Le cercle extérieur dans le sens des aiguilles d'une montre, l'intérieur dans l'autre sens :
    // la règle de remplissage par défaut (nonzero) laisse alors le trou du milieu vide.
    const R = arrondi(exterieur);
    const tourExterieur = `M 0 -${R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 -${R} Z`;
    if (interieur <= 0) return tourExterieur;
    const r = arrondi(interieur);
    return `${tourExterieur} M 0 -${r} A ${r} ${r} 0 1 0 0 ${r} A ${r} ${r} 0 1 0 0 -${r} Z`;
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

/** « 33 % », sans décimale. */
export function pourcent(fraction0a1: number): string {
  return `${Math.round(fraction0a1 * 100)} %`;
}

// ——— Le mouvement (3b.9) ———

/** Où se dessine une part : ses deux angles et ses deux rayons. */
export interface Geometrie {
  readonly debut: number;
  readonly fin: number;
  readonly interieur: number;
  readonly exterieur: number;
}

/** La géométrie d'une part posée, sur `anneaux` anneaux. */
export function geometrieDe(part: Part, anneaux: number, centre = RAYON_CENTRE): Geometrie {
  return { debut: part.debut, fin: part.fin, ...rayons(part.anneau, anneaux, centre) };
}

/** Une part pendant le mouvement : où elle en est, et son opacité (elle apparaît ou s'efface). */
export interface Trame {
  readonly geometrie: Geometrie;
  readonly opacite: number;
}

/** Ralentit au début et à la fin : t de 0 à 1 donne un avancement de 0 à 1. */
export function adoucir(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2;
}

const entre = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Le dessin au temps t (0 à 1) d'un passage d'un centre à un autre. Une part présente avant et
 * après glisse de sa place d'avant à sa place d'après. Une part nouvelle sort de son bord intérieur
 * en apparaissant ; une part qui disparaît (`depart` seul) s'efface sur place.
 */
export function trames(
  depart: ReadonlyMap<string, Geometrie>, arrivee: ReadonlyMap<string, Geometrie>, t: number,
): Map<string, Trame> {
  const k = adoucir(t);
  const resultat = new Map<string, Trame>();
  for (const [id, b] of arrivee) {
    const a = depart.get(id) ?? { ...b, exterieur: b.interieur };
    resultat.set(id, {
      geometrie: { debut: entre(a.debut, b.debut, k), fin: entre(a.fin, b.fin, k),
        interieur: entre(a.interieur, b.interieur, k), exterieur: entre(a.exterieur, b.exterieur, k) },
      opacite: depart.has(id) ? 1 : k,
    });
  }
  for (const [id, a] of depart) if (!arrivee.has(id)) resultat.set(id, { geometrie: a, opacite: 1 - k });
  return resultat;
}

// ——— Les libellés (3b.10) ———

/** Une ligne de titre le long d'un arc : son texte et son rayon. */
export interface LigneArc {
  readonly texte: string;
  readonly rayon: number;
}

/**
 * Comment s'écrit le titre d'une part : le long de l'arc (sur une ou deux lignes ; `inverse` quand la
 * part est en bas du cercle, pour se lire à l'endroit), dans le sens du rayon (part étroite mais
 * épaisse), ou pas du tout (null : il apparaît en touchant la part).
 */
export type Libelle =
  | { readonly mode: 'arc'; readonly lignes: readonly LigneArc[]; readonly inverse: boolean; readonly taille: number }
  | { readonly mode: 'rayon'; readonly texte: string; readonly taille: number };

/** Coupe un titre en lignes d'au plus `max` caractères, aux espaces si possible ; la dernière finit par « … » s'il en reste. */
export function couper(titre: string, max: number, lignes: number): string[] {
  const mots = titre.trim().split(/\s+/);
  const resultat: string[] = [];
  let courante = '';
  let i = 0;
  while (i < mots.length && resultat.length < lignes) {
    const mot = mots[i] ?? '';
    const essai = courante ? `${courante} ${mot}` : mot;
    if (essai.length <= max) { courante = essai; i += 1; continue; }
    if (!courante) { courante = mot.slice(0, max); mots[i] = mot.slice(max); if (!mots[i]) i += 1; }
    resultat.push(courante);
    courante = '';
  }
  if (courante && resultat.length < lignes) resultat.push(courante);
  if (i < mots.length || resultat.length === 0) {
    const derniere = resultat.pop() ?? '';
    resultat.push(`${derniere.slice(0, Math.max(1, max - 1)).trimEnd()}…`);
  }
  return resultat;
}

/** Un caractère prend environ 0,55 fois la taille du texte. */
const LARGEUR_CARACTERE = 0.55;

export function libelle(titre: string, geometrie: Geometrie, tailleMax: number, seuil = 1.6): Libelle | null {
  // Un titre trop long pour la part s'écrit un peu plus petit avant d'être coupé (11/11, Adrien : « le
  // texte dedans on le voit pas, trop long ») ; il n'est coupé que s'il ne tient pas non plus ainsi.
  const base = Math.min(tailleMax, (geometrie.exterieur - geometrie.interieur) * 0.4);
  if (base < seuil) return null;
  let premier: Libelle | null = null;
  for (const facteur of [1, 0.85, 0.72]) {
    const taille = base * facteur;
    if (taille < seuil) break;
    const essai = poserLibelle(titre, geometrie, taille);
    if (facteur === 1) premier = essai;
    if (essai && !libelleCoupe(essai)) return essai;
  }
  return premier;
}

/** Le titre a-t-il été coupé (des points de suspension) ? */
function libelleCoupe(l: Libelle): boolean {
  return l.mode === 'rayon' ? l.texte.endsWith('…') : l.lignes.some((x) => x.texte.endsWith('…'));
}

/** Le titre posé à une taille donnée : le long de l'arc (sur une ou deux lignes), ou dans le sens du rayon. */
function poserLibelle(titre: string, geometrie: Geometrie, taille: number): Libelle | null {
  const { interieur, exterieur } = geometrie;
  const angle = Math.min(geometrie.fin - geometrie.debut, Math.PI);
  const epaisseur = exterieur - interieur;
  const milieu = (interieur + exterieur) / 2;
  const tient = (rayon: number): number => Math.floor((rayon * angle * 0.85) / (taille * LARGEUR_CARACTERE));
  const surUne = tient(milieu);
  // Dans le sens du rayon : la place est l'épaisseur, il faut que l'arc laisse passer une ligne.
  const surRayon = milieu * angle >= taille * 1.3 ? Math.floor((epaisseur * 0.85) / (taille * LARGEUR_CARACTERE)) : 0;
  const a = (geometrie.debut + geometrie.fin) / 2;
  const inverse = Math.cos(a) < 0; // le milieu de la part est dans la moitié basse
  if (surUne >= titre.length || (surUne >= 3 && surUne >= surRayon)) {
    // Deux lignes si le titre ne tient pas sur une et que l'anneau est assez épais pour deux.
    if (surUne < titre.length && epaisseur >= taille * 2.6) {
      const ecart = taille * 0.6;
      // La première ligne se lit en haut : à l'extérieur, sauf en bas du cercle où l'on lit retourné.
      const [r1, r2] = inverse ? [milieu - ecart, milieu + ecart] : [milieu + ecart, milieu - ecart];
      const max = Math.min(tient(r1), tient(r2));
      const lignes = couper(titre, max, 2);
      return { mode: 'arc', inverse, taille, lignes: lignes.map((texte, i) => ({ texte, rayon: i === 0 ? r1 : r2 })) };
    }
    return { mode: 'arc', inverse, taille, lignes: [{ texte: couper(titre, surUne, 1)[0] ?? '', rayon: milieu }] };
  }
  if (surRayon >= 3) return { mode: 'rayon', taille, texte: couper(titre, surRayon, 1)[0] ?? '' };
  return null;
}

/** Le chemin d'un arc de texte, au rayon donné : dans le sens des aiguilles d'une montre, ou l'inverse. */
export function arcDeTexte(rayon: number, debut: number, fin: number, inverse: boolean): string {
  // Un tour entier : le texte se pose sur le demi-cercle du haut (ou du bas, retourné).
  let [d, f] = fin - debut >= 2 * Math.PI - 1e-9 ? [-Math.PI / 2, Math.PI / 2] : [debut, fin];
  if (inverse && fin - debut >= 2 * Math.PI - 1e-9) [d, f] = [Math.PI / 2, (3 * Math.PI) / 2];
  const grand = f - d > Math.PI ? 1 : 0;
  const [a, b] = inverse ? [point(rayon, f), point(rayon, d)] : [point(rayon, d), point(rayon, f)];
  return `M ${arrondi(a.x)} ${arrondi(a.y)} A ${arrondi(rayon)} ${arrondi(rayon)} 0 ${grand} ${inverse ? 0 : 1} ${arrondi(b.x)} ${arrondi(b.y)}`;
}

// ——— Les gestes sur le cercle (3b.11, 3b.12) ———

/** L'angle (0 en haut, sens des aiguilles d'une montre, de 0 à 2π) et le rayon d'un point du dessin. */
export function polaire(x: number, y: number): { angle: number; rayon: number } {
  let angle = Math.atan2(x, -y);
  if (angle < 0) angle += 2 * Math.PI;
  return { angle, rayon: Math.hypot(x, y) };
}

/** Ramène un angle dans [debut, debut + 2π). */
function depuis(angle: number, debut: number): number {
  let a = angle;
  while (a < debut) a += 2 * Math.PI;
  while (a >= debut + 2 * Math.PI) a -= 2 * Math.PI;
  return a;
}

/** La plus petite (et, à l'inverse, la plus grande) part qu'on peut donner en tirant un bord. */
export const PART_MIN_FRONTIERE = 0.03;

/** Le bord qu'on tire sur une part : sa fin, sauf pour la dernière de sa fratrie, collée au bout (son début). */
export function bordTire(part: Part, fratrie: readonly Part[]): 'debut' | 'fin' {
  const derniere = [...fratrie].sort((x, y) => x.debut - y.debut).at(-1);
  return derniere?.element.id === part.element.id ? 'debut' : 'fin';
}

/**
 * Tirer le bord de la part choisie jusqu'à `angle` (11/11, Adrien : « je devrais pas modifier les
 * autres ») : seul son poids change ; ses sœurs gardent les leurs et se serrent toutes ensemble, dans
 * leurs proportions, comme dans Goalscape. On cherche la part `s` pour laquelle le bord tiré tombe
 * sous le doigt : avec `b` la part des sœurs d'avant parmi les autres, la fin est à b + s(1 - b) et
 * le début à b(1 - s). Rend son nouveau poids et sa part dans le parent (null : rien à régler).
 */
export function etirerPart(part: Part, fratrie: readonly Part[], angle: number): { poids: number; part: number } | null {
  const ordre = [...fratrie].sort((x, y) => x.debut - y.debut);
  const premiere = ordre[0];
  const derniere = ordre.at(-1);
  if (!premiere || !derniere || ordre.length < 2) return null;
  const debut = premiere.debut;
  const etendue = derniere.fin - debut;
  const ancienne = (part.fin - part.debut) / etendue;
  const avant = (part.debut - debut) / etendue / (1 - ancienne);
  let a = depuis(angle, debut) - debut;
  // Au-delà de la fratrie, le doigt est plus près d'un bout ou de l'autre : on bute contre lui.
  if (a > etendue) a = a - etendue < 2 * Math.PI - a ? etendue : 0;
  const t = a / etendue;
  const brute = bordTire(part, ordre) === 'fin' ? (t - avant) / (1 - avant) : 1 - t / avant;
  const nouvelle = Math.min(1 - PART_MIN_FRONTIERE, Math.max(PART_MIN_FRONTIERE, brute));
  const autres = ordre.filter((p) => p.element.id !== part.element.id).map((p) => p.element.poids);
  return { poids: Math.round(poidsPourPart(nouvelle, autres) * 1000) / 1000, part: nouvelle };
}

/** L'avancement lu sous le doigt, du bord intérieur (0) au bord extérieur (100), par pas de 5. */
export function avancementSous(rayon: number, interieur: number, exterieur: number): number {
  const brut = ((rayon - interieur) / (exterieur - interieur)) * 100;
  return Math.min(100, Math.max(0, Math.round(brut / 5) * 5));
}

/** Où tombe une part lâchée : dans le centre, ou sur une part (avant elle, dedans, après elle). */
export type Cible =
  | { readonly sorte: 'centre' }
  | { readonly sorte: 'part'; readonly part: Part; readonly ou: 'avant' | 'dans' | 'apres' };

/** La cible sous le point (x, y) du dessin, ou null (hors du cercle). */
export function cibleSous(lesParts: readonly Part[], anneaux: number, x: number, y: number, centre = RAYON_CENTRE): Cible | null {
  const { angle, rayon } = polaire(x, y);
  if (rayon < centre) return { sorte: 'centre' };
  for (const p of lesParts) {
    const { interieur, exterieur } = rayons(p.anneau, anneaux, centre);
    if (rayon < interieur || rayon >= exterieur) continue;
    const a = depuis(angle, p.debut);
    if (a >= p.fin) continue;
    const fraction = (a - p.debut) / (p.fin - p.debut);
    // Un tour entier n'a pas de bord : on ne peut que s'y ranger.
    const ou = p.fin - p.debut >= 2 * Math.PI - 1e-9 ? 'dans' : fraction < 0.25 ? 'avant' : fraction > 0.75 ? 'apres' : 'dans';
    return { sorte: 'part', part: p, ou };
  }
  return null;
}

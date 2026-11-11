// La vue en cercles (/cercles) : un élément au centre (« Tout » sans `?centre=`), un anneau par
// niveau de sous-éléments, chaque part à son poids dans son parent, remplie selon son avancement.
// Toucher une part la choisit et montre sa fiche ; la retoucher la met au centre ; toucher le centre
// remonte d'un niveau ; le passage d'un centre à l'autre est animé. Sur le cercle même : tirer le
// bord de la part choisie règle son importance, tirer son remplissage règle son avancement, glisser
// une part la range ailleurs, les flèches du clavier passent d'une part à l'autre. La fiche fait le
// reste (curseurs, ajouter, renommer, supprimer). Les calculs sont dans cercles.ts (sans React).
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject, type KeyboardEvent, type PointerEvent as EvenementPointeur } from 'react';
import { poidsPourPart } from '../src/domaine/cercles';
import { naviguer } from './adresse';
import { api, type Changements, type Element, type Tag } from './api';
import { csvDeBranche } from './export-csv';
import { lireListe } from './liste-collee';
import { tagsParElement } from './tags';
import { PlanCercles } from './plan-cercles';
import {
  ANNEAUX_MAX, arcDeTexte, avancementSous, chemin, cibleSous, couleursChoisies, couper, bordTire, etirerPart, disposer, TEINTES, enfantsDe,
  enfantsParParent, filAriane, geometrieDe, libelle, oignon, point, polaire, pourcent, trames, type Cible, type Geometrie, type Part,
} from './cercles';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly centre: string | null;
  readonly anneaux: number;
  /** L'élément dont le détail est ouvert. */
  readonly ouvert: string | null;
  readonly ouvrir: (id: string) => void;
  readonly modifier: (id: string, changements: Changements) => Promise<void>;
  readonly creer: (champs: Changements & { titre: string }) => Promise<Element | null>;
  readonly supprimer: (element: Element) => Promise<void>;
  /** Range un élément dans un parent (null : à la racine) et ordonne sa nouvelle fratrie. */
  readonly ranger: (id: string, parent: string | null, ordre: readonly string[]) => Promise<void>;
  readonly signaler: (message: string) => void;
  /** Avec des filtres : les éléments qui y répondent, éclairés ; les autres sont grisés. Null : pas de filtre. */
  readonly eclaires: ReadonlySet<string> | null;
  /** Le jour AAAA-MM-JJ, pour marquer ce qui est en retard. */
  readonly jour: string;
  /** Tous les tags posés : les couleurs choisies (`couleur:<teinte>`), l'export. */
  readonly tags: readonly Tag[];
  /** Relit les éléments et les tags, après des changements faits ici directement par l'API. */
  readonly recharger: () => Promise<void>;
  /** Plusieurs changements d'un coup (égaliser, une frontière tirée) : montrés tout de suite, envoyés ensemble. */
  readonly modifierPlusieurs: (envois: readonly (readonly [string, Changements])[]) => Promise<void>;
}

/** L'adresse de la vue avec ce centre et ce nombre d'anneaux (les autres paramètres restent). */
function adresseCercles(centre: string | null, anneaux?: number): string {
  const p = new URLSearchParams(window.location.search);
  if (centre) p.set('centre', centre); else p.delete('centre');
  if (anneaux !== undefined) p.set('anneaux', String(anneaux));
  const recherche = p.toString();
  return `/cercles${recherche ? `?${recherche}` : ''}`;
}

const TAILLE_TEXTE = 4.2;
/** La durée du passage d'un centre à l'autre, en millisecondes. */
const DUREE_MOUVEMENT = 350;
/** Au doigt, l'appui qui attrape une part pour la glisser, en millisecondes. */
const APPUI_LONG = 400;

/** Le mouvement en cours : d'où partent les parts, celles qui s'effacent, et quand il a commencé. */
interface Mouvement {
  readonly depart: ReadonlyMap<string, Geometrie>;
  readonly fantomes: readonly Part[];
  readonly debut: number;
}

/** Une saisie sur le cercle : ajouter dans un élément (null : dans « Tout »), à côté d'une part, ou la renommer. */
interface Edition {
  readonly sorte: 'dedans' | 'cote' | 'renommer';
  readonly id: string | null;
}

/** Un geste en cours sur la part choisie : tirer une frontière, ou tirer le remplissage. */
type Geste =
  | { readonly sorte: 'frontiere'; readonly part: Part; readonly fratrie: readonly Part[]; readonly pointeur: number }
  | { readonly sorte: 'avancement'; readonly part: Part; readonly pointeur: number };

/** Une part attrapée pour la glisser : où est le doigt (dans le dessin) et ce qu'il y a dessous. */
interface Glisse {
  readonly part: Part;
  readonly x: number;
  readonly y: number;
  readonly cible: Cible | null;
}

/** Le point du dessin (de -100 à 100) sous un événement du pointeur. */
function pointDuDessin(svg: SVGSVGElement | null, clientX: number, clientY: number): { x: number; y: number } | null {
  const matrice = svg?.getScreenCTM();
  if (!svg || !matrice) return null;
  const p = svg.createSVGPoint();
  p.x = clientX;
  p.y = clientY;
  const q = p.matrixTransform(matrice.inverse());
  return { x: q.x, y: q.y };
}

/** La clé de la fiche : l'élément, son poids et son avancement enregistrés. */
const cleFiche = (e: Element): string => `${e.id}-${e.poids ?? ''}-${e.avancement ?? ''}`;

/** La moitié de la largeur du dessin entier : le cercle (rayon 98) et, autour, la place des boutons d'action. */
const VUE = 114;
/** Le rayon où se posent les boutons d'action, juste au-delà du bord du cercle. */
const RAYON_BOUTONS = 105;
/** Le rayon d'un bouton d'action (dans le dessin ; environ 18 pixels sur un téléphone). */
const TAILLE_BOUTON = 8.5;
const ZOOM_MAX = 6;

/** La loupe : le grossissement et le point du dessin au milieu de la vue. */
interface Loupe {
  readonly k: number;
  readonly x: number;
  readonly y: number;
}
const LOUPE_ENTIERE: Loupe = { k: 1, x: 0, y: 0 };

/** Garde la loupe dans ses bornes : pas plus petit que le cercle entier, et le cercle jamais hors de la vue. */
function borner(l: Loupe): Loupe {
  const k = Math.min(ZOOM_MAX, Math.max(1, l.k));
  const marge = VUE - VUE / k;
  return { k, x: Math.min(marge, Math.max(-marge, l.x)), y: Math.min(marge, Math.max(-marge, l.y)) };
}

/** La loupe qui grossit `facteur` fois en gardant le point `p` du dessin sous le même endroit de l'écran. */
function zoomerAutour(l: Loupe, facteur: number, p: { x: number; y: number }): Loupe {
  const k = Math.min(ZOOM_MAX, Math.max(1, l.k * facteur));
  const r = l.k / k;
  return borner({ k, x: p.x + (l.x - p.x) * r, y: p.y + (l.y - p.y) * r });
}

const mouvementsReduits = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function VueCercles({ elements, centre, anneaux, ouvert, ouvrir, modifier, creer, supprimer, ranger, signaler, eclaires, jour, tags, recharger, modifierPlusieurs }: Proprietes) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const dessinRef = useRef<SVGSVGElement>(null);
  // Le curseur d'importance (ou la frontière tirée) : les poids essayés, montrés avant d'être enregistrés.
  const [apercu, setApercu] = useState<ReadonlyMap<string, number>>(new Map());
  // Le curseur d'avancement (ou le remplissage tiré) : la valeur essayée.
  const [avancementEssaye, setAvancementEssaye] = useState<{ id: string; valeur: number } | null>(null);
  const [mouvement, setMouvement] = useState<Mouvement | null>(null);
  const [instant, setInstant] = useState(0);
  const [geste, setGeste] = useState<Geste | null>(null);
  const [glisse, setGlisse] = useState<Glisse | null>(null);
  const [survol, setSurvol] = useState<{ part: Part; x: number; y: number } | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  // La loupe : le grossissement (1 : le cercle entier) et le point du dessin au milieu de l'écran.
  const [loupe, setLoupe] = useState<Loupe>(LOUPE_ENTIERE);
  const [pleinEcran, setPleinEcran] = useState(false);
  // Les doigts posés sur le dessin ; à deux, ils pincent pour zoomer et se déplacent pour bouger le dessin.
  const doigts = useRef(new Map<number, { x: number; y: number }>());
  const pince = useRef<{ ecart: number; loupe: Loupe; milieu: { x: number; y: number } } | null>(null);
  // Après un ajout qui tombe hors des anneaux montrés, on zoome sur son parent puis on choisit le nouveau.
  const aChoisir = useRef<{ id: string; edition: Edition } | null>(null);
  // Ce qui était affiché au dernier dessin : le départ du prochain mouvement.
  const affiche = useRef<{ geometries: ReadonlyMap<string, Geometrie>; parts: readonly Part[] }>({ geometries: new Map(), parts: [] });
  // Une part appuyée, pas encore attrapée (la souris doit bouger, le doigt rester appuyé).
  const appui = useRef<{ part: Part; x: number; y: number; pointeur: number; sorte: string; minuteur: number | null } | null>(null);
  // Après un glisser, le « clic » que le navigateur envoie au lâcher ne doit pas choisir la part.
  const ignorerClic = useRef(false);

  const apercuAvancement = avancementEssaye
    ? elements.map((e) => (e.id === avancementEssaye.id ? { ...e, avancement: avancementEssaye.valeur } : e))
    : elements;
  const parElement = tagsParElement(tags);
  const dessin = disposer(apercuAvancement, centre, anneaux, apercu, couleursChoisies(parElement));
  const fil = filAriane(elements, centre);
  const centreInconnu = centre !== null && dessin.centre === null;
  // Le centre en oignon : « Tout » au milieu, une bande par ancêtre, puis le centre ; les anneaux autour.
  const coeur = oignon(centreInconnu ? 0 : fil.length);
  const rc = coeur.rayon;
  const cadre = { x: loupe.x - VUE / loupe.k, y: loupe.y - VUE / loupe.k, cote: (2 * VUE) / loupe.k };
  /** Où tombe un point du dessin dans la zone, en pourcentages (pour y poser un champ de saisie). */
  const dansLaZone = (x: number, y: number): { left: string; top: string } => ({
    left: `${((x - cadre.x) / cadre.cote) * 100}%`, top: `${((y - cadre.y) / cadre.cote) * 100}%`,
  });
  const partChoisie = dessin.parts.find((p) => p.element.id === choisi) ?? null;
  // Pendant un réglage, tout s'estompe sauf ce qu'il touche : la part et ses sœurs pour
  // l'importance ; ses sœurs et ses ancêtres pour l'avancement (il remonte jusqu'au centre).
  let gardees: ReadonlySet<string> | null = null;
  if (partChoisie && (apercu.size > 0 || avancementEssaye)) {
    const parent = partChoisie.element.parent;
    const ids = new Set(elements.filter((e) => e.parent === parent).map((e) => e.id));
    if (avancementEssaye) for (const a of filAriane(elements, parent)) ids.add(a.id);
    gardees = ids;
  }

  // Les anneaux se partagent toute la place : une branche à deux niveaux remplit le cercle comme une à trois.
  const anneauxDessines = Math.min(anneaux, Math.max(1, ...dessin.parts.map((p) => p.anneau)));
  // Les géométries d'arrivée, et celles du moment si un mouvement est en cours.
  const arrivee = new Map(dessin.parts.map((p) => [p.element.id, geometrieDe(p, anneauxDessines, rc)]));
  const enCours = mouvement ? trames(mouvement.depart, arrivee, instant) : null;
  const geometrieDeLaPart = (p: Part): Geometrie => enCours?.get(p.element.id)?.geometrie ?? arrivee.get(p.element.id) ?? geometrieDe(p, anneauxDessines, rc);
  useEffect(() => {
    affiche.current = { geometries: new Map(dessin.parts.map((p) => [p.element.id, geometrieDeLaPart(p)])), parts: dessin.parts };
  });

  // Changer de centre (ou d'anneaux) lance le mouvement : avant que l'écran ne se redessine, on part
  // de ce qui était affiché.
  const premier = useRef(true);
  useLayoutEffect(() => {
    if (premier.current) { premier.current = false; return; }
    if (mouvementsReduits()) return;
    const ids = new Set(dessin.parts.map((p) => p.element.id));
    setMouvement({ depart: affiche.current.geometries, fantomes: affiche.current.parts.filter((p) => !ids.has(p.element.id)), debut: performance.now() });
    setInstant(0);
  }, [centre, anneaux]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mouvement) return undefined;
    let image = 0;
    const avancer = (maintenant: number): void => {
      const t = (maintenant - mouvement.debut) / DUREE_MOUVEMENT;
      if (t >= 1) { setMouvement(null); return; }
      setInstant(t);
      image = requestAnimationFrame(avancer);
    };
    image = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image);
  }, [mouvement]);


  /** Crée les lignes d'une liste collée sous `parent` (null : à la racine), dans l'ordre, chacune sous la sienne. */
  async function creerListe(parent: string | null, texte: string, typeDefaut: string): Promise<number> {
    const lignes = lireListe(texte);
    const ids: string[] = [];
    try {
      for (const l of lignes) {
        const sonParent = l.parent === null ? parent : ids[l.parent] ?? parent;
        const cree = await api.creer({ titre: l.titre, type: l.parent === null ? typeDefaut : 'tache', parent: sonParent,
          ...(l.description ? { description: l.description } : {}) });
        ids.push(cree.id);
      }
    } catch (e) {
      signaler(e instanceof Error ? e.message : String(e));
    }
    await recharger();
    return ids.length;
  }

  /** Change la couleur choisie d'un élément (un tag `couleur:<teinte>`), ou la retire (null). */
  async function colorer(id: string, teinte: string | null): Promise<void> {
    try {
      for (const t of parElement.get(id) ?? []) if (t.startsWith('couleur:')) await api.detagger(id, t);
      if (teinte) await api.tagger(id, `couleur:${teinte}`);
    } catch (e) {
      signaler(e instanceof Error ? e.message : String(e));
    }
    await recharger();
  }

  // Changer de centre oublie le choix et les essais.
  useEffect(() => {
    const suivant = aChoisir.current;
    aChoisir.current = null;
    setChoisi(suivant?.id ?? null); setEdition(suivant?.edition ?? null);
    setApercu(new Map()); setAvancementEssaye(null); setGeste(null); setGlisse(null); setLoupe(LOUPE_ENTIERE);
  }, [centre]);

  const zoomer = (id: string): void => naviguer(adresseCercles(id));
  const remonter = (): void => {
    if (centre === null) return;
    naviguer(adresseCercles(dessin.centre?.parent ?? null));
  };
  const toucher = (part: Part): void => {
    if (ignorerClic.current) { ignorerClic.current = false; return; }
    if (choisi === part.element.id) zoomer(part.element.id);
    else { setChoisi(part.element.id); setEdition(null); }
  };

  // ——— Ajouter, renommer, supprimer sur le cercle même ———
  /** Le parent où tombe un ajout : dans l'élément (`dedans`, null : « Tout »), ou dans le parent de la part (`cote`). */
  function parentDeLAjout(sorte: 'dedans' | 'cote', id: string | null): string | null {
    if (sorte === 'dedans') return id;
    const ref = elements.find((e) => e.id === id);
    return ref?.parent && elements.some((e) => e.id === ref.parent) ? ref.parent : null;
  }

  async function ajouterSurLeCercle(sorte: 'dedans' | 'cote', id: string | null, titre: string): Promise<void> {
    const parent = parentDeLAjout(sorte, id);
    const enfants = enfantsParParent(elements);
    const freres = enfantsDe(parent, elements, enfants);
    // Son type : celui d'une sœur, sinon « objectif » à la racine et « tâche » ailleurs (comme la fiche).
    const type = freres[0]?.type ?? (parent === null ? 'objectif' : 'tache');
    {
      const cree = await creer({ titre, type, parent });
      if (!cree) return;
      const ids = freres.map((f) => f.id);
      const i = sorte === 'cote' && id ? ids.indexOf(id) : -1;
      // « À côté » se place juste après la part, pas au bout de la fratrie.
      if (i >= 0 && i < ids.length - 1) void ranger(cree.id, parent, [...ids.slice(0, i + 1), cree.id, ...ids.slice(i + 1)]);
      // La saisie reste ouverte : un autre titre ajoute la sœur suivante, comme on dresse une liste.
      const suite: Edition = { sorte: 'cote', id: cree.id };
      const anneauDuParent = parent === null || parent === (dessin.centre?.id ?? null) ? 0
        : dessin.parts.find((p) => p.element.id === parent)?.anneau ?? Number.POSITIVE_INFINITY;
      if (anneauDuParent + 1 > anneaux) {
        // Le nouvel élément serait hors des anneaux montrés : on zoome sur son parent.
        aChoisir.current = { id: cree.id, edition: suite };
        naviguer(adresseCercles(parent));
      } else {
        setChoisi(cree.id);
        setEdition(suite);
      }
    }
  }

  async function renommerSurLeCercle(id: string, titre: string): Promise<void> {
    const actuel = elements.find((e) => e.id === id);
    setEdition(null);
    if (!actuel || titre === actuel.titre) return;
    await modifier(id, { titre });
  }

  async function supprimerSurLeCercle(part: Part): Promise<void> {
    setChoisi(null);
    setEdition(null);
    await supprimer(part.element);
  }

  /** Ferme la saisie et rend la main à la part, pour enchaîner au clavier. */
  function fermerSaisie(id: string): void {
    setEdition(null);
    requestAnimationFrame(() => {
      dessinRef.current?.querySelector<SVGGElement>(`g.part[data-id="${CSS.escape(id)}"]`)?.focus();
    });
  }

  /** Les raccourcis sur une part choisie : Inser ou + (sous-élément), F2 (renommer), Suppr (supprimer). */
  function raccourci(part: Part, touche: string): boolean {
    // Les nôtres (Inser, F2, Suppr) et ceux du menu de Goalscape (Ctrl+Entrée, Ctrl+Maj+Entrée, Alt+Entrée,
    // Ctrl+Retour arrière ; Cmd au lieu de Ctrl sur un Mac).
    const editer = (sorte: Edition['sorte']): true => { setChoisi(part.element.id); setEdition({ sorte, id: part.element.id }); return true; };
    if (touche === 'Insert' || touche === '+' || touche === 'Mod+Enter') return editer('dedans');
    if (touche === 'Mod+Maj+Enter') return editer('cote');
    if (touche === 'F2' || touche === 'Alt+Enter') return editer('renommer');
    if (touche === 'Delete' || touche === 'Mod+Backspace') { void supprimerSurLeCercle(part); return true; }
    return false;
  }

  // Échap remonte d'un niveau, quand le panneau de détail n'est pas ouvert (il prend Échap pour lui).
  useEffect(() => {
    if (ouvert) return undefined;
    const touche = (e: globalThis.KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (choisi) setChoisi(null); else if (centre !== null) naviguer(adresseCercles(dessin.centre?.parent ?? null));
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [ouvert, choisi, centre, dessin.centre?.parent]);

  // ——— Les flèches du clavier : d'une sœur à l'autre, vers le parent, vers le premier sous-élément ———
  function fleche(part: Part, touche: string): void {
    let cible: Part | undefined;
    if (touche === 'ArrowLeft' || touche === 'ArrowRight') {
      const soeurs = dessin.parts.filter((p) => p.anneau === part.anneau && (part.anneau === 1 || p.element.parent === part.element.parent))
        .sort((a, b) => a.debut - b.debut);
      const i = soeurs.findIndex((p) => p.element.id === part.element.id);
      cible = soeurs[(i + (touche === 'ArrowRight' ? 1 : soeurs.length - 1)) % soeurs.length];
    } else if (touche === 'ArrowUp') {
      cible = dessin.parts.find((p) => p.element.id === part.element.parent && p.anneau === part.anneau - 1);
      if (!cible) { dessinRef.current?.querySelector<SVGGElement>('g.centre')?.focus(); setChoisi(null); return; }
    } else if (touche === 'ArrowDown') {
      cible = dessin.parts.filter((p) => p.element.parent === part.element.id && p.anneau === part.anneau + 1)
        .sort((a, b) => a.debut - b.debut)[0];
    }
    if (!cible) return;
    setChoisi(cible.element.id);
    dessinRef.current?.querySelector<SVGGElement>(`g.part[data-id="${cible.element.id}"]`)?.focus();
  }

  // ——— Les poignées de la part choisie : tirer sa frontière avec une sœur, tirer son remplissage ———
  const fratrieChoisie = ((): readonly Part[] | null => {
    if (!partChoisie) return null;
    // Au premier anneau, toutes les parts sont sœurs (autour de « Tout », leur parent est vide ou pas chargé).
    const fratrie = dessin.parts.filter((p) => p.anneau === partChoisie.anneau
      && (partChoisie.anneau === 1 || p.element.parent === partChoisie.element.parent)).sort((a, b) => a.debut - b.debut);
    return fratrie.length < 2 ? null : fratrie;
  })();
  const remplissageReglable = partChoisie !== null && !partChoisie.calcule && partChoisie.element.statut !== 'fait'
    && !dessin.parts.some((p) => p.element.parent === partChoisie.element.id)
    && !elements.some((e) => e.parent === partChoisie.element.id);

  function commencerGeste(evenement: EvenementPointeur, nouveau: Geste): void {
    evenement.stopPropagation();
    evenement.preventDefault();
    dessinRef.current?.setPointerCapture(evenement.pointerId);
    setGeste(nouveau);
  }

  function suivreGeste(clientX: number, clientY: number): void {
    if (!geste) return;
    const q = pointDuDessin(dessinRef.current, clientX, clientY);
    if (!q) return;
    const { angle, rayon } = polaire(q.x, q.y);
    if (geste.sorte === 'frontiere') {
      const etire = etirerPart(geste.part, geste.fratrie, angle);
      if (etire) setApercu(new Map([[geste.part.element.id, etire.poids]]));
    } else {
      const { interieur, exterieur } = geometrieDe(geste.part, anneauxDessines, rc);
      setAvancementEssaye({ id: geste.part.element.id, valeur: avancementSous(rayon, interieur, exterieur) });
    }
  }

  async function finirGeste(): Promise<void> {
    const fini = geste;
    setGeste(null);
    if (!fini) return;
    if (fini.sorte === 'frontiere') {
      const poids = apercu.get(fini.part.element.id);
      if (poids !== undefined) await modifier(fini.part.element.id, { poids });
      setApercu(new Map());
    } else if (avancementEssaye) {
      await modifier(fini.part.element.id, { avancement: avancementEssaye.valeur });
      setAvancementEssaye(null);
    }
  }

  // ——— Glisser une part sur le cercle pour la ranger ailleurs ———
  function appuyer(part: Part, evenement: EvenementPointeur): void {
    if (evenement.button !== 0 || geste || doigts.current.size > 1) return;
    const nouveau = { part, x: evenement.clientX, y: evenement.clientY, pointeur: evenement.pointerId, sorte: evenement.pointerType, minuteur: null as number | null };
    if (evenement.pointerType !== 'mouse') {
      // Au doigt, un appui long attrape la part ; bouger avant laisse la page défiler.
      nouveau.minuteur = window.setTimeout(() => attraper(nouveau.x, nouveau.y), APPUI_LONG);
    }
    appui.current = nouveau;
  }

  function attraper(clientX: number, clientY: number): void {
    const a = appui.current;
    if (!a) return;
    if (a.minuteur !== null) window.clearTimeout(a.minuteur);
    const q = pointDuDessin(dessinRef.current, clientX, clientY);
    if (!q) return;
    try { dessinRef.current?.setPointerCapture(a.pointeur); } catch { /* le pointeur est déjà relâché */ }
    navigator.vibrate?.(15);
    setSurvol(null);
    setGlisse({ part: a.part, x: q.x, y: q.y, cible: cibleSous(dessin.parts, anneauxDessines, q.x, q.y, rc) });
  }

  /** Un doigt de plus sur le dessin : au deuxième, la pince remplace tout autre geste. */
  function poserDoigt(evenement: EvenementPointeur<SVGSVGElement>): void {
    if (evenement.pointerType === 'mouse') return;
    doigts.current.set(evenement.pointerId, { x: evenement.clientX, y: evenement.clientY });
    if (doigts.current.size !== 2) return;
    const a = appui.current;
    if (a?.minuteur != null) window.clearTimeout(a.minuteur);
    appui.current = null;
    setGlisse(null); setGeste(null); setApercu(new Map()); setAvancementEssaye(null); setSurvol(null);
    const [p, q] = [...doigts.current.values()];
    if (!p || !q) return;
    const milieu = pointDuDessin(dessinRef.current, (p.x + q.x) / 2, (p.y + q.y) / 2);
    if (milieu) pince.current = { ecart: Math.hypot(p.x - q.x, p.y - q.y), loupe, milieu };
  }

  function leverDoigt(evenement: EvenementPointeur<SVGSVGElement>): void {
    doigts.current.delete(evenement.pointerId);
    if (doigts.current.size < 2) pince.current = null;
  }

  /** La pince : l'écart des doigts grossit, et le point du dessin pris entre eux reste entre eux. */
  function pincer(): boolean {
    const debut = pince.current;
    const svg = dessinRef.current;
    const [p, q] = [...doigts.current.values()];
    if (!debut || !svg || !p || !q) return false;
    const k = Math.min(ZOOM_MAX, Math.max(1, debut.loupe.k * (Math.hypot(p.x - q.x, p.y - q.y) / Math.max(1, debut.ecart))));
    const boite = svg.getBoundingClientRect();
    const cote = (2 * VUE) / k;
    const fx = ((p.x + q.x) / 2 - boite.left) / boite.width;
    const fy = ((p.y + q.y) / 2 - boite.top) / boite.height;
    setLoupe(borner({ k, x: debut.milieu.x - fx * cote + cote / 2, y: debut.milieu.y - fy * cote + cote / 2 }));
    return true;
  }

  function bouger(evenement: EvenementPointeur<SVGSVGElement>): void {
    if (doigts.current.has(evenement.pointerId)) doigts.current.set(evenement.pointerId, { x: evenement.clientX, y: evenement.clientY });
    if (pince.current) { pincer(); return; }
    if (geste) { suivreGeste(evenement.clientX, evenement.clientY); return; }
    if (glisse) {
      const q = pointDuDessin(dessinRef.current, evenement.clientX, evenement.clientY);
      if (q) setGlisse({ ...glisse, x: q.x, y: q.y, cible: cibleSous(dessin.parts, anneauxDessines, q.x, q.y, rc) });
      return;
    }
    const a = appui.current;
    if (!a || a.pointeur !== evenement.pointerId) return;
    const distance = Math.hypot(evenement.clientX - a.x, evenement.clientY - a.y);
    if (a.sorte === 'mouse' && distance > 5) attraper(evenement.clientX, evenement.clientY);
    else if (a.sorte !== 'mouse' && distance > 8) { if (a.minuteur !== null) window.clearTimeout(a.minuteur); appui.current = null; }
  }

  async function relacher(): Promise<void> {
    const a = appui.current;
    if (a?.minuteur != null) window.clearTimeout(a.minuteur);
    appui.current = null;
    if (geste) { await finirGeste(); return; }
    if (!glisse) return;
    const lachee = glisse;
    setGlisse(null);
    ignorerClic.current = true;
    window.setTimeout(() => { ignorerClic.current = false; }, 0);
    if (lachee.cible) await deposer(lachee.part.element, lachee.cible);
  }

  // Au doigt, une fois la part attrapée, la page ne doit plus défiler : il faut un écouteur « non passif ».
  useEffect(() => {
    const svg = dessinRef.current;
    if (!svg) return undefined;
    const retenir = (e: TouchEvent): void => { if (glisse || geste || e.touches.length > 1) e.preventDefault(); };
    svg.addEventListener('touchmove', retenir, { passive: false });
    return () => svg.removeEventListener('touchmove', retenir);
  }, [glisse, geste]);

  // La molette avec Ctrl (ou le pincement d'un pavé tactile, que le navigateur envoie ainsi) zoome
  // autour du pointeur ; sans Ctrl, la molette fait défiler la page comme d'habitude.
  useEffect(() => {
    const svg = dessinRef.current;
    if (!svg) return undefined;
    const molette = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = pointDuDessin(svg, e.clientX, e.clientY);
      if (p) setLoupe((l) => zoomerAutour(l, Math.exp(-e.deltaY / 300), p));
    };
    svg.addEventListener('wheel', molette, { passive: false });
    return () => svg.removeEventListener('wheel', molette);
  }, []);

  // Échap quitte le plein écran (avant de remonter d'un niveau).
  useEffect(() => {
    if (!pleinEcran) return undefined;
    const touche = (e: globalThis.KeyboardEvent): void => {
      // Dans un champ, Échap ferme d'abord le champ.
      if (e.key !== 'Escape' || e.defaultPrevented || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select'))) return;
      e.preventDefault();
      setPleinEcran(false);
    };
    window.addEventListener('keydown', touche, true);
    return () => window.removeEventListener('keydown', touche, true);
  }, [pleinEcran]);

  /** Range l'élément lâché : dans le centre, dans une part, ou avant ou après une part (dans le parent de celle-ci). */
  async function deposer(element: Element, cible: Cible): Promise<void> {
    const parId = new Map(elements.map((e) => [e.id, e]));
    const enfants = enfantsParParent(elements);
    let parent: string | null;
    let ordre: string[];
    if (cible.sorte === 'centre' || cible.ou === 'dans') {
      parent = cible.sorte === 'centre' ? dessin.centre?.id ?? null : cible.part.element.id;
      if (parent === element.id) return;
      ordre = [...enfantsDe(parent, elements, enfants).map((e) => e.id).filter((i) => i !== element.id), element.id];
    } else {
      const voisine = cible.part.element;
      if (voisine.id === element.id) return;
      parent = voisine.parent && parId.has(voisine.parent) ? voisine.parent : null;
      const freres = enfantsDe(parent, elements, enfants).map((e) => e.id).filter((i) => i !== element.id);
      const i = freres.indexOf(voisine.id);
      ordre = [...freres.slice(0, cible.ou === 'avant' ? i : i + 1), element.id, ...freres.slice(cible.ou === 'avant' ? i : i + 1)];
    }
    // Une boucle : le nouveau parent est l'élément lui-même ou l'un de ses sous-éléments.
    for (let p = parent; p !== null; p = parId.get(p)?.parent ?? null) {
      if (p === element.id) { signaler('On ne peut pas ranger un élément dans l’un de ses propres sous-éléments.'); return; }
    }
    const avant = enfantsDe(element.parent && parId.has(element.parent) ? element.parent : null, elements, enfants).map((e) => e.id);
    const memeParent = (element.parent && parId.has(element.parent) ? element.parent : null) === parent;
    if (memeParent && avant.join() === ordre.join()) return;
    await ranger(element.id, parent, ordre);
  }

  if (centreInconnu) {
    return (
      <div id="cercles">
        <p className="etat">Cet élément n’existe plus. <a href="/cercles" onClick={(e) => { e.preventDefault(); naviguer(adresseCercles(null)); }}>Revenir à Tout</a></p>
      </div>
    );
  }

  const titreCentre = dessin.centre?.titre ?? 'Tout';
  const lignesCentre = couper(titreCentre, 11, 2);
  const cible = glisse?.cible ?? null;
  return (
    <div id="cercles">
      <div className="reglages">
        <nav aria-label="Fil d'Ariane" className="fil">
          <a href="/cercles" aria-current={centre === null ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); naviguer(adresseCercles(null)); }}>Tout</a>
          {fil.map((e) => (
            <span key={e.id}>
              <span aria-hidden="true"> › </span>
              <a href={adresseCercles(e.id)} aria-current={e.id === centre ? 'page' : undefined}
                onClick={(ev) => { ev.preventDefault(); naviguer(adresseCercles(e.id)); }}>{e.titre}</a>
            </span>
          ))}
        </nav>
        <button type="button" className="enregistrer-image" onClick={() => enregistrerImage(dessinRef.current, titreCentre)}>
          Enregistrer l’image
        </button>
        <button type="button" className="enregistrer-image" onClick={() => exporterCsv(csvDeBranche(elements, centre, parElement), titreCentre)}>
          Exporter en CSV
        </button>
        <label className="anneaux">
          Anneaux
          <select value={anneaux} onChange={(e) => naviguer(adresseCercles(centre, Number(e.target.value)), { remplacer: true })}>
            {Array.from({ length: ANNEAUX_MAX }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className={['zone-dessin', pleinEcran && 'plein-ecran'].filter(Boolean).join(' ')}>
      <div className="outils-loupe" role="toolbar" aria-label="Zoom">
        <button type="button" aria-label="Dézoomer" title="Dézoomer (Ctrl + molette, ou pincer)" disabled={loupe.k <= 1}
          onClick={() => setLoupe((l) => zoomerAutour(l, 1 / 1.5, { x: l.x, y: l.y }))}>−</button>
        <button type="button" aria-label="Zoomer" title="Zoomer (Ctrl + molette, ou pincer)" disabled={loupe.k >= ZOOM_MAX}
          onClick={() => setLoupe((l) => zoomerAutour(l, 1.5, { x: l.x, y: l.y }))}>+</button>
        {loupe.k > 1 && <button type="button" aria-label="Voir le cercle entier" title="Voir le cercle entier" onClick={() => setLoupe(LOUPE_ENTIERE)}>⊙</button>}
        <button type="button" aria-label={pleinEcran ? 'Quitter le plein écran' : 'Plein écran'} aria-pressed={pleinEcran}
          title={pleinEcran ? 'Quitter le plein écran (Échap)' : 'Plein écran'} onClick={() => setPleinEcran((v) => !v)}>{pleinEcran ? '✕' : '⛶'}</button>
      </div>
      <svg ref={dessinRef} viewBox={`${cadre.x} ${cadre.y} ${cadre.cote} ${cadre.cote}`} role="group" aria-label={`Cercles de « ${titreCentre} »`}
        className={['dessin-cercles', glisse && 'glisse-en-cours', geste && 'geste-en-cours'].filter(Boolean).join(' ')}
        data-anime={mouvement ? 'oui' : undefined} data-zoom={Math.round(loupe.k * 100) / 100}
        onPointerDownCapture={poserDoigt}
        onPointerMove={bouger} onPointerUp={(e) => { leverDoigt(e); void relacher(); }}
        onPointerCancel={(e) => { leverDoigt(e); appui.current = null; setGlisse(null); if (geste) void finirGeste(); }}
        onContextMenu={(e) => { if (appui.current || glisse) e.preventDefault(); }}>
        {mouvement?.fantomes.map((p) => {
          const t = enCours?.get(p.element.id);
          if (!t) return null;
          const g = t.geometrie;
          return (
            <g key={`fantome-${p.element.id}`} className={`part fantome branche-${p.couleur}`} opacity={t.opacite} aria-hidden="true">
              <path className="fond" d={chemin(g.interieur, g.exterieur, g.debut, g.fin)} />
              <path className="contour" d={chemin(g.interieur, g.exterieur, g.debut, g.fin)} />
            </g>
          );
        })}
        {dessin.parts.map((p) => (
          <PartDessinee key={p.element.id} part={p} geometrie={geometrieDeLaPart(p)} zoom={loupe.k} opacite={enCours?.get(p.element.id)?.opacite ?? 1}
            enMouvement={mouvement !== null} choisie={p.element.id === choisi}
            eteinte={(eclaires !== null && !eclaires.has(p.element.id)) || (gardees !== null && !gardees.has(p.element.id))}
            enRetard={p.element.echeance !== null && p.element.echeance < jour && p.element.statut !== 'fait'}
            glissee={glisse?.part.element.id === p.element.id}
            cible={cible?.sorte === 'part' && cible.part.element.id === p.element.id ? cible.ou : null}
            toucher={() => toucher(p)} zoomer={() => zoomer(p.element.id)} fleche={(touche) => fleche(p, touche)}
            raccourci={(touche) => raccourci(p, touche)}
            menu={() => { if (choisi !== p.element.id) { setChoisi(p.element.id); setEdition(null); } }}
            appuyer={(e) => appuyer(p, e)}
            survoler={(e) => {
              if (e.pointerType !== 'mouse' || glisse || geste) { setSurvol(null); return; }
              setSurvol({ part: p, x: e.clientX, y: e.clientY });
            }}
            quitter={() => setSurvol((s) => (s?.part.element.id === p.element.id ? null : s))} />
        ))}
        {partChoisie && !mouvement && !glisse && fratrieChoisie && (() => {
          const { interieur, exterieur } = geometrieDe(partChoisie, anneauxDessines, rc);
          const angle = bordTire(partChoisie, fratrieChoisie) === 'fin' ? partChoisie.fin : partChoisie.debut;
          const a = point(interieur + 1, angle);
          const b = point(exterieur - 1, angle);
          const m = point((interieur + exterieur) / 2, angle);
          return (
            <g className="poignee poignee-frontiere" role="slider" aria-label={`Importance de « ${partChoisie.element.titre} »`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(partChoisie.part * 100)}
              data-x={Math.round(m.x * 100) / 100} data-y={Math.round(m.y * 100) / 100}
              onPointerDown={(e) => commencerGeste(e, { sorte: 'frontiere', part: partChoisie, fratrie: fratrieChoisie, pointeur: e.pointerId })}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              <circle cx={m.x} cy={m.y} r={3.2} />
              <circle className="zone" cx={m.x} cy={m.y} r={7} />
            </g>
          );
        })()}
        {partChoisie && !mouvement && !glisse && remplissageReglable && (() => {
          const { interieur, exterieur } = geometrieDe(partChoisie, anneauxDessines, rc);
          const r = interieur + ((exterieur - interieur) * partChoisie.avancement) / 100;
          const m = point(r, (partChoisie.debut + partChoisie.fin) / 2);
          return (
            <g className="poignee poignee-avancement" role="slider" aria-label={`Avancement de « ${partChoisie.element.titre} »`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(partChoisie.avancement)}
              data-x={Math.round(m.x * 100) / 100} data-y={Math.round(m.y * 100) / 100}
              onPointerDown={(e) => commencerGeste(e, { sorte: 'avancement', part: partChoisie, pointeur: e.pointerId })}>
              <circle cx={m.x} cy={m.y} r={2.8} />
              <circle className="zone" cx={m.x} cy={m.y} r={7} />
            </g>
          );
        })()}
        {coeur.bandes.length > 0 && (
          // L'oignon : « Tout » au milieu, puis les ancêtres ; toucher l'un d'eux y remonte directement.
          <g className="oignon">
            <g className="anneau-parent racine" role="button" tabIndex={0} aria-label="Remonter à « Tout »"
              onClick={() => naviguer(adresseCercles(null))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); naviguer(adresseCercles(null)); } }}>
              <circle r={coeur.racine} />
              <text className="titre-oignon">Tout</text>
            </g>
            {fil.slice(0, -1).map((e, i) => {
              const bande = coeur.bandes[i];
              if (!bande) return null;
              const milieu = (bande.interieur + bande.exterieur) / 2;
              return (
                <g key={e.id} className="anneau-parent" role="button" tabIndex={0} aria-label={`Remonter à « ${e.titre} »`}
                  data-titre={e.titre} onClick={() => naviguer(adresseCercles(e.id))}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); naviguer(adresseCercles(e.id)); } }}>
                  <path className="bande" d={chemin(bande.interieur, bande.exterieur, 0, 2 * Math.PI)} />
                  <path id={`oignon-${i}`} className="trace" d={arcDuHaut(milieu)} />
                  <text className="titre-oignon" style={{ fontSize: `${Math.min(3.6, (bande.exterieur - bande.interieur) * 0.62)}px` }}>
                    <textPath href={`#oignon-${i}`} startOffset="50%">{couper(e.titre, Math.max(6, Math.floor((Math.PI * milieu) / 2.4)), 1)[0]}</textPath>
                  </text>
                </g>
              );
            })}
          </g>
        )}
        <g className={['centre', coeur.bandes.length > 0 && 'en-oignon', cible?.sorte === 'centre' && 'cible-dans'].filter(Boolean).join(' ')} role="button" tabIndex={0}
          aria-label={centre === null ? `Tout, avancement ${Math.round(dessin.avancementCentre)} %` : `Remonter depuis « ${titreCentre} »`}
          onClick={remonter}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remonter(); }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const premiere = dessin.parts.filter((p) => p.anneau === 1).sort((a, b) => a.debut - b.debut)[0];
              if (premiere) { setChoisi(premiere.element.id); dessinRef.current?.querySelector<SVGGElement>(`g.part[data-id="${premiere.element.id}"]`)?.focus(); }
            }
          }}>
          {(() => {
            const bande = coeur.bandes.at(-1);
            if (!bande) {
              return (
                <>
                  <circle r={rc - 1} />
                  {lignesCentre.map((l, i) => (
                    <text key={i} y={(lignesCentre.length === 1 ? -3 : -6) + i * 5.4} className="titre-centre">{l}</text>
                  ))}
                  <text y={lignesCentre.length === 1 ? 6 : 8} className="avancement-centre">{Math.round(dessin.avancementCentre)} %</text>
                </>
              );
            }
            // Le centre est la bande la plus large de l'oignon : son titre en haut, son avancement en bas.
            const milieu = (bande.interieur + bande.exterieur) / 2;
            return (
              <>
                <path className="bande" d={chemin(bande.interieur, bande.exterieur - 0.6, 0, 2 * Math.PI)} />
                <path id="oignon-centre-haut" className="trace" d={arcDuHaut(milieu)} />
                <path id="oignon-centre-bas" className="trace" d={arcDuBas(milieu)} />
                {/* Zoomé, le titre garde sa taille à l'écran : plus de lettres tiennent sur l'arc. */}
                <text className="titre-centre" style={loupe.k > 1 ? { fontSize: `${4.6 / loupe.k}px` } : undefined}>
                  <textPath href="#oignon-centre-haut" startOffset="50%">{couper(titreCentre, Math.max(8, Math.floor((Math.PI * milieu * loupe.k) / 2.9)), 1)[0]}</textPath>
                </text>
                <text className="avancement-centre">
                  <textPath href="#oignon-centre-bas" startOffset="50%">{Math.round(dessin.avancementCentre)} %</textPath>
                </text>
              </>
            );
          })()}
        </g>
        {glisse && (
          <g className="etiquette-glisse" aria-hidden="true" transform={`translate(${glisse.x} ${glisse.y - 9})`}>
            <rect x={-30} y={-4.5} width={60} height={9} rx={2} />
            <text>{couper(glisse.part.element.titre, 18, 1)[0]}</text>
          </g>
        )}
        {!mouvement && !glisse && !geste && !edition && (() => {
          // Les boutons d'action, sur le bord du cercle (pas sur les titres) : sans part choisie, un « + »
          // en bas ajoute dans le centre ; avec une part choisie, ses boutons se posent au-delà de son bord.
          if (!partChoisie) {
            return (
              <g className="barre-part">
                <BoutonCercle angle={Math.PI} classe="plus ajout-centre" signe="+" nom={`Ajouter dans « ${titreCentre} »`}
                  agir={() => setEdition({ sorte: 'dedans', id: dessin.centre?.id ?? null })} />
              </g>
            );
          }
          const e = partChoisie.element;
          const angles = anglesDesBoutons(partChoisie);
          return (
            <g className="barre-part" role="toolbar" aria-label={`Actions sur « ${e.titre} »`}>
              <BoutonCercle angle={angles.supprimer} classe="moins" signe="−" nom="Supprimer" aide="Supprimer (Suppr)"
                agir={() => void supprimerSurLeCercle(partChoisie)} />
              <BoutonCercle angle={angles.renommer} classe="crayon" signe="✎" nom="Renommer" aide="Renommer (F2)"
                agir={() => setEdition({ sorte: 'renommer', id: e.id })} />
              <BoutonCercle angle={angles.dedans} classe="plus" signe="+" nom="Ajouter un sous-élément" aide="Ajouter un sous-élément, sur l'anneau suivant (Inser)"
                agir={() => setEdition({ sorte: 'dedans', id: e.id })} />
              <BoutonCercle angle={angles.cote} classe="plus cote" signe="+" nom="Ajouter à côté" aide="Ajouter à côté, juste après (Ctrl+Maj+Entrée)"
                agir={() => setEdition({ sorte: 'cote', id: e.id })} />
            </g>
          );
        })()}
      </svg>
      {geste && (() => {
        // Pendant un réglage, la valeur s'affiche au-dessus du cercle, là où le doigt ne la cache pas.
        const id = geste.part.element.id;
        const p = dessin.parts.find((x) => x.element.id === id);
        if (!p) return null;
        const valeur = geste.sorte === 'frontiere' ? `${pourcent(p.part)} de son parent`
          : `Avancement ${avancementEssaye?.id === id ? avancementEssaye.valeur : Math.round(p.avancement)} %`;
        return (
          <div className="valeur-geste" role="status">
            <strong>{p.element.titre}</strong>
            <span>{valeur}</span>
          </div>
        );
      })()}
      {!mouvement && !glisse && !geste && edition && (() => {
        // Le champ pour taper un titre, posé au bord du cercle, là où l'on a touché le bouton.
        if (edition.sorte === 'dedans' && edition.id === (dessin.centre?.id ?? null) && !partChoisie) {
          const q = point(RAYON_BOUTONS, Math.PI);
          return (
            <SaisieCercle position={dansLaZone(q.x, q.y)} dessous libelle={`Ajouter dans « ${titreCentre} »`} valeur=""
              valider={(t) => ajouterSurLeCercle('dedans', dessin.centre?.id ?? null, t)} fermer={() => setEdition(null)} />
          );
        }
        if (!partChoisie || edition.id !== partChoisie.element.id) return null;
        const e = partChoisie.element;
        const q = point(RAYON_BOUTONS, milieuDe(partChoisie));
        const libelle = edition.sorte === 'dedans' ? `Ajouter dans « ${e.titre} »`
          : edition.sorte === 'cote' ? 'Ajouter à côté' : `Renommer « ${e.titre} »`;
        return (
          <SaisieCercle key={`${edition.sorte}-${e.id}`} position={dansLaZone(q.x, q.y)} dessous={q.y >= 0} libelle={libelle}
            valeur={edition.sorte === 'renommer' ? e.titre : ''}
            valider={(t) => (edition.sorte === 'renommer' ? renommerSurLeCercle(e.id, t) : ajouterSurLeCercle(edition.sorte, e.id, t))}
            fermer={() => fermerSaisie(e.id)} />
        );
      })()}
      </div>

      {glisse && (
        <p className="consigne-glisse" role="status">
          {cible === null ? 'Lâcher hors du cercle : rien ne change.'
            : cible.sorte === 'centre' ? `Ranger dans « ${titreCentre} »`
              : cible.part.element.id === glisse.part.element.id ? 'Lâcher ici : rien ne change.'
                : cible.ou === 'dans' ? `Ranger dans « ${cible.part.element.titre} »`
                  : `Placer ${cible.ou === 'avant' ? 'avant' : 'après'} « ${cible.part.element.titre} »`}
        </p>
      )}

      {survol && !glisse && survol.part.element.id !== partChoisie?.element.id && (
        <div className="bulle-part" role="tooltip" style={{ left: survol.x + 14, top: survol.y + 14 }}>
          <strong>{survol.part.element.titre}</strong>
          <span>{pourcent(survol.part.part)} de son parent · {pourcent(survol.part.absolue)} du centre</span>
          <span>Avancement {Math.round(survol.part.avancement)} %{survol.part.calcule ? ' (calculé)' : ''}</span>
        </div>
      )}

      {dessin.parts.length === 0 && (
        <p className="etat">
          {centre === null
            ? 'Rien à montrer : créer un objectif ou un projet, ou ranger des éléments les uns dans les autres.'
            : 'Aucun sous-élément ici pour l’instant.'}
        </p>
      )}

      <div className="cote">
      {partChoisie ? (
        // La fiche se refait quand le poids ou l'avancement enregistrés changent (un geste sur le cercle),
        // pas pendant un essai au curseur : on lit donc l'élément tel qu'il est enregistré.
        <FichePart key={cleFiche(elements.find((x) => x.id === partChoisie.element.id) ?? partChoisie.element)}
          part={partChoisie} elements={elements} ouvert={ouvert === partChoisie.element.id}
          zoomer={() => zoomer(partChoisie.element.id)} ouvrir={() => ouvrir(partChoisie.element.id)}
          essayerPoids={(poids) => setApercu(poids === null ? new Map() : new Map([[partChoisie.element.id, poids]]))}
          essayerAvancement={(valeur) => setAvancementEssaye(valeur === null ? null : { id: partChoisie.element.id, valeur })}
          modifier={async (c) => { await modifier(partChoisie.element.id, c); setApercu(new Map()); setAvancementEssaye(null); }}
          egaliser={() => modifierPlusieurs(elements.filter((x) => x.parent === partChoisie.element.id && x.poids !== null)
            .map((x) => [x.id, { poids: null }] as [string, Changements]))}
          creerListe={(texte) => creerListe(partChoisie.element.id, texte, 'tache')}
          teinte={(parElement.get(partChoisie.element.id) ?? []).find((t) => t.startsWith('couleur:'))?.slice('couleur:'.length) ?? ''}
          colorer={(t) => colorer(partChoisie.element.id, t)}
          creer={creer} supprimer={async () => { setChoisi(null); await supprimer(partChoisie.element); }} />
      ) : (
        <AjoutAuCentre centre={dessin.centre} elements={elements} creer={creer}
          creerListe={(texte) => creerListe(dessin.centre?.id ?? null, texte, dessin.centre ? 'tache' : 'objectif')}
          egaliser={() => modifierPlusieurs(enfantsDe(centre, elements).filter((x) => x.poids !== null)
            .map((x) => [x.id, { poids: null }] as [string, Changements]))} />
      )}

      <PlanCercles elements={elements} centre={centre} choisi={choisi} choisir={setChoisi} ranger={ranger} signaler={signaler}
        eclaires={eclaires} />
      </div>
    </div>
  );
}

/** Un bouton rond posé sur le bord du cercle, à l'angle donné. */
function BoutonCercle({ angle, classe, signe, nom, aide, agir }: {
  angle: number; classe: string; signe: string; nom: string; aide?: string; agir: () => void;
}) {
  const q = point(RAYON_BOUTONS, angle);
  return (
    <g className={`bouton-cercle ${classe}`} role="button" tabIndex={0} aria-label={nom}
      data-x={Math.round(q.x * 100) / 100} data-y={Math.round(q.y * 100) / 100}
      // Le doigt sur un bouton ne doit ni attraper la part dessous, ni compter pour une pince.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); agir(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); agir(); } }}>
      <title>{aide ?? nom}</title>
      <circle cx={q.x} cy={q.y} r={TAILLE_BOUTON} />
      <text x={q.x} y={q.y}>{signe}</text>
    </g>
  );
}

/** L'angle du milieu d'une part (le bas pour un tour entier). */
function milieuDe(part: Part): number {
  return part.fin - part.debut >= 2 * Math.PI - 1e-9 ? Math.PI : (part.debut + part.fin) / 2;
}

/**
 * Où poser les quatre boutons d'une part, au-delà du bord du cercle : « + dedans » face à son milieu
 * (l'anneau suivant, vers l'extérieur), « + à côté » sur sa frontière de fin (là où la sœur viendra),
 * puis « ✎ » et « − » avant le milieu. Une part étroite les écarte assez pour qu'ils ne se touchent pas.
 */
function anglesDesBoutons(part: Part): { supprimer: number; renommer: number; dedans: number; cote: number } {
  const pas = (2 * TAILLE_BOUTON + 2) / RAYON_BOUTONS;
  const milieu = milieuDe(part);
  const tour = part.fin - part.debut >= 2 * Math.PI - 1e-9;
  return {
    supprimer: milieu - 2 * pas, renommer: milieu - pas, dedans: milieu,
    cote: tour ? milieu + pas : Math.max(part.fin, milieu + pas),
  };
}

/** Un arc de cercle par le haut, de gauche à droite : un titre s'y lit à l'endroit. */
function arcDuHaut(r: number): string {
  return `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`;
}

/** Un arc de cercle par le bas, de gauche à droite : un titre s'y lit à l'endroit, lui aussi. */
function arcDuBas(r: number): string {
  return `M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`;
}

/**
 * Garde une bulle posée sur le cercle dans l'écran : si elle déborde à gauche ou à droite
 * (part au bord d'un téléphone), on la décale juste assez, sans changer sa hauteur.
 */
function useGarderDansLEcran<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.marginLeft = '0px';
    const r = el.getBoundingClientRect();
    const marge = 8;
    const largeur = document.documentElement.clientWidth;
    let decalage = 0;
    if (r.left < marge) decalage = marge - r.left;
    else if (r.right > largeur - marge) decalage = largeur - marge - r.right;
    el.style.marginLeft = `${decalage}px`;
  });
  return ref;
}

/** Le champ posé sur le cercle pour taper un titre : Entrée valide, Échap ferme (sans remonter d'un niveau). */
function SaisieCercle({ position, dessous, libelle, valeur, valider, fermer }: {
  position: { left: string; top: string }; dessous: boolean; libelle: string; valeur: string;
  valider: (titre: string) => Promise<void>; fermer: () => void;
}) {
  const [texte, setTexte] = useState(valeur);
  const [envoi, setEnvoi] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const cadre = useGarderDansLEcran<HTMLFormElement>();
  useEffect(() => { champ.current?.focus(); champ.current?.select(); }, []);
  async function envoyer(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    const titre = texte.trim();
    if (titre === '' || envoi) return;
    setEnvoi(true);
    try { await valider(titre); } finally { setEnvoi(false); }
    setTexte('');
  }
  return (
    <form ref={cadre} className={`saisie-cercle ${dessous ? 'dessous' : 'dessus'}`} autoComplete="off"
      style={position}
      onSubmit={(ev) => void envoyer(ev)}>
      <input ref={champ} aria-label={libelle} placeholder={libelle} maxLength={200} enterKeyHint="done" value={texte}
        onChange={(ev) => setTexte(ev.target.value)}
        onKeyDown={(ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fermer(); } }} />
      <button type="submit" aria-label="Valider" disabled={texte.trim() === '' || envoi}>✓</button>
      <button type="button" aria-label="Fermer" onClick={fermer}>✕</button>
    </form>
  );
}

interface ProprietesPart {
  readonly part: Part;
  /** Le grossissement de la loupe (1 : le cercle entier). */
  readonly zoom: number;
  /** Où elle se dessine en ce moment (pendant un mouvement, entre deux places). */
  readonly geometrie: Geometrie;
  readonly opacite: number;
  readonly enMouvement: boolean;
  readonly choisie: boolean;
  readonly eteinte: boolean;
  readonly enRetard: boolean;
  /** Elle est attrapée et suit le doigt. */
  readonly glissee: boolean;
  /** Une part glissée tomberait avant elle, dedans, ou après elle. */
  readonly cible: 'avant' | 'dans' | 'apres' | null;
  readonly toucher: () => void;
  readonly zoomer: () => void;
  readonly fleche: (touche: string) => void;
  /** Inser, +, F2, Suppr : rend vrai si la touche a servi. */
  readonly raccourci: (touche: string) => boolean;
  /** Le clic droit : la part est choisie et sa barre d'actions apparaît. */
  readonly menu: () => void;
  readonly appuyer: (evenement: EvenementPointeur) => void;
  readonly survoler: (evenement: EvenementPointeur) => void;
  readonly quitter: () => void;
}

/** Une part : sa couleur claire, sa portion faite en foncé (du bord intérieur vers l'extérieur), son titre s'il tient. */
function PartDessinee({ part, geometrie, zoom, opacite, enMouvement, choisie, eteinte, enRetard, glissee, cible, toucher, zoomer, fleche, raccourci, menu, appuyer, survoler, quitter }: ProprietesPart) {
  const { interieur, exterieur, debut, fin } = geometrie;
  const fait = interieur + ((exterieur - interieur) * part.avancement) / 100;
  const a = (debut + fin) / 2;
  const milieu = (interieur + exterieur) / 2;
  const { x, y } = point(milieu, a);
  // Zoomé, le texte garde sa taille à l'écran : plus petit dans le dessin, il laisse passer plus de lettres.
  const texte = enMouvement ? null : libelle(part.element.titre, geometrie, TAILLE_TEXTE / zoom, 1.6 / zoom);
  const description = `${part.element.titre}, ${pourcent(part.part)} de son parent, avancement ${Math.round(part.avancement)} %`
    + (enRetard ? `, en retard (échéance ${part.element.echeance ?? ''})` : '');
  const idArc = `arc-${part.element.id}`;
  return (
    <g className={[`part branche-${part.couleur} nuance-${part.nuance}`, choisie && 'choisie', part.element.statut === 'fait' && 'faite',
      eteinte && 'eteinte', enRetard && 'en-retard', glissee && 'glissee', cible && `cible-${cible}`].filter(Boolean).join(' ')}
      role="button" tabIndex={0} aria-label={description} aria-pressed={choisie} data-titre={part.element.titre} data-id={part.element.id}
      data-x={Math.round(x * 100) / 100} data-y={Math.round(y * 100) / 100} opacity={opacite < 1 ? opacite : undefined}
      data-angle={Math.round(((part.fin - part.debut) * 180) / Math.PI)} data-avancement={Math.round(part.avancement)}
      data-interieur={Math.round(interieur * 100) / 100} data-exterieur={Math.round(exterieur * 100) / 100}
      onClick={toucher} onPointerDown={appuyer} onPointerEnter={survoler} onPointerMove={survoler} onPointerLeave={quitter}
      onKeyDown={(e: KeyboardEvent) => {
        // Les raccourcis à touches combinées (ceux de Goalscape) passent avant Entrée seule, qui zoome.
        const combinee = `${e.ctrlKey || e.metaKey ? 'Mod+' : ''}${e.shiftKey ? 'Maj+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`;
        if (combinee !== e.key && raccourci(combinee)) { e.preventDefault(); return; }
        if (e.key === 'Enter') { e.preventDefault(); zoomer(); } else if (e.key === ' ') { e.preventDefault(); toucher(); }
        else if (e.key.startsWith('Arrow')) { e.preventDefault(); fleche(e.key); }
        else if (raccourci(e.key)) e.preventDefault();
      }}
      onContextMenu={(e) => { e.preventDefault(); menu(); }}>
      <path className="fond" d={chemin(interieur, exterieur, debut, fin)} />
      {part.avancement > 0 && <path className="rempli" d={chemin(interieur, fait, debut, fin)} />}
      <path className="contour" d={chemin(interieur, exterieur, debut, fin)} />
      {cible === 'avant' || cible === 'apres' ? (() => {
        const bord = cible === 'avant' ? debut : fin;
        const p1 = point(interieur, bord);
        const p2 = point(exterieur, bord);
        return <line className="repere-depot" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
      })() : null}
      {texte && part.element.description && (() => {
        const q = point(exterieur - Math.min(2.4, (exterieur - interieur) * 0.15), a);
        return <circle className="indicateur" cx={q.x} cy={q.y} r={1.1}><title>A une description</title></circle>;
      })()}
      {texte?.mode === 'arc' && texte.lignes.map((ligne, i) => (
        <g key={i}>
          <path id={`${idArc}-${i}`} d={arcDeTexte(ligne.rayon, debut, fin, texte.inverse)} fill="none" stroke="none" />
          <text fontSize={texte.taille}>
            <textPath href={`#${idArc}-${i}`} startOffset="50%">{ligne.texte}</textPath>
          </text>
        </g>
      ))}
      {texte?.mode === 'rayon' && (() => {
        const degres = (a * 180) / Math.PI;
        // Le long du rayon, vers l'extérieur à droite du cercle ; vers le centre à gauche, pour se lire à l'endroit.
        const rotation = a > Math.PI ? degres + 90 : degres - 90;
        return <text x={x} y={y} fontSize={texte.taille} transform={`rotate(${rotation} ${x} ${y})`}>{texte.texte}</text>;
      })()}
    </g>
  );
}

interface ProprietesFiche {
  readonly part: Part;
  readonly elements: readonly Element[];
  readonly ouvert: boolean;
  readonly zoomer: () => void;
  readonly ouvrir: () => void;
  readonly essayerPoids: (poids: number | null) => void;
  readonly essayerAvancement: (valeur: number | null) => void;
  readonly modifier: (changements: Changements) => Promise<void>;
  readonly creer: (champs: Changements & { titre: string }) => Promise<unknown>;
  readonly supprimer: () => Promise<void>;
  readonly egaliser: () => Promise<void>;
  readonly creerListe: (texte: string) => Promise<number>;
  /** La teinte choisie, ou '' (automatique). */
  readonly teinte: string;
  readonly colorer: (teinte: string | null) => Promise<void>;
}

/** La fiche de la part choisie : ce qu'elle pèse, où elle en est, et de quoi la changer. */
function FichePart({ part, elements, zoomer, ouvrir, essayerPoids, essayerAvancement, modifier, creer, supprimer, egaliser, creerListe, teinte, colorer }: ProprietesFiche) {
  const e = part.element;
  const enfants = enfantsParParent(elements);
  const soeurs = enfantsDe(e.parent, elements, enfants).filter((s) => s.id !== e.id);
  const [importance, setImportance] = useState(Math.round(part.part * 100));
  const [avancement, setAvancement] = useState(e.avancement ?? 0);
  const [titre, setTitre] = useState(e.titre);
  const curseurImportance = useRef<HTMLInputElement>(null);
  const curseurAvancement = useRef<HTMLInputElement>(null);

  // Le curseur se suit sous le doigt (événement « input ») ; on n'enregistre qu'au lâcher (« change »).
  // React appelle « onChange » l'événement « input » : le vrai « change » s'écoute à la main.
  useEffect(() => {
    const champ = curseurImportance.current;
    if (!champ) return undefined;
    const lacher = (): void => {
      const p = Number(champ.value) / 100;
      void modifier({ poids: poidsPourPart(p, soeurs.map((s) => s.poids)) });
    };
    champ.addEventListener('change', lacher);
    return () => champ.removeEventListener('change', lacher);
  });
  useEffect(() => {
    const champ = curseurAvancement.current;
    if (!champ) return undefined;
    const lacher = (): void => { void modifier({ avancement: Number(champ.value) }); };
    champ.addEventListener('change', lacher);
    return () => champ.removeEventListener('change', lacher);
  });

  async function renommer(): Promise<void> {
    if (titre.trim() === '' || titre.trim() === e.titre) return;
    await modifier({ titre: titre.trim() });
  }

  return (
    <section className="fiche-part" aria-label={`Fiche de « ${e.titre} »`}>
      <form onSubmit={(ev) => { ev.preventDefault(); void renommer(); }} className="titre-fiche">
        <input aria-label="Titre de la part" value={titre} maxLength={200} onChange={(ev) => setTitre(ev.target.value)}
          onBlur={() => void renommer()} />
      </form>
      <p className="doux">
        {e.type} · <span className="part-du-parent">{pourcent(part.part)}</span> de son parent
        (<span className="part-du-centre">{pourcent(part.absolue)}</span> du centre) ·
        avancement <span className="avancement-part">{Math.round(part.avancement)} %</span>{part.calcule ? ' (calculé)' : ''}
        {e.echeance && <> · échéance {e.echeance}</>}
      </p>

      {soeurs.length > 0 ? (
        <label className="curseur">
          <span>Importance : <output>{importance} %</output></span>
          <input ref={curseurImportance} type="range" min={1} max={99} step={1} value={importance} aria-label="Importance"
            onChange={(ev) => {
              const v = Number(ev.target.value);
              setImportance(v);
              essayerPoids(poidsPourPart(v / 100, soeurs.map((s) => s.poids)));
            }} />
        </label>
      ) : <p className="doux">Seule dans son parent : elle en fait 100 %.</p>}

      {part.calcule ? (
        <p className="doux">L’avancement se calcule à partir de ses sous-éléments.</p>
      ) : (
        <div className="rangee-avancement">
          <label className="curseur">
            <span>Avancement : <output>{e.statut === 'fait' ? 100 : avancement} %</output></span>
            <input ref={curseurAvancement} type="range" min={0} max={100} step={5} value={e.statut === 'fait' ? 100 : avancement}
              aria-label="Avancement" disabled={e.statut === 'fait'}
              onChange={(ev) => { const v = Number(ev.target.value); setAvancement(v); essayerAvancement(v); }} />
          </label>
          <label className="case-fait">
            <input type="checkbox" checked={e.statut === 'fait'} onChange={(ev) => void modifier({ statut: ev.target.checked ? 'fait' : 'a_faire' })} />
            Fait
          </label>
        </div>
      )}

      <label className="couleur">
        Couleur
        <select value={teinte} onChange={(ev) => void colorer(ev.target.value || null)}>
          <option value="">Automatique</option>
          {TEINTES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <div className="actions-fiche">
        <button type="button" onClick={zoomer}>Zoomer</button>
        {(enfants.get(e.id) ?? []).length > 1 && <button type="button" onClick={() => void egaliser()}>Égaliser les sous-éléments</button>}
        <button type="button" onClick={ouvrir}>Détail</button>
        <button type="button" className="danger" onClick={() => void supprimer()}>Supprimer</button>
      </div>
      <Ajout parent={e} soeursDuNouveau={enfants.get(e.id) ?? []} libelle="Sous-élément" creer={creer} />
      <Ajout parent={e.parent === null ? null : elements.find((x) => x.id === e.parent) ?? null}
        soeursDuNouveau={[e, ...soeurs]} libelle="À côté" creer={creer} />
      <CollerListe creerListe={creerListe} />
    </section>
  );
}

/** Sans part choisie : ajouter un élément au centre. */
function AjoutAuCentre({ centre, elements, creer, creerListe, egaliser }: { centre: Element | null; elements: readonly Element[];
  creer: (champs: Changements & { titre: string }) => Promise<unknown>; creerListe: (texte: string) => Promise<number>;
  egaliser: () => Promise<void> }) {
  const premiers = enfantsDe(centre?.id ?? null, elements);
  return (
    <section className="fiche-part" aria-label="Ajouter au centre">
      <p className="doux">Toucher une part pour la choisir ; la retoucher pour y entrer ; toucher un anneau du milieu pour remonter. Pincer ou Ctrl + molette pour zoomer.</p>
      {premiers.length > 1 && (
        <div className="actions-fiche">
          <button type="button" onClick={() => void egaliser()}>Égaliser les sous-éléments</button>
        </div>
      )}
      <Ajout parent={centre} soeursDuNouveau={premiers} libelle={centre ? `Dans « ${centre.titre} »` : 'Dans Tout'} creer={creer} />
      <CollerListe creerListe={creerListe} />
    </section>
  );
}

/**
 * Un champ pour ajouter un élément dans `parent` (null : à la racine). Son type : celui d'une sœur,
 * sinon « objectif » à la racine et « tâche » ailleurs. Il prend le rang après la dernière sœur.
 */
function Ajout({ parent, soeursDuNouveau, libelle, creer }: { parent: Element | null; soeursDuNouveau: readonly Element[];
  libelle: string; creer: (champs: Changements & { titre: string }) => Promise<unknown> }) {
  const [titre, setTitre] = useState('');
  async function ajouter(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    if (titre.trim() === '') return;
    const type = soeursDuNouveau[0]?.type ?? (parent === null ? 'objectif' : 'tache');
    const rangs = soeursDuNouveau.map((s) => s.rang).filter((r): r is number => r !== null);
    await creer({
      titre: titre.trim(), type, parent: parent?.id ?? null,
      ...(rangs.length === soeursDuNouveau.length && rangs.length > 0 ? { rang: Math.max(...rangs) + 1000 } : {}),
    });
    setTitre('');
  }
  return (
    <form className="ajout" onSubmit={(ev) => void ajouter(ev)} autoComplete="off">
      <input aria-label={`Ajouter : ${libelle}`} placeholder={`+ ${libelle}…`} maxLength={200} enterKeyHint="done"
        value={titre} onChange={(ev) => setTitre(ev.target.value)} />
      <button type="submit" disabled={titre.trim() === ''}>Ajouter</button>
    </form>
  );
}

/**
 * Enregistre le dessin dans un fichier SVG. Les couleurs viennent de la feuille de style (clair ou
 * sombre) : on les recopie sur chaque forme, pour que le fichier s'affiche pareil hors de l'appli.
 */
function enregistrerImage(svg: SVGSVGElement | null, titre: string): void {
  if (!svg) return;
  const copie = svg.cloneNode(true) as SVGSVGElement;
  const originaux = svg.querySelectorAll<SVGElement>('path, text, circle');
  const copies = copie.querySelectorAll<SVGElement>('path, text, circle');
  originaux.forEach((o, i) => {
    const style = getComputedStyle(o);
    const c = copies[i];
    if (!c) return;
    for (const prop of ['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline']) {
      c.setAttribute(prop, style.getPropertyValue(prop));
    }
  });
  copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copie.setAttribute('width', '800');
  copie.setAttribute('height', '800');
  copie.setAttribute('font-family', getComputedStyle(svg).fontFamily);
  const fond = getComputedStyle(document.body).backgroundColor;
  copie.insertAdjacentHTML('afterbegin', `<rect x="-100" y="-100" width="200" height="200" fill="${fond}"/>`);
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copie)], { type: 'image/svg+xml' }));
  lien.download = `cercles-${titre.normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tout'}.svg`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

/**
 * Coller une liste indentée (d'un éditeur, d'un tableur, de Claude) : chaque ligne devient un
 * sous-élément, la profondeur suit le retrait. Replié par défaut, pour ne pas encombrer la fiche.
 */
function CollerListe({ creerListe }: { creerListe: (texte: string) => Promise<number> }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const n = lireListe(texte).length;
  return (
    <details className="coller-liste">
      <summary>Coller une liste</summary>
      <textarea aria-label="Liste à coller" rows={5} value={texte} onChange={(ev) => setTexte(ev.target.value)}
        placeholder={'Une ligne par élément, en retrait pour un sous-élément :\nSanté\n  Courir\n  Dormir\nFamille'} />
      <button type="button" disabled={n === 0 || envoi}
        onClick={() => { setEnvoi(true); void creerListe(texte).then(() => { setTexte(''); setEnvoi(false); }); }}>
        {n > 1 ? `Créer ${n} sous-éléments` : 'Créer le sous-élément'}
      </button>
    </details>
  );
}

/** Enregistre le tableau CSV de la branche dans un fichier. */
function exporterCsv(csv: string, titre: string): void {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  lien.download = `cercles-${titre.normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tout'}.csv`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

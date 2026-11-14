// Les retours d'Adrien à Claude, écrits depuis une page de l'outil (étape 9), sans le navigateur :
// testés seuls (tests/unitaires/interface-retours.test.ts).
// Un retour est un élément de type « retour », tagué page:<vue> ; ses commentaires sont le fil de la
// discussion (Adrien écrit depuis la page, Claude répond par le connecteur).
import type { Element, Tag } from './api';
import type { Vue } from './chemins';

export const TYPE_RETOUR = 'retour';
export const CLE_PAGE = 'page';

/** Le nom de chaque vue, tel qu'il s'affiche dans les onglets et dans le fil. */
export const NOMS_VUES: Record<Vue, string> = {
  liste: 'Liste', journee: 'Journée', kanban: 'Kanban', backlog: 'Backlog', calendrier: 'Calendrier',
  horizons: 'Horizons', projets: 'Projets', cercles: 'Cercles', tableau: 'Tableau',
};

/** Un retour est-il un retour (et pas un élément de travail) ? */
export const estRetour = (e: Element): boolean => e.type === TYPE_RETOUR;

/** Les retours d'une page : ceux qui portent le tag page:<vue>, du plus ancien au plus récent. */
export function retoursDeLaPage(elements: readonly Element[], tags: readonly Tag[], vue: Vue): Element[] {
  const ici = new Set(tags.filter((t) => t.cle === CLE_PAGE && t.valeur === vue).map((t) => t.elementId));
  return elements.filter((e) => estRetour(e) && ici.has(e.id)).sort((a, b) => a.creeLe.localeCompare(b.creeLe));
}

/** Combien de retours de la page attendent encore (pas « fait ») : le nombre sur le bouton. */
export const ouverts = (retours: readonly Element[]): number => retours.filter((r) => r.statut !== 'fait').length;

/** Ce que la page sait de l'endroit où Adrien écrit : gardé avec le retour pour que Claude comprenne. */
export interface Contexte {
  readonly vue: Vue;
  /** Le chemin et les paramètres (`/cercles?centre=…`). */
  readonly adresse: string;
  /** Le titre de l'élément ouvert dans le détail, ou au centre des cercles, s'il y en a un. */
  readonly element: { readonly id: string; readonly titre: string } | null;
  readonly largeur: number;
  readonly hauteur: number;
}

const TITRE_MAX = 200;

/**
 * Le retour à créer : la première ligne en titre (coupée à 200 caractères), le texte entier et le
 * contexte en description. Null pour un texte vide.
 */
export function retourACreer(texte: string, contexte: Contexte): { titre: string; description: string } | null {
  const propre = texte.trim();
  if (propre === '') return null;
  const premiere = (propre.split('\n')[0] ?? '').trim();
  const lettres = [...premiere];
  const titre = lettres.length > TITRE_MAX ? `${lettres.slice(0, TITRE_MAX - 1).join('')}…` : premiere;
  const lignes = [
    propre,
    '',
    '---',
    `Page : ${NOMS_VUES[contexte.vue]} (${contexte.adresse})`,
    ...(contexte.element ? [`Élément regardé : « ${contexte.element.titre} » (${contexte.element.id})`] : []),
    `Écran : ${contexte.largeur} × ${contexte.hauteur}`,
  ];
  return { titre, description: lignes.join('\n') };
}

/** Le message à donner à Claude pour qu'il prenne un retour : copié, et pré-rempli quand c'est possible. */
export function messagePourClaude(retour: Pick<Element, 'id' | 'titre'>, vue: Vue): string {
  return `Retour Crazybrain ${retour.id} sur la page ${NOMS_VUES[vue]} : « ${retour.titre} ». `
    + 'Lis-le avec lire_element (connecteur Crazybrain), réponds-moi par commenter_element, '
    + 'et si la page doit changer, change-la par une PR du dépôt crazybrain.';
}

/** Par défaut, Claude s'ouvre sur une nouvelle conversation de claude.ai. */
export const ADRESSE_CLAUDE_PAR_DEFAUT = 'https://claude.ai/new';

/**
 * L'adresse à ouvrir pour continuer dans Claude. Une nouvelle conversation claude.ai reçoit le message
 * en paramètre `q` (pré-rempli ; hypothèse non vérifiée, le message est aussi copié). Une autre adresse
 * (le chat d'un projet Claude) s'ouvre telle quelle : le message copié se colle.
 */
export function adresseClaude(reglage: string | null, message: string): string {
  const base = adresseValide(reglage) ?? ADRESSE_CLAUDE_PAR_DEFAUT;
  if (base !== ADRESSE_CLAUDE_PAR_DEFAUT) return base;
  return `${base}?q=${encodeURIComponent(message)}`;
}

/** Une adresse réglée par Adrien n'est gardée que si c'est une adresse https ; sinon null. */
export function adresseValide(texte: string | null): string | null {
  if (!texte) return null;
  try {
    const url = new URL(texte.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

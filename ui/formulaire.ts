// Le formulaire du panneau de détail, sans React : ce que montrent les champs (du texte), et les
// changements à envoyer quand on enregistre (seulement ce qui a changé). Testé seul
// (tests/unitaires/interface-formulaire.test.ts) ; le serveur revérifie chaque valeur.
import type { Changements, Element } from './api';

/** Les champs du formulaire, tels qu'on les tape : du texte, vide quand le champ n'a pas de valeur. */
export interface Brouillon {
  readonly titre: string;
  readonly statut: string;
  readonly type: string;
  readonly parent: string;
  readonly description: string;
  readonly priorite: string;
  readonly echeance: string;
  readonly jourPlanifie: string;
  readonly heurePlanifiee: string;
  /** En minutes. */
  readonly estimation: string;
  /** Ce qu'il pèse parmi ses frères (vue en cercles) ; vide : 1. */
  readonly poids: string;
  /** En pour cent, de 0 à 100. */
  readonly avancement: string;
  /** L'heure du rappel, à l'heure du téléphone : AAAA-MM-JJTHH:MM (champ datetime-local). */
  readonly rappel: string;
  /** La règle de récurrence, en français (« chaque lundi »). */
  readonly recurrence: string;
}

export function brouillonDe(e: Element): Brouillon {
  return {
    titre: e.titre,
    statut: e.statut,
    type: e.type,
    parent: e.parent ?? '',
    description: e.description ?? '',
    priorite: e.priorite ?? '',
    echeance: e.echeance ?? '',
    jourPlanifie: e.jourPlanifie ?? '',
    heurePlanifiee: e.heurePlanifiee ?? '',
    estimation: e.estimation === null ? '' : String(e.estimation),
    poids: e.poids === null ? '' : String(e.poids),
    avancement: e.avancement === null ? '' : String(e.avancement),
    rappel: e.rappel === null ? '' : saisieLocale(new Date(e.rappel)),
    recurrence: e.recurrence ?? '',
  };
}

/** Texte vide → null (le champ facultatif se vide). */
const ouNull = (texte: string): string | null => (texte.trim() === '' ? null : texte);

/**
 * Les changements entre l'élément et le brouillon, ou un message si une valeur ne peut pas partir
 * (le reste des règles est vérifié par le serveur, qui dit pourquoi il refuse).
 */
export function changementsDepuis(e: Element, b: Brouillon): Changements | string {
  const titre = b.titre.trim();
  if (titre === '') return 'Le titre ne peut pas être vide.';
  let estimation: number | null = null;
  if (b.estimation.trim() !== '') {
    estimation = Number(b.estimation);
    if (!Number.isInteger(estimation) || estimation <= 0) return "L'estimation est un nombre entier de minutes.";
  }
  let poids: number | null = null;
  if (b.poids.trim() !== '') {
    poids = Number(b.poids.replace(',', '.'));
    if (!Number.isFinite(poids) || poids <= 0) return 'Le poids est un nombre plus grand que 0.';
  }
  let avancement: number | null = null;
  if (b.avancement.trim() !== '') {
    avancement = Number(b.avancement);
    if (!Number.isInteger(avancement) || avancement < 0 || avancement > 100) return "L'avancement est un nombre entier de 0 à 100.";
  }
  const description = b.description.trim() === '' ? null : b.description;
  const c: Record<string, unknown> = {};
  if (titre !== e.titre) c.titre = titre;
  if (b.statut !== e.statut) c.statut = b.statut;
  if (b.type !== e.type) c.type = b.type;
  if (ouNull(b.parent) !== e.parent) c.parent = ouNull(b.parent);
  if (description !== e.description) c.description = description;
  if (ouNull(b.priorite) !== e.priorite) c.priorite = ouNull(b.priorite);
  if (ouNull(b.echeance) !== e.echeance) c.echeance = ouNull(b.echeance);
  if (ouNull(b.jourPlanifie) !== e.jourPlanifie) c.jourPlanifie = ouNull(b.jourPlanifie);
  if (ouNull(b.heurePlanifiee) !== e.heurePlanifiee) c.heurePlanifiee = ouNull(b.heurePlanifiee);
  if (estimation !== e.estimation) c.estimation = estimation;
  if (poids !== e.poids) c.poids = poids;
  if (avancement !== e.avancement) c.avancement = avancement;
  // Le champ n'a que la minute : on ne compare qu'à la minute, sinon chaque enregistrement le renverrait.
  const rappel = b.rappel.trim() === '' ? null : new Date(b.rappel).toISOString();
  if ((b.rappel.trim() === '' ? '' : b.rappel) !== (e.rappel === null ? '' : saisieLocale(new Date(e.rappel)))) c.rappel = rappel;
  if (ouNull(b.recurrence) !== e.recurrence) c.recurrence = ouNull(b.recurrence);
  return c as Changements;
}

/**
 * Les parents possibles : tout élément sauf lui-même et ceux qu'il contient déjà (ce serait une
 * boucle, que le serveur refuserait aussi). Les projets d'abord, puis par titre.
 */
export function parentsPossibles(id: string, elements: readonly Element[]): Element[] {
  const enfants = new Map<string, string[]>();
  for (const e of elements) {
    if (e.parent) enfants.set(e.parent, [...(enfants.get(e.parent) ?? []), e.id]);
  }
  const exclus = new Set<string>([id]);
  const aVoir = [id];
  while (aVoir.length > 0) {
    for (const enfant of enfants.get(aVoir.pop() ?? '') ?? []) {
      if (!exclus.has(enfant)) { exclus.add(enfant); aVoir.push(enfant); }
    }
  }
  return elements.filter((e) => !exclus.has(e.id))
    .sort((a, b) => Number(b.type === 'projet') - Number(a.type === 'projet') || a.titre.localeCompare(b.titre, 'fr'));
}

/** Un instant écrit pour un champ datetime-local, à l'heure du téléphone (AAAA-MM-JJTHH:MM). */
export function saisieLocale(d: Date): string {
  const deux = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

// Les tags à l'écran, sans React : testés seuls (tests/unitaires/interface-tags.test.ts).
// Un tag est « cle:valeur » (composant:pxe, release:v1) ou une clé seule (urgent).
// `projet:<nom>` n'est pas un tag (décision 002) : c'est le projet qui contient l'élément, montré
// comme un tag et qui mène au projet.
import type { Element, Tag } from './api';

export function texteTag(t: Pick<Tag, 'cle' | 'valeur'>): string {
  return t.valeur === '' ? t.cle : `${t.cle}:${t.valeur}`;
}

/** Les tags de chaque élément, triés. */
export function tagsParElement(tags: readonly Tag[]): Map<string, string[]> {
  const parId = new Map<string, string[]>();
  for (const t of tags) parId.set(t.elementId, [...(parId.get(t.elementId) ?? []), texteTag(t)]);
  for (const liste of parId.values()) liste.sort((a, b) => a.localeCompare(b, 'fr'));
  return parId;
}

/**
 * Les propositions de complétion : les tags déjà posés quelque part (les plus utilisés d'abord),
 * sans ceux que l'élément porte déjà, et `projet:<titre>` pour chaque projet.
 */
export function suggestions(tous: readonly Tag[], dejaLa: readonly string[], elements: readonly Element[]): string[] {
  const comptes = new Map<string, number>();
  for (const t of tous) comptes.set(texteTag(t), (comptes.get(texteTag(t)) ?? 0) + 1);
  const tags = [...comptes].filter(([t]) => !dejaLa.includes(t))
    .sort(([a, na], [b, nb]) => nb - na || a.localeCompare(b, 'fr')).map(([t]) => t);
  const projets = elements.filter((e) => e.type === 'projet').map((e) => `projet:${e.titre}`)
    .sort((a, b) => a.localeCompare(b, 'fr'));
  return [...tags, ...projets];
}

/** Le projet qui contient l'élément : le premier ancêtre (parent, parent du parent…) de type projet. */
export function projetDe(id: string, elements: readonly Element[]): Element | null {
  const parId = new Map(elements.map((e) => [e.id, e]));
  const vus = new Set<string>([id]);
  let courant = parId.get(id)?.parent ?? null;
  while (courant && !vus.has(courant)) {
    const e = parId.get(courant);
    if (!e) return null;
    if (e.type === 'projet') return e;
    vus.add(courant);
    courant = e.parent;
  }
  return null;
}

/** Ce que veut dire une saisie : poser un tag, ou ranger l'élément dans un projet (`projet:<titre>`). */
export type Saisie =
  | { readonly sorte: 'tag'; readonly texte: string }
  | { readonly sorte: 'projet'; readonly projet: Element }
  | { readonly sorte: 'erreur'; readonly message: string };

export function lireSaisie(texte: string, elements: readonly Element[]): Saisie {
  const propre = texte.trim();
  if (propre === '') return { sorte: 'erreur', message: 'Taper un tag, par exemple composant:pxe.' };
  const projet = /^projet:(.+)$/i.exec(propre);
  if (!projet?.[1]) return { sorte: 'tag', texte: propre };
  const titre = projet[1].trim().toLocaleLowerCase('fr');
  const trouves = elements.filter((e) => e.type === 'projet' && e.titre.toLocaleLowerCase('fr') === titre);
  if (trouves.length === 1 && trouves[0]) return { sorte: 'projet', projet: trouves[0] };
  return {
    sorte: 'erreur',
    message: trouves.length === 0 ? `Aucun projet ne s'appelle « ${projet[1].trim()} ».` : `Plusieurs projets s'appellent « ${projet[1].trim()} ».`,
  };
}

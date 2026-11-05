// Les liens d'un élément tels qu'on les lit depuis lui, sans React : testés seuls
// (tests/unitaires/interface-relations.test.ts).
// `liens` : ceux de l'élément, tels que GET /api/elements/:id les rend (où il est source ou cible).
// Un lien a un sens : « A bloque B » se lit « bloque B » depuis A, et « bloqué par A » depuis B.
import type { Element, Lien } from './api';

/** Les types de lien qu'on pose depuis le panneau, avec leur nom vu depuis la source. */
export const TYPES_LIEN: readonly [string, string][] = [
  ['lie_a', 'Lié à'],
  ['bloque', 'Bloque'],
  ['duplique', 'En double de'],
  ['appartient_a', 'Appartient à'],
];

const VU_DE_LA_SOURCE: Record<string, string> = Object.fromEntries(TYPES_LIEN);
const VU_DE_LA_CIBLE: Record<string, string> = {
  lie_a: 'Lié à', bloque: 'Bloqué par', duplique: 'A pour double', appartient_a: 'Contient',
};

/** Un lien vu depuis un élément : ce qu'il dit, et l'autre élément. */
export interface LienVu {
  readonly id: string;
  readonly libelle: string;
  readonly autre: string;
  /** Le titre de l'autre élément, ou null s'il n'est pas dans la liste (archivé). */
  readonly titreAutre: string | null;
}

export function liensVusDe(id: string, liens: readonly Lien[], elements: readonly Element[]): LienVu[] {
  const titres = new Map(elements.map((e) => [e.id, e.titre]));
  return liens.map((l) => {
    const depuisSource = l.source === id;
    const autre = depuisSource ? l.cible : l.source;
    const libelle = (depuisSource ? VU_DE_LA_SOURCE : VU_DE_LA_CIBLE)[l.type] ?? l.type;
    return { id: l.id, libelle, autre, titreAutre: titres.get(autre) ?? null };
  }).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr') || (a.titreAutre ?? '').localeCompare(b.titreAutre ?? '', 'fr'));
}

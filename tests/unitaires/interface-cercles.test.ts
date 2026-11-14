// La vue en cercles sans React (ui/cercles.ts) : le dessin d'une part (chemin), les tâches rattachées
// à un projet (rattacher).
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import {
  arcDeTexte, avancementSous, chemin, cibleSous, couper, etirerPart, disposer, oignon, libelle, polaire, rattacher, trames, type Part,
} from '../../ui/cercles';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null,
    faitLe: null, archiveLe: null, creeLe: '2026-11-09T10:00:00.000Z', modifieLe: '2026-11-09T10:00:00.000Z', ...champs,
  };
}

describe('chemin', () => {
  it("dessine un morceau d'anneau avec ses deux bords droits", () => {
    const d = chemin(24, 48, 0, Math.PI / 2);
    expect(d).toBe('M 0 -48 A 48 48 0 0 1 48 0 L 24 0 A 24 24 0 0 0 0 -24 Z');
  });

  it('dessine un tour complet en deux cercles, sans trait du centre vers le bord', () => {
    // Le cas d'une seule part autour du centre (un seul projet) : avant, deux moitiés avec une
    // couture en haut et en bas, qui faisaient croire à deux parts.
    const d = chemin(24, 48, 0, 2 * Math.PI);
    expect(d).not.toContain('L');
    expect(d).toBe('M 0 -48 A 48 48 0 1 1 0 48 A 48 48 0 1 1 0 -48 Z M 0 -24 A 24 24 0 1 0 0 24 A 24 24 0 1 0 0 -24 Z');
  });

  it("dessine un tour complet qui ne commence pas en haut de la même façon", () => {
    expect(chemin(24, 48, 1, 1 + 2 * Math.PI)).toBe(chemin(24, 48, 0, 2 * Math.PI));
  });

  it('dessine un disque plein quand il n\'y a pas de trou', () => {
    expect(chemin(0, 48, 0, 2 * Math.PI)).toBe('M 0 -48 A 48 48 0 1 1 0 48 A 48 48 0 1 1 0 -48 Z');
  });
});

describe('rattacher', () => {
  const sport = element('sport', { type: 'projet' });
  const maison = element('maison', { type: 'projet' });

  it('range dans son projet une tâche rattachée et rangée nulle part', () => {
    const velo = element('velo');
    const resultat = rattacher([sport, velo], [{ source: 'velo', cible: 'sport' }]);
    expect(resultat.find((e) => e.id === 'velo')?.parent).toBe('sport');
    // Le projet n'est plus vide : la tâche y fait le tour entier.
    expect(disposer(resultat, 'sport', 3).parts.map((p) => p.element.id)).toEqual(['velo']);
  });

  it('garde le rangement choisi à la main, et prend le premier projet quand il y en a plusieurs', () => {
    const rangee = element('rangee', { parent: 'maison' });
    const double = element('double');
    const resultat = rattacher([sport, maison, rangee, double],
      [{ source: 'rangee', cible: 'sport' }, { source: 'double', cible: 'maison' }, { source: 'double', cible: 'sport' }]);
    expect(resultat.find((e) => e.id === 'rangee')?.parent).toBe('maison');
    expect(resultat.find((e) => e.id === 'double')?.parent).toBe('maison');
  });

  it("ignore un projet qui n'est pas chargé et un rattachement qui ferait une boucle", () => {
    const a = element('a', { type: 'projet' });
    const b = element('b', { type: 'projet', parent: 'a' });
    const resultat = rattacher([a, b, element('seule')],
      [{ source: 'a', cible: 'b' }, { source: 'seule', cible: 'inconnu' }]);
    expect(resultat.find((e) => e.id === 'a')?.parent).toBeNull();
    expect(resultat.find((e) => e.id === 'seule')?.parent).toBeNull();
  });
});

describe('trames (le mouvement du zoom)', () => {
  const avant = new Map([
    ['sante', { debut: 0, fin: Math.PI, interieur: 24, exterieur: 48 }],
    ['famille', { debut: Math.PI, fin: 2 * Math.PI, interieur: 24, exterieur: 48 }],
    ['courir', { debut: 0, fin: Math.PI, interieur: 48, exterieur: 72 }],
  ]);
  const apres = new Map([
    ['courir', { debut: 0, fin: 2 * Math.PI, interieur: 24, exterieur: 48 }],
    ['etirer', { debut: 0, fin: 2 * Math.PI, interieur: 48, exterieur: 72 }],
  ]);

  it("part de la place d'avant et arrive à celle d'après", () => {
    expect(trames(avant, apres, 0).get('courir')?.geometrie).toEqual(avant.get('courir'));
    expect(trames(avant, apres, 1).get('courir')?.geometrie).toEqual(apres.get('courir'));
    const milieu = trames(avant, apres, 0.5).get('courir')?.geometrie;
    expect(milieu?.fin).toBeCloseTo(1.5 * Math.PI);
  });

  it("fait sortir les nouvelles parts de leur bord intérieur et efface celles qui s'en vont", () => {
    const debut = trames(avant, apres, 0);
    expect(debut.get('etirer')).toEqual({ geometrie: { debut: 0, fin: 2 * Math.PI, interieur: 48, exterieur: 48 }, opacite: 0 });
    expect(debut.get('famille')?.opacite).toBe(1);
    const fin = trames(avant, apres, 1);
    expect(fin.get('etirer')?.opacite).toBe(1);
    expect(fin.get('famille')?.opacite).toBe(0);
  });
});

describe('libelle (le titre dans sa part)', () => {
  it("écrit un titre trop long un peu plus petit avant de le couper, et le coupe s'il ne tient toujours pas", () => {
    const g = { debut: 0, fin: Math.PI / 4, interieur: 60, exterieur: 98 };
    const entier = libelle('Préparer le dossier complet du notaire pour la vente', g, 4.2);
    expect(entier?.mode === 'arc' && entier.lignes.map((l) => l.texte).join(' ')).toBe('Préparer le dossier complet du notaire pour la vente');
    expect(entier?.taille).toBeLessThan(4.2);
    // Trop long même plus petit : coupé, à la taille normale.
    const coupe = libelle('Préparer le dossier complet du notaire pour la vente de la maison', g, 4.2);
    expect(coupe?.taille).toBe(4.2);
    expect(coupe?.mode === 'arc' && coupe.lignes.at(-1)?.texte.endsWith('…')).toBe(true);
  });

  it("écrit le titre le long de l'arc quand il y tient", () => {
    const l = libelle('Santé', { debut: 0, fin: Math.PI / 2, interieur: 24, exterieur: 48 }, 4.2);
    expect(l).toEqual({ mode: 'arc', inverse: false, taille: 4.2, lignes: [{ texte: 'Santé', rayon: 36 }] });
  });

  it("le retourne en bas du cercle, pour qu'il se lise à l'endroit", () => {
    const l = libelle('Santé', { debut: Math.PI * 0.75, fin: Math.PI * 1.25, interieur: 24, exterieur: 48 }, 4.2);
    expect(l?.mode === 'arc' && l.inverse).toBe(true);
  });

  it("passe sur deux lignes quand le titre est long et l'anneau épais", () => {
    const l = libelle('Courir trois fois par semaine au parc', { debut: 0, fin: Math.PI / 3, interieur: 50, exterieur: 98 }, 4.2);
    expect(l?.mode).toBe('arc');
    if (l?.mode === 'arc') {
      expect(l.lignes).toHaveLength(2);
      expect(l.lignes[0]?.rayon).toBeGreaterThan(l.lignes[1]?.rayon ?? 0);
    }
  });

  it("écrit dans le sens du rayon une part étroite mais épaisse", () => {
    const l = libelle('Dormir', { debut: 0, fin: 0.12, interieur: 24, exterieur: 98 }, 4.2);
    expect(l).toEqual({ mode: 'rayon', taille: 4.2, texte: 'Dormir' });
  });

  it("n'écrit rien dans une part trop petite", () => {
    expect(libelle('Dormir', { debut: 0, fin: 0.02, interieur: 90, exterieur: 98 }, 4.2)).toBeNull();
  });

  it('coupe aux espaces et finit par « … » ce qui ne tient pas', () => {
    expect(couper('Courir trois fois par semaine', 12, 2)).toEqual(['Courir trois', 'fois par…']);
    expect(couper('Anticonstitutionnellement', 10, 1)).toEqual(['Anticonst…']);
    expect(couper('Vélo', 10, 2)).toEqual(['Vélo']);
  });

  it("trace l'arc de texte dans le sens de lecture", () => {
    expect(arcDeTexte(36, 0, Math.PI / 2, false)).toBe('M 0 -36 A 36 36 0 0 1 36 0');
    expect(arcDeTexte(36, 0, Math.PI / 2, true)).toBe('M 36 0 A 36 36 0 0 0 0 -36');
  });
});

/** Une part posée, pour les gestes. */
function partPosee(id: string, debut: number, fin: number, anneau = 1, poids: number | null = null): Part {
  return { element: element(id, { poids }), anneau, debut, fin, part: (fin - debut) / (2 * Math.PI), absolue: 0, avancement: 0,
    calcule: false, couleur: 0, nuance: 0 };
}

describe('les gestes sur le cercle', () => {
  it("lit l'angle et le rayon d'un point (0 en haut, sens des aiguilles d'une montre)", () => {
    expect(polaire(0, -10)).toEqual({ angle: 0, rayon: 10 });
    expect(polaire(10, 0).angle).toBeCloseTo(Math.PI / 2);
    expect(polaire(-10, 0).angle).toBeCloseTo(1.5 * Math.PI);
  });

  it('tirer le bord d\'une part ne change que son poids : ses sœurs se serrent ensemble', () => {
    // Trois sœurs de poids 1 sur un tour : 120° chacune.
    const t = (2 * Math.PI) / 3;
    const a = partPosee('a', 0, t);
    const b = partPosee('b', t, 2 * t);
    const c = partPosee('c', 2 * t, 3 * t);
    const fratrie = [a, b, c];
    // La fin de « a » tirée à 180° : « a » fait la moitié, donc poids 2 face aux deux autres (1 + 1).
    const r = etirerPart(a, fratrie, Math.PI);
    expect(r?.part).toBeCloseTo(0.5);
    expect(r?.poids).toBeCloseTo(2);
    // « b » au milieu : sa fin tirée à 240° + 60° (300°). Avant elle, « a » pèse la moitié des autres :
    // la fin est à 1/2 + s/2 = 300/360, donc s = 2/3 (poids 4 face à 1 + 1).
    expect(etirerPart(b, fratrie, (300 / 180) * Math.PI)?.poids).toBeCloseTo(4);
    // « c », la dernière : on tire son début. Début à 180° : b(1 - s) = 1/2 avec b = 1, donc s = 1/2.
    expect(etirerPart(c, fratrie, Math.PI)?.part).toBeCloseTo(0.5);
    // On bute en gardant un minimum, et une part seule n'a rien à régler.
    expect(etirerPart(a, fratrie, 0.001)?.part).toBeCloseTo(0.03);
    expect(etirerPart(a, [a], Math.PI)).toBeNull();
  });

  it("lit l'avancement sous le doigt, par pas de 5", () => {
    expect(avancementSous(24, 24, 48)).toBe(0);
    expect(avancementSous(38.5, 24, 48)).toBe(60);
    expect(avancementSous(60, 24, 48)).toBe(100);
  });

  it('trouve où tombe une part lâchée', () => {
    const a = partPosee('a', 0, Math.PI);
    const b = partPosee('b', Math.PI, 2 * Math.PI);
    const parts = [a, b];
    expect(cibleSous(parts, 3, 0, -5)).toEqual({ sorte: 'centre' });
    // Au milieu de a (à droite, en haut du premier anneau) : dedans.
    expect(cibleSous(parts, 3, 30, 0)).toEqual({ sorte: 'part', part: a, ou: 'dans' });
    // Tout près du début de a : avant elle ; près de sa fin : après.
    expect(cibleSous(parts, 3, 3, -30)).toMatchObject({ part: a, ou: 'avant' });
    expect(cibleSous(parts, 3, 3, 30)).toMatchObject({ part: a, ou: 'apres' });
    expect(cibleSous(parts, 3, 0, -99)).toBeNull();
  });
});

describe('le centre en oignon', () => {
  it('sur « Tout », le disque seul ; plus bas, « Tout » au milieu, une bande par ancêtre, puis le centre', () => {
    expect(oignon(0)).toEqual({ racine: 24, bandes: [], rayon: 24 });
    // Un niveau : le disque de « Tout » et la bande du centre, qui finit où finissait le disque.
    expect(oignon(1)).toEqual({ racine: 11, bandes: [{ interieur: 11, exterieur: 24 }], rayon: 24 });
    // Trois niveaux : deux ancêtres de 7, puis le centre.
    expect(oignon(3).bandes.map((b) => b.exterieur)).toEqual([18, 25, 38]);
    // Très profond, les bandes des ancêtres s'amincissent : le centre ne dépasse pas sa taille maximale.
    expect(oignon(12).rayon).toBeCloseTo(46);
  });
});

// Coller une liste indentée pour créer des sous-éléments d'un coup, sans React : testé seul
// (tests/unitaires/interface-liste-collee.test.ts). Ce qu'on colle vient d'un éditeur, d'un tableur,
// d'une réponse de Claude : des lignes, plus ou moins en retrait, avec ou sans puces.

/** Une ligne lue : son titre, sa description éventuelle, et le numéro de la ligne de son parent (null : au premier niveau). */
export interface LigneCollee {
  readonly titre: string;
  readonly description: string | null;
  readonly parent: number | null;
}

/** La largeur du retrait d'une ligne : une tabulation compte pour quatre espaces. */
function retrait(ligne: string): number {
  let largeur = 0;
  for (const c of ligne) {
    if (c === ' ') largeur += 1;
    else if (c === '\t') largeur += 4;
    else break;
  }
  return largeur;
}

/** Le texte d'une ligne sans son retrait, sa puce (`-`, `*`, `•`) ni son numéro (`1.`, `2)`). */
function sansPuce(ligne: string): string {
  return ligne.trim().replace(/^(?:[-*•+]|\d+[.)])\s+/, '').trim();
}

/**
 * Lit la liste : une ligne non vide par élément ; une ligne plus en retrait que la précédente est son
 * enfant, une ligne revenue au retrait d'une ligne plus haute est sa sœur. `**Titre** suite` : le
 * gras fait le titre, la suite la description. Un titre trop long est coupé à 200 caractères.
 */
export function lireListe(texte: string): LigneCollee[] {
  const lignes: LigneCollee[] = [];
  // La pile des lignes ouvertes : leur retrait, et leur numéro dans `lignes`.
  const pile: { retrait: number; numero: number }[] = [];
  for (const brute of texte.replace(/\r\n?/g, '\n').split('\n')) {
    const propre = sansPuce(brute);
    if (propre === '') continue;
    const r = retrait(brute);
    while (pile.length > 0 && (pile[pile.length - 1]?.retrait ?? 0) >= r) pile.pop();
    const gras = /^\*\*(.+?)\*\*\s*[:\-–]?\s*(.*)$/.exec(propre);
    const titre = (gras?.[1] ?? propre).trim().slice(0, 200);
    const reste = gras?.[2]?.trim() ?? '';
    lignes.push({ titre, description: reste === '' ? null : reste, parent: pile[pile.length - 1]?.numero ?? null });
    pile.push({ retrait: r, numero: lignes.length - 1 });
  }
  return lignes;
}

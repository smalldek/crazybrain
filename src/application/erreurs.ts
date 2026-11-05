/** Ce qu'on cherche n'existe pas (l'API répond 404, le connecteur le dit à Claude). */
export class ErreurIntrouvable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurIntrouvable';
  }
}

/** La demande heurte l'état actuel, par exemple un lien qui existe déjà (409). */
export class ErreurConflit extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurConflit';
  }
}

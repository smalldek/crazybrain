/**
 * Une règle métier n'est pas respectée (titre vide, trop long…).
 * Comme une exception de domaine en .NET : l'API la traduit en réponse 400, le domaine ignore HTTP.
 */
export class ErreurDomaine extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurDomaine';
  }
}

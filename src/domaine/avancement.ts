import { ErreurDomaine } from './erreur-domaine';

/**
 * Objet-valeur « avancement » : où en est un élément, en pour cent, de 0 à 100 (entier). Il se
 * saisit sur une feuille (un élément sans enfant) ; celui d'un parent se calcule (voir cercles.ts).
 */
export class Avancement {
  private constructor(public readonly pourcent: number) {}

  static creer(pourcent: number): Avancement {
    if (!Number.isInteger(pourcent) || pourcent < 0 || pourcent > 100) {
      throw new ErreurDomaine(`Avancement invalide : ${pourcent} (un nombre entier de 0 à 100).`);
    }
    return new Avancement(pourcent);
  }
}

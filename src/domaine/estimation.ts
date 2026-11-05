import { ErreurDomaine } from './erreur-domaine';

/** Au-delà de 1 000 heures, ce n'est plus une estimation de tâche. */
export const ESTIMATION_MAX_MINUTES = 60_000;

/** Objet-valeur « estimation » : le temps prévu, en minutes entières, plus de zéro. */
export class Estimation {
  private constructor(public readonly minutes: number) {}

  static creer(minutes: number): Estimation {
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > ESTIMATION_MAX_MINUTES) {
      throw new ErreurDomaine(`Estimation invalide : ${minutes} (un nombre entier de minutes, de 1 à ${ESTIMATION_MAX_MINUTES}).`);
    }
    return new Estimation(minutes);
  }
}

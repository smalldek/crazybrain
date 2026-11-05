import { ErreurDomaine } from './erreur-domaine';

/** Objet-valeur « heure » : une heure de la journée, HH:MM sur 24 heures (comme un TimeOnly en .NET). */
export class Heure {
  private constructor(public readonly valeur: string) {}

  static creer(texte: string): Heure {
    const morceaux = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(texte);
    if (!morceaux) {
      throw new ErreurDomaine(`Heure invalide : « ${texte} » (format attendu HH:MM, de 00:00 à 23:59).`);
    }
    return new Heure(texte);
  }
}

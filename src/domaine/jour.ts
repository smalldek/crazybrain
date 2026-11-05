import { ErreurDomaine } from './erreur-domaine';

const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Objet-valeur « jour » : un jour du calendrier sans heure (comme un DateOnly en .NET), écrit
 * AAAA-MM-JJ, toujours un jour qui existe. Sert à l'échéance et au jour planifié.
 */
export class Jour {
  private constructor(public readonly valeur: string) {}

  static creer(texte: string): Jour {
    const morceaux = FORMAT.exec(texte);
    if (!morceaux) {
      throw new ErreurDomaine(`Jour invalide : « ${texte} » (format attendu AAAA-MM-JJ).`);
    }
    const [annee, mois, jour] = [Number(morceaux[1]), Number(morceaux[2]), Number(morceaux[3])];
    // On fabrique la date et on relit ses parties : le 30 février deviendrait le 2 mars, donc refusé.
    const date = new Date(Date.UTC(annee, mois - 1, jour));
    if (date.getUTCFullYear() !== annee || date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) {
      throw new ErreurDomaine(`Jour invalide : le ${texte} n'existe pas.`);
    }
    return new Jour(texte);
  }

  egale(autre: Jour): boolean {
    return this.valeur === autre.valeur;
  }
}

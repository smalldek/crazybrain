import { ErreurDomaine } from './erreur-domaine';

const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Objet-valeur « échéance » : la date limite d'une tâche, un jour du calendrier sans heure
 * (comme un DateOnly en .NET), écrit AAAA-MM-JJ. Toujours un jour qui existe.
 */
export class Echeance {
  private constructor(public readonly valeur: string) {}

  static creer(texte: string): Echeance {
    const morceaux = FORMAT.exec(texte);
    if (!morceaux) {
      throw new ErreurDomaine(`Échéance invalide : « ${texte} » (format attendu AAAA-MM-JJ).`);
    }
    const [annee, mois, jour] = [Number(morceaux[1]), Number(morceaux[2]), Number(morceaux[3])];
    // On fabrique la date et on relit ses parties : le 30 février deviendrait le 2 mars, donc refusé.
    const date = new Date(Date.UTC(annee, mois - 1, jour));
    if (date.getUTCFullYear() !== annee || date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) {
      throw new ErreurDomaine(`Échéance invalide : le ${texte} n'existe pas.`);
    }
    return new Echeance(texte);
  }

  egale(autre: Echeance): boolean {
    return this.valeur === autre.valeur;
  }
}

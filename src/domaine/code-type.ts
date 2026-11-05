import { ErreurDomaine } from './erreur-domaine';

/**
 * Objet-valeur « code de type » : le code d'un type d'élément (`tache`, `projet`, `epic`…), en
 * minuscules sans accent. Que le type existe se vérifie contre la table `types`, hors du domaine.
 */
export class CodeType {
  private constructor(public readonly valeur: string) {}

  static creer(texte: string): CodeType {
    if (!/^[a-z][a-z0-9_]{0,29}$/.test(texte)) {
      throw new ErreurDomaine(`Type invalide : « ${texte} » (minuscules, chiffres et _, sans accent).`);
    }
    return new CodeType(texte);
  }
}

/** Le type d'un élément créé sans préciser : une tâche. */
export const TYPE_PAR_DEFAUT = 'tache';

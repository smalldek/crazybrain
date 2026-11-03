import { Element, type InstantaneElement, type Statut } from '../domaine/element';
import type { Evenement } from '../domaine/evenement';

/** Une ligne de la table elements, telle que D1 la rend (noms de colonnes en snake_case). */
interface LigneElement {
  id: string;
  titre: string;
  statut: Statut;
  cree_le: string;
  modifie_le: string;
}

/**
 * Dépôt (repository) des éléments sur D1 : la seule pièce qui connaît le SQL.
 * Chaque écriture enregistre l'état ET l'événement dans un même `batch`, que D1 exécute comme
 * une transaction : tout passe, ou rien.
 */
export class DepotElements {
  constructor(private readonly db: D1Database) {}

  async lister(): Promise<Element[]> {
    const { results } = await this.db
      .prepare('SELECT id, titre, statut, cree_le, modifie_le FROM elements ORDER BY cree_le DESC, id')
      .all<LigneElement>();
    return results.map((ligne) => Element.depuisInstantane(versInstantane(ligne)));
  }

  async enregistrerCreation(element: Element, evenement: Evenement): Promise<void> {
    const etat = element.instantane();
    await this.db.batch([
      this.db
        .prepare('INSERT INTO elements (id, titre, statut, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?)')
        .bind(etat.id, etat.titre, etat.statut, etat.creeLe, etat.modifieLe),
      this.insererEvenement(evenement),
    ]);
  }

  private insererEvenement(evenement: Evenement): D1PreparedStatement {
    return this.db
      .prepare(
        'INSERT INTO evenements (id, element_id, type, version_forme, avant, apres, auteur, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        evenement.id,
        evenement.elementId,
        evenement.type,
        evenement.versionForme,
        evenement.avant === null ? null : JSON.stringify(evenement.avant),
        evenement.apres === null ? null : JSON.stringify(evenement.apres),
        evenement.auteur,
        evenement.date,
      );
  }
}

function versInstantane(ligne: LigneElement): InstantaneElement {
  return {
    id: ligne.id,
    titre: ligne.titre,
    statut: ligne.statut,
    creeLe: ligne.cree_le,
    modifieLe: ligne.modifie_le,
  };
}

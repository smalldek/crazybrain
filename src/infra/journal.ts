import type { Evenement } from '../domaine/evenement';

/** L'écriture d'un événement du journal, à mettre dans le même `batch` que la donnée qu'il raconte. */
export function insererEvenement(db: D1Database, evenement: Evenement): D1PreparedStatement {
  return db
    .prepare('INSERT INTO evenements (id, element_id, type, version_forme, avant, apres, auteur, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
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

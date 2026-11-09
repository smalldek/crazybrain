import type { InstantaneCommentaire } from '../domaine/commentaire';
import type { Evenement } from '../domaine/evenement';
import type { InstantaneLien, TypeLien } from '../domaine/lien';
import type { InstantaneTag } from '../domaine/tag';
import { insererEvenement } from './journal';

interface LigneLien { id: string; source: string; cible: string; type: TypeLien; cree_le: string }
interface LigneCommentaire { id: string; element_id: string; texte: string; auteur: 'adrien' | 'claude'; cree_le: string }

/**
 * Dépôt des liens, tags et commentaires d'un élément. Comme DepotElements : chaque écriture range
 * la donnée ET son événement dans un même `batch` (une transaction).
 */
export class DepotRelations {
  constructor(private readonly db: D1Database) {}

  /** Les liens où l'élément est source ou cible. */
  async liensDe(elementId: string): Promise<InstantaneLien[]> {
    const { results } = await this.db
      .prepare('SELECT id, source, cible, type, cree_le FROM liens WHERE source = ?1 OR cible = ?1 ORDER BY cree_le, id')
      .bind(elementId)
      .all<LigneLien>();
    return results.map(versLien);
  }

  /**
   * Tous les liens « appartient à » entre éléments non supprimés, du plus ancien au plus récent :
   * pour la vue en cercles, où une tâche rattachée à un projet devient une part de ce projet.
   */
  async appartenances(): Promise<{ source: string; cible: string }[]> {
    const { results } = await this.db
      .prepare(`SELECT l.source, l.cible FROM liens l
                JOIN elements s ON s.id = l.source JOIN elements c ON c.id = l.cible
                WHERE l.type = 'appartient_a' AND s.archive_le IS NULL AND c.archive_le IS NULL
                ORDER BY l.cree_le, l.id`)
      .all<{ source: string; cible: string }>();
    return results;
  }

  async lien(id: string): Promise<InstantaneLien | null> {
    const ligne = await this.db.prepare('SELECT id, source, cible, type, cree_le FROM liens WHERE id = ?').bind(id).first<LigneLien>();
    return ligne ? versLien(ligne) : null;
  }

  async lienExiste(source: string, cible: string, type: TypeLien): Promise<boolean> {
    return (await this.db.prepare('SELECT 1 FROM liens WHERE source = ? AND cible = ? AND type = ?').bind(source, cible, type).first()) !== null;
  }

  async ajouterLien(lien: InstantaneLien, evenement: Evenement): Promise<void> {
    await this.db.batch([
      this.db.prepare('INSERT INTO liens (id, source, cible, type, cree_le) VALUES (?, ?, ?, ?, ?)')
        .bind(lien.id, lien.source, lien.cible, lien.type, lien.creeLe),
      insererEvenement(this.db, evenement),
    ]);
  }

  async retirerLien(id: string, evenement: Evenement): Promise<void> {
    await this.db.batch([this.db.prepare('DELETE FROM liens WHERE id = ?').bind(id), insererEvenement(this.db, evenement)]);
  }

  async tagsDe(elementId: string): Promise<InstantaneTag[]> {
    const { results } = await this.db
      .prepare('SELECT element_id, cle, valeur FROM tags WHERE element_id = ? ORDER BY cle, valeur')
      .bind(elementId)
      .all<{ element_id: string; cle: string; valeur: string }>();
    return results.map((l) => ({ elementId: l.element_id, cle: l.cle, valeur: l.valeur }));
  }

  /** Tous les tags des éléments non supprimés : pour l'écran (complétion, couloirs, filtres). */
  async tousLesTags(): Promise<InstantaneTag[]> {
    const { results } = await this.db
      .prepare(`SELECT t.element_id, t.cle, t.valeur FROM tags t JOIN elements e ON e.id = t.element_id
                WHERE e.archive_le IS NULL ORDER BY t.cle, t.valeur, t.element_id`)
      .all<{ element_id: string; cle: string; valeur: string }>();
    return results.map((l) => ({ elementId: l.element_id, cle: l.cle, valeur: l.valeur }));
  }

  async tagExiste(tag: InstantaneTag): Promise<boolean> {
    return (await this.db.prepare('SELECT 1 FROM tags WHERE element_id = ? AND cle = ? AND valeur = ?')
      .bind(tag.elementId, tag.cle, tag.valeur).first()) !== null;
  }

  async ajouterTag(tag: InstantaneTag, evenement: Evenement): Promise<void> {
    await this.db.batch([
      this.db.prepare('INSERT INTO tags (element_id, cle, valeur) VALUES (?, ?, ?)').bind(tag.elementId, tag.cle, tag.valeur),
      insererEvenement(this.db, evenement),
    ]);
  }

  async retirerTag(tag: InstantaneTag, evenement: Evenement): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM tags WHERE element_id = ? AND cle = ? AND valeur = ?').bind(tag.elementId, tag.cle, tag.valeur),
      insererEvenement(this.db, evenement),
    ]);
  }

  async commentairesDe(elementId: string): Promise<InstantaneCommentaire[]> {
    const { results } = await this.db
      .prepare('SELECT id, element_id, texte, auteur, cree_le FROM commentaires WHERE element_id = ? ORDER BY cree_le, id')
      .bind(elementId)
      .all<LigneCommentaire>();
    return results.map((l) => ({ id: l.id, elementId: l.element_id, texte: l.texte, auteur: l.auteur, creeLe: l.cree_le }));
  }

  async ajouterCommentaire(commentaire: InstantaneCommentaire, evenement: Evenement): Promise<void> {
    await this.db.batch([
      this.db.prepare('INSERT INTO commentaires (id, element_id, texte, auteur, cree_le) VALUES (?, ?, ?, ?, ?)')
        .bind(commentaire.id, commentaire.elementId, commentaire.texte, commentaire.auteur, commentaire.creeLe),
      insererEvenement(this.db, evenement),
    ]);
  }
}

function versLien(l: LigneLien): InstantaneLien {
  return { id: l.id, source: l.source, cible: l.cible, type: l.type, creeLe: l.cree_le };
}

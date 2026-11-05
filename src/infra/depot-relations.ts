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

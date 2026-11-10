// Les requêtes : leur exécution en lecture seule (tâche 4.1, décision 005) et leur enregistrement
// (tâche 4.2). La garde est dans le domaine (verifierLecture) ; ici, on lit les noms des tables à
// interdire, on exécute la requête enveloppée, et on range les requêtes enregistrées avec leur
// événement, dans la même transaction.
import { ErreurDomaine } from '../domaine/erreur-domaine';
import type { Evenement } from '../domaine/evenement';
import type { InstantaneRequete } from '../domaine/requete';
import { LIGNES_MAX, verifierLecture } from '../domaine/requete-lecture';
import { insererEvenement } from './journal';

/** Le résultat d'une requête : ses colonnes, ses lignes (LIGNES_MAX au plus), et si on a coupé. */
export interface ResultatLecture {
  readonly colonnes: string[];
  readonly lignes: Record<string, unknown>[];
  readonly tronque: boolean;
}

interface LigneRequete { id: string; nom: string; description: string | null; sql: string; cree_le: string; modifie_le: string }

export class DepotRequetes {
  constructor(private readonly db: D1Database) {}

  /** Vérifie la requête, puis l'exécute. Une erreur de SQLite (faute de frappe, colonne inconnue) devient une ErreurDomaine qui la cite. */
  async executer(sql: string): Promise<ResultatLecture> {
    const requete = verifierLecture(sql, await this.tables());
    let resultat: D1Result<Record<string, unknown>>;
    try {
      resultat = await this.db.prepare(requete.sqlExecute).all<Record<string, unknown>>();
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      throw new ErreurDomaine(`SQLite refuse la requête : ${message.replace(/^D1_ERROR:\s*/, '')}`);
    }
    const lignes = resultat.results.slice(0, LIGNES_MAX);
    const colonnes = lignes[0] ? Object.keys(lignes[0]) : [];
    return { colonnes, lignes, tronque: resultat.results.length > LIGNES_MAX };
  }

  /** Les requêtes enregistrées, par nom. */
  async lister(): Promise<InstantaneRequete[]> {
    const { results } = await this.db.prepare('SELECT * FROM requetes ORDER BY nom COLLATE NOCASE').all<LigneRequete>();
    return results.map(versInstantane);
  }

  /** La requête de cet id, ou de ce nom (sans tenir compte des majuscules) ; null sinon. */
  async trouver(idOuNom: string): Promise<InstantaneRequete | null> {
    const ligne = await this.db.prepare('SELECT * FROM requetes WHERE id = ?1 OR nom = ?1 COLLATE NOCASE LIMIT 1')
      .bind(idOuNom.trim()).first<LigneRequete>();
    return ligne ? versInstantane(ligne) : null;
  }

  /** Ajoute ou remplace (même id) la requête, avec son événement. */
  async enregistrer(r: InstantaneRequete, evenement: Evenement): Promise<void> {
    await this.db.batch([
      this.db.prepare(`INSERT INTO requetes (id, nom, description, sql, cree_le, modifie_le) VALUES (?, ?, ?, ?, ?, ?)
                       ON CONFLICT (id) DO UPDATE SET nom = excluded.nom, description = excluded.description,
                       sql = excluded.sql, modifie_le = excluded.modifie_le`)
        .bind(r.id, r.nom, r.description, r.sql, r.creeLe, r.modifieLe),
      insererEvenement(this.db, evenement),
    ]);
  }

  async supprimer(id: string, evenement: Evenement): Promise<void> {
    await this.db.batch([this.db.prepare('DELETE FROM requetes WHERE id = ?').bind(id), insererEvenement(this.db, evenement)]);
  }

  /** Les tables de la base (pas les vues) : une requête ne les nomme pas. */
  private async tables(): Promise<string[]> {
    const { results } = await this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>();
    return results.map((r) => r.name);
  }
}

function versInstantane(l: LigneRequete): InstantaneRequete {
  return { id: l.id, nom: l.nom, description: l.description, sql: l.sql, creeLe: l.cree_le, modifieLe: l.modifie_le };
}

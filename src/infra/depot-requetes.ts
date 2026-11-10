// L'exécution des requêtes en lecture seule (tâche 4.1, décision 005). La garde est dans le domaine
// (verifierLecture) ; ici, on lit les noms des tables à interdire et on exécute la requête enveloppée.
import { ErreurDomaine } from '../domaine/erreur-domaine';
import { LIGNES_MAX, verifierLecture } from '../domaine/requete-lecture';

/** Le résultat d'une requête : ses colonnes, ses lignes (LIGNES_MAX au plus), et si on a coupé. */
export interface ResultatLecture {
  readonly colonnes: string[];
  readonly lignes: Record<string, unknown>[];
  readonly tronque: boolean;
}

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

  /** Les tables de la base (pas les vues) : une requête ne les nomme pas. */
  private async tables(): Promise<string[]> {
    const { results } = await this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>();
    return results.map((r) => r.name);
  }
}

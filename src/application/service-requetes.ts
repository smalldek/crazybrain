// Les requêtes en lecture seule (étape 4) : les cas d'usage que l'API et le connecteur appellent.
import { DepotRequetes, type ResultatLecture } from '../infra/depot-requetes';

export class ServiceRequetes {
  private readonly depot: DepotRequetes;

  constructor(db: D1Database) {
    this.depot = new DepotRequetes(db);
  }

  /** Exécute une requête de lecture et rend ses lignes ; refusée (ErreurDomaine) si elle n'est pas une lecture. */
  essayer(sql: string): Promise<ResultatLecture> {
    return this.depot.executer(sql);
  }
}

export type { ResultatLecture };

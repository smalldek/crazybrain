// Les requêtes (étape 4) : les cas d'usage que l'API et le connecteur appellent. Une requête
// s'essaie (elle ne lit que les vues, décision 005), s'enregistre sous un nom, se rejoue.
import { ErreurIntrouvable } from './erreurs';
import { evenementDe, type Auteur } from '../domaine/evenement';
import { preparerRequete, type InstantaneRequete } from '../domaine/requete';
import { DepotRequetes, type ResultatLecture } from '../infra/depot-requetes';

/** Une requête enregistrée, et ce qu'elle a rendu en l'essayant au moment de l'enregistrer. */
export interface RequeteEnregistree {
  readonly requete: InstantaneRequete;
  readonly remplacee: boolean;
  readonly resultat: ResultatLecture;
}

export class ServiceRequetes {
  private readonly depot: DepotRequetes;

  constructor(db: D1Database, private readonly horloge: () => Date = () => new Date()) {
    this.depot = new DepotRequetes(db);
  }

  /** Exécute une requête de lecture et rend ses lignes ; refusée (ErreurDomaine) si elle n'est pas une lecture. */
  essayer(sql: string): Promise<ResultatLecture> {
    return this.depot.executer(sql);
  }

  lister(): Promise<InstantaneRequete[]> {
    return this.depot.lister();
  }

  async lire(idOuNom: string): Promise<InstantaneRequete> {
    const r = await this.depot.trouver(idOuNom);
    if (!r) throw new ErreurIntrouvable(`Requête inconnue : « ${idOuNom} ».`);
    return r;
  }

  /** Rejoue une requête enregistrée. */
  async executer(idOuNom: string): Promise<{ requete: InstantaneRequete; resultat: ResultatLecture }> {
    const requete = await this.lire(idOuNom);
    return { requete, resultat: await this.depot.executer(requete.sql) };
  }

  /**
   * Enregistre une requête sous un nom, après l'avoir essayée : une requête refusée ou fautive ne
   * s'enregistre pas. Un nom déjà pris est remplacé (même id), et le journal le dit.
   */
  async enregistrer(demande: { nom: string; sql: string; description?: string | null }, auteur: Auteur): Promise<RequeteEnregistree> {
    const resultat = await this.depot.executer(demande.sql);
    const existante = (await this.depot.trouver(demande.nom.trim().replace(/\s+/g, ' '))) ?? undefined;
    const maintenant = this.horloge();
    const requete = preparerRequete({ id: crypto.randomUUID(), ...demande, sql: demande.sql.trim(), maintenant, ...(existante ? { existante } : {}) });
    await this.depot.enregistrer(requete, evenementDe({
      id: crypto.randomUUID(), elementId: requete.id, type: existante ? 'requete_modifiee' : 'requete_enregistree',
      avant: existante ?? null, apres: requete, auteur, maintenant,
    }));
    return { requete, remplacee: existante !== undefined, resultat };
  }

  async supprimer(idOuNom: string, auteur: Auteur): Promise<void> {
    const requete = await this.lire(idOuNom);
    await this.depot.supprimer(requete.id, evenementDe({
      id: crypto.randomUUID(), elementId: requete.id, type: 'requete_supprimee', avant: requete, apres: null, auteur, maintenant: this.horloge(),
    }));
  }
}

export type { InstantaneRequete, ResultatLecture };

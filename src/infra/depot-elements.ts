import { Element, type InstantaneElement, type Statut } from '../domaine/element';
import type { Priorite } from '../domaine/priorite';
import type { Evenement } from '../domaine/evenement';

const COLONNES =
  'id, type, parent, titre, description, statut, priorite, echeance, jour_planifie, heure_planifiee, estimation, rang, fait_le, cree_le, modifie_le';

/** Une ligne de la table elements, telle que D1 la rend (noms de colonnes en snake_case). */
interface LigneElement {
  id: string;
  type: string;
  parent: string | null;
  titre: string;
  description: string | null;
  statut: Statut;
  priorite: Priorite | null;
  echeance: string | null;
  jour_planifie: string | null;
  heure_planifiee: string | null;
  estimation: number | null;
  rang: number | null;
  fait_le: string | null;
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
      .prepare(`SELECT ${COLONNES} FROM elements ORDER BY cree_le DESC, id`)
      .all<LigneElement>();
    return results.map((ligne) => Element.depuisInstantane(versInstantane(ligne)));
  }

  /** L'élément, ou null s'il n'existe pas. */
  async lire(id: string): Promise<Element | null> {
    const ligne = await this.db.prepare(`SELECT ${COLONNES} FROM elements WHERE id = ?`).bind(id).first<LigneElement>();
    return ligne ? Element.depuisInstantane(versInstantane(ligne)) : null;
  }

  async compter(): Promise<number> {
    const ligne = await this.db.prepare('SELECT COUNT(*) AS nombre FROM elements').first<{ nombre: number }>();
    return ligne?.nombre ?? 0;
  }

  async enregistrerCreation(element: Element, evenement: Evenement): Promise<void> {
    const etat = element.instantane();
    await this.db.batch([
      this.db
        .prepare(`INSERT INTO elements (${COLONNES}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(etat.id, ...valeursModifiables(etat), etat.creeLe, etat.modifieLe),
      this.insererEvenement(evenement),
    ]);
  }

  /** Le nouvel état et l'événement qui le raconte, dans la même transaction. */
  async enregistrerModification(element: Element, evenement: Evenement): Promise<void> {
    const etat = element.instantane();
    await this.db.batch([
      this.db
        .prepare(
          `UPDATE elements SET type = ?, parent = ?, titre = ?, description = ?, statut = ?, priorite = ?, echeance = ?,
           jour_planifie = ?, heure_planifiee = ?, estimation = ?, rang = ?, fait_le = ?, modifie_le = ? WHERE id = ?`,
        )
        .bind(...valeursModifiables(etat), etat.modifieLe, etat.id),
      this.insererEvenement(evenement),
    ]);
  }

  /** Le type existe-t-il dans la table `types` ? */
  async typeExiste(code: string): Promise<boolean> {
    return (await this.db.prepare('SELECT 1 FROM types WHERE code = ?').bind(code).first()) !== null;
  }

  /** Les types d'éléments, dans leur ordre. */
  async types(): Promise<{ code: string; libelle: string }[]> {
    const { results } = await this.db.prepare('SELECT code, libelle FROM types ORDER BY ordre').all<{ code: string; libelle: string }>();
    return results;
  }

  /**
   * L'élément et ses ancêtres (son parent, le parent de son parent…), du plus proche au plus lointain.
   * Vide si l'élément n'existe pas. Une requête récursive (CTE), avec une limite de profondeur par sûreté.
   */
  async lignee(id: string): Promise<string[]> {
    const { results } = await this.db
      .prepare(
        `WITH RECURSIVE lignee(id, parent, profondeur) AS (
           SELECT id, parent, 0 FROM elements WHERE id = ?
           UNION ALL
           SELECT e.id, e.parent, l.profondeur + 1 FROM elements e JOIN lignee l ON e.id = l.parent WHERE l.profondeur < 100
         )
         SELECT id FROM lignee ORDER BY profondeur`,
      )
      .bind(id)
      .all<{ id: string }>();
    return results.map((r) => r.id);
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

/** Les valeurs d'un élément dans l'ordre des colonnes, sans id ni dates de création et de modification. */
function valeursModifiables(etat: InstantaneElement): (string | number | null)[] {
  return [etat.type, etat.parent, etat.titre, etat.description, etat.statut, etat.priorite, etat.echeance,
    etat.jourPlanifie, etat.heurePlanifiee, etat.estimation, etat.rang, etat.faitLe];
}

function versInstantane(ligne: LigneElement): InstantaneElement {
  return {
    id: ligne.id,
    type: ligne.type,
    parent: ligne.parent,
    titre: ligne.titre,
    description: ligne.description,
    statut: ligne.statut,
    priorite: ligne.priorite,
    echeance: ligne.echeance,
    jourPlanifie: ligne.jour_planifie,
    heurePlanifiee: ligne.heure_planifiee,
    estimation: ligne.estimation,
    rang: ligne.rang,
    faitLe: ligne.fait_le,
    creeLe: ligne.cree_le,
    modifieLe: ligne.modifie_le,
  };
}

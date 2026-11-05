import { Element, type InstantaneElement, type Statut } from '../domaine/element';
import type { Priorite } from '../domaine/priorite';
import type { Evenement } from '../domaine/evenement';
import { insererEvenement } from './journal';

/**
 * Les filtres d'une recherche. Tous facultatifs, et cumulés (ET). Les éléments supprimés n'en sortent jamais.
 */
export interface FiltresRecherche {
  /** Un morceau du titre ou de la description (sans tenir compte des majuscules, pour les lettres sans accent). */
  readonly texte?: string;
  readonly statuts?: readonly Statut[];
  readonly types?: readonly string[];
  /** Id d'un projet : ce qui lui appartient (lien « appartient_a »), ou est rangé dedans, sous-projets compris. */
  readonly projet?: string;
  /** Id du parent ; null : seulement les éléments sans parent. */
  readonly parent?: string | null;
  /** Tags exigés : clé seule (n'importe quelle valeur) ou clé et valeur. */
  readonly tags?: readonly { cle: string; valeur?: string }[];
  /** Échéance strictement avant ce jour (AAAA-MM-JJ). */
  readonly echeanceAvant?: string;
  /** Échéance au plus tard ce jour (AAAA-MM-JJ). */
  readonly echeanceJusquA?: string;
  /** Planifié ce jour-là (AAAA-MM-JJ). */
  readonly jourPlanifie?: string;
  /** Nombre maximal de résultats (50 par défaut, 200 au plus). */
  readonly limite?: number;
}

/** Un résultat de recherche : l'élément et ses tags, écrits « cle:valeur ». */
export interface Trouve {
  readonly element: InstantaneElement;
  readonly tags: string[];
}

const COLONNES =
  'id, type, parent, titre, description, statut, priorite, echeance, jour_planifie, heure_planifiee, estimation, rang, fait_le, archive_le, cree_le, modifie_le';

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
  archive_le: string | null;
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

  /** Les éléments, sans ceux qui sont supprimés (archivés). */
  async lister(): Promise<Element[]> {
    const { results } = await this.db
      .prepare(`SELECT ${COLONNES} FROM elements WHERE archive_le IS NULL ORDER BY cree_le DESC, id`)
      .all<LigneElement>();
    return results.map((ligne) => Element.depuisInstantane(versInstantane(ligne)));
  }

  /**
   * Cherche des éléments. La requête se construit morceau par morceau selon les filtres donnés,
   * toujours avec des paramètres (?), jamais en collant le texte reçu dans le SQL.
   */
  async chercher(filtres: FiltresRecherche): Promise<Trouve[]> {
    const conditions = ['e.archive_le IS NULL'];
    const parametres: (string | number)[] = [];
    let avant = '';
    if (filtres.projet !== undefined) {
      // Le projet et tout ce qui est rangé dessous, à n'importe quelle profondeur.
      avant = `WITH RECURSIVE sous(id) AS (SELECT ? UNION SELECT e2.id FROM elements e2 JOIN sous ON e2.parent = sous.id) `;
      parametres.push(filtres.projet);
      conditions.push(`(e.id IN (SELECT id FROM sous) AND e.id <> ?
        OR e.id IN (SELECT source FROM liens WHERE type = 'appartient_a' AND cible IN (SELECT id FROM sous)))`);
      parametres.push(filtres.projet);
    }
    if (filtres.texte) {
      const motif = `%${filtres.texte.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
      conditions.push(`(e.titre LIKE ? ESCAPE '\\' OR e.description LIKE ? ESCAPE '\\')`);
      parametres.push(motif, motif);
    }
    if (filtres.statuts?.length) {
      conditions.push(`e.statut IN (${filtres.statuts.map(() => '?').join(', ')})`);
      parametres.push(...filtres.statuts);
    }
    if (filtres.types?.length) {
      conditions.push(`e.type IN (${filtres.types.map(() => '?').join(', ')})`);
      parametres.push(...filtres.types);
    }
    if (filtres.parent !== undefined) {
      if (filtres.parent === null) {
        conditions.push('e.parent IS NULL');
      } else {
        conditions.push('e.parent = ?');
        parametres.push(filtres.parent);
      }
    }
    for (const tag of filtres.tags ?? []) {
      if (tag.valeur === undefined) {
        conditions.push('EXISTS (SELECT 1 FROM tags t WHERE t.element_id = e.id AND t.cle = ?)');
        parametres.push(tag.cle);
      } else {
        conditions.push('EXISTS (SELECT 1 FROM tags t WHERE t.element_id = e.id AND t.cle = ? AND t.valeur = ?)');
        parametres.push(tag.cle, tag.valeur);
      }
    }
    if (filtres.echeanceAvant) {
      conditions.push('e.echeance < ?');
      parametres.push(filtres.echeanceAvant);
    }
    if (filtres.echeanceJusquA) {
      conditions.push('e.echeance <= ?');
      parametres.push(filtres.echeanceJusquA);
    }
    if (filtres.jourPlanifie) {
      conditions.push('e.jour_planifie = ?');
      parametres.push(filtres.jourPlanifie);
    }
    const limite = Math.min(Math.max(Math.trunc(filtres.limite ?? 50), 1), 200);
    const colonnes = COLONNES.split(', ').map((c) => `e.${c}`).join(', ');
    const sql = `${avant}SELECT ${colonnes},
        (SELECT group_concat(CASE WHEN t.valeur = '' THEN t.cle ELSE t.cle || ':' || t.valeur END, ' ')
           FROM tags t WHERE t.element_id = e.id) AS tags_texte
      FROM elements e
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.echeance IS NULL, e.echeance, e.cree_le DESC, e.id
      LIMIT ${limite}`;
    const { results } = await this.db.prepare(sql).bind(...parametres).all<LigneElement & { tags_texte: string | null }>();
    return results.map((ligne) => ({
      element: Element.depuisInstantane(versInstantane(ligne)).instantane(),
      tags: ligne.tags_texte ? ligne.tags_texte.split(' ').sort() : [],
    }));
  }

  /** Les projets non supprimés dont le titre est exactement celui-ci, aux majuscules près. */
  async projetsNommes(titre: string): Promise<{ id: string }[]> {
    const { results } = await this.db
      .prepare("SELECT id FROM elements WHERE type = 'projet' AND archive_le IS NULL AND lower(titre) = lower(?)")
      .bind(titre.trim())
      .all<{ id: string }>();
    return results;
  }

  /** L'élément, ou null s'il n'existe pas. */
  async lire(id: string): Promise<Element | null> {
    const ligne = await this.db.prepare(`SELECT ${COLONNES} FROM elements WHERE id = ?`).bind(id).first<LigneElement>();
    return ligne ? Element.depuisInstantane(versInstantane(ligne)) : null;
  }

  async compter(): Promise<number> {
    const ligne = await this.db.prepare('SELECT COUNT(*) AS nombre FROM elements WHERE archive_le IS NULL').first<{ nombre: number }>();
    return ligne?.nombre ?? 0;
  }

  async enregistrerCreation(element: Element, evenement: Evenement): Promise<void> {
    const etat = element.instantane();
    await this.db.batch([
      this.db
        .prepare(`INSERT INTO elements (${COLONNES}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
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
           jour_planifie = ?, heure_planifiee = ?, estimation = ?, rang = ?, fait_le = ?, archive_le = ?, modifie_le = ? WHERE id = ?`,
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
    return insererEvenement(this.db, evenement);
  }
}

/** Les valeurs d'un élément dans l'ordre des colonnes, sans id ni dates de création et de modification. */
function valeursModifiables(etat: InstantaneElement): (string | number | null)[] {
  return [etat.type, etat.parent, etat.titre, etat.description, etat.statut, etat.priorite, etat.echeance,
    etat.jourPlanifie, etat.heurePlanifiee, etat.estimation, etat.rang, etat.faitLe, etat.archiveLe];
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
    archiveLe: ligne.archive_le,
    creeLe: ligne.cree_le,
    modifieLe: ligne.modifie_le,
  };
}

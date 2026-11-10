// Le service d'application : les cas d'usage tels que l'API (la page) et le connecteur (Claude) les
// appellent. Il lit en base ce dont le domaine a besoin, appelle le domaine, et enregistre le
// résultat avec son événement. Comme un « application service » en .NET : il orchestre, les règles
// restent dans le domaine. Il ne connaît pas HTTP : il lève ErreurIntrouvable, ErreurConflit ou
// ErreurDomaine, que chaque porte d'entrée traduit.
import { archiverElement, restaurerElement } from '../domaine/archiver-element';
import { creerCommentaire, type InstantaneCommentaire } from '../domaine/commentaire';
import { creerElement } from '../domaine/creer-element';
import { Jour } from '../domaine/jour';
import { champsDeLaSuivante } from '../domaine/suivante';
import { aujourdhuiAParis } from './aujourdhui';
import type { InstantaneElement, Statut } from '../domaine/element';
import { ErreurDomaine } from '../domaine/erreur-domaine';
import { evenementDe, type Auteur } from '../domaine/evenement';
import { creerLien, type InstantaneLien } from '../domaine/lien';
import { modifierElement, type ChangementsElement, type ContexteParent } from '../domaine/modifier-element';
import { Tag, type InstantaneTag } from '../domaine/tag';
import { DepotElements, type FiltresRecherche, type Trouve } from '../infra/depot-elements';
import { DepotRelations } from '../infra/depot-relations';
import { ErreurConflit, ErreurIntrouvable } from './erreurs';

/** Un élément lu en entier : lui, ses liens (source ou cible), ses tags, ses commentaires. */
export interface ElementComplet {
  readonly element: InstantaneElement;
  readonly liens: InstantaneLien[];
  readonly tags: InstantaneTag[];
  readonly commentaires: InstantaneCommentaire[];
}

/** Ce qu'il faut pour créer un élément : le titre, les autres champs, et en plus ses projets et ses tags. */
export interface DemandeCreation extends ChangementsElement {
  readonly titre: string;
  /** Les projets (id ou titre exact) auxquels il appartient : un lien « appartient_a » vers chacun. */
  readonly projets?: readonly string[];
  /** Tags « cle:valeur » ou « cle ». */
  readonly tags?: readonly string[];
}

export class ServiceElements {
  private readonly elements: DepotElements;
  private readonly relations: DepotRelations;

  constructor(db: D1Database, private readonly horloge: () => Date = () => new Date()) {
    this.elements = new DepotElements(db);
    this.relations = new DepotRelations(db);
  }

  lister(): Promise<InstantaneElement[]> {
    return this.elements.lister().then((l) => l.map((e) => e.instantane()));
  }

  chercher(filtres: FiltresRecherche): Promise<Trouve[]> {
    return this.elements.chercher(filtres);
  }

  types(): Promise<{ code: string; libelle: string }[]> {
    return this.elements.types();
  }

  async lire(id: string): Promise<ElementComplet> {
    const element = await this.elements.lire(id);
    if (!element) throw new ErreurIntrouvable(`Élément inconnu : « ${id} ».`);
    const [liens, tags, commentaires] = await Promise.all([
      this.relations.liensDe(id), this.relations.tagsDe(id), this.relations.commentairesDe(id),
    ]);
    return { element: element.instantane(), liens, tags, commentaires };
  }

  /**
   * Retrouve un projet par son id ou par son titre exact (sans tenir compte des majuscules), pour que
   * Claude puisse écrire « le projet Maison ». Refuse si aucun ou plusieurs projets portent ce titre.
   */
  async trouverProjet(idOuTitre: string): Promise<string> {
    const parId = await this.elements.lire(idOuTitre);
    if (parId) return parId.id;
    const candidats = await this.elements.projetsNommes(idOuTitre);
    if (candidats.length === 1 && candidats[0]) return candidats[0].id;
    if (candidats.length === 0) throw new ErreurIntrouvable(`Aucun projet ne s'appelle « ${idOuTitre} ».`);
    throw new ErreurConflit(`Plusieurs projets s'appellent « ${idOuTitre} » : ${candidats.map((c) => c.id).join(', ')}. Donner l'id.`);
  }

  /**
   * Crée un élément, puis ses liens vers ses projets et ses tags. Tout est vérifié avant la première
   * écriture (titre, champs, projets, tags) : une demande fausse n'écrit rien.
   */
  async creer(demande: DemandeCreation, auteur: Auteur): Promise<ElementComplet> {
    const { titre, projets = [], tags = [], ...champs } = demande;
    const contexte = await this.contexte(champs);
    const idsProjets = await Promise.all(projets.map((p) => this.trouverProjet(p)));
    const tagsLus = [...new Map(tags.map((t) => Tag.lire(t)).map((t) => [t.texte(), t])).values()];
    const maintenant = this.horloge();
    const { element, evenement } = creerElement({
      idElement: crypto.randomUUID(), idEvenement: crypto.randomUUID(), titre, champs, ...contexte, auteur, maintenant,
    });
    await this.elements.enregistrerCreation(element, evenement);
    for (const cible of new Set(idsProjets)) {
      await this.ajouterLien(element.id, cible, 'appartient_a', auteur, maintenant);
    }
    for (const tag of tagsLus) {
      await this.ajouterTag(element.id, tag, auteur, maintenant);
    }
    return this.lire(element.id);
  }

  /**
   * Modifie un élément. Cocher une tâche récurrente crée aussi la suivante (tâche 5.6), avec les
   * mêmes projets et les mêmes tags ; son id est rendu dans `suivante`.
   */
  async modifier(id: string, changements: ChangementsElement, auteur: Auteur): Promise<{ element: InstantaneElement; suivante: string | null }> {
    const actuel = await this.elements.lire(id);
    if (!actuel) throw new ErreurIntrouvable(`Élément inconnu : « ${id} ».`);
    const contexte = await this.contexte(changements);
    const maintenant = this.horloge();
    const { element, evenement } = modifierElement({
      element: actuel, changements, ...contexte, idEvenement: crypto.randomUUID(), auteur, maintenant,
    });
    if (evenement) await this.elements.enregistrerModification(element, evenement);
    const champs = actuel.statut !== 'fait' && element.statut === 'fait'
      ? champsDeLaSuivante(actuel, Jour.creer(aujourdhuiAParis(maintenant))) : null;
    if (!champs) return { element: element.instantane(), suivante: null };
    const [liens, tags] = await Promise.all([this.relations.liensDe(id), this.relations.tagsDe(id)]);
    const suivante = await this.creer({
      ...champs,
      projets: liens.filter((l) => l.type === 'appartient_a' && l.source === id).map((l) => l.cible),
      tags: tags.map((t) => (t.valeur === '' ? t.cle : `${t.cle}:${t.valeur}`)),
    }, auteur);
    return { element: element.instantane(), suivante: suivante.element.id };
  }

  async supprimer(id: string, auteur: Auteur): Promise<void> {
    const actuel = await this.elements.lire(id);
    if (!actuel) throw new ErreurIntrouvable(`Élément inconnu : « ${id} ».`);
    const { element, evenement } = archiverElement({ element: actuel, idEvenement: crypto.randomUUID(), auteur, maintenant: this.horloge() });
    await this.elements.enregistrerModification(element, evenement);
  }

  async restaurer(id: string, auteur: Auteur): Promise<InstantaneElement> {
    const actuel = await this.elements.lire(id);
    if (!actuel) throw new ErreurIntrouvable(`Élément inconnu : « ${id} ».`);
    const { element, evenement } = restaurerElement({ element: actuel, idEvenement: crypto.randomUUID(), auteur, maintenant: this.horloge() });
    await this.elements.enregistrerModification(element, evenement);
    return element.instantane();
  }

  async lier(source: string, cible: string, type: string, auteur: Auteur): Promise<InstantaneLien> {
    await this.exiger(source);
    if (!(await this.elements.lire(cible))) throw new ErreurDomaine(`Cible inconnue : « ${cible} ».`);
    return this.ajouterLien(source, cible, type, auteur, this.horloge());
  }

  async delier(idLien: string, auteur: Auteur): Promise<void> {
    const lien = await this.relations.lien(idLien);
    if (!lien) throw new ErreurIntrouvable(`Lien inconnu : « ${idLien} ».`);
    await this.relations.retirerLien(lien, evenementDe({
      id: crypto.randomUUID(), elementId: lien.source, type: 'lien_retire', avant: lien, apres: null, auteur, maintenant: this.horloge(),
    }));
  }

  /** Pose un tag ; le reposer ne change rien. Rend le tag et s'il a été ajouté. */
  /** Tous les liens « appartient à » (éléments non supprimés) : la tâche (source) et son projet (cible). */
  appartenances(): Promise<{ source: string; cible: string }[]> {
    return this.relations.appartenances();
  }

  /** Tous les tags posés (éléments non supprimés). */
  tousLesTags(): Promise<InstantaneTag[]> {
    return this.relations.tousLesTags();
  }

  async tagger(elementId: string, texte: string, auteur: Auteur): Promise<{ tag: InstantaneTag; ajoute: boolean }> {
    const tag = Tag.lire(texte);
    await this.exiger(elementId);
    return this.ajouterTag(elementId, tag, auteur, this.horloge());
  }

  async detagger(elementId: string, texte: string, auteur: Auteur): Promise<void> {
    const lu = Tag.lire(texte);
    const tag: InstantaneTag = { elementId, cle: lu.cle, valeur: lu.valeur };
    if (!(await this.relations.tagExiste(tag))) throw new ErreurIntrouvable(`Le tag « ${lu.texte()} » n'est pas sur cet élément.`);
    await this.relations.retirerTag(tag, evenementDe({
      id: crypto.randomUUID(), elementId, type: 'tag_retire', avant: tag, apres: null, auteur, maintenant: this.horloge(),
    }));
  }

  async commenter(elementId: string, texte: string, auteur: Auteur): Promise<InstantaneCommentaire> {
    await this.exiger(elementId);
    const maintenant = this.horloge();
    const commentaire = creerCommentaire({ id: crypto.randomUUID(), elementId, texte, auteur, maintenant });
    await this.relations.ajouterCommentaire(commentaire, evenementDe({
      id: crypto.randomUUID(), elementId, type: 'commentaire_ajoute', avant: null, apres: commentaire, auteur, maintenant,
    }));
    return commentaire;
  }

  compter(): Promise<number> {
    return this.elements.compter();
  }

  private async exiger(id: string): Promise<void> {
    if (!(await this.elements.lire(id))) throw new ErreurIntrouvable(`Élément inconnu : « ${id} ».`);
  }

  private async ajouterLien(source: string, cible: string, type: string, auteur: Auteur, maintenant: Date): Promise<InstantaneLien> {
    const lien = creerLien({ id: crypto.randomUUID(), source, cible, type, maintenant });
    if (await this.relations.lienExiste(lien.source, lien.cible, lien.type)) {
      throw new ErreurConflit('Ce lien existe déjà.');
    }
    await this.relations.ajouterLien(lien, evenementDe({
      id: crypto.randomUUID(), elementId: source, type: 'lien_ajoute', avant: null, apres: lien, auteur, maintenant,
    }));
    return lien;
  }

  private async ajouterTag(elementId: string, lu: Tag, auteur: Auteur, maintenant: Date): Promise<{ tag: InstantaneTag; ajoute: boolean }> {
    const tag: InstantaneTag = { elementId, cle: lu.cle, valeur: lu.valeur };
    if (await this.relations.tagExiste(tag)) return { tag, ajoute: false };
    await this.relations.ajouterTag(tag, evenementDe({
      id: crypto.randomUUID(), elementId, type: 'tag_ajoute', avant: null, apres: tag, auteur, maintenant,
    }));
    return { tag, ajoute: true };
  }

  /** Vérifie en base le type et le parent demandés, et lit les ancêtres du parent (contre les boucles). */
  private async contexte(changements: ChangementsElement): Promise<{ contexteParent?: ContexteParent }> {
    if (typeof changements.type === 'string' && /^[a-z][a-z0-9_]*$/.test(changements.type) && !(await this.elements.typeExiste(changements.type))) {
      const codes = (await this.elements.types()).map((t) => t.code).join(', ');
      throw new ErreurDomaine(`Type inconnu : « ${changements.type} ». Les types : ${codes}.`);
    }
    if (typeof changements.parent !== 'string') return {};
    const ancetresDuParent = await this.elements.lignee(changements.parent);
    if (ancetresDuParent.length === 0) throw new ErreurDomaine(`Parent inconnu : « ${changements.parent} ».`);
    return { contexteParent: { ancetresDuParent } };
  }
}

export type { FiltresRecherche, Statut, Trouve };

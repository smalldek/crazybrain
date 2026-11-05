// Le kanban : une colonne par statut, une carte par élément. Glisser une carte dans une autre
// colonne change son statut ; la glisser dans sa colonne change son ordre (le `rang`).
// Le glisser-déposer vient de la bibliothèque dnd-kit : elle marche à la souris, au doigt (appui
// long, pour ne pas gêner le défilement) et au clavier (Espace pour prendre, flèches, Espace pour poser).
import {
  closestCorners, DndContext, pointerWithin, type CollisionDetection, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useMemo, useState } from 'react';
import type { Element, Tag } from './api';
import { aujourdhui } from './dates';
import {
  colonneDe, colonnesDe, COLONNES, couloirsDe, deplacer, ecrireCritere, lireCritere, type Critere, type StatutColonne,
} from './kanban';
import { projetDe, tagsParElement } from './tags';

interface Proprietes {
  /** Les éléments montrés (une fois filtrés). */
  readonly elements: readonly Element[];
  /** Tous les éléments : pour nommer un projet ou un parent même quand le filtre le cache. */
  readonly tous: readonly Element[];
  readonly tags: readonly Tag[];
  /** Les couloirs choisis, et comment en changer. */
  readonly critere: Critere;
  readonly changerCritere: (c: Critere) => void;
  readonly ouvert: string | null;
  readonly ouvrir: (id: string) => void;
  /**
   * Une carte posée : son nouveau statut, et l'ordre complet de sa colonne d'arrivée.
   * L'appelant enregistre (statut et rangs) puis relit la liste.
   */
  readonly poser: (id: string, statut: StatutColonne, ordre: readonly string[]) => void;
}

export function VueKanban({ elements, tous, tags, critere, changerCritere, ouvert, ouvrir, poser }: Proprietes) {
  const parElement = useMemo(() => tagsParElement(tags), [tags]);
  // Ce que montre une carte sous son titre : son projet et ses tags.
  const etiquettes = useMemo(() => new Map(elements.map((e) => {
    const projet = projetDe(e.id, tous);
    return [e.id, [...(projet ? [`projet:${projet.titre}`] : []), ...(parElement.get(e.id) ?? [])]];
  })), [elements, tous, parElement]);
  // Les couloirs se calculent sur tout (leurs noms restent justes), puis ne gardent que ce qui est montré.
  const couloirs = useMemo(() => {
    const montres = new Set(elements.map((e) => e.id));
    return couloirsDe(tous, critere, parElement)
      .map((c) => ({ ...c, elements: c.elements.filter((e) => montres.has(e.id)) }))
      .filter((c) => c.elements.length > 0);
  }, [elements, tous, critere, parElement]);
  const cles = [...new Set(tags.map((t) => t.cle))].sort((a, b) => a.localeCompare(b, 'fr'));
  const choix = ecrireCritere(critere) ?? '';

  return (
    <>
      <div className="reglages">
        <label htmlFor="couloirs">Couloirs</label>
        <select id="couloirs" value={choix} onChange={(e) => changerCritere(lireCritere(e.target.value || null))}>
          <option value="">Aucun</option>
          <option value="parent">Par parent</option>
          <option value="priorite">Par priorité</option>
          {critere.sorte === 'tag' && !cles.includes(critere.cle) && <option value={choix}>Par tag {critere.cle}</option>}
          {cles.map((c) => <option key={c} value={`tag:${c}`}>Par tag {c}</option>)}
        </select>
      </div>
      <div className="kanban" id="kanban">
        {critere.sorte === 'aucun'
          ? <Tableau elements={elements} etiquettes={etiquettes} ouvert={ouvert} ouvrir={ouvrir} poser={poser} />
          : couloirs.map((c) => (
            <section key={c.cle} className="couloir" aria-label={`Couloir ${c.titre}`}>
              <h2 className="titre-couloir">{c.titre} <span className="compte">{c.elements.length}</span></h2>
              <Tableau elements={c.elements} etiquettes={etiquettes} ouvert={ouvert} ouvrir={ouvrir} poser={poser} />
            </section>
          ))}
      </div>
    </>
  );
}

interface ProprietesTableau {
  readonly elements: readonly Element[];
  readonly etiquettes: ReadonlyMap<string, readonly string[]>;
  readonly ouvert: string | null;
  readonly ouvrir: (id: string) => void;
  readonly poser: (id: string, statut: StatutColonne, ordre: readonly string[]) => void;
}

/**
 * Un tableau de trois colonnes, avec son propre glisser-déposer : une carte change de colonne (de
 * statut) mais reste dans son couloir. Changer de couloir, c'est changer le parent, la priorité ou
 * le tag, dans le détail.
 */
function Tableau({ elements, etiquettes, ouvert, ouvrir, poser }: ProprietesTableau) {
  const parId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const depuisServeur = useMemo(() => colonnesDe(elements), [elements]);
  // Pendant un glissement, les colonnes bougent ici avant d'être enregistrées.
  const [colonnes, setColonnes] = useState(depuisServeur);
  const [prise, setPrise] = useState<string | null>(null);
  useEffect(() => { setColonnes(depuisServeur); }, [depuisServeur]);

  const capteurs = useSensors(
    // Souris et doigt séparés : au doigt, un glissement court doit faire défiler l'écran, pas prendre la carte.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const debut = (e: DragStartEvent): void => setPrise(String(e.active.id));

  // Survoler une autre colonne y fait passer la carte tout de suite, pour voir où elle tombera.
  const survol = (e: DragOverEvent): void => {
    if (!e.over) return;
    const carte = String(e.active.id);
    const sur = String(e.over.id);
    setColonnes((c) => (colonneDe(carte, c) === colonneDe(sur, c) ? c : deplacer(c, carte, sur)));
  };

  const fin = (e: DragEndEvent): void => {
    setPrise(null);
    const carte = String(e.active.id);
    if (!e.over) { setColonnes(depuisServeur); return; }
    const apres = deplacer(colonnes, carte, String(e.over.id));
    const statut = colonneDe(carte, apres);
    if (!statut) return;
    setColonnes(apres);
    const avant = parId.get(carte);
    const memeOrdre = avant?.statut === statut && apres[statut].join() === depuisServeur[statut].join();
    if (!memeOrdre) poser(carte, statut, apres[statut]);
  };

  const elementPris = prise ? parId.get(prise) : undefined;

  return (
    // Le défilement automatique ne part qu'au bord de l'écran (8 % de la largeur) : sur le téléphone, on
    // peut poser une carte sur le bout visible de la colonne voisine sans que le kanban défile.
    <DndContext sensors={capteurs} autoScroll={{ threshold: { x: 0.08, y: 0.15 } }} accessibility={{ screenReaderInstructions: { draggable: CONSIGNES } }} collisionDetection={sousLeDoigt} onDragStart={debut} onDragOver={survol}
      onDragEnd={fin} onDragCancel={() => { setPrise(null); setColonnes(depuisServeur); }}>
      <div className="tableau">
        {COLONNES.map((c) => (
          <Colonne key={c.statut} statut={c.statut} titre={c.titre} ids={colonnes[c.statut]}
            parId={parId} etiquettes={etiquettes} ouvert={ouvert} ouvrir={ouvrir} />
        ))}
      </div>
      <DragOverlay>{elementPris ? <Carte element={elementPris} flottante /> : null}</DragOverlay>
    </DndContext>
  );
}

interface ProprietesColonne {
  readonly statut: StatutColonne;
  readonly titre: string;
  readonly ids: readonly string[];
  readonly parId: ReadonlyMap<string, Element>;
  readonly etiquettes: ReadonlyMap<string, readonly string[]>;
  readonly ouvert: string | null;
  readonly ouvrir: (id: string) => void;
}

function Colonne({ statut, titre, ids, parId, etiquettes, ouvert, ouvrir }: ProprietesColonne) {
  // La colonne elle-même accepte une carte (utile quand elle est vide).
  const { setNodeRef } = useDroppable({ id: statut });
  return (
    <section className="colonne" aria-label={titre} data-statut={statut}>
      <h2>{titre} <span className="compte">{ids.length}</span></h2>
      <SortableContext id={statut} items={[...ids]} strategy={verticalListSortingStrategy}>
        <ol ref={setNodeRef} className="cartes">
          {ids.map((id) => {
            const element = parId.get(id);
            return element ? <CarteGlissable key={id} element={element} etiquettes={etiquettes.get(id) ?? []} ouverte={id === ouvert} ouvrir={() => ouvrir(id)} /> : null;
          })}
        </ol>
      </SortableContext>
    </section>
  );
}

function CarteGlissable({ element, etiquettes, ouverte, ouvrir }: { element: Element; etiquettes: readonly string[]; ouverte: boolean; ouvrir: () => void }) {
  // Le rôle reste « élément de liste » : la carte contient déjà un bouton (son titre), et un bouton
  // dans un bouton trouble les lecteurs d'écran.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id, attributes: { role: 'listitem', roleDescription: 'carte déplaçable' },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'carte-place' : undefined} data-id={element.id}
      {...attributes} {...listeners}>
      <Carte element={element} etiquettes={etiquettes} ouverte={ouverte} ouvrir={ouvrir} />
    </li>
  );
}

/**
 * Où tombe la carte : ce qui est sous le doigt (ou la souris) d'abord ; sinon (au clavier, ou hors
 * de toute colonne), le plus proche. « Le plus proche » seul se trompe avec des colonnes très
 * hautes : leurs coins sont loin, et une carte de la colonne de départ gagne.
 */
const sousLeDoigt: CollisionDetection = (args) => {
  const dessous = pointerWithin(args);
  return dessous.length > 0 ? dessous : closestCorners(args);
};

const CONSIGNES = 'Pour prendre une carte, appuyer sur Espace. Les flèches la déplacent ; Espace la pose, Échap annule.';

const PRIORITE: Record<string, string> = { urgente: 'Urgente', haute: 'Haute', normale: 'Normale', basse: 'Basse' };

interface ProprietesCarte {
  readonly element: Element;
  readonly etiquettes?: readonly string[];
  readonly ouverte?: boolean;
  readonly ouvrir?: () => void;
  readonly flottante?: boolean;
}

function Carte({ element, etiquettes = [], ouverte, ouvrir, flottante }: ProprietesCarte) {
  const enRetard = element.statut !== 'fait' && element.echeance !== null && element.echeance < aujourdhui();
  const classes = ['carte', ouverte && 'ouverte', flottante && 'flottante', element.statut === 'fait' && 'fait'].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <button type="button" className="titre-carte" onClick={ouvrir} tabIndex={ouvrir ? 0 : -1}>{element.titre}</button>
      <div className="infos">
        {element.type !== 'tache' && <span className="pastille">{element.type}</span>}
        {element.priorite && <span className={`pastille priorite-${element.priorite}`}>{PRIORITE[element.priorite]}</span>}
        {element.echeance && <span className={enRetard ? 'echeance en-retard' : 'echeance'}>{jourCourt(element.echeance)}</span>}
        {etiquettes.map((t) => <span key={t} className="pastille etiquette">{t}</span>)}
      </div>
    </div>
  );
}

/** « 2026-11-05 » → « 5 nov. ». */
function jourCourt(jour: string): string {
  return new Date(`${jour}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

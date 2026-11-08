// Le plan, sous les cercles : la même arborescence en liste. Chaque ligne a sa part et son
// avancement ; le triangle replie ou déplie une branche ; toucher le titre choisit la part dans les
// cercles. La poignée ⠿ se glisse (souris, doigt après un appui long, clavier) : en haut ou en bas
// d'une autre ligne, l'élément se range avant ou après elle ; en son milieu, il se range dedans.
import {
  DndContext, KeyboardSensor, MouseSensor, pointerWithin, rectIntersection, TouchSensor, useDraggable, useDroppable, useSensor,
  useSensors, type CollisionDetection, type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import type { Element } from './api';
import { pourcent } from './cercles';
import { deplacement, lignesDuPlan, positionDans, type LignePlan } from './plan';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly centre: string | null;
  readonly choisi: string | null;
  readonly choisir: (id: string) => void;
  /** Range l'élément dans `parent` (null : « Tout »), et donne à sa fratrie cet ordre. */
  readonly ranger: (id: string, parent: string | null, ordre: readonly string[]) => Promise<void>;
  readonly signaler: (message: string) => void;
}

// Au doigt et à la souris, la ligne sous le pointeur ; au clavier (pas de pointeur), celle que la poignée recouvre.
const collision: CollisionDetection = (args) => {
  const sous = pointerWithin(args);
  return sous.length > 0 ? sous : rectIntersection(args);
};

export function PlanCercles({ elements, centre, choisi, choisir, ranger, signaler }: Proprietes) {
  const [replies, setReplies] = useState<ReadonlySet<string>>(new Set());
  const lignes = lignesDuPlan(elements, centre, replies);
  const capteurs = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const basculer = (id: string): void => setReplies((r) => {
    const n = new Set(r);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  function poser({ active, over, activatorEvent, delta }: DragEndEvent): void {
    if (!over) return;
    // La hauteur du point de dépôt dans la ligne visée : le point de départ, plus le chemin parcouru.
    const depart = activatorEvent instanceof MouseEvent ? activatorEvent.clientY
      : typeof TouchEvent !== 'undefined' && activatorEvent instanceof TouchEvent ? activatorEvent.touches[0]?.clientY ?? null : null;
    const y = depart === null
      ? (active.rect.current.translated?.top ?? 0) + (active.rect.current.translated?.height ?? 0) / 2
      : depart + delta.y;
    const position = positionDans((y - over.rect.top) / over.rect.height);
    const resultat = deplacement(elements, centre, String(active.id), String(over.id), position);
    if (resultat === null) return;
    if (typeof resultat === 'string') { signaler(resultat); return; }
    void ranger(String(active.id), resultat.parent, resultat.ordre);
  }

  if (lignes.length === 0) return null;
  return (
    <section className="plan" aria-label="Plan">
      <h2>Plan</h2>
      <DndContext sensors={capteurs} collisionDetection={collision} onDragEnd={poser}>
        <ul>
          {lignes.map((l) => (
            <Ligne key={l.element.id} ligne={l} choisie={l.element.id === choisi} choisir={() => choisir(l.element.id)}
              basculer={() => basculer(l.element.id)} />
          ))}
        </ul>
      </DndContext>
    </section>
  );
}

function Ligne({ ligne, choisie, choisir, basculer }: { ligne: LignePlan; choisie: boolean; choisir: () => void; basculer: () => void }) {
  const { element: e, niveau, part, avancement, aDesEnfants, replie } = ligne;
  const glisse = useDraggable({ id: e.id });
  const cible = useDroppable({ id: e.id });
  const survolee = cible.isOver && !glisse.isDragging;
  return (
    <li ref={cible.setNodeRef} data-id={e.id} data-titre={e.titre} data-niveau={niveau}
      className={['ligne-plan', choisie && 'choisie', survolee && 'survolee', glisse.isDragging && 'glissee', e.statut === 'fait' && 'fait']
        .filter(Boolean).join(' ')}
      style={{ paddingLeft: `${0.4 + (niveau - 1) * 1.6}rem` }}>
      <button type="button" className="poignee" ref={glisse.setNodeRef} {...glisse.listeners} {...glisse.attributes}
        aria-label={`Déplacer « ${e.titre} »`}>⠿</button>
      {aDesEnfants
        ? <button type="button" className="replier" aria-expanded={!replie} aria-label={`${replie ? 'Déplier' : 'Replier'} « ${e.titre} »`}
            onClick={basculer}>{replie ? '▸' : '▾'}</button>
        : <span className="replier" aria-hidden="true" />}
      <button type="button" className="titre" onClick={choisir}>{e.titre}</button>
      <span className="part-plan">{pourcent(part)}</span>
      <meter min={0} max={100} value={avancement} aria-label={`Avancement : ${Math.round(avancement)} %`} />
    </li>
  );
}

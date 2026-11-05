// Une ligne de la liste : la case à cocher, le titre (qu'on touche pour le corriger), l'échéance,
// la flèche qui ouvre son détail, et la croix qui supprime.
import { useState, type KeyboardEvent } from 'react';
import type { Changements, Element } from './api';
import { aujourdhui } from './dates';

interface Proprietes {
  readonly element: Element;
  readonly modifier: (changements: Changements) => void;
  readonly supprimer: () => void;
  /** Ouvre le panneau de détail. */
  readonly ouvrir: () => void;
  /** Son panneau de détail est ouvert. */
  readonly ouverte: boolean;
}

export function LigneTache({ element, modifier, supprimer, ouvrir, ouverte }: Proprietes) {
  const fait = element.statut === 'fait';
  const enRetard = !fait && element.echeance !== null && element.echeance < aujourdhui();
  const [edition, setEdition] = useState(false);

  const classes = ['vide', 'en-retard'].filter((c) => (c === 'vide' ? !element.echeance : enRetard)).join(' ');

  return (
    <li className={[fait && 'fait', ouverte && 'ouverte'].filter(Boolean).join(' ') || undefined} data-id={element.id}>
      <input type="checkbox" checked={fait} aria-label={fait ? 'Marquer à faire' : 'Marquer comme faite'}
        onChange={(e) => modifier({ statut: e.target.checked ? 'fait' : 'a_faire' })} />
      {edition
        ? <EditionTitre titre={element.titre} fermer={(titre) => {
            setEdition(false);
            if (titre !== null && titre !== element.titre) modifier({ titre });
          }} />
        : <button type="button" className="titre" onClick={() => setEdition(true)}>{element.titre}</button>}
      <input type="date" aria-label="Échéance" className={classes || undefined} value={element.echeance ?? ''}
        title={enRetard ? 'Échéance dépassée' : undefined}
        onChange={(e) => modifier({ echeance: e.target.value || null })} />
      <button type="button" className="ouvrir" aria-label={`Ouvrir « ${element.titre} »`} onClick={ouvrir}>›</button>
      <button type="button" className="supprimer" aria-label={`Supprimer « ${element.titre} »`} onClick={supprimer}>×</button>
    </li>
  );
}

/**
 * Le champ qui remplace le titre : Entrée ou quitter le champ enregistre, Échap annule.
 * `fermer` reçoit le nouveau titre, ou null pour ne rien changer.
 */
function EditionTitre({ titre, fermer }: { titre: string; fermer: (titre: string | null) => void }) {
  const [valeur, setValeur] = useState(titre);
  // Entrée puis la perte du focus qui suit ne doivent enregistrer qu'une fois.
  const [fini, setFini] = useState(false);

  const terminer = (enregistrer: boolean): void => {
    if (fini) return;
    setFini(true);
    const propre = valeur.trim();
    fermer(enregistrer && propre !== '' ? propre : null);
  };

  const touche = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); terminer(true); }
    if (e.key === 'Escape') { e.preventDefault(); terminer(false); }
  };

  return (
    <input className="edition" aria-label="Titre de la tâche" maxLength={200} autoFocus value={valeur}
      onChange={(e) => setValeur(e.target.value)} onKeyDown={touche} onBlur={() => terminer(true)} />
  );
}

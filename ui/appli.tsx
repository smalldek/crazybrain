// L'écran de la liste : la saisie rapide, le message d'état, les tâches ; et, quand l'adresse est
// /e/<id>, le panneau de détail de cet élément à côté.
// Un composant React est une fonction qui rend ce qu'il faut afficher à partir de son état ;
// quand l'état change (useState), React refait l'affichage tout seul.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adresseElement, elementDeLAdresse, naviguer, useAdresse } from './adresse';
import { api, type Changements, type Element } from './api';
import { PanneauDetail } from './panneau-detail';
import { LigneTache } from './ligne-tache';
import { appliquer, ordonner } from './liste';

/** Le message sous la saisie : un état, une erreur, ou « supprimée » avec un bouton Annuler. */
interface Message {
  readonly texte: string;
  readonly erreur?: boolean;
  readonly annuler?: () => void;
}

export function Appli() {
  const [elements, setElements] = useState<Element[] | null>(null);
  const [message, setMessage] = useState<Message>({ texte: 'Chargement…' });
  const [titre, setTitre] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const ouvert = elementDeLAdresse(useAdresse());
  const fermer = useCallback(() => naviguer('/'), []);

  const erreur = (e: unknown): void => setMessage({ texte: e instanceof Error ? e.message : String(e), erreur: true });

  /** Relit la liste ; garde le message en cours sauf « Chargement… » et « Aucune tâche ». */
  const charger = useCallback(async (): Promise<void> => {
    try {
      const lus = await api.lister();
      setElements(lus);
      setMessage((m) => (m.erreur || m.annuler ? m : { texte: lus.length === 0 ? 'Aucune tâche pour l’instant.' : '' }));
    } catch (e) {
      erreur(e);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  async function ajouter(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    if (titre.trim() === '') return;
    setEnvoi(true);
    try {
      await api.creer({ titre });
      setTitre('');
      setMessage({ texte: '' });
      await charger();
    } catch (e) {
      erreur(e);
    } finally {
      setEnvoi(false);
    }
  }

  // La page montre le changement tout de suite (une case cochée se coche sous le doigt), puis relit
  // la liste : si le serveur refuse, la relecture remet l'état vrai et le message dit pourquoi.
  async function modifier(id: string, changements: Changements): Promise<void> {
    setElements((liste) => liste && liste.map((e) => (e.id === id ? appliquer(e, changements) : e)));
    try {
      await api.modifier(id, changements);
      setMessage({ texte: '' });
      await charger();
    } catch (e) {
      erreur(e);
      await charger();
    }
  }

  // Supprimer ne demande pas de confirmation : la tâche est archivée, et « Annuler » la restaure
  // tout de suite (plus rapide qu'une question à chaque fois, et rien n'est perdu).
  async function supprimer(element: Element): Promise<void> {
    try {
      await api.supprimer(element.id);
    } catch (e) {
      erreur(e);
      return;
    }
    setMessage({
      texte: `« ${element.titre} » supprimée.`,
      annuler: () => {
        void (async () => {
          try {
            await api.restaurer(element.id);
            setMessage({ texte: '' });
            await charger();
          } catch (e) {
            erreur(e);
          }
        })();
      },
    });
    await charger();
  }

  return (
    <div className={ouvert ? 'mise-en-page avec-panneau' : 'mise-en-page'}>
      <main>
        <h1>Crazybrain</h1>
        <form onSubmit={(e) => void ajouter(e)} autoComplete="off">
          <label htmlFor="titre">Nouvelle tâche (Entrée pour l'ajouter)</label>
          <input id="titre" name="titre" maxLength={200} enterKeyHint="done" placeholder="Taper une tâche…"
            autoFocus={!ouvert} value={titre} disabled={envoi} onChange={(e) => setTitre(e.target.value)} />
        </form>
        <p id="message" className={message.erreur ? 'etat erreur' : 'etat'} role="status" aria-live="polite"
          hidden={message.texte === ''}>
          {message.texte}
          {message.annuler && <button type="button" onClick={message.annuler}>Annuler</button>}
        </p>
        <ul id="liste">
          {elements && ordonner(elements).map((e) => (
            <LigneTache key={e.id} element={e} ouverte={e.id === ouvert}
              modifier={(c) => void modifier(e.id, c)} supprimer={() => void supprimer(e)}
              ouvrir={() => naviguer(adresseElement(e.id))} />
          ))}
        </ul>
      </main>
      {ouvert && (
        <PanneauDetail key={ouvert} id={ouvert} elements={elements ?? []} fermer={fermer}
          modifie={() => void charger()} />
      )}
    </div>
  );
}

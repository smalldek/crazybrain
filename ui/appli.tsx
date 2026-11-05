// L'écran principal : la saisie rapide, le message d'état, puis la vue choisie (la liste ou le
// kanban) ; et, quand l'adresse nomme un élément (/e/<id>, /kanban/e/<id>), son panneau de détail.
// Un composant React est une fonction qui rend ce qu'il faut afficher à partir de son état ;
// quand l'état change (useState), React refait l'affichage tout seul.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adresseElement, adresseVue, elementDeLAdresse, naviguer, useAdresse, vueDe, type Vue } from './adresse';
import { api, type Changements, type Element, type Tag } from './api';
import { PanneauDetail } from './panneau-detail';
import { LigneTache } from './ligne-tache';
import { rangsAPoser, type StatutColonne } from './kanban';
import { appliquer, ordonner } from './liste';
import { VueKanban } from './vue-kanban';

/** Le message sous la saisie : un état, une erreur, ou « supprimée » avec un bouton Annuler. */
interface Message {
  readonly texte: string;
  readonly erreur?: boolean;
  readonly annuler?: () => void;
}

const NOMS_VUES: Record<Vue, string> = { liste: 'Liste', kanban: 'Kanban' };

export function Appli() {
  const [elements, setElements] = useState<Element[] | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [message, setMessage] = useState<Message>({ texte: 'Chargement…' });
  const [titre, setTitre] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const chemin = useAdresse();
  const vue = vueDe(chemin);
  const ouvert = elementDeLAdresse(chemin);
  const fermer = useCallback(() => naviguer(adresseVue(vueDe(window.location.pathname))), []);
  const ouvrir = (id: string): void => naviguer(adresseElement(id, vue));

  const erreur = (e: unknown): void => setMessage({ texte: e instanceof Error ? e.message : String(e), erreur: true });

  /** Relit la liste ; garde le message en cours sauf « Chargement… » et « Aucune tâche ». */
  const charger = useCallback(async (): Promise<void> => {
    try {
      const [lus, tousLesTags] = await Promise.all([api.lister(), api.tags()]);
      setElements(lus);
      setTags(tousLesTags);
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

  // Une carte posée sur le kanban : son statut s'il a changé, et les rangs de sa colonne d'arrivée
  // (seulement ceux qui changent). L'écran les montre tout de suite ; la relecture confirme.
  async function poser(id: string, statut: StatutColonne, ordre: readonly string[]): Promise<void> {
    const liste = elements ?? [];
    const carte = liste.find((e) => e.id === id);
    const parId = new Map<string, Changements>();
    // La carte déplacée d'abord : son statut et son rang partent ensemble.
    if (carte && carte.statut !== statut) parId.set(id, { statut });
    for (const { id: autre, rang } of rangsAPoser(ordre, liste)) parId.set(autre, { ...parId.get(autre), rang });
    const envois = [...parId];
    setElements((l) => l && l.map((e) => {
      const changement = envois.find(([i]) => i === e.id);
      return changement ? appliquer(e, changement[1]) : e;
    }));
    try {
      for (const [i, changements] of envois) await api.modifier(i, changements);
      setMessage({ texte: '' });
    } catch (e) {
      erreur(e);
    }
    await charger();
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
    <div className={['mise-en-page', ouvert && 'avec-panneau', `vue-${vue}`].filter(Boolean).join(' ')}>
      <main>
        <header className="entete-appli">
          <h1>Crazybrain</h1>
          <nav aria-label="Vues">
            {(['liste', 'kanban'] as const).map((v) => (
              <a key={v} href={adresseVue(v)} aria-current={v === vue ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); naviguer(adresseVue(v)); }}>{NOMS_VUES[v]}</a>
            ))}
          </nav>
        </header>
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
        {vue === 'liste' ? (
          <ul id="liste">
            {elements && ordonner(elements).map((e) => (
              <LigneTache key={e.id} element={e} ouverte={e.id === ouvert}
                modifier={(c) => void modifier(e.id, c)} supprimer={() => void supprimer(e)}
                ouvrir={() => ouvrir(e.id)} />
            ))}
          </ul>
        ) : (
          elements && <VueKanban elements={elements} tags={tags} ouvert={ouvert} ouvrir={ouvrir}
            poser={(id, statut, ordre) => void poser(id, statut, ordre)} />
        )}
      </main>
      {ouvert && (
        <PanneauDetail key={ouvert} id={ouvert} elements={elements ?? []} tousLesTags={tags} fermer={fermer}
          modifie={() => void charger()} />
      )}
    </div>
  );
}

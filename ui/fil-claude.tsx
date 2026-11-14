// Le bouton « Claude », sur chaque page (étape 9) : il ouvre le fil des retours de la page. Adrien y
// écrit ce qu'il veut changer, sans quitter la page ; Claude lit le retour par le connecteur et
// répond dans le même fil (ses réponses sont les commentaires du retour). « Continuer dans Claude »
// copie un message tout prêt et ouvre Claude, pour la discussion en direct.
import { useEffect, useState, type FormEvent } from 'react';
import { api, type Commentaire, type Element } from './api';
import type { Vue } from './chemins';
import { dateLisible } from './relations-detail';
import {
  ADRESSE_CLAUDE_PAR_DEFAUT, adresseClaude, adresseValide, CLE_PAGE, messagePourClaude, NOMS_VUES, ouverts,
  retourACreer, TYPE_RETOUR, type Contexte,
} from './retours';

const CLE_ADRESSE = 'crazybrain:adresse-claude';

function lireReglage(): string | null {
  try { return localStorage.getItem(CLE_ADRESSE); } catch { return null; }
}

interface Proprietes {
  readonly contexte: Contexte;
  /** Les retours de cette page, du plus ancien au plus récent. */
  readonly retours: readonly Element[];
  /** Relit les éléments (après un retour envoyé ou fermé). */
  readonly recharger: () => Promise<void>;
}

export function FilClaude({ contexte, retours, recharger }: Proprietes) {
  const [ouvert, setOuvert] = useState(false);
  const nombre = ouverts(retours);
  return (
    <>
      <button type="button" id="bouton-claude" className="bouton-claude" aria-expanded={ouvert}
        aria-label={`Claude : retours sur cette page${nombre > 0 ? `, ${nombre} ouverts` : ''}`} onClick={() => setOuvert(!ouvert)}>
        Claude{nombre > 0 && <span className="pastille" aria-hidden="true">{nombre}</span>}
      </button>
      {ouvert && <Fil contexte={contexte} retours={retours} recharger={recharger} fermer={() => setOuvert(false)} />}
    </>
  );
}

function Fil({ contexte, retours, recharger, fermer }: Proprietes & { fermer: () => void }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [reponses, setReponses] = useState<ReadonlyMap<string, readonly Commentaire[]>>(new Map());
  const [reglage, setReglage] = useState<string | null>(lireReglage);
  // Relu quand l'appli revient au premier plan : Claude a pu répondre pendant ce temps.
  const [tour, setTour] = useState(0);
  useEffect(() => {
    const auRetour = (): void => { if (document.visibilityState === 'visible') setTour((t) => t + 1); };
    document.addEventListener('visibilitychange', auRetour);
    return () => document.removeEventListener('visibilitychange', auRetour);
  }, []);
  const cles = retours.map((r) => `${r.id}@${r.modifieLe}`).join(',');

  // Les réponses de chaque retour : ses commentaires, relus quand un retour change.
  useEffect(() => {
    let actif = true;
    void Promise.all(retours.map(async (r) => [r.id, (await api.lire(r.id)).commentaires] as const)).then(
      (lus) => { if (actif) setReponses(new Map(lus)); },
      () => { /* sans les réponses, le fil montre au moins les retours */ },
    );
    return () => { actif = false; };
  }, [cles, tour]);

  const relireReponses = async (id: string): Promise<void> => {
    const { commentaires } = await api.lire(id);
    setReponses((m) => new Map(m).set(id, commentaires));
  };

  async function envoyer(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    const retour = retourACreer(texte, contexte);
    if (!retour) return;
    setEnvoi(true);
    try {
      const cree = await api.creer({ ...retour, type: TYPE_RETOUR });
      await api.tagger(cree.id, `${CLE_PAGE}:${contexte.vue}`);
      setTexte('');
      setAvis({ texte: 'Retour gardé. Claude le lira quand tu lui diras « traite les retours », ou tout de suite avec « Continuer dans Claude ».' });
      await recharger();
    } catch (e) {
      setAvis({ texte: e instanceof Error ? e.message : String(e), erreur: true });
    } finally {
      setEnvoi(false);
    }
  }

  async function continuer(retour: Element): Promise<void> {
    const message = messagePourClaude(retour, contexte.vue);
    try {
      await navigator.clipboard.writeText(message);
      setAvis({ texte: 'Message copié : colle-le dans Claude s’il n’y est pas déjà.' });
    } catch {
      setAvis({ texte: `À coller dans Claude : ${message}` });
    }
    window.open(adresseClaude(reglage, message), '_blank', 'noopener');
  }

  async function regle(retour: Element): Promise<void> {
    try {
      await api.modifier(retour.id, { statut: 'fait' });
      await recharger();
    } catch (e) {
      setAvis({ texte: e instanceof Error ? e.message : String(e), erreur: true });
    }
  }

  const enCours = retours.filter((r) => r.statut !== 'fait');
  const faits = retours.filter((r) => r.statut === 'fait');

  return (
    <aside id="fil-claude" className="fil-claude" role="dialog" aria-label="Discuter avec Claude">
      <header>
        <h2>Claude · page {NOMS_VUES[contexte.vue]}</h2>
        <button type="button" className="fermer" aria-label="Fermer le fil" onClick={fermer}>✕</button>
      </header>
      <div className="defile">
        {enCours.length === 0 && faits.length === 0 && (
          <p className="vide-doux">Aucun retour sur cette page. Écris ce qui ne va pas, ce que tu voudrais : Claude le lira et répondra ici.</p>
        )}
        <ol className="retours">
          {enCours.map((r) => (
            <Retour key={r.id} retour={r} reponses={reponses.get(r.id) ?? []} continuer={() => void continuer(r)}
              regle={() => void regle(r)} repondu={() => void relireReponses(r.id)} signaler={setAvis} />
          ))}
        </ol>
        {faits.length > 0 && (
          <details className="retours-faits">
            <summary>{faits.length} réglé{faits.length > 1 ? 's' : ''}</summary>
            <ol className="retours">
              {faits.map((r) => <Retour key={r.id} retour={r} reponses={reponses.get(r.id) ?? []} />)}
            </ol>
          </details>
        )}
      </div>
      {avis && <p className={avis.erreur ? 'etat erreur' : 'etat'} role="status">{avis.texte}</p>}
      <form className="nouveau-retour" onSubmit={(e) => void envoyer(e)}>
        <textarea aria-label="Ton retour sur cette page" rows={3} placeholder="Ce qui ne va pas, ce que tu voudrais sur cette page…"
          value={texte} disabled={envoi} onChange={(e) => setTexte(e.target.value)} />
        <button type="submit" disabled={envoi || texte.trim() === ''}>Envoyer</button>
      </form>
      <details className="reglage-claude">
        <summary>Où ouvrir Claude</summary>
        <ReglageAdresse reglage={reglage} changer={setReglage} />
      </details>
    </aside>
  );
}

/** Le texte d'Adrien, sans le contexte ajouté pour Claude (après « --- »). */
const sansContexte = (description: string | null): string => (description ?? '').split('\n\n---\n')[0] ?? '';

function Retour({ retour, reponses, continuer, regle, repondu, signaler }: {
  retour: Element;
  reponses: readonly Commentaire[];
  continuer?: () => void;
  regle?: () => void;
  repondu?: () => void;
  signaler?: (avis: { texte: string; erreur?: boolean }) => void;
}) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const claudeARepondu = reponses.some((c) => c.auteur === 'claude');

  async function repondre(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    if (texte.trim() === '') return;
    setEnvoi(true);
    try {
      await api.commenter(retour.id, texte);
      setTexte('');
      repondu?.();
    } catch (e) {
      signaler?.({ texte: e instanceof Error ? e.message : String(e), erreur: true });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <li className="retour" data-id={retour.id}>
      <div className="bulle adrien">
        <div className="entete">Adrien · {dateLisible(retour.creeLe)}</div>
        <div className="texte">{sansContexte(retour.description) || retour.titre}</div>
      </div>
      {reponses.map((c) => (
        <div key={c.id} className={`bulle ${c.auteur}`}>
          <div className="entete">{c.auteur === 'claude' ? 'Claude' : 'Adrien'} · {dateLisible(c.creeLe)}</div>
          <div className="texte">{c.texte}</div>
        </div>
      ))}
      {retour.statut !== 'fait' && (
        <>
          <p className="attente">{claudeARepondu ? 'Claude a répondu.' : retour.statut === 'en_cours' ? 'Claude y travaille.' : 'En attente de Claude.'}</p>
          <form className="repondre" onSubmit={(e) => void repondre(e)}>
            <input aria-label={`Répondre à « ${retour.titre} »`} placeholder="Répondre…" value={texte} disabled={envoi}
              onChange={(e) => setTexte(e.target.value)} />
            <button type="submit" disabled={envoi || texte.trim() === ''}>Répondre</button>
          </form>
          <div className="actions">
            <button type="button" onClick={continuer}>Continuer dans Claude</button>
            <button type="button" onClick={regle}>C’est réglé</button>
          </div>
        </>
      )}
    </li>
  );
}

function ReglageAdresse({ reglage, changer }: { reglage: string | null; changer: (r: string | null) => void }) {
  const [texte, setTexte] = useState(reglage ?? '');
  const [avis, setAvis] = useState('');
  const garder = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const valide = texte.trim() === '' ? null : adresseValide(texte);
    if (texte.trim() !== '' && !valide) { setAvis('Une adresse https://… s’il te plaît.'); return; }
    try {
      if (valide) localStorage.setItem(CLE_ADRESSE, valide); else localStorage.removeItem(CLE_ADRESSE);
    } catch { /* sans mémoire, valable pour cette page */ }
    changer(valide);
    setAvis(valide ? 'Gardé sur cet appareil.' : 'Retour à une nouvelle conversation claude.ai.');
  };
  return (
    <form className="ajout colonne" onSubmit={garder}>
      <p className="vide-doux">Par défaut, une nouvelle conversation claude.ai ({ADRESSE_CLAUDE_PAR_DEFAUT}), avec le message déjà écrit. Tu peux mettre à la place l’adresse du chat de ton projet Claude « crazybrain » : le message copié s’y colle.</p>
      <input type="url" aria-label="Adresse où ouvrir Claude" placeholder={ADRESSE_CLAUDE_PAR_DEFAUT} value={texte}
        onChange={(e) => setTexte(e.target.value)} />
      <button type="submit">Garder</button>
      {avis && <p className="etat" role="status">{avis}</p>}
    </form>
  );
}

// Le panneau de détail d'un élément : tous ses champs, modifiables (c'est le formulaire complet).
// À droite de la liste sur un grand écran, en plein écran sur le téléphone. Son adresse est
// /e/<id> : on peut la garder, la partager (derrière Access), y revenir.
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { api, type Element, type ElementComplet, type TypeElement } from './api';
import { brouillonDe, changementsDepuis, parentsPossibles, type Brouillon } from './formulaire';
import { dateLisible, RelationsDetail } from './relations-detail';

interface Proprietes {
  readonly id: string;
  /** Les éléments de la liste, pour choisir un parent. */
  readonly elements: readonly Element[];
  readonly fermer: () => void;
  /** Prévient la liste qu'un élément a changé. */
  readonly modifie: () => void;
}

const STATUTS: readonly [string, string][] = [['a_faire', 'À faire'], ['en_cours', 'En cours'], ['fait', 'Fait']];
const PRIORITES: readonly [string, string][] = [['', 'Pas décidée'], ['basse', 'Basse'], ['normale', 'Normale'], ['haute', 'Haute'], ['urgente', 'Urgente']];

type Etat =
  | { readonly sorte: 'chargement' }
  | { readonly sorte: 'introuvable'; readonly message: string }
  | { readonly sorte: 'pret'; readonly complet: ElementComplet };

export function PanneauDetail({ id, elements, fermer, modifie }: Proprietes) {
  const [etat, setEtat] = useState<Etat>({ sorte: 'chargement' });
  const [types, setTypes] = useState<TypeElement[]>([]);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let actif = true; // une réponse arrivée après un changement d'élément est ignorée
    setEtat({ sorte: 'chargement' });
    setMessage(null);
    api.lire(id).then(
      (complet) => { if (actif) { setEtat({ sorte: 'pret', complet }); setBrouillon(brouillonDe(complet.element)); } },
      (e: unknown) => { if (actif) setEtat({ sorte: 'introuvable', message: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { actif = false; };
  }, [id]);

  // Relit l'élément (après un lien ou un commentaire) sans toucher au formulaire en cours de saisie.
  const relire = async (): Promise<void> => {
    const complet = await api.lire(id);
    setEtat({ sorte: 'pret', complet });
  };

  useEffect(() => {
    api.types().then(setTypes, () => setTypes([]));
  }, []);

  // Échap ferme le panneau, sauf s'il a déjà servi ailleurs (annuler la correction d'un titre).
  useEffect(() => {
    const touche = (e: KeyboardEvent): void => { if (e.key === 'Escape' && !e.defaultPrevented) fermer(); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [fermer]);

  async function enregistrer(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    if (etat.sorte !== 'pret' || !brouillon) return;
    const changements = changementsDepuis(etat.complet.element, brouillon);
    if (typeof changements === 'string') { setMessage({ texte: changements, erreur: true }); return; }
    if (Object.keys(changements).length === 0) { setMessage({ texte: 'Rien à enregistrer.', erreur: false }); return; }
    setEnvoi(true);
    try {
      const element = await api.modifier(id, changements);
      setEtat({ sorte: 'pret', complet: { ...etat.complet, element } });
      setBrouillon(brouillonDe(element));
      setMessage({ texte: 'Enregistré.', erreur: false });
      modifie();
    } catch (e) {
      setMessage({ texte: e instanceof Error ? e.message : String(e), erreur: true });
    } finally {
      setEnvoi(false);
    }
  }

  const champ = <K extends keyof Brouillon>(cle: K) => ({
    value: brouillon?.[cle] ?? '',
    onChange: (e: { target: { value: string } }) => {
      setBrouillon((b) => (b ? { ...b, [cle]: e.target.value } : b));
      setMessage(null);
    },
  });

  let contenu: ReactNode;
  if (etat.sorte === 'chargement' || (etat.sorte === 'pret' && !brouillon)) {
    contenu = <p className="etat">Chargement…</p>;
  } else if (etat.sorte === 'introuvable') {
    contenu = <p className="etat erreur" role="alert">{etat.message}</p>;
  } else {
    const element = etat.complet.element;
    const parents = parentsPossibles(element.id, elements);
    // Le parent actuel peut manquer de la liste (archivé, ou pas encore chargé) : on le garde choisi.
    const parentInconnu = element.parent !== null && !parents.some((p) => p.id === element.parent);
    contenu = (
      <>
      <form onSubmit={(e) => void enregistrer(e)} className="formulaire">
        <Champ libelle="Titre">{(id) => <input id={id} maxLength={200} required {...champ('titre')} />}</Champ>
        <div className="rangee">
          <Champ libelle="Statut">{(id) => (
            <select id={id} {...champ('statut')}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          )}</Champ>
          <Champ libelle="Type">{(id) => (
            <select id={id} {...champ('type')}>
              {(types.length ? types : [{ code: element.type, libelle: element.type }]).map((t) =>
                <option key={t.code} value={t.code}>{t.libelle}</option>)}
            </select>
          )}</Champ>
          <Champ libelle="Priorité">{(id) => (
            <select id={id} {...champ('priorite')}>{PRIORITES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          )}</Champ>
        </div>
        <Champ libelle="Contenu dans">{(id) => (
          <select id={id} {...champ('parent')}>
            <option value="">Rien (à la racine)</option>
            {parentInconnu && <option value={element.parent ?? ''}>Élément {element.parent}</option>}
            {parents.map((p) => <option key={p.id} value={p.id}>{p.type === 'tache' ? p.titre : `${p.titre} (${p.type})`}</option>)}
          </select>
        )}</Champ>
        <Champ libelle="Description">{(id) => (
          <textarea id={id} rows={5} placeholder="Notes, liens, étapes… (Markdown)" {...champ('description')} />
        )}</Champ>
        <div className="rangee">
          <Champ libelle="Échéance">{(id) => <input id={id} type="date" {...champ('echeance')} />}</Champ>
          <Champ libelle="Prévu le">{(id) => <input id={id} type="date" {...champ('jourPlanifie')} />}</Champ>
          <Champ libelle="À">{(id) => <input id={id} type="time" {...champ('heurePlanifiee')} />}</Champ>
        </div>
        <Champ libelle="Estimation (minutes)">{(id) => (
          <input id={id} type="number" inputMode="numeric" min={1} step={1} {...champ('estimation')} />
        )}</Champ>
        <div className="actions">
          <button type="submit" className="principal" disabled={envoi}>Enregistrer</button>
          {message && <span className={message.erreur ? 'etat erreur' : 'etat'} role="status">{message.texte}</span>}
        </div>
        <p className="dates">
          Créé le {dateLisible(element.creeLe)} · modifié le {dateLisible(element.modifieLe)}
          {element.faitLe && <> · fait le {dateLisible(element.faitLe)}</>}
        </p>
      </form>
      <RelationsDetail id={element.id} liens={etat.complet.liens} commentaires={etat.complet.commentaires}
        elements={elements} relire={relire} />
      </>
    );
  }

  return (
    <aside className="panneau" aria-label="Détail de l'élément">
      <header>
        <h2>{etat.sorte === 'pret' ? etat.complet.element.titre : 'Détail'}</h2>
        <button type="button" className="fermer" aria-label="Fermer le détail" onClick={fermer}>×</button>
      </header>
      {contenu}
    </aside>
  );
}

/**
 * Un champ et son nom au-dessus, reliés par un id (le nom sert aux lecteurs d'écran et aux tests).
 * `children` reçoit cet id, à poser sur le champ.
 */
function Champ({ libelle, children }: { libelle: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className="champ"><label htmlFor={id}>{libelle}</label>{children(id)}</div>;
}

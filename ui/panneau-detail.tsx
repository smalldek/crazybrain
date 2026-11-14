// Le panneau de détail d'un élément : tous ses champs, modifiables (c'est le formulaire complet).
// À droite de la liste sur un grand écran, en plein écran sur le téléphone. Son adresse est
// /e/<id> : on peut la garder, la partager (derrière Access), y revenir.
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { avancementsCalcules } from '../src/domaine/cercles';
import { libelleHorizon } from './horizons';
import { api, type Element, type ElementComplet, type Tag, type TypeElement } from './api';
import { TYPE_RETOUR } from './retours';
import { brouillonDe, changementsDepuis, parentsPossibles, type Brouillon } from './formulaire';
import { contenuAPartager } from './partage';
import { dateLisible, RelationsDetail } from './relations-detail';

interface Proprietes {
  readonly id: string;
  /** Les éléments de la liste, pour choisir un parent. */
  readonly elements: readonly Element[];
  /** Tous les tags posés, pour la complétion. */
  readonly tousLesTags: readonly Tag[];
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

export function PanneauDetail({ id, elements, tousLesTags, fermer, modifie }: Proprietes) {
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
    modifie();
  };

  // Ranger dans un projet (taper projet:<nom> dans les tags) change le parent : le formulaire le suit,
  // sinon « Enregistrer » remettrait l'ancien.
  const ranger = async (projet: string): Promise<void> => {
    await api.modifier(id, { parent: projet });
    setBrouillon((b) => (b ? { ...b, parent: projet } : b));
  };

  useEffect(() => {
    api.types().then((t) => setTypes(t.filter((x) => x.code !== TYPE_RETOUR)), () => setTypes([]));
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
    // Un élément qui a des enfants : son avancement se calcule (vue en cercles), il ne se saisit pas.
    const aDesEnfants = elements.some((e) => e.parent === element.id);
    const calcule = aDesEnfants ? Math.round(avancementsCalcules(elements).get(element.id) ?? 0) : null;
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
        <Champ libelle="Rappel sur le téléphone">{(id) => <input id={id} type="datetime-local" {...champ('rappel')} />}</Champ>
        <Champ libelle="Se répète">{(id) => (
          <input id={id} list="recurrences" placeholder="chaque lundi, le 1er du mois, 3 mois après fait…" {...champ('recurrence')} />
        )}</Champ>
        <datalist id="recurrences">
          {['chaque jour', 'chaque lundi', 'chaque semaine', 'le 1er du mois', 'chaque mois', 'chaque année', '3 mois après fait', '1 an après fait'].map((r) => <option key={r} value={r} />)}
        </datalist>
        <Champ libelle="Horizon">{(id) => (
          <input id={id} list="horizons" placeholder="semaine 46, novembre, T1 2027, 2027, un jour…" {...champ('horizon')} />
        )}</Champ>
        {element.horizon && <p className="aide">Horizon : {libelleHorizon(element.horizon)}</p>}
        <datalist id="horizons">
          {['cette semaine', 'la semaine prochaine', 'ce mois', 'le mois prochain', 'ce trimestre', 'cette année', "l'an prochain", 'cette décennie', 'un jour'].map((h) => <option key={h} value={h} />)}
        </datalist>
        <div className="rangee">
          <Champ libelle="Estimation (minutes)">{(id) => (
            <input id={id} type="number" inputMode="numeric" min={1} step={1} {...champ('estimation')} />
          )}</Champ>
          <Champ libelle="Poids">{(id) => (
            <input id={id} type="number" inputMode="decimal" min={0} step="any" placeholder="1" {...champ('poids')} />
          )}</Champ>
          {calcule === null ? (
            <Champ libelle="Avancement (%)">{(id) => (
              <input id={id} type="number" inputMode="numeric" min={0} max={100} step={1} placeholder="0" {...champ('avancement')} />
            )}</Champ>
          ) : (
            <Champ libelle="Avancement (calculé)">{(id) => (
              <output id={id} className="calcule" title="Calculé à partir de ses sous-éléments, pondérés par leur poids">{calcule} %</output>
            )}</Champ>
          )}
        </div>
        <div className="actions">
          <button type="submit" className="principal" disabled={envoi}>Enregistrer</button>
          <button type="button" onClick={() => void partager(element)}>Partager</button>
          {message && <span className={message.erreur ? 'etat erreur' : 'etat'} role="status">{message.texte}</span>}
        </div>
        <p className="dates">
          Créé le {dateLisible(element.creeLe)} · modifié le {dateLisible(element.modifieLe)}
          {element.faitLe && <> · fait le {dateLisible(element.faitLe)}</>}
        </p>
      </form>
      <RelationsDetail id={element.id} liens={etat.complet.liens} commentaires={etat.complet.commentaires}
        tags={etat.complet.tags} tousLesTags={tousLesTags} elements={elements} relire={relire} ranger={ranger} />
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
 * Envoie la tâche à une autre appli par le menu de partage d'Android (tâche 5.3). Sans ce menu
 * (ordinateur sans partage), le texte est copié. Fermer le menu sans choisir n'est pas une erreur.
 */
async function partager(e: Element): Promise<void> {
  const contenu = contenuAPartager(e, window.location.origin);
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(contenu);
    } catch (erreur) {
      if (!(erreur instanceof DOMException && erreur.name === 'AbortError')) window.alert('Le partage a échoué.');
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${contenu.text}\n${contenu.url}`);
    window.alert('Copié : à coller où tu veux.');
  } catch {
    window.alert('Ce navigateur ne sait ni partager ni copier.');
  }
}

/**
 * Un champ et son nom au-dessus, reliés par un id (le nom sert aux lecteurs d'écran et aux tests).
 * `children` reçoit cet id, à poser sur le champ.
 */
function Champ({ libelle, children }: { libelle: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className="champ"><label htmlFor={id}>{libelle}</label>{children(id)}</div>;
}

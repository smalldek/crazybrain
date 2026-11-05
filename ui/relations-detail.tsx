// Sous le formulaire du panneau de détail : les tags de l'élément, ses liens, puis ses commentaires.
// Chaque ajout ou retrait part tout de suite au serveur, puis le panneau relit l'élément.
import { useId, useState, type FormEvent } from 'react';
import { adresseIci, naviguer } from './adresse';
import { api, type Commentaire, type Element, type Lien, type Tag } from './api';
import { liensVusDe, TYPES_LIEN } from './relations';
import { lireSaisie, projetDe, suggestions, texteTag } from './tags';

interface Proprietes {
  readonly id: string;
  readonly liens: readonly Lien[];
  readonly commentaires: readonly Commentaire[];
  readonly tags: readonly Tag[];
  /** Tous les tags posés, pour la complétion. */
  readonly tousLesTags: readonly Tag[];
  readonly elements: readonly Element[];
  /** Relit l'élément (et la liste) après un changement. */
  readonly relire: () => Promise<void>;
  /** Range l'élément dans un projet (change son parent, formulaire compris). */
  readonly ranger: (projet: string) => Promise<void>;
}

export function RelationsDetail({ id, liens, commentaires, tags, tousLesTags, elements, relire, ranger }: Proprietes) {
  const [erreur, setErreur] = useState<string | null>(null);

  /** Lance un appel ; en cas de refus, le message du serveur s'affiche. Rend vrai si l'appel a réussi. */
  async function essayer(appel: () => Promise<unknown>): Promise<boolean> {
    try {
      await appel();
      setErreur(null);
      await relire();
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  return (
    <>
      {erreur && <p className="etat erreur" role="alert">{erreur}</p>}
      <Tags id={id} tags={tags} tousLesTags={tousLesTags} elements={elements} essayer={essayer} ranger={ranger}
        signaler={setErreur} />
      <Liens id={id} liens={liens} elements={elements} essayer={essayer} />
      <Commentaires id={id} commentaires={commentaires} essayer={essayer} />
    </>
  );
}

type Essayer = (appel: () => Promise<unknown>) => Promise<boolean>;

interface ProprietesTags {
  readonly id: string;
  readonly tags: readonly Tag[];
  readonly tousLesTags: readonly Tag[];
  readonly elements: readonly Element[];
  readonly essayer: Essayer;
  readonly ranger: (projet: string) => Promise<void>;
  readonly signaler: (message: string) => void;
}

/**
 * Les tags : chacun avec sa croix ; un champ avec complétion (les tags déjà utilisés ailleurs) pour
 * en poser un. Taper `projet:<nom>` range l'élément dans ce projet, qui s'affiche alors en tête,
 * comme un tag qui mène au projet.
 */
function Tags({ id, tags, tousLesTags, elements, essayer, ranger, signaler }: ProprietesTags) {
  const [saisie, setSaisie] = useState('');
  const idListe = useId();
  const textes = tags.map(texteTag);
  const projet = projetDe(id, elements);

  async function poser(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    const lu = lireSaisie(saisie, elements);
    if (lu.sorte === 'erreur') { signaler(lu.message); return; }
    if (lu.sorte === 'projet') {
      if (await essayer(() => ranger(lu.projet.id))) setSaisie('');
      return;
    }
    if (await essayer(() => api.tagger(id, lu.texte))) setSaisie('');
  }

  return (
    <section className="bloc" aria-label="Tags">
      <h3>Tags</h3>
      <ul className="tags">
        {projet && (
          <li className="tag tag-projet">
            <a href={adresseIci(projet.id)} onClick={(e) => { e.preventDefault(); naviguer(adresseIci(projet.id)); }}>projet:{projet.titre}</a>
          </li>
        )}
        {textes.map((t) => (
          <li key={t} className="tag">
            <span>{t}</span>
            <button type="button" aria-label={`Retirer le tag ${t}`} onClick={() => void essayer(() => api.detagger(id, t))}>×</button>
          </li>
        ))}
        {!projet && textes.length === 0 && <li className="vide-doux">Aucun tag.</li>}
      </ul>
      <form className="ajout" onSubmit={(e) => void poser(e)}>
        <input aria-label="Nouveau tag" list={idListe} placeholder="composant:pxe, release:v1, projet:…" value={saisie}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => setSaisie(e.target.value)} />
        <datalist id={idListe}>
          {suggestions(tousLesTags, textes, elements).map((t) => <option key={t} value={t} />)}
        </datalist>
        <button type="submit" disabled={saisie.trim() === ''}>Poser</button>
      </form>
    </section>
  );
}

function Liens({ id, liens, elements, essayer }: { id: string; liens: readonly Lien[]; elements: readonly Element[]; essayer: Essayer }) {
  const [type, setType] = useState('lie_a');
  const [cible, setCible] = useState('');
  const vus = liensVusDe(id, liens, elements);
  const cibles = elements.filter((e) => e.id !== id).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));

  async function lier(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    if (cible === '') return;
    if (await essayer(() => api.lier(id, cible, type))) setCible('');
  }

  return (
    <section className="bloc" aria-label="Liens">
      <h3>Liens</h3>
      {vus.length === 0 ? <p className="vide-doux">Aucun lien.</p> : (
        <ul className="relations">
          {vus.map((l) => (
            <li key={l.id}>
              <span className="sorte">{l.libelle}</span>
              {l.titreAutre === null
                ? <span className="doux">un élément supprimé</span>
                : <a href={adresseIci(l.autre)} onClick={(e) => { e.preventDefault(); naviguer(adresseIci(l.autre)); }}>{l.titreAutre}</a>}
              <button type="button" className="retirer" aria-label={`Retirer le lien « ${l.libelle} ${l.titreAutre ?? ''} »`}
                onClick={() => void essayer(() => api.delier(l.id))}>×</button>
            </li>
          ))}
        </ul>
      )}
      <form className="ajout" onSubmit={(e) => void lier(e)}>
        <select aria-label="Sorte de lien" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES_LIEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Élément à lier" value={cible} onChange={(e) => setCible(e.target.value)}>
          <option value="">Choisir…</option>
          {cibles.map((e) => <option key={e.id} value={e.id}>{e.titre}</option>)}
        </select>
        <button type="submit" disabled={cible === ''}>Lier</button>
      </form>
    </section>
  );
}

function Commentaires({ id, commentaires, essayer }: { id: string; commentaires: readonly Commentaire[]; essayer: Essayer }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function commenter(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    if (texte.trim() === '') return;
    setEnvoi(true);
    if (await essayer(() => api.commenter(id, texte))) setTexte('');
    setEnvoi(false);
  }

  return (
    <section className="bloc" aria-label="Commentaires">
      <h3>Commentaires</h3>
      {commentaires.length === 0 ? <p className="vide-doux">Aucun commentaire.</p> : (
        <ol className="commentaires">
          {commentaires.map((c) => (
            <li key={c.id}>
              <div className="entete">{c.auteur === 'claude' ? 'Claude' : 'Adrien'} · {dateLisible(c.creeLe)}</div>
              <div className="texte">{c.texte}</div>
            </li>
          ))}
        </ol>
      )}
      <form className="ajout colonne" onSubmit={(e) => void commenter(e)}>
        <textarea aria-label="Nouveau commentaire" rows={3} placeholder="Écrire un commentaire…" value={texte}
          onChange={(e) => setTexte(e.target.value)} />
        <button type="submit" disabled={envoi || texte.trim() === ''}>Commenter</button>
      </form>
    </section>
  );
}

export function dateLisible(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' });
}

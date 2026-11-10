// La barre des filtres, au-dessus de chaque vue : un champ de recherche toujours là, et un bouton
// « Filtres (n) » qui montre ou cache les autres critères. Tout est dans l'adresse : la barre lit
// les filtres dans l'adresse et les y écrit (les règles sont dans filtres.ts).
import { useEffect, useId, useState } from 'react';
import { api, type Element, type Requete, type Tag, type TypeElement } from './api';
import { avecFiltre, CLES_FILTRES, nombreDeFiltres, type Filtres } from './filtres';
import { texteTag } from './tags';

interface Proprietes {
  readonly filtres: Filtres;
  readonly elements: readonly Element[];
  readonly tags: readonly Tag[];
  /** Les nouveaux paramètres de l'adresse ; l'appelant y va. */
  readonly changer: (parametres: URLSearchParams) => void;
}

type CleFiltre = (typeof CLES_FILTRES)[number];

const STATUTS = [['a_faire', 'À faire'], ['en_cours', 'En cours'], ['fait', 'Fait']] as const;
const PRIORITES = [['urgente', 'Urgente'], ['haute', 'Haute'], ['normale', 'Normale'], ['basse', 'Basse'], ['aucune', 'Sans priorité']] as const;
const ECHEANCES = [['en_retard', 'En retard'], ['semaine', 'D’ici 7 jours'], ['sans', 'Sans échéance']] as const;
const TRIS = [['modifie', 'Modifié récemment']] as const;

export function BarreFiltres({ filtres, elements, tags, changer }: Proprietes) {
  const nombre = nombreDeFiltres(filtres);
  const [ouverte, setOuverte] = useState(nombre > 0);
  const [types, setTypes] = useState<TypeElement[]>([]);
  const [requetes, setRequetes] = useState<Requete[]>([]);
  // Le texte tapé s'écrit dans l'adresse à chaque lettre, mais sans attendre l'adresse pour s'afficher.
  const [texte, setTexte] = useState(filtres.texte ?? '');
  useEffect(() => { setTexte(filtres.texte ?? ''); }, [filtres.texte]);
  useEffect(() => { api.types().then(setTypes, () => setTypes([])); }, []);
  useEffect(() => { api.requetes().then(setRequetes, () => setRequetes([])); }, []);
  const id = useId();

  const poser = (cle: CleFiltre, valeur: string | null): void =>
    changer(avecFiltre(new URLSearchParams(window.location.search), cle, valeur));
  const toutEffacer = (): void => {
    let p = new URLSearchParams(window.location.search);
    for (const cle of CLES_FILTRES) p = avecFiltre(p, cle, null);
    changer(p);
    setTexte('');
  };

  // « Dans » : les éléments qui en contiennent d'autres, les projets d'abord.
  const parents = new Set(elements.map((e) => e.parent).filter((p): p is string => p !== null));
  const conteneurs = elements.filter((e) => parents.has(e.id))
    .sort((a, b) => Number(b.type === 'projet') - Number(a.type === 'projet') || a.titre.localeCompare(b.titre, 'fr'));
  const textesTags = [...new Set(tags.flatMap((t) => [t.cle, texteTag(t)]))].sort((a, b) => a.localeCompare(b, 'fr'));

  const choix = (cle: CleFiltre, libelle: string, options: readonly (readonly [string, string])[], aucun = 'Tous') => (
    <div className="champ">
      <label htmlFor={`${id}-${cle}`}>{libelle}</label>
      <select id={`${id}-${cle}`} value={filtres[cle] ?? ''} onChange={(e) => poser(cle, e.target.value || null)}>
        <option value="">{aucun}</option>
        {/* Une valeur de l'adresse que la liste ne connaît pas reste visible, pour pouvoir l'enlever. */}
        {filtres[cle] && !options.some(([v]) => v === filtres[cle]) && <option value={filtres[cle]}>{filtres[cle]}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <section className="filtres" aria-label="Filtres">
      <div className="ligne-filtres">
        <input type="search" aria-label="Chercher" placeholder="Chercher…" value={texte}
          onChange={(e) => { setTexte(e.target.value); poser('texte', e.target.value); }} />
        <button type="button" className="bouton-filtres" aria-expanded={ouverte} onClick={() => setOuverte(!ouverte)}>
          Filtres{nombre > 0 ? ` (${nombre})` : ''}
        </button>
      </div>
      {ouverte && (
        <div className="criteres">
          {choix('type', 'Type', types.map((t) => [t.code, t.libelle] as const))}
          {choix('statut', 'Statut', STATUTS)}
          {choix('priorite', 'Priorité', PRIORITES)}
          {choix('dans', 'Dans', conteneurs.map((e) => [e.id, e.titre] as const))}
          {choix('echeance', 'Échéance', ECHEANCES)}
          {/* Les requêtes que Claude a enregistrées (tâche 4.3) : seulement s'il y en a. */}
          {(requetes.length > 0 || filtres.requete) && choix('requete', 'Requête de Claude', requetes.map((r) => [r.id, r.nom] as const))}
          {choix('tri', 'Ordre (liste et backlog)', TRIS, 'Habituel')}
          <div className="champ">
            <label htmlFor={`${id}-tag`}>Tag (clé ou clé:valeur)</label>
            <input id={`${id}-tag`} list={`${id}-tags`} defaultValue={filtres.tag ?? ''} key={filtres.tag ?? ''}
              placeholder="composant:pxe" enterKeyHint="done"
              onBlur={(e) => poser('tag', e.target.value.trim() || null)}
              onKeyDown={(e) => { if (e.key === 'Enter') poser('tag', e.currentTarget.value.trim() || null); }} />
            <datalist id={`${id}-tags`}>{textesTags.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          {nombre > 0 && <button type="button" className="effacer" onClick={toutEffacer}>Effacer les filtres</button>}
        </div>
      )}
    </section>
  );
}

// La vue horizons (/horizons, tâche 7.2), à la Timestripe : une colonne par échelle, du jour à « un
// jour », chacune sur sa période en cours. ‹ et › d'une colonne changent sa période (gardée dans
// l'adresse : ?decalages=semaine:1). On ajoute un élément directement dans une colonne : il prend
// l'horizon de sa période. En bas, ce qui a dépassé son horizon sans être fait.
import { useState, type FormEvent } from 'react';
import type { Echelle } from '../src/domaine/horizon';
import { naviguer } from './adresse';
import type { Changements, Element } from './api';
import { colonnes, depasses, ecrireDecalages, libelleHorizon, lireDecalages, NOMS_ECHELLES, type Colonne } from './horizons';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly aujourdhui: string;
  readonly parametres: URLSearchParams;
  readonly ouvrir: (id: string) => void;
  readonly creer: (champs: Changements & { titre: string }) => Promise<void>;
}

export function VueHorizons({ elements, aujourdhui, parametres, ouvrir, creer }: Proprietes) {
  const decalages = lireDecalages(parametres.get('decalages'));
  const decaler = (echelle: Echelle, sens: number): void => {
    const p = new URLSearchParams(window.location.search);
    const texte = ecrireDecalages({ ...decalages, [echelle]: (decalages[echelle] ?? 0) + sens });
    if (texte) p.set('decalages', texte); else p.delete('decalages');
    const recherche = p.toString();
    naviguer(`${window.location.pathname}${recherche ? `?${recherche}` : ''}`);
  };
  const enRetard = depasses(elements, aujourdhui);

  return (
    <div id="horizons">
      <div className="colonnes">
        {colonnes(elements, aujourdhui, decalages).map((c) => (
          <ColonneHorizon key={c.echelle} colonne={c} ouvrir={ouvrir} creer={creer} decaler={(sens) => decaler(c.echelle, sens)} />
        ))}
      </div>
      {enRetard.length > 0 && (
        <section aria-labelledby="titre-depasses" className="depasses">
          <h2 id="titre-depasses">Horizon dépassé, pas fait</h2>
          <ul>
            {enRetard.map((e) => (
              <li key={e.id} data-id={e.id}>
                <button type="button" className="lien" onClick={() => ouvrir(e.id)}>{e.titre}</button>
                <small>{libelleHorizon(e.horizon ?? '')}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ColonneHorizon({ colonne: c, ouvrir, creer, decaler }: {
  colonne: Colonne; ouvrir: (id: string) => void; creer: Proprietes['creer']; decaler: (sens: number) => void;
}) {
  const nom = NOMS_ECHELLES[c.echelle];
  const [titre, setTitre] = useState('');
  const ajouter = (ev: FormEvent): void => {
    ev.preventDefault();
    if (titre.trim() === '') return;
    void creer({ titre: titre.trim(), horizon: c.horizon.texte });
    setTitre('');
  };
  return (
    <section className={c.decalage === 0 ? 'colonne en-cours' : 'colonne'} aria-label={nom} data-horizon={c.horizon.texte}>
      <header>
        <h2>{nom}</h2>
        {c.echelle !== 'vie' && (
          <div className="periode">
            <button type="button" aria-label={`${nom} précédent`} onClick={() => decaler(-1)}>‹</button>
            <span className="libelle">{c.horizon.libelle}</span>
            <button type="button" aria-label={`${nom} suivant`} onClick={() => decaler(1)}>›</button>
          </div>
        )}
      </header>
      <ul>
        {c.elements.map((e) => (
          <li key={e.id} className={e.statut === 'fait' ? 'fait' : undefined} data-id={e.id}>
            <button type="button" className="lien" onClick={() => ouvrir(e.id)}>{e.titre}</button>
            {e.type !== 'tache' && <small>{e.type}</small>}
          </li>
        ))}
      </ul>
      <form onSubmit={ajouter}>
        <input aria-label={`Ajouter à ${nom}`} placeholder="+ Ajouter" value={titre} maxLength={200} onChange={(ev) => setTitre(ev.target.value)} />
      </form>
    </section>
  );
}

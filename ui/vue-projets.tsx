// La vue des projets (/projets) : l'arbre des projets et sous-projets, avec leur avancement, puis
// les releases (tags `release:<nom>`). Toucher un projet ouvre son détail ; « Voir » montre son
// contenu dans la liste (le filtre « Dans ») ; une release mène au kanban filtré sur son tag.
import { useState, type FormEvent } from 'react';
import { adresseVue, naviguer } from './adresse';
import type { Element, Tag } from './api';
import { arbreProjets, releases, type Avancement } from './projets';
import { tagsParElement } from './tags';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly tags: readonly Tag[];
  readonly ouvert: string | null;
  readonly ouvrir: (id: string) => void;
  /** Crée un projet de ce titre ; l'appelant relit la liste. */
  readonly creerProjet: (titre: string) => Promise<void>;
}

export function VueProjets({ elements, tags, ouvert, ouvrir, creerProjet }: Proprietes) {
  const lignes = arbreProjets(elements);
  const lesReleases = releases(elements, tagsParElement(tags));
  const [titre, setTitre] = useState('');

  async function ajouter(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (titre.trim() === '') return;
    await creerProjet(titre);
    setTitre('');
  }

  return (
    <div id="projets">
      <section aria-label="Projets">
        <h2>Projets</h2>
        <form onSubmit={(e) => void ajouter(e)} autoComplete="off" className="nouveau-projet">
          <input aria-label="Nouveau projet" placeholder="Nouveau projet…" maxLength={200} enterKeyHint="done"
            value={titre} onChange={(e) => setTitre(e.target.value)} />
        </form>
        {lignes.length === 0 && <p className="etat">Aucun projet pour l’instant.</p>}
        <ul className="arbre">
          {lignes.map(({ projet, profondeur, avancement }) => (
            <li key={projet.id} className={projet.id === ouvert ? 'ouverte' : undefined}
              style={{ marginLeft: `${profondeur * 1.25}rem` }} data-profondeur={profondeur}>
              <button type="button" className="titre" onClick={() => ouvrir(projet.id)}>{projet.titre}</button>
              <Barre avancement={avancement} />
              <a href={`${adresseVue('liste')}?dans=${encodeURIComponent(projet.id)}`} className="voir"
                aria-label={`Voir le contenu de « ${projet.titre} »`}
                onClick={(e) => { e.preventDefault(); naviguer(`${adresseVue('liste')}?dans=${encodeURIComponent(projet.id)}`); }}>Voir</a>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Releases">
        <h2>Releases</h2>
        {lesReleases.length === 0
          ? <p className="etat">Aucune release : poser le tag <code>release:&lt;nom&gt;</code> sur les éléments à livrer ensemble.</p>
          : (
            <ul className="arbre">
              {lesReleases.map(({ nom, avancement }) => {
                const adresse = `${adresseVue('kanban')}?tag=${encodeURIComponent(`release:${nom}`)}`;
                return (
                  <li key={nom}>
                    <a href={adresse} className="titre" onClick={(e) => { e.preventDefault(); naviguer(adresse); }}>{nom}</a>
                    <Barre avancement={avancement} />
                  </li>
                );
              })}
            </ul>
          )}
      </section>
    </div>
  );
}

/** « 2 / 5 » et une barre qui se remplit ; une barre vide quand il n'y a rien dedans. */
function Barre({ avancement: { faits, total } }: { avancement: Avancement }) {
  return (
    <span className="avancement" title={`${faits} fait${faits > 1 ? 's' : ''} sur ${total}`}>
      <span className="compte">{faits} / {total}</span>
      <meter min={0} max={Math.max(total, 1)} value={faits} aria-label={`Avancement : ${faits} sur ${total}`} />
    </span>
  );
}

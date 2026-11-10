// Le mode journée (/journee, tâche 6.2) : le matin, choisir ses tâches du jour dans le backlog.
// En haut, la journée : ce qui est prévu aujourd'hui et le temps que ça représente. Puis ce qui a
// glissé d'un jour passé, à reprendre ou à rendre au backlog. En bas, le backlog, où « Aujourd'hui »
// pose le jour prévu. Retirer une tâche de la journée la rend au backlog.
import type { ReactNode } from 'react';
import type { Changements, Element } from './api';
import { jourLisible } from './calendrier';
import { backlog } from './filtres';
import { duJour, duree, enSouffrance, tempsPrevu } from './journee';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly aujourdhui: string;
  readonly modifier: (id: string, changements: Changements) => void;
  readonly ouvrir: (id: string) => void;
}

export function VueJournee({ elements, aujourdhui, modifier, ouvrir }: Proprietes) {
  const jour = duJour(elements, aujourdhui);
  const glissees = enSouffrance(elements, aujourdhui);
  const choix = backlog(elements);
  const t = tempsPrevu(jour);
  const prendre = (id: string): void => modifier(id, { jourPlanifie: aujourdhui });
  const rendre = (id: string): void => modifier(id, { jourPlanifie: null, heurePlanifiee: null });

  return (
    <div id="journee">
      <section aria-labelledby="titre-jour">
        <h2 id="titre-jour">Aujourd’hui, {jourLisible(aujourdhui)}</h2>
        <p className="temps" aria-label="Temps prévu">
          {t.restantes === 0 ? (jour.length === 0 ? 'Rien de prévu : choisis dans le backlog ci-dessous.' : 'Tout est fait.')
            : <>{t.restantes} à faire · <strong>{duree(t.minutes)}</strong> prévues{t.sansEstimation > 0 && <> ({t.sansEstimation} sans estimation)</>}</>}
        </p>
        <ul className="du-jour">
          {jour.map((e) => (
            <Ligne key={e.id} element={e} ouvrir={ouvrir}>
              <input type="checkbox" aria-label={`Fait : ${e.titre}`} checked={e.statut === 'fait'}
                onChange={() => modifier(e.id, { statut: e.statut === 'fait' ? 'a_faire' : 'fait' })} />
              <button type="button" className="secondaire" aria-label={`Retirer de la journée : ${e.titre}`} onClick={() => rendre(e.id)}>Retirer</button>
            </Ligne>
          ))}
        </ul>
      </section>

      {glissees.length > 0 && (
        <section aria-labelledby="titre-glissees">
          <h2 id="titre-glissees">Prévues avant, pas faites</h2>
          <ul>
            {glissees.map((e) => (
              <Ligne key={e.id} element={e} ouvrir={ouvrir} detail={`prévue ${jourLisible(e.jourPlanifie ?? '')}`}>
                <button type="button" aria-label={`Reprendre aujourd’hui : ${e.titre}`} onClick={() => prendre(e.id)}>Aujourd’hui</button>
                <button type="button" className="secondaire" aria-label={`Rendre au backlog : ${e.titre}`} onClick={() => rendre(e.id)}>Backlog</button>
              </Ligne>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titre-choix">
        <h2 id="titre-choix">Choisir dans le backlog</h2>
        {choix.length === 0 ? <p className="etat">Le backlog est vide.</p> : (
          <ul>
            {choix.map((e) => (
              <Ligne key={e.id} element={e} ouvrir={ouvrir}>
                <button type="button" aria-label={`Prendre aujourd’hui : ${e.titre}`} onClick={() => prendre(e.id)}>+ Aujourd’hui</button>
              </Ligne>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Une tâche : son titre (qui ouvre le détail), ce qui aide à choisir, et ses boutons. */
function Ligne({ element: e, ouvrir, detail, children }: {
  element: Element; ouvrir: (id: string) => void; detail?: string; children: ReactNode;
}) {
  const infos = [
    e.heurePlanifiee, detail, e.estimation !== null ? duree(e.estimation) : null,
    e.priorite === 'urgente' || e.priorite === 'haute' ? e.priorite : null,
    e.echeance ? `échéance ${jourLisible(e.echeance)}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <li className={e.statut === 'fait' ? 'fait' : undefined} data-id={e.id}>
      <span className="texte">
        <button type="button" className="lien" onClick={() => ouvrir(e.id)}>{e.titre}</button>
        {infos && <small>{infos}</small>}
      </span>
      <span className="boutons">{children}</span>
    </li>
  );
}

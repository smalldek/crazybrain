// Le mode journée (/journee, tâche 6.2) : le matin, choisir ses tâches du jour dans le backlog.
// En haut, la journée : ce qui est prévu aujourd'hui et le temps que ça représente. Puis ce qui a
// glissé d'un jour passé, à reprendre ou à rendre au backlog. En bas, le backlog, où « Aujourd'hui »
// pose le jour prévu. Retirer une tâche de la journée la rend au backlog.
// Les créneaux (tâche 6.3) : chaque tâche du jour prend une heure, « Caser à la suite » donne la
// sienne à chacune, et le bilan met le temps prévu face au temps disponible jusqu'à la fin de journée.
import { useEffect, useState, type ReactNode } from 'react';
import type { Changements, Element } from './api';
import { jourLisible } from './calendrier';
import { backlog } from './filtres';
import { bilanDuJour, caserALaSuite, creneaux, disponible, heure, lirePlage, type Plage } from './creneaux';
import { duJour, duree, enSouffrance, tempsPrevu } from './journee';

const CLE_PLAGE = 'crazybrain.plage';

/** L'heure du téléphone, « HH:MM », remise à jour chaque minute. */
function useMaintenant(): string {
  const lire = (): string => heure(new Date().getHours() * 60 + new Date().getMinutes());
  const [maintenant, setMaintenant] = useState(lire);
  useEffect(() => {
    const minuteur = window.setInterval(() => setMaintenant(lire()), 60_000);
    return () => window.clearInterval(minuteur);
  }, []);
  return maintenant;
}

/** La plage de la journée, gardée dans le téléphone (chaque appareil a la sienne). */
function usePlage(): [Plage, (p: Plage) => void] {
  const [plage, setPlage] = useState<Plage>(() => {
    try { return lirePlage(localStorage.getItem(CLE_PLAGE)); } catch { return lirePlage(null); }
  });
  const changer = (p: Plage): void => {
    if (p.debut >= p.fin) return;
    setPlage(p);
    try { localStorage.setItem(CLE_PLAGE, JSON.stringify(p)); } catch { /* sans mémoire, valable pour cette page */ }
  };
  return [plage, changer];
}

interface Proprietes {
  readonly elements: readonly Element[];
  readonly aujourdhui: string;
  readonly modifier: (id: string, changements: Changements) => void;
  readonly modifierPlusieurs: (envois: readonly (readonly [string, Changements])[]) => void;
  readonly ouvrir: (id: string) => void;
}

export function VueJournee({ elements, aujourdhui, modifier, modifierPlusieurs, ouvrir }: Proprietes) {
  const maintenant = useMaintenant();
  const [plage, changerPlage] = usePlage();
  const jour = duJour(elements, aujourdhui);
  const glissees = enSouffrance(elements, aujourdhui);
  const choix = backlog(elements);
  const t = tempsPrevu(jour);
  const bilan = bilanDuJour(t.minutes, disponible(plage, maintenant));
  const parId = new Map(creneaux(jour).map((c) => [c.element.id, c]));
  const aCaser = jour.filter((e) => e.heurePlanifiee === null && e.statut !== 'fait').length;
  const caser = (): void => {
    const heures = caserALaSuite(jour, plage, maintenant);
    if (heures.size > 0) modifierPlusieurs([...heures].map(([id, h]) => [id, { heurePlanifiee: h }] as const));
  };
  const prendre = (id: string): void => modifier(id, { jourPlanifie: aujourdhui });
  const rendre = (id: string): void => modifier(id, { jourPlanifie: null, heurePlanifiee: null });

  return (
    <div id="journee">
      <section aria-labelledby="titre-jour">
        <h2 id="titre-jour">Aujourd’hui, {jourLisible(aujourdhui)}</h2>
        <div className="plage">
          Ma journée de <input type="time" aria-label="Début de journée" value={plage.debut} onChange={(e) => changerPlage({ ...plage, debut: e.target.value })} />
          à <input type="time" aria-label="Fin de journée" value={plage.fin} onChange={(e) => changerPlage({ ...plage, fin: e.target.value })} />
        </div>
        <p className="temps" aria-label="Temps prévu">
          {t.restantes === 0 ? (jour.length === 0 ? 'Rien de prévu : choisis dans le backlog ci-dessous.' : 'Tout est fait.')
            : <><strong>{duree(bilan.prevu)}</strong> prévues sur <strong>{duree(bilan.disponible)}</strong> disponibles
              {t.sansEstimation > 0 && <> ({t.sansEstimation} sans estimation)</>}</>}
        </p>
        {t.restantes > 0 && (
          <div className={bilan.trop > 0 ? 'jauge trop' : 'jauge'} role="img"
            aria-label={`${Math.round(bilan.part * 100)} % du temps disponible`}>
            <span style={{ width: `${Math.round(bilan.part * 100)}%` }} />
          </div>
        )}
        {bilan.trop > 0 && <p className="etat erreur" role="status" id="trop">{duree(bilan.trop)} de trop : retire ou repousse une tâche.</p>}
        {aCaser > 0 && (
          <button type="button" className="caser" onClick={caser}>Caser à la suite ({aCaser})</button>
        )}
        <ul className="du-jour">
          {jour.map((e) => (
            <Ligne key={e.id} element={e} ouvrir={ouvrir} sansHeure
              detail={parId.has(e.id) ? `${heure(parId.get(e.id)?.debut ?? 0)}–${heure(parId.get(e.id)?.fin ?? 0)}${parId.get(e.id)?.chevauche ? ' · chevauche' : ''}` : undefined}>
              <input type="time" aria-label={`Heure : ${e.titre}`} value={e.heurePlanifiee ?? ''}
                onChange={(ev) => modifier(e.id, { heurePlanifiee: ev.target.value === '' ? null : ev.target.value })} />
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
function Ligne({ element: e, ouvrir, detail, sansHeure = false, children }: {
  element: Element; ouvrir: (id: string) => void; detail?: string | undefined; sansHeure?: boolean; children: ReactNode;
}) {
  const infos = [
    sansHeure ? null : e.heurePlanifiee, detail, e.estimation !== null ? duree(e.estimation) : null,
    e.priorite === 'urgente' || e.priorite === 'haute' ? e.priorite : null,
    e.echeance ? `échéance ${jourLisible(e.echeance)}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <li className={[e.statut === 'fait' && 'fait', detail?.includes('chevauche') && 'chevauche'].filter(Boolean).join(' ') || undefined} data-id={e.id}>
      <span className="texte">
        <button type="button" className="lien" onClick={() => ouvrir(e.id)}>{e.titre}</button>
        {infos && <small>{infos}</small>}
      </span>
      <span className="boutons">{children}</span>
    </li>
  );
}

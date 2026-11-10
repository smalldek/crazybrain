// Le calendrier (tâche 6.1) : la semaine (une liste par jour, lisible sur le téléphone) ou le mois
// (une grille). Un élément y paraît à son échéance et au jour où il est prévu. La période et le jour
// vivent dans l'adresse (?periode=mois&jour=2026-11-10) : on peut la garder, y revenir.
import { naviguer } from './adresse';
import type { Element } from './api';
import { deplacer, JOURS_COURTS, jourLisible, mois, poses, semaine, titrePeriode, type Periode, type Pose } from './calendrier';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly parametres: URLSearchParams;
  readonly aujourdhui: string;
  readonly ouvrir: (id: string) => void;
}

const TITRES_PAR_CASE = 3;

export function VueCalendrier({ elements, parametres, aujourdhui, ouvrir }: Proprietes) {
  const periode: Periode = parametres.get('periode') === 'mois' ? 'mois' : 'semaine';
  const lu = parametres.get('jour') ?? '';
  const jour = /^\d{4}-\d{2}-\d{2}$/.test(lu) ? lu : aujourdhui;
  const aller = (champs: { periode?: Periode; jour?: string }): void => {
    const p = new URLSearchParams(window.location.search);
    if (champs.periode) p.set('periode', champs.periode);
    if (champs.jour) { if (champs.jour === aujourdhui) p.delete('jour'); else p.set('jour', champs.jour); }
    naviguer(`${window.location.pathname}?${p.toString()}`);
  };

  const rangees = periode === 'mois' ? mois(jour) : [semaine(jour)];
  const parJour = poses(elements, rangees.flat());

  return (
    <div id="calendrier" className={`periode-${periode}`}>
      <div className="commandes">
        <button type="button" aria-label="Période précédente" onClick={() => aller({ jour: deplacer(jour, periode, -1) })}>‹</button>
        <h2>{titrePeriode(jour, periode)}</h2>
        <button type="button" aria-label="Période suivante" onClick={() => aller({ jour: deplacer(jour, periode, 1) })}>›</button>
        <button type="button" className="lien" onClick={() => aller({ jour: aujourdhui })}>Aujourd’hui</button>
        <span className="bascule" role="group" aria-label="Période">
          {(['semaine', 'mois'] as const).map((p) => (
            <button key={p} type="button" aria-pressed={p === periode} onClick={() => aller({ periode: p })}>{p === 'semaine' ? 'Semaine' : 'Mois'}</button>
          ))}
        </span>
      </div>

      {periode === 'semaine' ? (
        <ol className="semaine">
          {rangees[0]?.map((j) => (
            <li key={j} data-jour={j} className={j === aujourdhui ? 'aujourdhui' : undefined} aria-label={jourLisible(j)}>
              <h3>{jourLisible(j)}</h3>
              {(parJour.get(j) ?? []).length === 0 ? <p className="vide">—</p> : (
                <ul>{(parJour.get(j) ?? []).map((p) => <Entree key={`${p.element.id}-${p.sorte}`} pose={p} ouvrir={ouvrir} />)}</ul>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <table className="mois">
          <thead><tr>{JOURS_COURTS.map((j) => <th key={j} scope="col">{j}</th>)}</tr></thead>
          <tbody>
            {rangees.map((r) => (
              <tr key={r[0]}>
                {r.map((j) => {
                  const liste = parJour.get(j) ?? [];
                  const classes = [j === aujourdhui && 'aujourdhui', j.slice(0, 7) !== jour.slice(0, 7) && 'autre-mois'].filter(Boolean).join(' ');
                  return (
                    <td key={j} data-jour={j} className={classes || undefined} aria-label={`${jourLisible(j)} : ${liste.length} élément${liste.length > 1 ? 's' : ''}`}>
                      <button type="button" className="numero" onClick={() => aller({ periode: 'semaine', jour: j })}
                        aria-label={`Voir la semaine du ${jourLisible(j)}`}>{Number(j.slice(8))}</button>
                      <ul>
                        {liste.slice(0, TITRES_PAR_CASE).map((p) => <Entree key={`${p.element.id}-${p.sorte}`} pose={p} ouvrir={ouvrir} />)}
                      </ul>
                      {liste.length > TITRES_PAR_CASE && <span className="encore">+{liste.length - TITRES_PAR_CASE}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Un élément dans un jour : son titre, et si c'est son échéance ou le jour prévu (avec l'heure). */
function Entree({ pose, ouvrir }: { pose: Pose; ouvrir: (id: string) => void }) {
  const e = pose.element;
  const marque = pose.sorte === 'echeance' ? 'échéance' : e.heurePlanifiee ?? 'prévu';
  return (
    <li className={[pose.sorte, e.statut === 'fait' && 'fait'].filter(Boolean).join(' ')} data-id={e.id}>
      <button type="button" className="lien" onClick={() => ouvrir(e.id)}>{e.titre}</button>
      <span className="marque">{marque}</span>
    </li>
  );
}

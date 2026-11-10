// Le tableau de bord (/tableau, tâche 4.4) : des chiffres, les tâches faites semaine par semaine,
// les prochaines échéances, puis les requêtes enregistrées par Claude. Une requête qui rend des
// `id` mène à la liste filtrée ; les autres se lisent en tableau.
import { useEffect, useState } from 'react';
import { naviguer } from './adresse';
import { api, type Element, type MailRecu, type Requete, type ResultatRequete } from './api';
import { idsDeRequete } from './filtres';
import { VueRappels } from './vue-rappels';
import { chiffres, faitesParSemaine, jourCourt, prochainesEcheances } from './tableau';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly aujourdhui: string;
  readonly ouvrir: (id: string) => void;
}

const LIGNES_MONTREES = 20;

export function VueTableau({ elements, aujourdhui, ouvrir }: Proprietes) {
  const c = chiffres(elements, aujourdhui);
  const semaines = faitesParSemaine(elements, aujourdhui);
  const echeances = prochainesEcheances(elements, aujourdhui);

  return (
    <div id="tableau">
      <section aria-label="Chiffres" className="chiffres">
        <Chiffre libelle="À faire" valeur={c.aFaire} />
        <Chiffre libelle="En cours" valeur={c.enCours} />
        <Chiffre libelle="En retard" valeur={c.enRetard} alerte={c.enRetard > 0} />
        <Chiffre libelle="Faites en 7 jours" valeur={c.faitesSemaine} />
        <Chiffre libelle="Créées en 7 jours" valeur={c.creesSemaine} />
      </section>

      <section aria-label="Faites par semaine">
        <h2>Faites par semaine</h2>
        {semaines.every((s) => s.nombre === 0)
          ? <p className="etat">Aucune tâche faite ces huit dernières semaines.</p>
          : <Barres semaines={semaines} />}
      </section>

      <section aria-label="Prochaines échéances">
        <h2>Prochaines échéances</h2>
        {echeances.length === 0 ? <p className="etat">Aucune échéance à venir.</p> : (
          <ul className="echeances">
            {echeances.map((e) => (
              <li key={e.id}><button type="button" className="lien" onClick={() => ouvrir(e.id)}>{e.titre}</button>
                <span className="date">{e.echeance === aujourdhui ? 'aujourd’hui' : jourCourt(e.echeance ?? '')}</span></li>
            ))}
          </ul>
        )}
      </section>

      <RequetesDeClaude />
      <VueRappels />
      <MailsRecus ouvrir={ouvrir} />
    </div>
  );
}

function Chiffre({ libelle, valeur, alerte = false }: { libelle: string; valeur: number; alerte?: boolean }) {
  return (
    <div className={alerte ? 'chiffre alerte' : 'chiffre'} role="group" aria-label={libelle}>
      <span className="valeur">{valeur}</span>
      <span className="libelle">{libelle}</span>
    </div>
  );
}

/** Une barre par semaine, sur un seul axe ; le nombre est écrit au-dessus de chaque barre non vide. */
function Barres({ semaines }: { semaines: { lundi: string; nombre: number }[] }) {
  const largeur = 320;
  const hauteur = 140;
  const bas = hauteur - 20;
  const max = Math.max(1, ...semaines.map((s) => s.nombre));
  const pas = largeur / semaines.length;
  return (
    <svg className="barres" viewBox={`0 0 ${largeur} ${hauteur}`} role="img"
      aria-label={`Tâches faites par semaine : ${semaines.map((s) => `semaine du ${jourCourt(s.lundi)}, ${s.nombre}`).join(' ; ')}`}>
      <line x1="0" x2={largeur} y1={bas} y2={bas} className="axe" />
      {semaines.map((s, i) => {
        const h = ((bas - 16) * s.nombre) / max;
        const x = i * pas + pas * 0.2;
        return (
          <g key={s.lundi} data-semaine={s.lundi} data-nombre={s.nombre}>
            <title>{`Semaine du ${jourCourt(s.lundi)} : ${s.nombre} faite${s.nombre > 1 ? 's' : ''}`}</title>
            {/* Une zone de survol plus grande que la barre. */}
            <rect x={i * pas} y="0" width={pas} height={bas} className="survol" />
            {s.nombre > 0 && <rect x={x} y={bas - h} width={pas * 0.6} height={h} rx="4" className="barre" />}
            {s.nombre > 0 && <text x={x + pas * 0.3} y={bas - h - 4} className="nombre">{s.nombre}</text>}
            <text x={x + pas * 0.3} y={hauteur - 4} className="jour">{jourCourt(s.lundi)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Les requêtes que Claude a enregistrées, chacune rejouée. */
function RequetesDeClaude() {
  const [requetes, setRequetes] = useState<Requete[] | null>(null);
  useEffect(() => { api.requetes().then(setRequetes, () => setRequetes([])); }, []);
  if (!requetes || requetes.length === 0) return null;
  return (
    <section aria-label="Requêtes de Claude">
      <h2>Requêtes de Claude</h2>
      {requetes.map((r) => <ResultatDeRequete key={r.id} requete={r} />)}
    </section>
  );
}

function ResultatDeRequete({ requete }: { requete: Requete }) {
  const [resultat, setResultat] = useState<ResultatRequete | string | null>(null);
  useEffect(() => {
    api.lignesRequete(requete.id).then(setResultat, (e: unknown) => setResultat(e instanceof Error ? e.message : String(e)));
  }, [requete.id]);
  const ids = resultat && typeof resultat !== 'string' ? idsDeRequete(resultat) : null;
  return (
    <article className="requete" aria-label={requete.nom}>
      <h3>{requete.nom}</h3>
      {requete.description && <p className="description">{requete.description}</p>}
      {resultat === null ? <p className="etat">Chargement…</p>
        : typeof resultat === 'string' ? <p className="etat erreur">{resultat}</p>
          : ids ? (
            <p>{ids.size} élément{ids.size > 1 ? 's' : ''}{' '}
              <button type="button" className="lien" onClick={() => naviguer(`/?requete=${encodeURIComponent(requete.id)}`)}>Voir dans la liste</button></p>
          ) : (
            <div className="defile">
              <table>
                <thead><tr>{resultat.colonnes.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                <tbody>
                  {resultat.lignes.slice(0, LIGNES_MONTREES).map((l, i) => (
                    <tr key={i}>{resultat.colonnes.map((c) => <td key={c}>{l[c] === null || l[c] === undefined ? '' : String(l[c])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {resultat.lignes.length > LIGNES_MONTREES && <p className="etat">{LIGNES_MONTREES} premières lignes sur {resultat.lignes.length}{resultat.tronque ? '+' : ''}.</p>}
            </div>
          )}
    </article>
  );
}

/**
 * Les derniers mails reçus à l'adresse de Crazybrain (étape 8) : la tâche créée, ou la raison du
 * refus. Rien ne s'affiche tant qu'aucun mail n'est arrivé.
 */
function MailsRecus({ ouvrir }: { ouvrir: (id: string) => void }) {
  const [mails, setMails] = useState<MailRecu[]>([]);
  useEffect(() => { api.mails().then(setMails, () => setMails([])); }, []);
  if (mails.length === 0) return null;
  return (
    <section aria-label="Mails reçus">
      <h2>Mails reçus</h2>
      <ul className="echeances">
        {mails.map((m) => (
          <li key={m.id}>
            {m.accepte && m.elementId
              ? <button type="button" className="lien" onClick={() => ouvrir(m.elementId ?? '')}>{m.sujet ?? '(sans sujet)'}</button>
              : <span>{m.sujet ?? '(sans sujet)'} — refusé : {m.raison}{m.authserv ? ` (résultat écrit par ${m.authserv})` : ''}</span>}
            <span className="date">{jourCourt(m.recuLe.slice(0, 10))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

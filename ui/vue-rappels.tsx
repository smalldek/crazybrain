// Les rappels sur ce téléphone (tâche 5.5), dans l'onglet Tableau : les activer (le téléphone
// s'abonne aux notifications), envoyer un rappel d'essai, et voir les retards mesurés.
import { useCallback, useEffect, useState } from 'react';
import { api, type EnvoiRappel } from './api';
import { bilan, duree, octetsDeCle, retardDe } from './rappels';

type Etat =
  | { readonly sorte: 'chargement' }
  | { readonly sorte: 'impossible'; readonly raison: string }
  | { readonly sorte: 'pret'; readonly abonnement: PushSubscription | null };

const ENVOIS_MONTRES = 10;

export function VueRappels() {
  const [etat, setEtat] = useState<Etat>({ sorte: 'chargement' });
  const [message, setMessage] = useState('');
  const [envois, setEnvois] = useState<EnvoiRappel[]>([]);

  const relire = useCallback(async () => {
    setEnvois(await api.envoisPush().catch(() => []));
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setEtat({ sorte: 'impossible', raison: 'Ce navigateur ne reçoit pas de notifications. Sur Android, ouvrir Crazybrain dans Chrome, ou l’appli installée.' });
      return;
    }
    const enregistrement = await navigator.serviceWorker.ready;
    setEtat({ sorte: 'pret', abonnement: await enregistrement.pushManager.getSubscription() });
  }, []);

  useEffect(() => { void relire(); }, [relire]);

  async function activer(): Promise<void> {
    setMessage('');
    try {
      if ((await Notification.requestPermission()) !== 'granted') {
        setMessage('Les notifications sont refusées : les autoriser dans les réglages du site, puis réessayer.');
        return;
      }
      const cle = await api.clePush();
      if (!cle) {
        setMessage('Les rappels ne sont pas encore configurés sur le serveur.');
        return;
      }
      const enregistrement = await navigator.serviceWorker.ready;
      const abonnement = await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octetsDeCle(cle) });
      await api.abonner({ ...abonnement.toJSON(), appareil: navigator.userAgent.slice(0, 100) });
      setMessage('Rappels activés sur ce téléphone.');
      await relire();
    } catch (e) {
      setMessage(`L’activation a échoué : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function desactiver(abonnement: PushSubscription): Promise<void> {
    await api.desabonner(abonnement.endpoint).catch(() => undefined);
    await abonnement.unsubscribe();
    setMessage('Rappels désactivés sur ce téléphone.');
    await relire();
  }

  async function essayer(): Promise<void> {
    setMessage('');
    try {
      const n = await api.essaiPush();
      setMessage(`Rappel d’essai envoyé à ${n} appareil${n > 1 ? 's' : ''} : la notification doit arriver dans quelques secondes.`);
      window.setTimeout(() => void relire(), 5000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  const b = bilan(envois);
  return (
    <section aria-label="Rappels">
      <h2>Rappels sur ce téléphone</h2>
      {etat.sorte === 'chargement' && <p className="etat">Chargement…</p>}
      {etat.sorte === 'impossible' && <p className="etat">{etat.raison}</p>}
      {etat.sorte === 'pret' && (
        <p className="boutons">
          {etat.abonnement === null
            ? <button type="button" className="principal" onClick={() => void activer()}>Activer les rappels</button>
            : <>
              <button type="button" onClick={() => void essayer()}>Envoyer un rappel d’essai</button>{' '}
              <button type="button" className="lien" onClick={() => void desactiver(etat.abonnement as PushSubscription)}>Désactiver</button>
            </>}
        </p>
      )}
      {message && <p id="message-rappels" className="etat" role="status">{message}</p>}
      {envois.length > 0 && (
        <>
          <p id="bilan-rappels">
            {b.envoyes} envoi{b.envoyes > 1 ? 's' : ''}, {b.recus} reçu{b.recus > 1 ? 's' : ''} signalé{b.recus > 1 ? 's' : ''}
            {b.median !== null && b.pire !== null && <> ; retard médian {duree(b.median)}, pire {duree(b.pire)}</>}.
          </p>
          <div className="defile">
            <table>
              <thead><tr><th scope="col">Rappel</th><th scope="col">Prévu</th><th scope="col">Parti</th><th scope="col">Reçu</th></tr></thead>
              <tbody>
                {envois.slice(0, ENVOIS_MONTRES).map((e) => {
                  const r = retardDe(e);
                  return (
                    <tr key={e.id}>
                      <td>{e.titre}</td>
                      <td>{new Date(e.prevuLe).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{e.statutHttp === null ? 'aucun appareil' : e.statutHttp >= 400 ? `refusé (${e.statutHttp})` : `+${duree(r.depart)}`}</td>
                      <td>{r.reception === null ? '—' : `+${duree(r.reception)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

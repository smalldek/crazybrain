// L'écran principal : la saisie rapide, le message d'état, les filtres, puis la vue choisie (la
// liste, le kanban ou le backlog) ; et, quand l'adresse nomme un élément (/e/<id>, /kanban/e/<id>),
// son panneau de détail.
// Un composant React est une fonction qui rend ce qu'il faut afficher à partir de son état ;
// quand l'état change (useState), React refait l'affichage tout seul.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { adresseElement, adresseVue, elementDeLAdresse, naviguer, parametresIci, useAdresse, vueDe, type Vue } from './adresse';
import { api, type Appartenance, type Changements, type Element, type Tag } from './api';
import { BarreFiltres } from './barre-filtres';
import { aujourdhui } from './dates';
import { ErreurConnexion, memoire, quoiFaire } from './connexion';
import { backlog, filtrer, idsDeRequete, lireFiltres, nombreDeFiltres, parModification } from './filtres';
import { PanneauDetail } from './panneau-detail';
import { LigneTache } from './ligne-tache';
import { ecrireCritere, lireCritere, rangsAPoser, type Critere, type StatutColonne } from './kanban';
import { appliquer, ordonner } from './liste';
import { lirePartage } from './partage';
import { tagsParElement } from './tags';
import { VueKanban } from './vue-kanban';
import { VueProjets } from './vue-projets';
import { VueTableau } from './vue-tableau';
import { VueCalendrier } from './vue-calendrier';
import { VueJournee } from './vue-journee';
import { VueHorizons } from './vue-horizons';
import { lireAnneaux, rattacher } from './cercles';
import { VueCercles } from './vue-cercles';

/** Le message sous la saisie : un état, une erreur, ou « supprimée » avec un bouton Annuler. */
interface Message {
  readonly texte: string;
  readonly erreur?: boolean;
  readonly annuler?: () => void;
}

const NOMS_VUES: Record<Vue, string> = { liste: 'Liste', journee: 'Journée', kanban: 'Kanban', backlog: 'Backlog', calendrier: 'Calendrier', horizons: 'Horizons', projets: 'Projets', cercles: 'Cercles', tableau: 'Tableau' };

export function Appli() {
  const [elements, setElements] = useState<Element[] | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [appartenances, setAppartenances] = useState<Appartenance[]>([]);
  const [message, setMessage] = useState<Message>({ texte: 'Chargement…' });
  const [titre, setTitre] = useState('');
  const [envoi, setEnvoi] = useState(false);
  // Ce qu'une autre appli a partagé (tâche 5.4) : le titre va dans la saisie, le reste attend ici.
  const [descriptionPartagee, setDescriptionPartagee] = useState<string | null>(null);
  const { chemin, parametres } = useAdresse();
  const vue = vueDe(chemin);
  const ouvert = elementDeLAdresse(chemin);
  // Ouvrir ou fermer un détail garde les réglages de la vue (les couloirs du kanban, dans l'adresse).
  const fermer = useCallback(() => naviguer(adresseVue(vueDe(window.location.pathname)) + parametresIci()), []);
  const ouvrir = (id: string): void => naviguer(adresseElement(id, vue) + parametresIci());
  const critere = lireCritere(parametres.get('couloirs'));
  const changerCritere = (c: Critere): void => {
    const p = new URLSearchParams(window.location.search);
    const texte = ecrireCritere(c);
    if (texte) p.set('couloirs', texte); else p.delete('couloirs');
    const recherche = p.toString();
    naviguer(window.location.pathname + (recherche ? `?${recherche}` : ''));
  };

  // Les filtres de l'adresse s'appliquent à toutes les vues ; ils restent quand on change de vue.
  const filtres = lireFiltres(parametres);
  const changerFiltres = (p: URLSearchParams): void => {
    const recherche = p.toString();
    // Taper dans la recherche remplace l'adresse au lieu d'en empiler une par lettre.
    const seulLeTexte = p.get('texte') !== parametres.get('texte');
    naviguer(window.location.pathname + (recherche ? `?${recherche}` : ''), { remplacer: seulLeTexte });
  };
  // Le filtre « Requête de Claude » : les ids qu'elle rend, lus quand on la choisit (tâche 4.3).
  const [idsRequete, setIdsRequete] = useState<ReadonlySet<string> | null>(null);
  const [avisRequete, setAvisRequete] = useState('');
  useEffect(() => {
    setIdsRequete(null);
    setAvisRequete('');
    if (!filtres.requete) return;
    let actif = true;
    api.lignesRequete(filtres.requete).then((r) => {
      if (!actif) return;
      const ids = idsDeRequete(r);
      setIdsRequete(ids ?? new Set());
      if (!ids) setAvisRequete('Cette requête ne rend pas de colonne « id » : elle ne choisit pas d’éléments.');
      else if (r.tronque) setAvisRequete('La requête rend plus de 500 lignes : seules les 500 premières comptent.');
    }, (e: unknown) => { if (actif) { setIdsRequete(new Set()); setAvisRequete(e instanceof Error ? e.message : String(e)); } });
    return () => { actif = false; };
  }, [filtres.requete]);
  const visibles = elements && filtrer(elements, filtres, tagsParElement(tags), aujourdhui(), idsRequete);
  const rienAMontrer = vue !== 'projets' && vue !== 'cercles' && vue !== 'tableau' && vue !== 'calendrier' && vue !== 'journee' && vue !== 'horizons' && elements !== null && elements.length > 0 && visibles !== null
    && (vue === 'backlog' ? backlog(visibles) : visibles).length === 0;
  // La liste et le backlog dans leur ordre habituel, ou « modifié récemment » d'abord (filtre `tri`).
  const enOrdre = visibles && (vue === 'backlog' ? backlog(visibles) : ordonner(visibles));
  const lignes = enOrdre && filtres.tri === 'modifie' ? parModification(enOrdre) : enOrdre;

  // La connexion Access a expiré (tâche 5.2) : on recharge la page une fois, Access reconnecte et
  // revient ; si ça échoue encore juste après, un bouton plutôt qu'une boucle de rechargements.
  const [deconnecte, setDeconnecte] = useState(false);
  const reconnecter = (): void => {
    memoire.ecrire(Date.now());
    window.location.reload();
  };
  const erreur = (e: unknown): void => {
    if (e instanceof ErreurConnexion) {
      if (quoiFaire(memoire.lire(), Date.now()) === 'recharger') reconnecter();
      else setDeconnecte(true);
      return;
    }
    setMessage({ texte: e instanceof Error ? e.message : String(e), erreur: true });
  };

  // Les envois en vol et une « génération » qui avance à chaque envoi. Une relecture partie avant un
  // envoi, ou pendant qu'un envoi est en vol, est jetée : elle remettrait à l'écran un état déjà dépassé
  // (une part supprimée qui réapparaît un instant). Le dernier envoi terminé relance la relecture.
  const enVol = useRef(0);
  const generation = useRef(0);

  /** Relit la liste ; garde le message en cours sauf « Chargement… » et « Aucune tâche ». */
  const charger = useCallback(async (): Promise<void> => {
    const depart = generation.current;
    try {
      const [lus, tousLesTags, liens] = await Promise.all([api.lister(), api.tags(), api.appartenances()]);
      if (depart !== generation.current || enVol.current > 0) return;
      setElements(lus);
      setTags(tousLesTags);
      setAppartenances(liens);
      setMessage((m) => (m.erreur || m.annuler ? m : { texte: lus.length === 0 ? 'Aucune tâche pour l’instant.' : '' }));
    } catch (e) {
      erreur(e);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);
  // L'appli revient au premier plan (le téléphone l'avait mise de côté, parfois des heures) : on
  // relit, ce qui montre les changements faits ailleurs et détecte une connexion expirée.
  useEffect(() => {
    const auRetour = (): void => { if (document.visibilityState === 'visible') void charger(); };
    document.addEventListener('visibilitychange', auRetour);
    return () => document.removeEventListener('visibilitychange', auRetour);
  }, [charger]);

  // Android ouvre /partage?titre=…&texte=…&lien=… (le share_target du manifeste) : on pré-remplit la
  // saisie, puis l'adresse redevient / (un rechargement ne doit pas re-proposer le même partage).
  useEffect(() => {
    if (chemin !== '/partage') return;
    const partage = lirePartage(new URLSearchParams(window.location.search));
    if (partage) {
      setTitre(partage.titre);
      setDescriptionPartagee(partage.description);
    }
    naviguer('/', { remplacer: true });
  }, [chemin]);

  async function ajouter(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    if (titre.trim() === '') return;
    setEnvoi(true);
    try {
      const cree = await creerElement(descriptionPartagee ? { titre, description: descriptionPartagee } : { titre });
      if (cree) {
        setTitre('');
        setDescriptionPartagee(null);
      }
    } finally {
      setEnvoi(false);
    }
  }

  /**
   * Envoie un changement au serveur sans faire attendre l'écran, qui l'a déjà montré. Quand plus rien
   * n'est en vol, une relecture confirme l'état (ou remet l'état vrai si le serveur a refusé).
   */
  async function envoyer<T>(envoi: () => Promise<T>): Promise<T | null> {
    enVol.current += 1;
    generation.current += 1;
    try {
      const resultat = await envoi();
      setMessage((m) => (m.annuler ? m : { texte: '' }));
      return resultat;
    } catch (e) {
      erreur(e);
      return null;
    } finally {
      enVol.current -= 1;
      if (enVol.current === 0) void charger();
    }
  }

  /** Crée un élément ; il paraît dès que le serveur rend son identifiant, sans attendre la relecture. */
  async function creerElement(champs: Changements & { titre: string }): Promise<Element | null> {
    const cree = await envoyer(() => api.creer(champs));
    if (cree) setElements((l) => (l && !l.some((e) => e.id === cree.id) ? [...l, cree] : l));
    return cree;
  }

  async function creerProjet(titreProjet: string): Promise<void> {
    await creerElement({ titre: titreProjet, type: 'projet' });
  }

  // La page montre le changement tout de suite (une case cochée se coche sous le doigt), puis relit
  // la liste : si le serveur refuse, la relecture remet l'état vrai et le message dit pourquoi.
  async function modifier(id: string, changements: Changements): Promise<void> {
    setElements((liste) => liste && liste.map((e) => (e.id === id ? appliquer(e, changements) : e)));
    await envoyer(() => api.modifier(id, changements));
  }

  // Plusieurs éléments d'un coup (une carte posée, une ligne rangée, la journée casée) : l'écran les
  // montre tout de suite, les envois partent ensemble, puis la relecture confirme.
  async function modifierPlusieurs(envois: readonly (readonly [string, Changements])[]): Promise<void> {
    if (envois.length === 0) return;
    setElements((l) => l && l.map((e) => {
      const changement = envois.find(([i]) => i === e.id);
      return changement ? appliquer(e, changement[1]) : e;
    }));
    await envoyer(() => Promise.all(envois.map(([i, changements]) => api.modifier(i, changements))));
  }

  // Une carte posée sur le kanban : son statut s'il a changé, et les rangs de sa colonne d'arrivée
  // (seulement ceux qui changent). L'écran les montre tout de suite ; la relecture confirme.
  async function poser(id: string, statut: StatutColonne, ordre: readonly string[]): Promise<void> {
    const liste = elements ?? [];
    const carte = liste.find((e) => e.id === id);
    const parId = new Map<string, Changements>();
    // La carte déplacée d'abord : son statut et son rang partent ensemble.
    if (carte && carte.statut !== statut) parId.set(id, { statut });
    for (const { id: autre, rang } of rangsAPoser(ordre, liste)) parId.set(autre, { ...parId.get(autre), rang });
    await modifierPlusieurs([...parId]);
  }

  // Glisser une ligne du plan des cercles : son parent s'il change, puis les rangs de sa nouvelle
  // fratrie (seulement ceux qui changent).
  async function ranger(id: string, parent: string | null, ordre: readonly string[]): Promise<void> {
    const liste = elements ?? [];
    const element = liste.find((e) => e.id === id);
    const parId = new Map<string, Changements>();
    if (element && element.parent !== parent) parId.set(id, { parent });
    for (const { id: autre, rang } of rangsAPoser(ordre, liste)) parId.set(autre, { ...parId.get(autre), rang });
    await modifierPlusieurs([...parId]);
  }

  // Supprimer ne demande pas de confirmation : la tâche est archivée, et « Annuler » la restaure
  // tout de suite (plus rapide qu'une question à chaque fois, et rien n'est perdu). Elle quitte
  // l'écran sous le doigt, sans attendre le serveur.
  async function supprimer(element: Element): Promise<void> {
    setElements((l) => l && l.filter((e) => e.id !== element.id));
    setMessage({
      texte: `« ${element.titre} » supprimée.`,
      annuler: () => {
        setMessage({ texte: '' });
        setElements((l) => (l && !l.some((e) => e.id === element.id) ? [...l, element] : l));
        void envoyer(() => api.restaurer(element.id));
      },
    });
    await envoyer(() => api.supprimer(element.id));
  }

  return (
    <div className={['mise-en-page', ouvert && 'avec-panneau', `vue-${vue}`].filter(Boolean).join(' ')}>
      <main>
        <header className="entete-appli">
          <h1>Crazybrain</h1>
          <nav aria-label="Vues">
            {(['liste', 'journee', 'kanban', 'backlog', 'calendrier', 'horizons', 'projets', 'cercles', 'tableau'] as const).map((v) => (
              <a key={v} href={adresseVue(v) + window.location.search} aria-current={v === vue ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); naviguer(adresseVue(v) + parametresIci()); }}>{NOMS_VUES[v]}</a>
            ))}
          </nav>
        </header>
        <form onSubmit={(e) => void ajouter(e)} autoComplete="off">
          <label htmlFor="titre">Nouvelle tâche (Entrée pour l'ajouter)</label>
          <input id="titre" name="titre" maxLength={200} enterKeyHint="done" placeholder="Taper une tâche…"
            autoFocus={!ouvert} value={titre} disabled={envoi} onChange={(e) => setTitre(e.target.value)} />
          {descriptionPartagee && (
            <p id="partage" className="etat">
              Avec en description : « {descriptionPartagee.length > 80 ? `${descriptionPartagee.slice(0, 79)}…` : descriptionPartagee} »{' '}
              <button type="button" onClick={() => setDescriptionPartagee(null)}>Retirer</button>
            </p>
          )}
        </form>
        {deconnecte && (
          <p id="deconnexion" className="etat erreur" role="alert">
            La connexion a expiré. <button type="button" onClick={reconnecter}>Se reconnecter</button>
          </p>
        )}
        <p id="message" className={message.erreur ? 'etat erreur' : 'etat'} role="status" aria-live="polite"
          hidden={message.texte === ''}>
          {message.texte}
          {message.annuler && <button type="button" onClick={message.annuler}>Annuler</button>}
        </p>
        {/* Les filtres valent pour les vues d'éléments ; la vue des projets montre tout. */}
        {elements && elements.length > 0 && vue !== 'projets' && vue !== 'tableau' && (
          <BarreFiltres filtres={filtres} elements={elements} tags={tags} changer={changerFiltres} />
        )}
        {avisRequete && <p className="etat" id="avis-requete">{avisRequete}</p>}
        {rienAMontrer && <p className="etat" id="aucun-resultat">Rien ne correspond{vue === 'backlog' ? ' dans le backlog' : ''}.</p>}
        {vue === 'cercles' ? (
          elements && <VueCercles elements={rattacher(elements, appartenances)} centre={parametres.get('centre')} anneaux={lireAnneaux(parametres.get('anneaux'))}
            ouvert={ouvert} ouvrir={ouvrir} modifier={modifier} creer={creerElement} supprimer={supprimer}
            ranger={ranger} signaler={(texte) => setMessage({ texte, erreur: true })} jour={aujourdhui()}
            tags={tags} recharger={charger} modifierPlusieurs={modifierPlusieurs}
            eclaires={visibles && (nombreDeFiltres(filtres) > 0 || filtres.texte) ? new Set(visibles.map((e) => e.id)) : null} />
        ) : vue === 'journee' ? (
          visibles && <VueJournee elements={visibles} aujourdhui={aujourdhui()} ouvrir={ouvrir}
            modifier={(id, c) => void modifier(id, c)} modifierPlusieurs={(envois) => void modifierPlusieurs(envois)} />
        ) : vue === 'horizons' ? (
          visibles && <VueHorizons elements={visibles} aujourdhui={aujourdhui()} parametres={parametres} ouvrir={ouvrir} creer={creerElement} />
        ) : vue === 'calendrier' ? (
          visibles && <VueCalendrier elements={visibles} parametres={parametres} aujourdhui={aujourdhui()} ouvrir={ouvrir} />
        ) : vue === 'tableau' ? (
          elements && <VueTableau elements={elements} aujourdhui={aujourdhui()} ouvrir={ouvrir} />
        ) : vue === 'projets' ? (
          elements && <VueProjets elements={elements} tags={tags} ouvert={ouvert} ouvrir={ouvrir} creerProjet={creerProjet} />
        ) : vue !== 'kanban' ? (
          // Le backlog est une liste : ce qui n'est ni fait ni planifié, le plus important en haut.
          <ul id="liste" className={vue === 'backlog' ? 'backlog' : undefined}>
            {lignes?.map((e) => (
              <LigneTache key={e.id} element={e} ouverte={e.id === ouvert}
                modifier={(c) => void modifier(e.id, c)} supprimer={() => void supprimer(e)}
                ouvrir={() => ouvrir(e.id)} />
            ))}
          </ul>
        ) : (
          elements && visibles && <VueKanban elements={visibles} tous={elements} tags={tags} critere={critere} changerCritere={changerCritere} ouvert={ouvert} ouvrir={ouvrir}
            poser={(id, statut, ordre) => void poser(id, statut, ordre)} />
        )}
      </main>
      {ouvert && (
        <PanneauDetail key={ouvert} id={ouvert} elements={elements ?? []} tousLesTags={tags} fermer={fermer}
          modifie={() => void charger()} />
      )}
    </div>
  );
}

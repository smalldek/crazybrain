// La vue en cercles (/cercles) : un élément au centre (« Tout » sans `?centre=`), un anneau par
// niveau de sous-éléments, chaque part à son poids dans son parent, remplie selon son avancement.
// Toucher une part la choisit et montre sa fiche ; la retoucher la met au centre ; toucher le centre
// remonte d'un niveau. La fiche règle l'importance et l'avancement au curseur, ajoute, renomme,
// supprime. Les calculs sont dans cercles.ts (sans React).
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { poidsPourPart } from '../src/domaine/cercles';
import { naviguer } from './adresse';
import { api, type Changements, type Element, type Tag } from './api';
import { csvDeBranche } from './export-csv';
import { lireListe } from './liste-collee';
import { tagsParElement } from './tags';
import { PlanCercles } from './plan-cercles';
import {
  ANNEAUX_MAX, chemin, couleursChoisies, disposer, TEINTES, enfantsDe, enfantsParParent, etiquette, filAriane, point, pourcent, RAYON_CENTRE,
  rayons, type Part,
} from './cercles';

interface Proprietes {
  readonly elements: readonly Element[];
  readonly centre: string | null;
  readonly anneaux: number;
  /** L'élément dont le détail est ouvert. */
  readonly ouvert: string | null;
  readonly ouvrir: (id: string) => void;
  readonly modifier: (id: string, changements: Changements) => Promise<void>;
  readonly creer: (champs: Changements & { titre: string }) => Promise<void>;
  readonly supprimer: (element: Element) => Promise<void>;
  /** Range un élément dans un parent (null : à la racine) et ordonne sa nouvelle fratrie. */
  readonly ranger: (id: string, parent: string | null, ordre: readonly string[]) => Promise<void>;
  readonly signaler: (message: string) => void;
  /** Avec des filtres : les éléments qui y répondent, éclairés ; les autres sont grisés. Null : pas de filtre. */
  readonly eclaires: ReadonlySet<string> | null;
  /** Le jour AAAA-MM-JJ, pour marquer ce qui est en retard. */
  readonly jour: string;
  /** Tous les tags posés : les couleurs choisies (`couleur:<teinte>`), l'export. */
  readonly tags: readonly Tag[];
  /** Relit les éléments et les tags, après des changements faits ici directement par l'API. */
  readonly recharger: () => Promise<void>;
}

/** L'adresse de la vue avec ce centre et ce nombre d'anneaux (les autres paramètres restent). */
function adresseCercles(centre: string | null, anneaux?: number): string {
  const p = new URLSearchParams(window.location.search);
  if (centre) p.set('centre', centre); else p.delete('centre');
  if (anneaux !== undefined) p.set('anneaux', String(anneaux));
  const recherche = p.toString();
  return `/cercles${recherche ? `?${recherche}` : ''}`;
}

const TAILLE_TEXTE = 4.2;

export function VueCercles({ elements, centre, anneaux, ouvert, ouvrir, modifier, creer, supprimer, ranger, signaler, eclaires, jour, tags, recharger }: Proprietes) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const dessinRef = useRef<SVGSVGElement>(null);
  // Le curseur d'importance : le poids essayé, montré avant d'être enregistré.
  const [apercu, setApercu] = useState<ReadonlyMap<string, number>>(new Map());
  // Le curseur d'avancement : la valeur essayée.
  const [avancementEssaye, setAvancementEssaye] = useState<{ id: string; valeur: number } | null>(null);

  const apercuAvancement = avancementEssaye
    ? elements.map((e) => (e.id === avancementEssaye.id ? { ...e, avancement: avancementEssaye.valeur } : e))
    : elements;
  const parElement = tagsParElement(tags);
  const dessin = disposer(apercuAvancement, centre, anneaux, apercu, couleursChoisies(parElement));
  const fil = filAriane(elements, centre);
  const centreInconnu = centre !== null && dessin.centre === null;
  const partChoisie = dessin.parts.find((p) => p.element.id === choisi) ?? null;
  // Pendant un réglage au curseur, tout s'estompe sauf ce qu'il touche : la part et ses sœurs pour
  // l'importance ; ses sœurs et ses ancêtres pour l'avancement (il remonte jusqu'au centre).
  let gardees: ReadonlySet<string> | null = null;
  if (partChoisie && (apercu.size > 0 || avancementEssaye)) {
    const parent = partChoisie.element.parent;
    const ids = new Set(elements.filter((e) => e.parent === parent).map((e) => e.id));
    if (avancementEssaye) for (const a of filAriane(elements, parent)) ids.add(a.id);
    gardees = ids;
  }

  /** Plusieurs changements d'un coup (égaliser), puis une seule relecture. */
  async function modifierPlusieurs(envois: readonly [string, Changements][]): Promise<void> {
    try {
      for (const [id, c] of envois) await api.modifier(id, c);
    } catch (e) {
      signaler(e instanceof Error ? e.message : String(e));
    }
    await recharger();
  }

  /** Crée les lignes d'une liste collée sous `parent` (null : à la racine), dans l'ordre, chacune sous la sienne. */
  async function creerListe(parent: string | null, texte: string, typeDefaut: string): Promise<number> {
    const lignes = lireListe(texte);
    const ids: string[] = [];
    try {
      for (const l of lignes) {
        const sonParent = l.parent === null ? parent : ids[l.parent] ?? parent;
        const cree = await api.creer({ titre: l.titre, type: l.parent === null ? typeDefaut : 'tache', parent: sonParent,
          ...(l.description ? { description: l.description } : {}) });
        ids.push(cree.id);
      }
    } catch (e) {
      signaler(e instanceof Error ? e.message : String(e));
    }
    await recharger();
    return ids.length;
  }

  /** Change la couleur choisie d'un élément (un tag `couleur:<teinte>`), ou la retire (null). */
  async function colorer(id: string, teinte: string | null): Promise<void> {
    try {
      for (const t of parElement.get(id) ?? []) if (t.startsWith('couleur:')) await api.detagger(id, t);
      if (teinte) await api.tagger(id, `couleur:${teinte}`);
    } catch (e) {
      signaler(e instanceof Error ? e.message : String(e));
    }
    await recharger();
  }

  // Changer de centre oublie le choix et les essais.
  useEffect(() => { setChoisi(null); setApercu(new Map()); setAvancementEssaye(null); }, [centre]);

  const zoomer = (id: string): void => naviguer(adresseCercles(id));
  const remonter = (): void => {
    if (centre === null) return;
    naviguer(adresseCercles(dessin.centre?.parent ?? null));
  };
  const toucher = (part: Part): void => {
    if (choisi === part.element.id) zoomer(part.element.id);
    else setChoisi(part.element.id);
  };

  // Échap remonte d'un niveau, quand le panneau de détail n'est pas ouvert (il prend Échap pour lui).
  useEffect(() => {
    if (ouvert) return undefined;
    const touche = (e: globalThis.KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (choisi) setChoisi(null); else if (centre !== null) naviguer(adresseCercles(dessin.centre?.parent ?? null));
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [ouvert, choisi, centre, dessin.centre?.parent]);

  if (centreInconnu) {
    return (
      <div id="cercles">
        <p className="etat">Cet élément n’existe plus. <a href="/cercles" onClick={(e) => { e.preventDefault(); naviguer(adresseCercles(null)); }}>Revenir à Tout</a></p>
      </div>
    );
  }

  const titreCentre = dessin.centre?.titre ?? 'Tout';
  return (
    <div id="cercles">
      <div className="reglages">
        <nav aria-label="Fil d'Ariane" className="fil">
          <a href="/cercles" aria-current={centre === null ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); naviguer(adresseCercles(null)); }}>Tout</a>
          {fil.map((e) => (
            <span key={e.id}>
              <span aria-hidden="true"> › </span>
              <a href={adresseCercles(e.id)} aria-current={e.id === centre ? 'page' : undefined}
                onClick={(ev) => { ev.preventDefault(); naviguer(adresseCercles(e.id)); }}>{e.titre}</a>
            </span>
          ))}
        </nav>
        <button type="button" className="enregistrer-image" onClick={() => enregistrerImage(dessinRef.current, titreCentre)}>
          Enregistrer l’image
        </button>
        <button type="button" className="enregistrer-image" onClick={() => exporterCsv(csvDeBranche(elements, centre, parElement), titreCentre)}>
          Exporter en CSV
        </button>
        <label className="anneaux">
          Anneaux
          <select value={anneaux} onChange={(e) => naviguer(adresseCercles(centre, Number(e.target.value)), { remplacer: true })}>
            {Array.from({ length: ANNEAUX_MAX }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <svg ref={dessinRef} viewBox="-100 -100 200 200" className="dessin-cercles" role="group" aria-label={`Cercles de « ${titreCentre} »`}>
        {dessin.parts.map((p) => (
          <PartDessinee key={p.element.id} part={p} anneaux={anneaux} choisie={p.element.id === choisi}
            eteinte={(eclaires !== null && !eclaires.has(p.element.id)) || (gardees !== null && !gardees.has(p.element.id))}
            enRetard={p.element.echeance !== null && p.element.echeance < jour && p.element.statut !== 'fait'}
            toucher={() => toucher(p)} zoomer={() => zoomer(p.element.id)} />
        ))}
        <g className="centre" role="button" tabIndex={0}
          aria-label={centre === null ? `Tout, avancement ${Math.round(dessin.avancementCentre)} %` : `Remonter depuis « ${titreCentre} »`}
          onClick={remonter}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remonter(); } }}>
          <circle r={RAYON_CENTRE - 1} />
          <text y={-3} className="titre-centre">{etiquette(titreCentre, 14, 2, 4.4) ?? titreCentre.slice(0, 8)}</text>
          <text y={6} className="avancement-centre">{Math.round(dessin.avancementCentre)} %</text>
        </g>
      </svg>

      {dessin.parts.length === 0 && (
        <p className="etat">
          {centre === null
            ? 'Rien à montrer : créer un objectif ou un projet, ou ranger des éléments les uns dans les autres.'
            : 'Aucun sous-élément ici pour l’instant.'}
        </p>
      )}

      <div className="cote">
      {partChoisie ? (
        <FichePart key={partChoisie.element.id} part={partChoisie} elements={elements} ouvert={ouvert === partChoisie.element.id}
          zoomer={() => zoomer(partChoisie.element.id)} ouvrir={() => ouvrir(partChoisie.element.id)}
          essayerPoids={(poids) => setApercu(poids === null ? new Map() : new Map([[partChoisie.element.id, poids]]))}
          essayerAvancement={(valeur) => setAvancementEssaye(valeur === null ? null : { id: partChoisie.element.id, valeur })}
          modifier={async (c) => { await modifier(partChoisie.element.id, c); setApercu(new Map()); setAvancementEssaye(null); }}
          egaliser={() => modifierPlusieurs(elements.filter((x) => x.parent === partChoisie.element.id && x.poids !== null)
            .map((x) => [x.id, { poids: null }] as [string, Changements]))}
          creerListe={(texte) => creerListe(partChoisie.element.id, texte, 'tache')}
          teinte={(parElement.get(partChoisie.element.id) ?? []).find((t) => t.startsWith('couleur:'))?.slice('couleur:'.length) ?? ''}
          colorer={(t) => colorer(partChoisie.element.id, t)}
          creer={creer} supprimer={async () => { setChoisi(null); await supprimer(partChoisie.element); }} />
      ) : (
        <AjoutAuCentre centre={dessin.centre} elements={elements} creer={creer}
          creerListe={(texte) => creerListe(dessin.centre?.id ?? null, texte, dessin.centre ? 'tache' : 'objectif')}
          egaliser={() => modifierPlusieurs(enfantsDe(centre, elements).filter((x) => x.poids !== null)
            .map((x) => [x.id, { poids: null }] as [string, Changements]))} />
      )}

      <PlanCercles elements={elements} centre={centre} choisi={choisi} choisir={setChoisi} ranger={ranger} signaler={signaler}
        eclaires={eclaires} />
      </div>
    </div>
  );
}

/** Une part : sa couleur claire, sa portion faite en foncé (du bord intérieur vers l'extérieur), son titre s'il tient. */
function PartDessinee({ part, anneaux, choisie, eteinte, enRetard, toucher, zoomer }:
  { part: Part; anneaux: number; choisie: boolean; eteinte: boolean; enRetard: boolean; toucher: () => void; zoomer: () => void }) {
  const { interieur, exterieur } = rayons(part.anneau, anneaux);
  const fait = interieur + ((exterieur - interieur) * part.avancement) / 100;
  const milieu = (interieur + exterieur) / 2;
  const angle = part.fin - part.debut;
  const texte = etiquette(part.element.titre, milieu, angle, TAILLE_TEXTE);
  const a = (part.debut + part.fin) / 2;
  const { x, y } = point(milieu, a);
  // Le texte suit l'arc ; en bas du cercle, on le retourne pour qu'il se lise à l'endroit.
  let rotation = (a * 180) / Math.PI;
  if (rotation > 90 && rotation < 270) rotation -= 180;
  const description = `${part.element.titre}, ${pourcent(part.part)} de son parent, avancement ${Math.round(part.avancement)} %`
    + (enRetard ? `, en retard (échéance ${part.element.echeance ?? ''})` : '');
  return (
    <g className={[`part branche-${part.couleur}`, choisie && 'choisie', part.element.statut === 'fait' && 'faite',
      eteinte && 'eteinte', enRetard && 'en-retard'].filter(Boolean).join(' ')}
      role="button" tabIndex={0} aria-label={description} aria-pressed={choisie} data-titre={part.element.titre}
      data-x={Math.round(x * 100) / 100} data-y={Math.round(y * 100) / 100}
      data-angle={Math.round((angle * 180) / Math.PI)} data-avancement={Math.round(part.avancement)}
      onClick={toucher}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); zoomer(); } else if (e.key === ' ') { e.preventDefault(); toucher(); }
      }}>
      <title>{description}</title>
      <path className="fond" d={chemin(interieur, exterieur, part.debut, part.fin)} />
      {part.avancement > 0 && <path className="rempli" d={chemin(interieur, fait, part.debut, part.fin)} />}
      <path className="contour" d={chemin(interieur, exterieur, part.debut, part.fin)} />
      {texte && part.element.description && (() => {
        const q = point(exterieur - Math.min(2.4, (exterieur - interieur) * 0.15), a);
        return <circle className="indicateur" cx={q.x} cy={q.y} r={1.1}><title>A une description</title></circle>;
      })()}
      {texte && (
        <text x={x} y={y} transform={`rotate(${rotation} ${x} ${y})`} fontSize={Math.min(TAILLE_TEXTE, (exterieur - interieur) * 0.4)}>{texte}</text>
      )}
    </g>
  );
}

interface ProprietesFiche {
  readonly part: Part;
  readonly elements: readonly Element[];
  readonly ouvert: boolean;
  readonly zoomer: () => void;
  readonly ouvrir: () => void;
  readonly essayerPoids: (poids: number | null) => void;
  readonly essayerAvancement: (valeur: number | null) => void;
  readonly modifier: (changements: Changements) => Promise<void>;
  readonly creer: (champs: Changements & { titre: string }) => Promise<void>;
  readonly supprimer: () => Promise<void>;
  readonly egaliser: () => Promise<void>;
  readonly creerListe: (texte: string) => Promise<number>;
  /** La teinte choisie, ou '' (automatique). */
  readonly teinte: string;
  readonly colorer: (teinte: string | null) => Promise<void>;
}

/** La fiche de la part choisie : ce qu'elle pèse, où elle en est, et de quoi la changer. */
function FichePart({ part, elements, zoomer, ouvrir, essayerPoids, essayerAvancement, modifier, creer, supprimer, egaliser, creerListe, teinte, colorer }: ProprietesFiche) {
  const e = part.element;
  const enfants = enfantsParParent(elements);
  const soeurs = enfantsDe(e.parent, elements, enfants).filter((s) => s.id !== e.id);
  const [importance, setImportance] = useState(Math.round(part.part * 100));
  const [avancement, setAvancement] = useState(e.avancement ?? 0);
  const [titre, setTitre] = useState(e.titre);
  const curseurImportance = useRef<HTMLInputElement>(null);
  const curseurAvancement = useRef<HTMLInputElement>(null);

  // Le curseur se suit sous le doigt (événement « input ») ; on n'enregistre qu'au lâcher (« change »).
  // React appelle « onChange » l'événement « input » : le vrai « change » s'écoute à la main.
  useEffect(() => {
    const champ = curseurImportance.current;
    if (!champ) return undefined;
    const lacher = (): void => {
      const p = Number(champ.value) / 100;
      void modifier({ poids: poidsPourPart(p, soeurs.map((s) => s.poids)) });
    };
    champ.addEventListener('change', lacher);
    return () => champ.removeEventListener('change', lacher);
  });
  useEffect(() => {
    const champ = curseurAvancement.current;
    if (!champ) return undefined;
    const lacher = (): void => { void modifier({ avancement: Number(champ.value) }); };
    champ.addEventListener('change', lacher);
    return () => champ.removeEventListener('change', lacher);
  });

  async function renommer(): Promise<void> {
    if (titre.trim() === '' || titre.trim() === e.titre) return;
    await modifier({ titre: titre.trim() });
  }

  return (
    <section className="fiche-part" aria-label={`Fiche de « ${e.titre} »`}>
      <form onSubmit={(ev) => { ev.preventDefault(); void renommer(); }} className="titre-fiche">
        <input aria-label="Titre de la part" value={titre} maxLength={200} onChange={(ev) => setTitre(ev.target.value)}
          onBlur={() => void renommer()} />
      </form>
      <p className="doux">
        {e.type} · <span className="part-du-parent">{pourcent(part.part)}</span> de son parent
        (<span className="part-du-centre">{pourcent(part.absolue)}</span> du centre) ·
        avancement <span className="avancement-part">{Math.round(part.avancement)} %</span>{part.calcule ? ' (calculé)' : ''}
        {e.echeance && <> · échéance {e.echeance}</>}
      </p>

      {soeurs.length > 0 ? (
        <label className="curseur">
          <span>Importance : <output>{importance} %</output></span>
          <input ref={curseurImportance} type="range" min={1} max={99} step={1} value={importance} aria-label="Importance"
            onChange={(ev) => {
              const v = Number(ev.target.value);
              setImportance(v);
              essayerPoids(poidsPourPart(v / 100, soeurs.map((s) => s.poids)));
            }} />
        </label>
      ) : <p className="doux">Seule dans son parent : elle en fait 100 %.</p>}

      {part.calcule ? (
        <p className="doux">L’avancement se calcule à partir de ses sous-éléments.</p>
      ) : (
        <div className="rangee-avancement">
          <label className="curseur">
            <span>Avancement : <output>{e.statut === 'fait' ? 100 : avancement} %</output></span>
            <input ref={curseurAvancement} type="range" min={0} max={100} step={5} value={e.statut === 'fait' ? 100 : avancement}
              aria-label="Avancement" disabled={e.statut === 'fait'}
              onChange={(ev) => { const v = Number(ev.target.value); setAvancement(v); essayerAvancement(v); }} />
          </label>
          <label className="case-fait">
            <input type="checkbox" checked={e.statut === 'fait'} onChange={(ev) => void modifier({ statut: ev.target.checked ? 'fait' : 'a_faire' })} />
            Fait
          </label>
        </div>
      )}

      <label className="couleur">
        Couleur
        <select value={teinte} onChange={(ev) => void colorer(ev.target.value || null)}>
          <option value="">Automatique</option>
          {TEINTES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <div className="actions-fiche">
        <button type="button" onClick={zoomer}>Zoomer</button>
        {(enfants.get(e.id) ?? []).length > 1 && <button type="button" onClick={() => void egaliser()}>Égaliser les sous-éléments</button>}
        <button type="button" onClick={ouvrir}>Détail</button>
        <button type="button" className="danger" onClick={() => void supprimer()}>Supprimer</button>
      </div>
      <Ajout parent={e} soeursDuNouveau={enfants.get(e.id) ?? []} libelle="Sous-élément" creer={creer} />
      <Ajout parent={e.parent === null ? null : elements.find((x) => x.id === e.parent) ?? null}
        soeursDuNouveau={[e, ...soeurs]} libelle="À côté" creer={creer} />
      <CollerListe creerListe={creerListe} />
    </section>
  );
}

/** Sans part choisie : ajouter un élément au centre. */
function AjoutAuCentre({ centre, elements, creer, creerListe, egaliser }: { centre: Element | null; elements: readonly Element[];
  creer: (champs: Changements & { titre: string }) => Promise<void>; creerListe: (texte: string) => Promise<number>;
  egaliser: () => Promise<void> }) {
  const premiers = enfantsDe(centre?.id ?? null, elements);
  return (
    <section className="fiche-part" aria-label="Ajouter au centre">
      <p className="doux">Toucher une part pour la choisir ; la retoucher pour zoomer ; le centre pour remonter.</p>
      {premiers.length > 1 && (
        <div className="actions-fiche">
          <button type="button" onClick={() => void egaliser()}>Égaliser les sous-éléments</button>
        </div>
      )}
      <Ajout parent={centre} soeursDuNouveau={premiers} libelle={centre ? `Dans « ${centre.titre} »` : 'Dans Tout'} creer={creer} />
      <CollerListe creerListe={creerListe} />
    </section>
  );
}

/**
 * Un champ pour ajouter un élément dans `parent` (null : à la racine). Son type : celui d'une sœur,
 * sinon « objectif » à la racine et « tâche » ailleurs. Il prend le rang après la dernière sœur.
 */
function Ajout({ parent, soeursDuNouveau, libelle, creer }: { parent: Element | null; soeursDuNouveau: readonly Element[];
  libelle: string; creer: (champs: Changements & { titre: string }) => Promise<void> }) {
  const [titre, setTitre] = useState('');
  async function ajouter(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    if (titre.trim() === '') return;
    const type = soeursDuNouveau[0]?.type ?? (parent === null ? 'objectif' : 'tache');
    const rangs = soeursDuNouveau.map((s) => s.rang).filter((r): r is number => r !== null);
    await creer({
      titre: titre.trim(), type, parent: parent?.id ?? null,
      ...(rangs.length === soeursDuNouveau.length && rangs.length > 0 ? { rang: Math.max(...rangs) + 1000 } : {}),
    });
    setTitre('');
  }
  return (
    <form className="ajout" onSubmit={(ev) => void ajouter(ev)} autoComplete="off">
      <input aria-label={`Ajouter : ${libelle}`} placeholder={`+ ${libelle}…`} maxLength={200} enterKeyHint="done"
        value={titre} onChange={(ev) => setTitre(ev.target.value)} />
      <button type="submit" disabled={titre.trim() === ''}>Ajouter</button>
    </form>
  );
}

/**
 * Enregistre le dessin dans un fichier SVG. Les couleurs viennent de la feuille de style (clair ou
 * sombre) : on les recopie sur chaque forme, pour que le fichier s'affiche pareil hors de l'appli.
 */
function enregistrerImage(svg: SVGSVGElement | null, titre: string): void {
  if (!svg) return;
  const copie = svg.cloneNode(true) as SVGSVGElement;
  const originaux = svg.querySelectorAll<SVGElement>('path, text, circle');
  const copies = copie.querySelectorAll<SVGElement>('path, text, circle');
  originaux.forEach((o, i) => {
    const style = getComputedStyle(o);
    const c = copies[i];
    if (!c) return;
    for (const prop of ['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline']) {
      c.setAttribute(prop, style.getPropertyValue(prop));
    }
  });
  copie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copie.setAttribute('width', '800');
  copie.setAttribute('height', '800');
  copie.setAttribute('font-family', getComputedStyle(svg).fontFamily);
  const fond = getComputedStyle(document.body).backgroundColor;
  copie.insertAdjacentHTML('afterbegin', `<rect x="-100" y="-100" width="200" height="200" fill="${fond}"/>`);
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copie)], { type: 'image/svg+xml' }));
  lien.download = `cercles-${titre.normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tout'}.svg`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

/**
 * Coller une liste indentée (d'un éditeur, d'un tableur, de Claude) : chaque ligne devient un
 * sous-élément, la profondeur suit le retrait. Replié par défaut, pour ne pas encombrer la fiche.
 */
function CollerListe({ creerListe }: { creerListe: (texte: string) => Promise<number> }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const n = lireListe(texte).length;
  return (
    <details className="coller-liste">
      <summary>Coller une liste</summary>
      <textarea aria-label="Liste à coller" rows={5} value={texte} onChange={(ev) => setTexte(ev.target.value)}
        placeholder={'Une ligne par élément, en retrait pour un sous-élément :\nSanté\n  Courir\n  Dormir\nFamille'} />
      <button type="button" disabled={n === 0 || envoi}
        onClick={() => { setEnvoi(true); void creerListe(texte).then(() => { setTexte(''); setEnvoi(false); }); }}>
        {n > 1 ? `Créer ${n} sous-éléments` : 'Créer le sous-élément'}
      </button>
    </details>
  );
}

/** Enregistre le tableau CSV de la branche dans un fichier. */
function exporterCsv(csv: string, titre: string): void {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  lien.download = `cercles-${titre.normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tout'}.csv`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

// Le serveur MCP (Model Context Protocol, le protocole par lequel Claude utilise des outils
// extérieurs), servi à /mcp. Étape 2 : les outils avec lesquels Claude lit et écrit les tâches
// d'Adrien depuis une conversation. Chaque outil appelle le service d'application, comme l'API de
// la page, avec Claude pour auteur dans le journal.
//
// Mode « sans session » : chaque requête HTTP crée son serveur et son transport, répond, et tout
// est oublié. Un Worker ne garde rien entre deux requêtes ; pas besoin de Durable Object ici.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { aujourdhuiAParis } from '../application/aujourdhui';
import { ErreurConflit, ErreurIntrouvable } from '../application/erreurs';
import type { DemandeCreation, ElementComplet, FiltresRecherche, ServiceElements, Statut, Trouve } from '../application/service-elements';
import { messageBonjour } from '../domaine/bonjour';
import type { InstantaneElement } from '../domaine/element';
import { ErreurDomaine } from '../domaine/erreur-domaine';
import type { ChangementsElement } from '../domaine/modifier-element';
import { Tag } from '../domaine/tag';

/** Ce que les outils utilisent : le service d'application (la base, en vrai). */
export type SourcesMcp = Pick<ServiceElements,
  'compter' | 'chercher' | 'lire' | 'creer' | 'modifier' | 'supprimer' | 'restaurer' | 'commenter' | 'lier'
  | 'delier' | 'tagger' | 'detagger' | 'types' | 'trouverProjet'>;

/** Ce que Claude lit en se connectant : comment Crazybrain est organisé, et comment s'en servir. */
const INSTRUCTIONS = `Crazybrain est l'outil de gestion de tâches et de projets d'Adrien.
Tout est un « élément » : projet, initiative, objectif, epic, feature, tâche (type « tache »).
- Un élément peut être rangé dans un parent (le sous-projet dans son projet, la tâche dans sa feature).
- Une tâche se rattache à un ou plusieurs projets par un lien « appartient_a » : à la création, donner « projets » (id ou titre exact du projet).
- Les tags sont « cle:valeur » ou « cle » (composant:pxe, release:v1, urgent). « projet » n'est pas un tag.
- Statuts : a_faire, en_cours, fait. Priorités : basse, normale, haute, urgente. Dates AAAA-MM-JJ, heures HH:MM, estimation en minutes.
- Vue en cercles : « poids » dit ce que pèse un élément parmi ses frères (sa part dans son parent = son poids sur la somme des poids des frères ; sans poids, il compte pour 1). « avancement » (0 à 100) se saisit sur un élément sans enfant ; celui d'un parent se calcule de ses enfants, pondéré par leurs parts, et un élément « fait » vaut 100.
- Supprimer archive l'élément : il sort des listes et peut se restaurer.
Avant de créer un projet, chercher s'il existe déjà. Les dates relatives (« demain », « vendredi ») se comptent au jour de Paris.
Tout ce que Claude fait ici est noté dans le journal avec Claude pour auteur.`;

const statut = z.enum(['a_faire', 'en_cours', 'fait']);
const priorite = z.enum(['basse', 'normale', 'haute', 'urgente']);
const jour = z.string().describe('Jour AAAA-MM-JJ');

/** Les champs qu'on peut donner à la création et changer ensuite. */
const champsElement = {
  type: z.string().optional().describe('Code du type : tache (par défaut), projet, initiative, objectif, epic, feature'),
  parent: z.string().nullable().optional().describe("Id de l'élément qui le contient ; null pour le sortir de son parent"),
  description: z.string().nullable().optional().describe('Texte en Markdown'),
  priorite: priorite.nullable().optional(),
  echeance: jour.nullable().optional().describe('Date limite, AAAA-MM-JJ'),
  jourPlanifie: jour.nullable().optional().describe("Le jour où Adrien prévoit de le faire, AAAA-MM-JJ"),
  heurePlanifiee: z.string().nullable().optional().describe('HH:MM, seulement avec un jour planifié'),
  estimation: z.number().int().nullable().optional().describe('Temps prévu, en minutes'),
  poids: z.number().positive().nullable().optional().describe('Ce que pèse l\'élément parmi ses frères (vue en cercles) ; null : compte pour 1'),
  avancement: z.number().int().min(0).max(100).nullable().optional().describe('Avancement saisi, 0 à 100, pour un élément sans enfant'),
};

/** Le texte rendu à Claude : du JSON lisible. */
function texte(valeur: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: typeof valeur === 'string' ? valeur : JSON.stringify(valeur, null, 2) }] };
}

/** Une erreur prévue (valeur invalide, élément introuvable, conflit) revient à Claude comme un message, pas comme une panne. */
async function proteger(action: () => Promise<{ content: { type: 'text'; text: string }[] }>):
  Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    return await action();
  } catch (erreur) {
    if (erreur instanceof ErreurDomaine || erreur instanceof ErreurIntrouvable || erreur instanceof ErreurConflit) {
      return { ...texte(`Refusé : ${erreur.message}`), isError: true };
    }
    throw erreur;
  }
}

/** Un élément en bref, pour les listes : seulement les champs remplis. */
function enBref(element: InstantaneElement, tags?: string[]): Record<string, unknown> {
  const bref: Record<string, unknown> = { id: element.id, type: element.type, titre: element.titre, statut: element.statut };
  for (const cle of ['priorite', 'echeance', 'jourPlanifie', 'heurePlanifiee', 'estimation', 'parent', 'poids', 'avancement'] as const) {
    if (element[cle] !== null) bref[cle] = element[cle];
  }
  if (tags?.length) bref.tags = tags;
  return bref;
}

function complet(lu: ElementComplet): Record<string, unknown> {
  return {
    ...lu.element,
    tags: lu.tags.map((t) => (t.valeur === '' ? t.cle : `${t.cle}:${t.valeur}`)),
    liens: lu.liens,
    commentaires: lu.commentaires,
  };
}

/**
 * Une version du protocole MCP plus récente que la bibliothèque (claude.ai annonçait 2026-07-28 le
 * 07/11, la bibliothèque 1.32.2 s'arrête à 2025-11-25) : on répond dans la plus récente qu'on connaît
 * au lieu de refuser chaque appel (400). Les appels dont se sert Crazybrain (lister et appeler les
 * outils) n'ont pas changé de forme entre ces versions. À retirer quand la bibliothèque la connaîtra.
 */
export function versionConnue(requete: Request): Request {
  const version = requete.headers.get('mcp-protocol-version');
  if (version === null || SUPPORTED_PROTOCOL_VERSIONS.includes(version)) return requete;
  const entetes = new Headers(requete.headers);
  entetes.set('mcp-protocol-version', LATEST_PROTOCOL_VERSION);
  return new Request(requete, { headers: entetes });
}

export async function repondreMcp(requete: Request, sources: SourcesMcp, horloge: () => Date = () => new Date()): Promise<Response> {
  const serveur = new McpServer({ name: 'crazybrain', version: '0.2.0' }, { instructions: INSTRUCTIONS });

  serveur.registerTool('bonjour', {
    title: 'Bonjour',
    description: 'Dit bonjour depuis Crazybrain et donne le nombre de tâches en base. Sert à vérifier que le connecteur marche.',
    annotations: { readOnlyHint: true },
  }, async () => texte(messageBonjour(await sources.compter())));

  serveur.registerTool('chercher_elements', {
    title: 'Chercher des éléments',
    description: `Cherche les tâches, projets et autres éléments d'Adrien. Tous les filtres sont facultatifs et se cumulent.
Sans filtre de statut, les éléments faits sont exclus (inclureFaits pour les avoir).
Pour « qu'est-ce qui est en retard ? » : enRetard. Pour « qu'est-ce que j'ai aujourd'hui ? » : aujourdhui. Pour « sur quoi ai-je travaillé ? » : tri modifie.`,
    inputSchema: {
      texte: z.string().optional().describe('Un morceau du titre ou de la description'),
      statuts: z.array(statut).optional(),
      types: z.array(z.string()).optional().describe('Codes de type : tache, projet…'),
      projet: z.string().optional().describe("Id ou titre exact d'un projet : ce qui lui appartient ou est rangé dedans, sous-projets compris"),
      parent: z.string().optional().describe("Id du parent : ses enfants directs"),
      tags: z.array(z.string()).optional().describe('Tags exigés : « cle » ou « cle:valeur »'),
      enRetard: z.boolean().optional().describe("Échéance dépassée (avant aujourd'hui, à Paris) et pas faite"),
      aujourdhui: z.boolean().optional().describe("Planifié pour aujourd'hui (à Paris)"),
      echeanceJusquA: jour.optional().describe('Échéance au plus tard ce jour'),
      jourPlanifie: jour.optional().describe('Planifié ce jour-là'),
      inclureFaits: z.boolean().optional(),
      limite: z.number().int().min(1).max(200).optional().describe('50 par défaut'),
      tri: z.enum(['echeance', 'modifie']).optional().describe("echeance (défaut : la plus proche d'abord) ou modifie (modifié le plus récemment d'abord : commentaire, tag et lien comptent)"),
    },
    annotations: { readOnlyHint: true },
  }, async (a) => proteger(async () => {
    const auj = aujourdhuiAParis(horloge());
    let statuts: Statut[] | undefined = a.statuts;
    if (!statuts && !a.inclureFaits) statuts = ['a_faire', 'en_cours'];
    if (a.enRetard) statuts = (statuts ?? ['a_faire', 'en_cours']).filter((s) => s !== 'fait');
    const filtres: FiltresRecherche = {
      ...(a.texte ? { texte: a.texte } : {}),
      ...(statuts ? { statuts } : {}),
      ...(a.types ? { types: a.types } : {}),
      ...(a.projet ? { projet: await sources.trouverProjet(a.projet) } : {}),
      ...(a.parent ? { parent: a.parent } : {}),
      ...(a.tags ? { tags: a.tags.map((t) => Tag.lire(t)).map((t) => (t.valeur === '' ? { cle: t.cle } : { cle: t.cle, valeur: t.valeur })) } : {}),
      ...(a.enRetard ? { echeanceAvant: auj } : {}),
      ...(a.echeanceJusquA ? { echeanceJusquA: a.echeanceJusquA } : {}),
      ...(a.aujourdhui ? { jourPlanifie: auj } : a.jourPlanifie ? { jourPlanifie: a.jourPlanifie } : {}),
      ...(a.limite ? { limite: a.limite } : {}),
      ...(a.tri ? { tri: a.tri } : {}),
    };
    const trouves: Trouve[] = await sources.chercher(filtres);
    return texte({ aujourdhui: auj, nombre: trouves.length, elements: trouves.map((t) => enBref(t.element, t.tags)) });
  }));

  serveur.registerTool('lire_element', {
    title: 'Lire un élément',
    description: 'Lit un élément en entier : tous ses champs, ses tags, ses liens (où il est source ou cible) et ses commentaires.',
    inputSchema: { id: z.string() },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => proteger(async () => texte(complet(await sources.lire(id)))));

  serveur.registerTool('creer_elements', {
    title: 'Créer des éléments',
    description: `Crée un ou plusieurs éléments (50 au plus), dans l'ordre. Chacun a au moins un titre.
« projets » rattache l'élément à des projets (id ou titre exact) ; « tags » pose des tags. Si un élément est refusé, les précédents restent créés et la réponse le dit.`,
    inputSchema: {
      elements: z.array(z.object({
        titre: z.string(),
        statut: statut.optional().describe('a_faire par défaut'),
        ...champsElement,
        projets: z.array(z.string()).optional().describe('Id ou titre exact des projets auxquels il appartient'),
        tags: z.array(z.string()).optional().describe('« cle » ou « cle:valeur »'),
      })).min(1).max(50),
    },
  }, async ({ elements }) => {
    const crees: Record<string, unknown>[] = [];
    for (const [i, demande] of elements.entries()) {
      const resultat = await proteger(async () => {
        const lu = await sources.creer(demande as DemandeCreation, 'claude');
        crees.push(complet(lu));
        return texte('');
      });
      if (resultat.isError) {
        return { ...texte({ crees, refuse: { rang: i + 1, titre: demande.titre, raison: resultat.content[0]?.text } }), isError: true };
      }
    }
    return texte({ crees });
  });

  serveur.registerTool('modifier_element', {
    title: 'Modifier un élément',
    description: 'Change les champs donnés, et seulement eux. null vide un champ facultatif. Pour marquer une tâche faite : statut « fait ».',
    inputSchema: { id: z.string(), titre: z.string().optional(), statut: statut.optional(), ...champsElement, rang: z.number().nullable().optional() },
  }, async ({ id, ...changements }) => proteger(async () =>
    texte(await sources.modifier(id, changements as ChangementsElement, 'claude'))));

  serveur.registerTool('supprimer_element', {
    title: 'Supprimer un élément',
    description: "Supprime un élément en l'archivant : il sort des listes, son histoire reste, restaurer_element le remet.",
    inputSchema: { id: z.string() },
    annotations: { destructiveHint: true },
  }, async ({ id }) => proteger(async () => {
    await sources.supprimer(id, 'claude');
    return texte(`Élément ${id} supprimé (archivé).`);
  }));

  serveur.registerTool('restaurer_element', {
    title: 'Restaurer un élément',
    description: 'Remet un élément supprimé.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => proteger(async () => texte(await sources.restaurer(id, 'claude'))));

  serveur.registerTool('commenter_element', {
    title: 'Commenter un élément',
    description: 'Ajoute un commentaire (Markdown) à un élément, avec Claude pour auteur.',
    inputSchema: { id: z.string(), texte: z.string() },
  }, async ({ id, texte: contenu }) => proteger(async () => texte(await sources.commenter(id, contenu, 'claude'))));

  serveur.registerTool('lier_elements', {
    title: 'Lier deux éléments',
    description: `Crée un lien de la source vers la cible. Types : appartient_a (la source fait partie du projet cible),
bloque (la source empêche la cible d'avancer), duplique (la source est un doublon de la cible), lie_a.`,
    inputSchema: { source: z.string(), cible: z.string(), type: z.enum(['appartient_a', 'bloque', 'duplique', 'lie_a']) },
  }, async ({ source, cible, type }) => proteger(async () => texte(await sources.lier(source, cible, type, 'claude'))));

  serveur.registerTool('retirer_lien', {
    title: 'Retirer un lien',
    description: "Retire un lien, par son id (lire_element donne les liens d'un élément avec leur id).",
    inputSchema: { id: z.string() },
  }, async ({ id }) => proteger(async () => {
    await sources.delier(id, 'claude');
    return texte(`Lien ${id} retiré.`);
  }));

  serveur.registerTool('tagger_element', {
    title: 'Poser des tags',
    description: 'Pose des tags « cle » ou « cle:valeur » sur un élément. Un tag déjà posé ne change rien.',
    inputSchema: { id: z.string(), tags: z.array(z.string()).min(1) },
  }, async ({ id, tags }) => proteger(async () => {
    const poses = [];
    for (const tag of tags) poses.push((await sources.tagger(id, tag, 'claude')).tag);
    return texte({ id, tags: poses.map((t) => (t.valeur === '' ? t.cle : `${t.cle}:${t.valeur}`)) });
  }));

  serveur.registerTool('retirer_tag', {
    title: 'Retirer un tag',
    description: 'Retire un tag « cle » ou « cle:valeur » d’un élément.',
    inputSchema: { id: z.string(), tag: z.string() },
  }, async ({ id, tag }) => proteger(async () => {
    await sources.detagger(id, tag, 'claude');
    return texte(`Tag ${tag} retiré de ${id}.`);
  }));

  serveur.registerTool('lister_types', {
    title: "Lister les types d'éléments",
    description: "Les types d'éléments possibles (code et libellé).",
    annotations: { readOnlyHint: true },
  }, async () => texte(await sources.types()));

  // enableJsonResponse : une réponse JSON simple plutôt qu'un flux SSE (aucun outil n'envoie de
  // progression). Sans sessionIdGenerator, le transport est sans session.
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await serveur.connect(transport);
  return transport.handleRequest(versionConnue(requete));
}

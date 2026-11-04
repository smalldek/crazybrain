// Le serveur MCP (Model Context Protocol, le protocole par lequel Claude utilise des outils
// extérieurs), servi à /mcp. Un seul outil pour l'étape 1c : `bonjour`.
//
// Mode « sans session » : chaque requête HTTP crée son serveur et son transport, répond, et tout
// est oublié. Un Worker ne garde rien entre deux requêtes ; pas besoin de Durable Object ici.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { messageBonjour } from '../domaine/bonjour';

/** Ce dont les outils ont besoin, sans savoir d'où ça vient (la base, en vrai ; un faux, en test). */
export interface SourcesMcp {
  compterTaches(): Promise<number>;
}

export async function repondreMcp(requete: Request, sources: SourcesMcp): Promise<Response> {
  const serveur = new McpServer({ name: 'crazybrain', version: '0.1.0' });
  serveur.registerTool(
    'bonjour',
    {
      title: 'Bonjour',
      description: 'Dit bonjour depuis Crazybrain et donne le nombre de tâches en base. Sert à vérifier que le connecteur marche.',
      annotations: { readOnlyHint: true },
    },
    async () => ({ content: [{ type: 'text', text: messageBonjour(await sources.compterTaches()) }] }),
  );
  // enableJsonResponse : une réponse JSON simple plutôt qu'un flux SSE (aucun outil n'envoie de
  // progression). Sans sessionIdGenerator, le transport est sans session.
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await serveur.connect(transport);
  return transport.handleRequest(requete);
}

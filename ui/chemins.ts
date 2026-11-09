// Les adresses de l'appli, sans le navigateur : testées seules (tests/unitaires/interface-formulaire.test.ts).
// `/` la liste, `/kanban` le kanban, `/backlog` le backlog, `/projets` les projets et les releases,
// `/cercles` les objectifs en cercles ;
// `/e/<id>`, `/kanban/e/<id>`… ajoutent le panneau de détail d'un élément à la vue.

export type Vue = 'liste' | 'kanban' | 'backlog' | 'projets' | 'cercles';

const PREFIXE: Record<Vue, string> = { liste: '', kanban: '/kanban', backlog: '/backlog', projets: '/projets', cercles: '/cercles' };

/** La vue que montre cette adresse. */
export function vueDe(chemin: string): Vue {
  for (const vue of ['kanban', 'backlog', 'projets', 'cercles'] as const) {
    if (chemin === PREFIXE[vue] || chemin.startsWith(`${PREFIXE[vue]}/`)) return vue;
  }
  return 'liste';
}

/** L'adresse d'une vue, sans panneau. */
export function adresseVue(vue: Vue): string {
  return PREFIXE[vue] || '/';
}

/** L'adresse du panneau de détail d'un élément, dans une vue (la liste par défaut). */
export function adresseElement(id: string, vue: Vue = 'liste'): string {
  return `${PREFIXE[vue]}/e/${encodeURIComponent(id)}`;
}

/** L'id de l'élément ouvert par cette adresse, ou null. */
export function elementDeLAdresse(chemin: string): string | null {
  const trouve = /^(?:\/kanban|\/backlog|\/projets|\/cercles)?\/e\/([^/]+)\/?$/.exec(chemin);
  if (!trouve?.[1]) return null;
  try {
    return decodeURIComponent(trouve[1]);
  } catch {
    return null;
  }
}

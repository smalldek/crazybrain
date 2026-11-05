// Les adresses de l'appli, sans le navigateur : testées seules (tests/unitaires/interface-formulaire.test.ts).

/** L'adresse du panneau de détail d'un élément. */
export function adresseElement(id: string): string {
  return `/e/${encodeURIComponent(id)}`;
}

/** L'id de l'élément ouvert par cette adresse, ou null. */
export function elementDeLAdresse(chemin: string): string | null {
  const trouve = /^\/e\/([^/]+)\/?$/.exec(chemin);
  if (!trouve?.[1]) return null;
  try {
    return decodeURIComponent(trouve[1]);
  } catch {
    return null;
  }
}

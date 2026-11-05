// L'adresse de la page (ce qui suit le nom de domaine) décide de l'écran : `/` la liste,
// `/e/<id>` la liste avec le panneau de détail de cet élément. Changer d'écran change l'adresse
// (on peut la copier, la partager, revenir en arrière), sans recharger la page.
import { useEffect, useState } from 'react';

import { adresseElement, vueDe } from './chemins';

export { adresseElement, adresseVue, elementDeLAdresse, vueDe, type Vue } from './chemins';

/** L'adresse du panneau d'un élément, dans la vue où l'on est. */
export function adresseIci(id: string): string {
  return adresseElement(id, vueDe(window.location.pathname)) + window.location.search;
}

const AVERTIR = 'crazybrain:adresse';

/**
 * Va à une adresse de l'appli (chemin, et paramètres après « ? » s'il y en a), sans recharger :
 * l'historique du navigateur la retient (sauf avec `remplacer`).
 */
export function naviguer(chemin: string, { remplacer = false } = {}): void {
  if (chemin === window.location.pathname + window.location.search) return;
  // `remplacer` : pour ce qui change à chaque lettre (la recherche), qui ne doit pas remplir l'historique.
  if (remplacer) window.history.replaceState(null, '', chemin);
  else window.history.pushState(null, '', chemin);
  window.dispatchEvent(new Event(AVERTIR));
}

/** L'adresse courante : le chemin, et les paramètres (`?couloirs=…`). */
export interface Adresse {
  readonly chemin: string;
  readonly parametres: URLSearchParams;
}

const lire = (): Adresse => ({ chemin: window.location.pathname, parametres: new URLSearchParams(window.location.search) });

/** L'adresse courante ; le composant se redessine quand elle change (lien, bouton Retour). */
export function useAdresse(): Adresse {
  const [adresse, setAdresse] = useState(lire);
  useEffect(() => {
    const suivre = (): void => setAdresse(lire());
    window.addEventListener('popstate', suivre);
    window.addEventListener(AVERTIR, suivre);
    return () => {
      window.removeEventListener('popstate', suivre);
      window.removeEventListener(AVERTIR, suivre);
    };
  }, []);
  return adresse;
}

/** Les paramètres de l'adresse courante, à garder quand on change d'écran dans la même vue. */
export function parametresIci(): string {
  return window.location.search;
}

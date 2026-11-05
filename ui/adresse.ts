// L'adresse de la page (ce qui suit le nom de domaine) décide de l'écran : `/` la liste,
// `/e/<id>` la liste avec le panneau de détail de cet élément. Changer d'écran change l'adresse
// (on peut la copier, la partager, revenir en arrière), sans recharger la page.
import { useEffect, useState } from 'react';

import { adresseElement, vueDe } from './chemins';

export { adresseElement, adresseVue, elementDeLAdresse, vueDe, type Vue } from './chemins';

/** L'adresse du panneau d'un élément, dans la vue où l'on est. */
export function adresseIci(id: string): string {
  return adresseElement(id, vueDe(window.location.pathname));
}

const AVERTIR = 'crazybrain:adresse';

/** Va à une adresse de l'appli, sans recharger : l'historique du navigateur la retient. */
export function naviguer(chemin: string): void {
  if (chemin === window.location.pathname) return;
  window.history.pushState(null, '', chemin);
  window.dispatchEvent(new Event(AVERTIR));
}

/** L'adresse courante ; le composant se redessine quand elle change (lien, bouton Retour). */
export function useAdresse(): string {
  const [chemin, setChemin] = useState(window.location.pathname);
  useEffect(() => {
    const suivre = (): void => setChemin(window.location.pathname);
    window.addEventListener('popstate', suivre);
    window.addEventListener(AVERTIR, suivre);
    return () => {
      window.removeEventListener('popstate', suivre);
      window.removeEventListener(AVERTIR, suivre);
    };
  }, []);
  return chemin;
}

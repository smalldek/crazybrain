// Les règles de la liste, sans React : testées seules (tests/unitaires/interface-liste.test.ts).
import type { Changements, Element } from './api';

/** Les tâches à faire d'abord (dans l'ordre de l'API : les plus récentes en haut), les faites ensuite. */
export function ordonner(elements: readonly Element[]): Element[] {
  const aFaire = elements.filter((e) => e.statut !== 'fait');
  const faites = elements.filter((e) => e.statut === 'fait')
    .sort((a, b) => (b.faitLe ?? '').localeCompare(a.faitLe ?? ''));
  return [...aFaire, ...faites];
}

/** L'élément tel qu'il sera une fois le changement accepté (même règle de « fait le » que le domaine). */
export function appliquer(element: Element, changements: Changements): Element {
  const faitLe = changements.statut === undefined ? element.faitLe
    : changements.statut !== 'fait' ? null
      : element.statut === 'fait' ? element.faitLe : new Date().toISOString();
  return { ...element, ...changements, faitLe };
}

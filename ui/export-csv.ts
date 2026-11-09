// L'export en CSV de la branche au centre des cercles, sans React : testé seul
// (tests/unitaires/interface-export-csv.test.ts). Séparateur « ; » et marque UTF-8 en tête, pour
// qu'un tableur réglé en français l'ouvre directement avec ses accents.
import { avancementsCalcules, parts } from '../src/domaine/cercles';
import type { Element } from './api';
import { enfantsDe, enfantsParParent } from './cercles';

const ENTETE = ['Niveau', 'Titre', 'Type', 'Statut', 'Part du parent (%)', 'Part du centre (%)', 'Avancement (%)', 'Échéance', 'Tags'];

/** Une cellule : entre guillemets si elle contient le séparateur, un guillemet ou un retour à la ligne. */
function cellule(valeur: string): string {
  return /[;"\n\r]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur;
}

const enPourcent = (fraction: number): string => (Math.round(fraction * 1000) / 10).toString().replace('.', ',');

/**
 * Le tableau de tout ce qui est sous le centre (null : « Tout »), à tous les niveaux, dans l'ordre de
 * lecture (un élément puis ses sous-éléments). `tags` : les tags de chaque élément, en texte.
 */
export function csvDeBranche(elements: readonly Element[], centre: string | null, tags: ReadonlyMap<string, readonly string[]>): string {
  const enfants = enfantsParParent(elements);
  const avancements = avancementsCalcules(elements);
  const lignes = [ENTETE.join(';')];
  const vus = new Set<string>(centre ? [centre] : []);
  const descendre = (freres: readonly Element[], niveau: number, partDuParent: number): void => {
    const p = parts(freres);
    freres.forEach((e, i) => {
      if (vus.has(e.id)) return;
      vus.add(e.id);
      const absolue = partDuParent * (p[i] ?? 0);
      lignes.push([
        String(niveau), e.titre, e.type, e.statut, enPourcent(p[i] ?? 0), enPourcent(absolue),
        String(Math.round(avancements.get(e.id) ?? 0)), e.echeance ?? '', (tags.get(e.id) ?? []).join(' '),
      ].map(cellule).join(';'));
      descendre(enfants.get(e.id) ?? [], niveau + 1, absolue);
    });
  };
  descendre(enfantsDe(centre, elements, enfants), 1, 1);
  return `﻿${lignes.join('\r\n')}\r\n`;
}

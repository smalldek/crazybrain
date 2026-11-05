import { ErreurDomaine } from './erreur-domaine';
import type { Auteur } from './evenement';

export const COMMENTAIRE_LONGUEUR_MAX = 20_000;

/** Un commentaire, en données simples (pour l'API et le journal). */
export interface InstantaneCommentaire {
  readonly id: string;
  readonly elementId: string;
  /** Markdown. */
  readonly texte: string;
  readonly auteur: Auteur;
  readonly creeLe: string;
}

/** Un commentaire n'est jamais vide. Son auteur est Adrien ou Claude. */
export function creerCommentaire(params: { id: string; elementId: string; texte: string; auteur: Auteur; maintenant: Date }): InstantaneCommentaire {
  const texte = params.texte.trim();
  if (texte.length === 0) throw new ErreurDomaine('Le commentaire ne peut pas être vide.');
  if ([...texte].length > COMMENTAIRE_LONGUEUR_MAX) {
    throw new ErreurDomaine(`Le commentaire dépasse ${COMMENTAIRE_LONGUEUR_MAX} caractères.`);
  }
  return { id: params.id, elementId: params.elementId, texte, auteur: params.auteur, creeLe: params.maintenant.toISOString() };
}

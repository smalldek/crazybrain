// Une requête enregistrée (tâche 4.2) : un nom, une description, et le SQL qui ne lit que les vues.
// Le SQL est vérifié et essayé par le service avant d'être enregistré (verifierLecture, décision 005) ;
// ici, les règles du nom et de la description.
import { ErreurDomaine } from './erreur-domaine';

export const NOM_REQUETE_LONGUEUR_MAX = 80;
export const DESCRIPTION_REQUETE_LONGUEUR_MAX = 1_000;

/** Une requête enregistrée, en données simples (pour l'API, le connecteur et le journal). */
export interface InstantaneRequete {
  readonly id: string;
  readonly nom: string;
  readonly description: string | null;
  readonly sql: string;
  readonly creeLe: string;
  readonly modifieLe: string;
}

/**
 * La requête telle qu'elle sera enregistrée : nouvelle (`existante` absente) ou remplaçant une
 * requête du même nom, dont elle garde l'id et la date de création.
 */
export function preparerRequete(params: {
  id: string; nom: string; description?: string | null; sql: string; maintenant: Date; existante?: InstantaneRequete;
}): InstantaneRequete {
  const nom = params.nom.trim().replace(/\s+/g, ' ');
  if (nom.length === 0) throw new ErreurDomaine('Une requête a un nom.');
  if ([...nom].length > NOM_REQUETE_LONGUEUR_MAX) throw new ErreurDomaine(`Le nom dépasse ${NOM_REQUETE_LONGUEUR_MAX} caractères.`);
  const description = params.description?.trim() || null;
  if (description && [...description].length > DESCRIPTION_REQUETE_LONGUEUR_MAX) {
    throw new ErreurDomaine(`La description dépasse ${DESCRIPTION_REQUETE_LONGUEUR_MAX} caractères.`);
  }
  const maintenant = params.maintenant.toISOString();
  return {
    id: params.existante?.id ?? params.id,
    nom,
    description,
    sql: params.sql,
    creeLe: params.existante?.creeLe ?? maintenant,
    modifieLe: maintenant,
  };
}

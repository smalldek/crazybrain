/**
 * Le jour qu'il est à Paris (AAAA-MM-JJ). Le Worker tourne en UTC : entre minuit et 1 ou 2 heures,
 * le jour UTC est encore la veille. « En retard » se compte au jour d'Adrien.
 */
export function aujourdhuiAParis(maintenant: Date): string {
  // Le format suédois (sv-SE) écrit justement les dates en AAAA-MM-JJ.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maintenant);
}

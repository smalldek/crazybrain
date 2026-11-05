/** Le jour d'aujourd'hui sur le téléphone, au format AAAA-MM-JJ (celui des échéances). */
export function aujourdhui(maintenant: Date = new Date()): string {
  const deux = (n: number): string => String(n).padStart(2, '0');
  return `${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(maintenant.getDate())}`;
}

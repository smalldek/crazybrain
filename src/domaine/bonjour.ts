/**
 * La réponse de l'outil `bonjour` du connecteur Claude : la preuve que Claude atteint bien
 * Crazybrain, et sa base (le nombre de tâches vient de D1).
 */
export function messageBonjour(nombreDeTaches: number): string {
  if (!Number.isInteger(nombreDeTaches) || nombreDeTaches < 0) {
    throw new RangeError(`Nombre de tâches impossible : ${nombreDeTaches}.`);
  }
  const compte =
    nombreDeTaches === 0 ? 'Aucune tâche' : `${nombreDeTaches} tâche${nombreDeTaches > 1 ? 's' : ''}`;
  return `Bonjour depuis Crazybrain ! ${compte} en base.`;
}

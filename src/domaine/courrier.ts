// Un mail devient une tâche (étape 8). Ici, sans Cloudflare : dire si un mail reçu est accepté, et
// en tirer le titre et la description.
//
// Accepté seulement si les trois tiennent :
// - l'expéditeur (l'enveloppe SMTP et l'en-tête From, les deux) est une adresse d'Adrien, donnée
//   par un secret du Worker, jamais écrite dans le dépôt ;
// - le serveur qui a reçu le mail (Cloudflare) a écrit en tête un en-tête Authentication-Results
//   à son nom (son « authserv-id », réglé dans le Worker) ;
// - ce résultat dit spf=pass, et dkim=pass pour le domaine de l'expéditeur.
// Pourquoi exiger le nom du serveur : n'importe qui peut écrire lui-même « dkim=pass » dans son
// mail. Seul l'en-tête du dernier serveur, posé au-dessus de tous les autres, fait foi (RFC 8601).
import { DESCRIPTION_LONGUEUR_MAX } from './description';
import { TITRE_LONGUEUR_MAX } from './titre';

export interface ResultatsAuthentification {
  /** Le serveur qui a écrit le résultat (le premier mot de l'en-tête). */
  readonly authserv: string;
  readonly spf: string | null;
  /** Un résultat par signature DKIM : le verdict et le domaine signataire (header.d). */
  readonly dkim: readonly { readonly resultat: string; readonly domaine: string | null }[];
}

export type Verdict = { readonly accepte: true } | { readonly accepte: false; readonly raison: string };

const adresse = (texte: string): string => texte.trim().toLowerCase();
const domaineDe = (a: string): string => a.slice(a.lastIndexOf('@') + 1);

/** Lit un en-tête Authentication-Results (RFC 8601) ; null s'il n'a pas la forme attendue. */
export function lireResultats(valeur: string): ResultatsAuthentification | null {
  // Les commentaires entre parenthèses ne comptent pas.
  const sansCommentaires = valeur.replace(/\([^()]*\)/g, ' ');
  const [tete, ...morceaux] = sansCommentaires.split(';');
  const authserv = tete?.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!authserv) return null;
  let spf: string | null = null;
  const dkim: { resultat: string; domaine: string | null }[] = [];
  for (const morceau of morceaux) {
    const m = /^\s*(spf|dkim)\s*=\s*([a-z]+)/i.exec(morceau);
    if (!m) continue;
    const resultat = (m[2] ?? '').toLowerCase();
    if (m[1]?.toLowerCase() === 'spf') spf ??= resultat;
    else dkim.push({ resultat, domaine: /header\.d\s*=\s*([^\s;]+)/i.exec(morceau)?.[1]?.toLowerCase() ?? null });
  }
  return { authserv, spf, dkim };
}

/** Accepte ou refuse un mail reçu, avec la raison du refus. */
export function verdictCourrier(mail: {
  /** L'expéditeur de l'enveloppe SMTP (MAIL FROM). */
  readonly enveloppe: string;
  /** L'adresse de l'en-tête From, celle qu'on lit dans le mail. */
  readonly de: string | null;
  /** Le premier en-tête Authentication-Results, le plus haut dans le mail ; null s'il n'y en a pas. */
  readonly resultats: string | null;
  /** Les adresses d'Adrien (secret du Worker) ; vide : tout est refusé. */
  readonly autorises: readonly string[];
  /** Le nom du serveur de Cloudflare qui écrit le résultat (réglage du Worker) ; null : tout est refusé. */
  readonly authserv: string | null;
}): Verdict {
  const autorises = mail.autorises.map(adresse).filter((a) => a.includes('@'));
  if (autorises.length === 0) return { accepte: false, raison: 'aucune adresse autorisée n’est réglée' };
  const de = mail.de === null ? null : adresse(mail.de);
  if (!autorises.includes(adresse(mail.enveloppe)) || de === null || !autorises.includes(de)) {
    return { accepte: false, raison: 'expéditeur non autorisé' };
  }
  const lus = mail.resultats === null ? null : lireResultats(mail.resultats);
  if (lus === null) return { accepte: false, raison: 'pas de résultat d’authentification' };
  if (mail.authserv === null || lus.authserv !== mail.authserv.toLowerCase()) {
    return { accepte: false, raison: `résultat écrit par « ${lus.authserv} », serveur non reconnu` };
  }
  if (lus.spf !== 'pass') return { accepte: false, raison: `SPF ${lus.spf ?? 'absent'}` };
  const domaine = domaineDe(de);
  if (!lus.dkim.some((d) => d.resultat === 'pass' && d.domaine === domaine)) {
    return { accepte: false, raison: `pas de signature DKIM valide de ${domaine}` };
  }
  return { accepte: true };
}

/** Les préfixes que les messageries ajoutent au sujet : « Fwd: », « TR : », « Re: »… */
const PREFIXES = /^\s*(?:(?:fwd?|tr|re|ré|rép|aw|wg)\s*:\s*)+/i;

/**
 * Le titre et la description de la tâche : le sujet sans ses préfixes (ou, sans sujet, la première
 * ligne du texte), et le texte en description, coupés à leurs longueurs maximales.
 */
export function tacheDuCourrier(sujet: string | null, texte: string | null): { titre: string; description: string | null } {
  const corps = (texte ?? '').replace(/\r\n/g, '\n').trim();
  const premiereLigne = corps.split('\n').find((l) => l.trim() !== '')?.trim() ?? '';
  const titre = couper((sujet ?? '').replace(PREFIXES, '').replace(/\s+/g, ' ').trim() || premiereLigne || 'Mail sans sujet', TITRE_LONGUEUR_MAX);
  return { titre, description: corps === '' ? null : couper(corps, DESCRIPTION_LONGUEUR_MAX) };
}

/** Coupe à `max` caractères (pas en plein milieu d'un caractère composé), avec « … » si besoin. */
function couper(texte: string, max: number): string {
  const lettres = [...texte];
  return lettres.length <= max ? texte : `${lettres.slice(0, max - 1).join('')}…`;
}

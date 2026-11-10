// La garde des requêtes en lecture seule (tâche 4.1, décision 005).
//
// Claude écrit une requête SQL ; l'outil la rejoue. D1 n'a pas d'utilisateur en lecture seule, et
// refuse `PRAGMA query_only` (vérifié le 10/11 : « not authorized ») : la garde est donc à nous.
// Elle a deux couches :
//
// 1. Ici, un analyseur lexical (« lexer ») qui découpe le texte comme SQLite le découpe : chaînes
//    '…', noms entre "…", `…` ou […], commentaires -- et /* */. Sur ces morceaux, et non sur le texte
//    brut, on exige : une seule instruction, qui commence par SELECT ou WITH, aucun mot d'écriture
//    (INSERT, DELETE, PRAGMA, ATTACH…), aucune table interne (seulement les vues v_…), des
//    parenthèses équilibrées.
// 2. Puis la requête est enveloppée : `SELECT * FROM (<requête>) LIMIT n`. C'est alors SQLite
//    lui-même, le vrai analyseur, qui refuse tout ce qui n'est pas une lecture : une écriture n'a
//    pas le droit d'être une sous-requête (essayé : « near "DELETE": syntax error »).
//
// Chaque couche suffirait presque seule ; les deux ensemble couvrent l'erreur de l'autre.
import { ErreurDomaine } from './erreur-domaine';

/** Un morceau du texte SQL. `mot` : mot-clé ou nom nu ; `nom` : nom entre guillemets ; `signe` : ponctuation. */
type Morceau =
  | { readonly sorte: 'mot'; readonly texte: string }
  | { readonly sorte: 'nom'; readonly texte: string }
  | { readonly sorte: 'chaine' }
  | { readonly sorte: 'nombre' }
  | { readonly sorte: 'signe'; readonly texte: string; readonly position: number };

/** Le plus de lignes qu'une requête rend (au-delà, la réponse dit qu'elle est tronquée). */
export const LIGNES_MAX = 500;

/** La longueur maximale du texte d'une requête. */
export const LONGUEUR_MAX = 10_000;

/** Les vues qu'une requête a le droit de lire (migration 0007). */
export const VUES = ['v_elements', 'v_tags', 'v_liens', 'v_commentaires', 'v_evenements', 'v_types'] as const;

/**
 * Les mots qui n'apparaissent que dans une écriture, une instruction de schéma ou de transaction.
 * `replace` est à part : c'est aussi une fonction de lecture, `replace(titre, 'a', 'b')`.
 */
const MOTS_INTERDITS = new Set([
  'insert', 'update', 'delete', 'upsert', 'create', 'drop', 'alter', 'attach', 'detach', 'pragma',
  'vacuum', 'reindex', 'analyze', 'begin', 'commit', 'rollback', 'savepoint', 'release', 'transaction',
  'returning', 'load_extension',
]);

/** Le texte d'une requête acceptée, prêt à exécuter : enveloppé et limité. */
export interface RequeteLecture {
  /** La requête telle que Claude l'a écrite, sans le point-virgule final. */
  readonly texte: string;
  /** Ce que la base exécute : la requête en sous-requête, limitée à LIGNES_MAX + 1 lignes (pour savoir si on tronque). */
  readonly sqlExecute: string;
}

/**
 * Vérifie une requête et rend ce qu'il faut exécuter, ou lève ErreurDomaine avec la raison.
 * `tablesInternes` : les noms des tables de la base (lus dans sqlite_master), que la requête ne
 * doit pas nommer ; les noms qui commencent par sqlite_, _cf_ ou d1_ sont refusés de toute façon.
 */
export function verifierLecture(sql: string, tablesInternes: readonly string[]): RequeteLecture {
  if (sql.length > LONGUEUR_MAX) throw new ErreurDomaine(`La requête dépasse ${LONGUEUR_MAX} caractères.`);
  const morceaux = decouper(sql);

  // Une seule instruction : un point-virgule n'est permis qu'à la toute fin.
  let fin = morceaux.length;
  while (fin > 0 && estSigne(morceaux[fin - 1], ';')) fin -= 1;
  const utiles = morceaux.slice(0, fin);
  if (utiles.length === 0) throw new ErreurDomaine('La requête est vide.');
  if (utiles.some((m) => estSigne(m, ';'))) throw new ErreurDomaine('Une seule instruction par requête : pas de « ; » au milieu.');

  const premier = utiles[0];
  if (!(premier?.sorte === 'mot' && (premier.texte === 'select' || premier.texte === 'with'))) {
    throw new ErreurDomaine('Une requête commence par SELECT ou WITH : elle ne fait que lire.');
  }

  const internes = new Set(tablesInternes.map((t) => t.toLowerCase()).filter((t) => !(VUES as readonly string[]).includes(t)));
  let profondeur = 0;
  utiles.forEach((m, i) => {
    if (m.sorte === 'signe' && m.texte === '(') profondeur += 1;
    if (m.sorte === 'signe' && m.texte === ')') {
      profondeur -= 1;
      if (profondeur < 0) throw new ErreurDomaine('Une parenthèse fermante de trop.');
    }
    if (m.sorte === 'signe' && m.texte === '?') throw new ErreurDomaine('Pas de paramètre (?, :nom, @nom, $nom) : la requête porte ses valeurs.');
    if (m.sorte === 'mot' && MOTS_INTERDITS.has(m.texte)) {
      throw new ErreurDomaine(`« ${m.texte.toUpperCase()} » est refusé : une requête ne fait que lire.`);
    }
    if (m.sorte === 'mot' && m.texte === 'replace' && !estSigne(utiles[i + 1], '(')) {
      throw new ErreurDomaine('« REPLACE » n\'est permis que comme fonction, replace(texte, de, par).');
    }
    if (m.sorte === 'mot' || m.sorte === 'nom') {
      const nom = m.texte.toLowerCase();
      if (nom.startsWith('pragma_')) throw new ErreurDomaine(`« ${m.texte} » est refusé : les fonctions PRAGMA lisent le schéma interne.`);
      if (internes.has(nom) || /^(sqlite_|_cf_|d1_)/.test(nom)) {
        throw new ErreurDomaine(`La table « ${m.texte} » ne se lit pas directement : lire les vues ${VUES.join(', ')}.`);
      }
    }
  });
  if (profondeur !== 0) throw new ErreurDomaine('Les parenthèses ne sont pas équilibrées.');

  // La requête d'origine, coupée au premier point-virgule final (ce qui suit n'est que commentaire).
  const pointVirgule = morceaux[fin];
  const texte = (pointVirgule?.sorte === 'signe' ? sql.slice(0, pointVirgule.position) : sql).trim();
  // Les retours à la ligne autour : un commentaire « -- » en fin de requête ne mange pas la parenthèse.
  return { texte, sqlExecute: `SELECT * FROM (\n${texte}\n) LIMIT ${LIGNES_MAX + 1}` };
}

function estSigne(m: Morceau | undefined, signe: string): boolean {
  return m?.sorte === 'signe' && m.texte === signe;
}

/**
 * Découpe le texte comme SQLite (https://sqlite.org/lang_keywords.html, « tokenizer » de SQLite) :
 * les commentaires disparaissent, une chaîne ou un nom non fermé est refusé.
 */
function decouper(sql: string): Morceau[] {
  const morceaux: Morceau[] = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i] ?? '';
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '-' && sql[i + 1] === '-') {
      const finLigne = sql.indexOf('\n', i);
      i = finLigne === -1 ? n : finLigne + 1;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const fin = sql.indexOf('*/', i + 2);
      if (fin === -1) throw new ErreurDomaine('Un commentaire /* n\'est pas fermé.');
      i = fin + 2;
      continue;
    }
    if (c === '\'') {
      i = finDeGuillemets(sql, i, '\'', 'Une chaîne \' n\'est pas fermée.');
      morceaux.push({ sorte: 'chaine' });
      continue;
    }
    if (c === '"' || c === '`') {
      const fin = finDeGuillemets(sql, i, c, `Un nom entre ${c} n'est pas fermé.`);
      morceaux.push({ sorte: 'nom', texte: sql.slice(i + 1, fin - 1).split(c + c).join(c) });
      i = fin;
      continue;
    }
    if (c === '[') {
      const fin = sql.indexOf(']', i);
      if (fin === -1) throw new ErreurDomaine('Un nom entre [ ] n\'est pas fermé.');
      morceaux.push({ sorte: 'nom', texte: sql.slice(i + 1, fin) });
      i = fin + 1;
      continue;
    }
    // x'0A' : un blob ; on le traite comme une chaîne.
    if ((c === 'x' || c === 'X') && sql[i + 1] === '\'') {
      i = finDeGuillemets(sql, i + 1, '\'', 'Un blob x\'…\' n\'est pas fermé.');
      morceaux.push({ sorte: 'chaine' });
      continue;
    }
    const mot = /^[\p{L}_][\p{L}\p{N}_$]*/u.exec(sql.slice(i));
    if (mot) {
      morceaux.push({ sorte: 'mot', texte: mot[0].toLowerCase() });
      i += mot[0].length;
      continue;
    }
    const nombre = /^(0x[0-9a-f]+|(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?)/i.exec(sql.slice(i));
    if (nombre) {
      morceaux.push({ sorte: 'nombre' });
      i += nombre[0].length;
      continue;
    }
    // Les paramètres (?1, :nom, @nom, $nom) deviennent « ? » : refusés plus haut.
    if (c === '?' || ((c === ':' || c === '@' || c === '$') && /[\p{L}\p{N}_]/u.test(sql[i + 1] ?? ''))) {
      morceaux.push({ sorte: 'signe', texte: '?', position: i });
      i += 1;
      while (i < n && /[\p{L}\p{N}_]/u.test(sql[i] ?? '')) i += 1;
      continue;
    }
    morceaux.push({ sorte: 'signe', texte: c, position: i });
    i += 1;
  }
  return morceaux;
}

/** L'indice juste après le guillemet fermant ; un guillemet doublé ('') est un guillemet dans le texte. */
function finDeGuillemets(sql: string, debut: number, guillemet: string, siOuvert: string): number {
  let i = debut + 1;
  for (;;) {
    const fin = sql.indexOf(guillemet, i);
    if (fin === -1) throw new ErreurDomaine(siOuvert);
    if (sql[fin + 1] === guillemet) { i = fin + 2; continue; }
    return fin + 1;
  }
}

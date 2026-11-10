# 005 — Les requêtes en lecture seule : une garde à deux couches

- **Date** : 10/11/2026
- **Décidé par** : Claude, en construisant la tâche 4.1, sur la règle d'Adrien du 10/11 (« tu peux
  avancer, on changera après »). Elle se défait en une PR tant qu'aucune requête n'est enregistrée.
- **Statut** : acceptée

## La question

À l'étape 4, Claude écrit des requêtes SQL que l'outil rejoue comme filtres et tableaux de bord. Une
requête ne doit jamais rien modifier ni effacer. Or D1 n'a pas d'utilisateur en lecture seule : la
connexion du Worker peut tout faire. Il faut donc une **garde** : un contrôle qui laisse passer les
lectures et refuse le reste, y compris une écriture déguisée en lecture.

## Ce qui a été essayé (10/11, sur la base locale, qui est le même SQLite que D1)

- `PRAGMA query_only = ON` : **refusé** par D1 (« not authorized: SQLITE_AUTH »). Cette piste de
  l'architecture tombe.
- Envelopper la requête : `SELECT * FROM (<requête>) LIMIT n`. Une écriture placée là est **refusée
  par SQLite lui-même** (« near "DELETE": syntax error »), y compris derrière un `WITH`. SQLite
  n'accepte en sous-requête que des lectures : c'est son propre analyseur qui fait le tri.

## Ce qui est retenu : deux couches

1. **Un analyseur lexical** (`src/domaine/requete-lecture.ts`) : il découpe le texte comme SQLite le
   découpe (chaînes, noms entre guillemets, commentaires), puis exige sur ces morceaux une seule
   instruction, qui commence par `SELECT` ou `WITH`, sans mot d'écriture (`INSERT`, `DELETE`,
   `PRAGMA`, `ATTACH`…), sans paramètre, avec des parenthèses équilibrées (sinon une parenthèse
   fermante sortirait de l'enveloppe), et sans nommer une table : seulement les **vues** `v_elements`,
   `v_tags`, `v_liens`, `v_commentaires`, `v_evenements`, `v_types` (migration 0007). Il donne une
   raison claire à Claude, qui peut corriger sa requête.
2. **L'enveloppe** : la requête acceptée s'exécute en sous-requête, limitée à 500 lignes. Si la
   première couche laissait passer une écriture, SQLite la refuserait.

Les vues ont un second intérêt : les tables peuvent changer sans casser les requêtes enregistrées,
et les éléments supprimés (archivés) n'y sont pas.

**La preuve** : 35 écritures déguisées (dans `features/support/ecritures-deguisees.ts` : point-virgule
caché dans un commentaire, écriture derrière un `WITH`, parenthèse qui sort de l'enveloppe, table
entre crochets, chaîne qui cache la fin…) sont refusées par la garde (tests unitaires) et par le vrai
Worker, qui vérifie ensuite que la base n'a pas bougé d'une ligne ni d'un caractère du schéma
(`features/requetes.feature`). Un scénario prouve aussi la seconde couche seule.

## Les options écartées

- **Une bibliothèque d'analyse SQL** (node-sql-parser et semblables) : plusieurs centaines de Ko dans
  le Worker, et un dialecte qui n'est jamais exactement celui de SQLite. Ce qu'elle accepte et que
  SQLite comprend autrement est justement la faille. Le vrai analyseur de SQLite, par l'enveloppe,
  ne diverge pas de lui-même.
- **Une recherche de mots dans le texte brut** : un mot dans une chaîne (`titre LIKE '%delete%'`)
  serait refusé à tort, et un commentaire pourrait cacher un point-virgule. D'où le découpage.
- **Exécuter sur une copie de la base**, refaite régulièrement : sûr, mais les résultats auraient
  du retard, et il faudrait une seconde base à tenir. Gardée en repli si la garde cédait.
- **`PRAGMA query_only`** : refusé par D1, voir plus haut.

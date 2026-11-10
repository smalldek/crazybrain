# 007 — L'horizon est un champ dédié, pas un tag

Date : 10/11/2026. Prise par Claude sans attendre Adrien (règle du 10/11 : avancer sur la
recommandation). On peut la contester.

## Contexte

L'étape 7 place un élément dans un **horizon** à la Timestripe : « ce jour », « cette semaine »,
« novembre », « 2027 », « un jour ». La feuille de route laissait deux options ouvertes (tâche 7.1) :
un champ dédié sur l'élément, ou un tag `horizon:2026-11`.

## Décision

Un **champ dédié** `horizon`, rangé sous une forme unique par échelle :

| Échelle | Forme rangée | Se saisit aussi |
|---|---|---|
| jour | `2026-11-10` | « aujourd'hui », « demain » |
| semaine (ISO, du lundi au dimanche) | `2026-S46` | « semaine 46 », « s2 2027 », « la semaine prochaine » |
| mois | `2026-11` | « novembre », « février 2027 », « le mois prochain » |
| trimestre | `2026-T4` | « T4 », « Q1 2027 », « 1er trimestre 2027 », « ce trimestre » |
| année | `2027` | « cette année », « l'an prochain » |
| décennie | `2030-2039` | « années 2030 », « 2030s » |
| un jour (sans date) | `vie` | « un jour », « plus tard » |

Les formes relatives se comptent au jour de Paris. Le domaine (`src/domaine/horizon.ts`) refuse ce
qu'il ne comprend pas ou qui n'existe pas (le 30 février, la semaine 53 d'une année qui n'en a que
52), et le message dit quoi écrire.

L'horizon n'est pas une échéance : « 2027 » dit l'année visée, pas une date limite. Il ne se
déduit pas des enfants : un objectif « 2027 » peut avoir des tâches « semaine 46 ».

## Options écartées

- **Un tag `horizon:2026-11`** : rien n'empêche d'en poser deux, ni d'écrire `horizon:nov` ou
  `horizon:2026-13`. Il faudrait refaire la vérification partout où un tag se pose (page,
  connecteur), et la vue devrait lire les tags pour trouver les éléments. Le champ est vérifié en
  un seul endroit, le domaine, comme la récurrence (5.6).
- **Deux champs, l'échelle et la date de début** : plus facile à trier, mais deux valeurs à garder
  d'accord, et une requête SQL plus lourde pour Claude. La forme rangée se lit seule, et le tri du
  texte suit le temps à l'intérieur d'une échelle.
- **Des dates de début et de fin libres** : c'est un autre outil (un diagramme de Gantt). Les
  horizons servent à viser une période, pas à la borner au jour près.

## Conséquences

- Migration `0011_horizon.sql` : la colonne, un index, et la vue `v_elements` pour les requêtes de
  Claude.
- La forme des instantanés passe à 7.
- Le connecteur prend `horizon` à la création et à la modification ; sa description donne les formes.

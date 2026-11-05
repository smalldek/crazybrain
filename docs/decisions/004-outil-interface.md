# 004 — L'outil d'interface : React, construit par Vite

- **Date** : 05/11/2026 (nuit)
- **Décidé par** : Claude, pendant le travail de nuit demandé par Adrien (« Ben go fait. Travail cette
  nuit sans moi »), en appliquant la règle « une décision que le travail demandé exige, je prends la
  meilleure et je le dis ». Adrien peut la contester : elle se défait en une PR tant que l'étape 3
  est jeune.
- **Statut** : acceptée

## La question

Jusqu'ici la page était un fichier HTML avec quelques lignes de JavaScript écrites à la main
(décision 002 : pas de cadriciel avant l'étape 3). L'étape 3 apporte le kanban où l'on glisse des
cartes, un panneau de détail qui sert de formulaire complet, des tags avec complétion, des filtres ;
puis viendront le calendrier, le mode journée, les horizons et la vue circulaire des objectifs.
Écrire tout cela à la main, c'est réécrire nous-mêmes ce qu'un **cadriciel d'interface** fait déjà :
garder l'écran d'accord avec les données quand elles changent.

Un cadriciel d'interface (en anglais *framework*) est une bibliothèque où l'on décrit l'écran comme
une fonction des données ; quand les données changent, il met à jour l'écran tout seul. C'est
l'équivalent de Blazor ou de WPF avec ses liaisons de données, côté navigateur.

## Ce qu'on attend de l'outil

1. **Lisible pour Adrien**, qui vient de .NET et veut apprendre en relisant : TypeScript strict, des
   composants qui ressemblent à des classes ou des fonctions, peu de « magie ».
2. **Bien connu de Claude**, qui écrit l'essentiel du code : moins d'erreurs, de meilleures
   solutions du premier coup.
3. **Des briques toutes faites pour la suite** : glisser-déposer au doigt sur le téléphone (kanban),
   calendrier, graphiques en SVG.
4. **Léger sur le téléphone** et servi tel quel par Cloudflare (des fichiers statiques).
5. **Testable** dans le vrai navigateur par Playwright, comme la page actuelle.
6. **Durable** : maintenu, utilisé partout, pas un pari.

## La décision

- **React 19**, écrit en TypeScript strict (fichiers `.tsx` : du TypeScript où l'on écrit l'écran
  avec des balises, le « JSX »). Un composant est une fonction qui reçoit des données et rend
  l'affichage ; son état vit dans `useState`.
- **Vite** construit l'interface : il traduit `ui/` (TypeScript, JSX, CSS) en quelques fichiers
  dans `dist/` (`npm run construire`). Le Worker sert `dist/` comme il servait `public/`.
- **Une adresse par écran sans serveur de pages** : toute adresse qui n'est pas un fichier rend
  `index.html` (`not_found_handling: "single-page-application"` dans `wrangler.jsonc`), et React lit
  l'adresse pour ouvrir le bon écran. C'est ce qui donnera son adresse à chaque élément (tâche 3.2).
- Les **types** de l'interface viennent du domaine (`import type` de `src/domaine/`) : un champ
  renommé dans le domaine casse la compilation de l'interface au lieu d'un bug à l'écran.
- Les **règles** de l'interface qui ne dépendent pas de React (l'ordre de la liste, le changement
  montré avant la réponse du serveur) vivent dans des fichiers `.ts` à part, testés par Vitest.
- Pas de bibliothèque d'état (Redux…) ni de routeur tant que le besoin ne se montre pas.

## Options écartées

- **Rester sans cadriciel** : chaque écran de l'étape 3 demanderait de recoder à la main la mise à
  jour de l'affichage ; le glisser-déposer tactile seul est un gros morceau. Le coût grandit à chaque
  écran, et le code devient difficile à relire.
- **Svelte** : moins de code à écrire et des fichiers légers, mais c'est un langage à part (un
  compilateur, sa propre syntaxe de réactivité) qu'Adrien devrait apprendre en plus de TypeScript ;
  moins de briques toutes faites pour le kanban et le calendrier ; Claude le connaît moins bien que
  React.
- **Vue** : solide et lisible, mais ses fichiers `.vue` mêlent trois langages, et son écosystème
  pour le glisser-déposer tactile et les calendriers est plus mince que celui de React.
- **Preact** (un React allégé, 4 Ko) : compatible avec la plupart des briques React, mais pas toutes ;
  on gagne 60 Ko sur une appli installée, qui se charge une fois. On pourra y passer plus tard sans
  réécrire, si le poids devient un problème.
- **Composants web natifs (Lit)** : standard du navigateur, mais peu de briques pour le kanban et le
  calendrier, et l'état partagé entre écrans reste à organiser soi-même.
- **Pages construites par le Worker (Hono JSX) avec htmx** : peu de JavaScript côté téléphone, mais
  le kanban, le glisser-déposer et l'appli hors-ligne (étape 5) demandent de toute façon du code dans
  le navigateur ; on aurait deux façons de faire l'écran au lieu d'une.

## Ce que ça change

- Le code de l'interface vit dans `ui/` ; `public/` disparaît ; `dist/` n'est pas dans git.
- `npm run construire` avant de lancer le Worker en local ; les tests d'acceptation le font seuls,
  et le déploiement aussi.
- `npm run verifier-types` vérifie aussi l'interface (`tsconfig.ui.json`).
- Poids de la page : environ 71 Ko compressés (React compris), contre 3 Ko avant.

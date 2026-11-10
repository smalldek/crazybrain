# Crazybrain — Règles pour Claude

Crazybrain est le moteur de gestion de tâches et de projets d'Adrien. On le construit ensemble :
Adrien veut apprendre à travailler avec l'IA.

## Langue

- **Français**, partout : docs, commits, PR, commentaires du code, messages de l'interface.
  Les noms du code : vocabulaire métier en français sans accents (`elements`, `echeance`),
  ce que les bibliothèques imposent en anglais (décision 002).

## Moteur, pas données

- Ce dépôt contient le **moteur** : code, spec, architecture, feuille de route. Les tâches
  d'Adrien vivent dans la base D1, **jamais dans git**.
- **Le dépôt est public.** Aucune donnée réelle (tâche, commentaire, export de la base, mail),
  aucun secret (jeton, clé, mot de passe), aucune adresse mail d'Adrien. Les données de test sont
  inventées.
- Les identifiants Cloudflare (compte, base, application Access) et les secrets passent par les
  secrets du Worker et de GitHub Actions, pas par un fichier du dépôt.

## Changements

- **Chaque changement passe par une PR**, que Claude fusionne lui-même en **squash**, sans
  attendre l'accord d'Adrien (même règle que le dépôt `cluster`). Adrien suit et relit après coup
  s'il veut. Une session dont un garde-fou refuse la fusion le note et laisse la session mère
  fusionner.
- **Mode apprentissage** : chaque PR explique en mots simples ce qui est fait et pourquoi, pour
  qu'Adrien apprenne. Un terme technique s'explique la première fois qu'il apparaît. Pas de
  remplissage : ce qui a été fait, pourquoi ce choix, ce qu'on a vérifié, ce qui reste.
- **Claude vérifie lui-même, par des tests automatiques** (Adrien, 05/11 : « tu fais du test auto
  et tu vérifies toi même ») : tests unitaires du domaine, scénarios d'acceptation sur l'API, et la
  page jouée dans un vrai navigateur à la taille d'un téléphone (`features/page.feature`,
  Playwright). On ne demande à Adrien que ce qu'aucun test ne peut faire à sa place.
- **Un essai d'Adrien ne bloque rien** (Adrien, 09/11 : « le fait que je teste n'est pas une excuse
  pour s'arrêter ») : on enchaîne les tâches suivantes, il essaie quand il veut.
- **Une question à Adrien ne bloque rien non plus** (Adrien, 10/11 : « tu peux avancer. on changera
  après ») : on construit l'option recommandée, on la note (feuille de route et vault), on change
  après s'il choisit l'autre. N'attend que ce qui ne se défait pas.
- Une fonctionnalité qui repose sur une hypothèse non vérifiée (`docs/architecture.md`,
  « Hypothèses à vérifier ») commence par la vérifier.

## Construction

- **TypeScript strict, écrit pour un lecteur .NET** (décision 002) : domaine dans `src/domaine/`,
  sans Cloudflare ni HTTP ; entités et objets-valeurs explicites ; pas de `any`.
- **Chaque modification écrit l'état et un événement** (avant, après, auteur) dans la même
  transaction (décision 002).

- **L'interface se construit au fur et à mesure.** Le moteur (base, API, connecteur) d'abord ;
  chaque étape ajoute l'écran dont elle a besoin, simple, puis on l'améliore à l'usage.
- Une décision technique qui engage (langage, cadriciel, format) s'écrit dans `docs/decisions/`
  avec les options écartées et leur motif.

## Où vit quoi

- **Vision globale et état d'avancement** : dans le vault d'Adrien (dépôt privé `smalldek/vault`),
  fichier `informatique/crazybrain.md`. Il renvoie ici, il ne recopie pas.
- **Spec et technique** : ici, dans `docs/` :
  - `docs/vision.md` : pourquoi cet outil, ce qu'il est et n'est pas ;
  - `docs/fonctionnalites.md` : la liste complète, avec le statut de chacune ;
  - `docs/architecture.md` : socle, client, connecteur, modèle de données, hypothèses ;
  - `docs/feuille-de-route.md` : les étapes et leurs livrables vérifiables ;
  - `docs/decisions/NNN-sujet.md` : une décision par fichier.
- Quand l'état change (étape finie, hypothèse vérifiée), on met à jour la doc ici **et** l'état
  dans le vault.

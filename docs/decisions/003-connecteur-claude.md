# 003 — Le connecteur Claude : une ouverture limitée, gardée par l'OAuth du Worker

- **Date** : 04/11/2026 (accord d'Adrien le 03/11)
- **Décidé par** : Adrien, sur proposition de Claude
- **Statut** : acceptée ; le test depuis claude.ai reste à faire par Adrien

## La question

Le connecteur MCP (étape 1c) est appelé par **les serveurs d'Anthropic**, pas par le navigateur
d'Adrien. Ces serveurs n'ont pas la connexion Cloudflare Access d'Adrien, et la plupart sont aux
États-Unis, que la règle « hors de France » du pare-feu de `dekermadec.net` bloque. Tant que tout
le site est derrière Access et ce pare-feu, claude.ai ne peut pas joindre `/mcp`.

## L'accord d'Adrien

On lui a expliqué, le 03/11 : brancher Claude impose une ouverture limitée. Retirer la porte
Access et faire une exception au pare-feu « France seulement », **uniquement** sur `/mcp` et les
adresses OAuth du connecteur ; ces adresses sont alors protégées par l'OAuth du Worker, avec Access
pour vérifier que c'est bien Adrien ; tout le reste du site reste derrière Access. Le risque aussi :
sur ces adresses il n'y a plus qu'une serrure (le jeton OAuth du Worker) au lieu de deux, et
derrière il n'y a aujourd'hui que l'outil `bonjour`. Sa réponse : « Go ».

## La décision

1. **Le Worker est le serveur OAuth** du connecteur, avec la bibliothèque de Cloudflare
   `@cloudflare/workers-oauth-provider`. OAuth est le protocole par lequel une application (ici
   claude.ai) obtient un **jeton** (une clé temporaire) pour agir au nom de quelqu'un, sans connaître
   son mot de passe. La bibliothèque sert la **découverte** (`/.well-known/...` : où s'enregistrer,
   où demander un jeton), l'**enregistrement dynamique** des clients (`/register`), l'échange du code
   contre un jeton avec **PKCE** (`/token` ; PKCE : le client prouve qu'il est bien celui qui a
   demandé le code), et refuse `/mcp` sans jeton valide (401). Les jetons sont rangés dans un espace
   KV, **hachés** : lire la base ne donne aucun jeton utilisable.
2. **La page d'autorisation `/authorize` reste derrière Access.** C'est le navigateur d'Adrien qui
   l'ouvre (depuis la France, avec sa connexion Google), jamais les serveurs d'Anthropic. Le Worker y
   revérifie le jeton Access (la deuxième serrure de l'API), puis montre une **page de
   consentement** : quel client demande l'accès, et où partira le jeton (`claude.ai`). Sans cette
   page, n'importe qui pourrait enregistrer un client et envoyer à Adrien un lien qui, en un clic,
   lui donnerait un jeton.
3. **Access laisse passer la liste exacte des chemins du connecteur** : `/mcp`, `/token`,
   `/register`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`
   (liste dans `outils/commun_access.py`). Une application Access « crazybrain-connecteur » en
   « bypass » (laisser passer) les couvre, posée par `outils/poser_ouverture_connecteur.py`. À chaque
   déploiement, `outils/verifier_access.py avant` exige que tout le site reste fermé et **refuse toute
   autre ouverture** ; ses tests (`tests/outils/`) le prouvent.
4. **Une exception au pare-feu de la zone**, limitée à l'hôte `crazybrain.dekermadec.net` et à ces
   mêmes chemins, placée avant la règle « hors de France » (`outils/poser_pare_feu.py` ; il la pose
   si le jeton du dépôt en a le droit, sinon il donne la marche à suivre dans le tableau de bord).
5. **Le serveur MCP est sans session** (`@modelcontextprotocol/sdk`, transport HTTP standard) :
   chaque appel est indépendant, sans Durable Object. Un seul outil pour l'étape 1c : `bonjour`.

## Options écartées

- **Access en fournisseur d'identité OIDC** (une application Access « SaaS » vers laquelle le
  Worker renverrait Adrien, puis un retour sur `/callback`). C'était le chemin proposé au départ. Il
  ajoute deux adresses ouvertes (`/authorize` et `/callback`), un secret client à garder, et une
  application Access de plus. Garder `/authorize` derrière Access donne la même garantie (seul Adrien
  peut consentir) avec moins d'ouverture, et réutilise la vérification du jeton Access déjà écrite.
  Il reste un repli si un navigateur ou claude.ai posait problème avec cette page derrière Access.
- **Access fait lui-même l'OAuth de `/mcp`** (les « Managed OAuth » / serveurs MCP d'Access) : non
  vérifiable d'ici, et le pare-feu de la zone bloquerait de toute façon les serveurs d'Anthropic.
- **Le Worker fait l'OAuth avec Google directement** : un client OAuth Google de plus à créer par
  Adrien, et une adresse `/callback` ouverte ; à garder si Access ne convenait pas.
- **Ouvrir tout le site, protégé par le seul Worker** : la page et l'API perdraient Access. Refusé.
- **Laisser `/mcp` derrière Access avec un jeton de service** : claude.ai ne sait pas envoyer les
  en-têtes d'un jeton de service Access ; seule l'OAuth de la spécification MCP est prévue.

## Ce que ça coûte, ce qui reste

- Sur les cinq chemins ouverts, **une seule serrure** : le jeton OAuth. Une faille dans la
  bibliothèque ou dans le Worker toucherait `/mcp`. Aujourd'hui, `/mcp` ne fait que dire bonjour et
  compter les tâches ; à l'étape 2, il lira et écrira : c'est le moment de revoir la durée des
  jetons et d'ajouter des droits par outil (les « scopes »).
- Un jeton du connecteur n'ouvre pas l'API de la page (`/api/*` exige toujours le jeton Access) :
  un test d'acceptation le vérifie.

# 008 — Un mail devient une tâche : lecture avec postal-mime, confiance au seul serveur reconnu

Date : 10/11/2026. Prise par Claude sans attendre Adrien (règle du 10/11 : avancer sur la
recommandation). On peut la contester.

## Contexte

L'étape 8 transforme un mail envoyé par Adrien en tâche. Deux questions :
1. **Lire le mail.** Un vrai mail est du MIME : souvent plusieurs parties (texte et HTML), un sujet
   encodé (`=?UTF-8?B?…?=`), un texte en quoted-printable ou en base64, des jeux de caractères variés.
2. **Savoir qu'il vient d'Adrien.** L'adresse de l'expéditeur s'écrit librement : n'importe qui peut
   écrire « From: » avec l'adresse d'Adrien. Ce qui prouve l'origine, ce sont SPF (le serveur qui
   envoie a le droit d'envoyer pour ce domaine) et DKIM (le mail est signé par le domaine). Le
   serveur qui reçoit le mail les vérifie et écrit le résultat dans un en-tête
   `Authentication-Results` (RFC 8601).

## Décision

1. **postal-mime** (version 4.1.4, épinglée) lit le mail. C'est la bibliothèque que Cloudflare
   propose pour les Email Workers et qu'utilise aussi l'outil de test local de wrangler. Elle n'a pas
   de dépendance. On a pris une version publiée depuis plus de deux semaines.
2. Le Worker accepte un mail seulement si :
   - l'expéditeur de l'enveloppe SMTP **et** celui de l'en-tête From sont une adresse d'Adrien. Ces
     adresses sont rangées dans le secret `COURRIER_EXPEDITEURS`, jamais dans le dépôt ;
   - le **premier** en-tête `Authentication-Results`, celui que le dernier serveur pose au-dessus
     des autres, est écrit par le serveur reconnu (`COURRIER_AUTHSERV`) ;
   - ce résultat dit `spf=pass`, et `dkim=pass` pour le domaine de l'adresse d'Adrien.
3. Sans réglage, tout est refusé. Chaque mail reçu est noté (expéditeur, sujet, accepté ou non, la
   raison, le serveur qui a écrit le résultat), sans son texte. Le refus renvoie un message neutre
   à l'expéditeur ; le détail reste dans la base et l'onglet Tableau.

## Options écartées

- **Écrire notre propre lecteur MIME**, comme on a écrit Web Push (décision 006) : Web Push, ce sont
  deux normes courtes et fixes. Le MIME réel est plein de cas (jeux de caractères, encodages,
  parties imbriquées) ; une bibliothèque éprouvée vaut mieux que 300 lignes à nous.
- **Lire n'importe quel `Authentication-Results` qui dit « pass »** : l'expéditeur peut écrire
  lui-même cet en-tête dans son mail. Seul celui du serveur qui a reçu le mail fait foi, d'où le
  nom de serveur exigé (scénario « faux résultat » dans `features/courrier.feature`).
- **Vérifier DKIM dans le Worker** (lire la clé publique dans le DNS, vérifier la signature) :
  possible, mais long et délicat (canonicalisation des en-têtes). On le garde en repli si Email
  Routing n'écrit pas le résultat attendu.
- **Un mot de passe dans l'adresse** (`nouvelle+secret@…`) : simple, mais l'adresse finit dans
  l'historique des mails et ne prouve rien sur l'expéditeur.

## Ce qui n'est pas encore vérifié

Le nom exact du serveur de Cloudflare, et le fait qu'il écrive bien cet en-tête : ni la
documentation de Cloudflare ni le DNS ne sont joignables depuis le cloud des sessions. Le premier
vrai mail le dira : il sera refusé, et l'onglet Tableau montrera quel serveur a écrit le résultat.
On réglera alors `COURRIER_AUTHSERV` (voir `docs/architecture.md`, « Hypothèses à vérifier »).

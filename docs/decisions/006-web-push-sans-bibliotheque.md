# 006 — Web Push sans bibliothèque

Date : 10/11/2026. Prise par Claude sans attendre Adrien (règle du 10/11 : avancer sur la
recommandation). On peut la contester.

## Contexte

Les rappels (tâche 5.5) passent par Web Push : le Worker envoie un message au service de
notification du navigateur (Google, pour Chrome sur Android), qui le remet au téléphone. Deux
normes s'appliquent :
- VAPID (RFC 8292) : le Worker signe chaque envoi ;
- le chiffrement du message (RFC 8291, `aes128gcm`).

## Décision

Les deux normes sont écrites dans `src/infra/web-push.ts`, environ 120 lignes, avec WebCrypto. Le
Worker l'a d'origine et Node aussi. On n'utilise pas de bibliothèque.

Les clés VAPID sont tirées une seule fois par le déploiement (`outils/cles-vapid.ts`), la première
fois que le Worker n'a pas ces secrets. Elles sont rangées comme secrets du Worker (`VAPID_PRIVEE`,
`VAPID_PUBLIQUE`), jamais affichées, jamais dans le dépôt. Adrien n'a rien à faire.

## Vérification

Le code est vérifié par une autre implémentation que la nôtre :
- `http_ece`, la bibliothèque de Mozilla, déchiffre les messages comme le ferait le navigateur ;
- le module `crypto` de Node vérifie la signature.

Cette vérification se fait dans les tests unitaires (`tests/unitaires/web-push.test.ts`). Elle se
fait aussi de bout en bout : un faux service de notification reçoit les envois du vrai Worker local
(`features/rappels.feature`).

## Options écartées

- **La bibliothèque `web-push` (Node).** Elle dépend de modules Node (`crypto`, `https`) que le
  Worker n'a pas tels quels.
- **Les portages pour Workers (`@block65/webcrypto-web-push` et autres).** Ce sont de petits projets,
  peu suivis. Le code qu'ils remplaceraient est court, et nos tests le vérifient contre la
  référence.
- **Un message sans contenu.** Le téléphone irait chercher le rappel sur l'API. On évite ainsi le
  chiffrement, mais la lecture passe par Access : si la connexion a expiré, la notification
  arriverait vide.
- **Les clés VAPID dans la base D1.** Ce serait plus simple à créer, mais une clé privée est un
  secret, et la règle du dépôt range les secrets dans les secrets du Worker.

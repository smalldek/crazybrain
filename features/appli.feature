# language: fr
@navigateur
Fonctionnalité: L'appli installable sur le téléphone (tâche 5.1)
  Crazybrain s'installe sur l'écran d'accueil d'Android : un manifeste (nom, icônes, couleurs), et un
  service worker prudent, qui garde les fichiers de l'appli mais jamais les données.

  Scénario: Chromium ne trouve aucun obstacle à l'installation
    Étant donné que j'ouvre la page
    Alors le service worker de l'appli est actif
    Et le manifeste nomme l'appli "Crazybrain" avec des icônes de 192 et 512 pixels
    Et Chromium ne trouve aucun obstacle à l'installation

  Scénario: Avec le service worker, les données viennent toujours du serveur
    Étant donné que j'ouvre la page
    Et que le service worker de l'appli est actif
    Et que je recharge la page
    Quand je tape la tâche "Appli : vue tout de suite" et j'appuie sur Entrée
    Et je recharge la page
    Alors la page montre la tâche "Appli : vue tout de suite"
    Et aucune réponse de l'API n'est dans le cache du service worker

  Scénario: La connexion Access expire : l'appli se recharge seule, puis propose de se reconnecter (tâche 5.2)
    Étant donné que la tâche "Appli : après la reconnexion" existe avec la priorité "basse"
    Et que j'ouvre la page
    Quand la connexion Access expire
    Et l'appli revient au premier plan
    Alors la page s'est rechargée seule une fois
    Et la page propose de se reconnecter
    Quand la connexion Access revient
    Et je touche « Se reconnecter »
    Alors la page montre la tâche "Appli : après la reconnexion"
    Et la page ne propose plus de se reconnecter

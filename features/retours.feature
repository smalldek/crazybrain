# language: fr
@navigateur
Fonctionnalité: Parler à Claude depuis chaque page (étape 9)
  Sur n'importe quelle page, Adrien touche le bouton « Claude » et écrit ce qu'il veut changer, sans
  quitter la page. Le retour est gardé avec la page où il a été écrit ; Claude le trouve par le
  connecteur et répond, et la réponse s'affiche sous le retour, sur la page.

  Scénario: Un retour écrit sur une page, une réponse de Claude qui s'y affiche
    Étant donné que Claude est branché sur Crazybrain par le connecteur
    Et que j'ouvre la vue "/kanban"
    Quand j'écris à Claude "Retours : le kanban est lent\nSurtout quand je glisse une carte"
    Alors le fil montre le retour "Retours : le kanban est lent" en attente de Claude
    Et le bouton Claude compte 1 retour ouvert
    Quand je ferme le fil
    Et j'ouvre la vue "/"
    Alors la page ne montre pas la tâche "Retours : le kanban est lent"
    Et le bouton Claude compte 0 retour ouvert
    Quand Claude répond "Je regarde le glisser, je reviens vers toi" au retour "Retours : le kanban est lent"
    Et j'ouvre la vue "/kanban"
    Et j'ouvre le fil de Claude
    Alors le fil montre la réponse de Claude "Je regarde le glisser, je reviens vers toi"
    Quand je marque le retour "Retours : le kanban est lent" comme réglé
    Alors le bouton Claude compte 0 retour ouvert

  Scénario: « Continuer dans Claude » prépare le message pour Claude
    Étant donné que j'ouvre la vue "/cercles"
    Quand j'écris à Claude "Retours : le cercle ne prend pas toute la page"
    Et je continue le retour "Retours : le cercle ne prend pas toute la page" dans Claude
    Alors un onglet s'ouvre sur une nouvelle conversation claude.ai qui nomme le retour "Retours : le cercle ne prend pas toute la page"

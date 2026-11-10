# language: fr
@navigateur
Fonctionnalité: Partager avec les autres applis du téléphone (tâches 5.3 et 5.4)
  Une tâche s'envoie à une autre appli par le menu de partage d'Android ; et ce qu'une autre appli
  partage (un message WhatsApp, une page du navigateur) ouvre Crazybrain avec la saisie pré-remplie.

  Scénario: Le manifeste déclare l'appli comme cible de partage
    Étant donné que j'ouvre la page
    Alors le manifeste reçoit les partages sur "/partage" avec titre, texte et lien

  Scénario: Un message partagé devient une tâche, avec le reste en description
    Quand une autre appli partage le texte "Partage : rappeler le garage\nIls ferment à 18 h" et le lien "https://exemple.org/garage"
    Alors la saisie contient "Partage : rappeler le garage"
    Et l'adresse de la page est "/"
    Et la page annonce la description partagée
    Quand j'appuie sur Entrée dans la saisie
    Alors la page montre la tâche "Partage : rappeler le garage"
    Et la tâche "Partage : rappeler le garage" a pour description "Ils ferment à 18 h\n\nhttps://exemple.org/garage"

  Scénario: Une tâche s'envoie au menu de partage du téléphone
    Étant donné que le téléphone a un menu de partage
    Et que la tâche "Partage : à envoyer" existe
    Quand j'ouvre l'adresse de la tâche "Partage : à envoyer"
    Et je touche « Partager » dans le détail
    Alors le menu de partage a reçu "Partage : à envoyer" avec l'adresse de la tâche

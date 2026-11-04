# language: fr
Fonctionnalité: Le connecteur Claude (serveur MCP)
  claude.ai appelle /mcp depuis ses serveurs, sans la connexion Access d'Adrien. Il obtient un jeton
  par OAuth : il découvre le serveur d'autorisation, s'enregistre, envoie Adrien sur /authorize
  (derrière Access) qui consent, puis échange le code contre un jeton (avec PKCE).

  Scénario: Un appel sans jeton est refusé et indique où trouver l'autorisation
    Quand Claude appelle le connecteur sans jeton
    Alors le connecteur répond 401
    Et la réponse indique l'adresse de découverte "/.well-known/oauth-protected-resource/mcp"

  Scénario: Un jeton inventé est refusé
    Quand Claude appelle le connecteur avec le jeton "inventé:de:toutes:pieces"
    Alors le connecteur répond 401

  Scénario: La découverte mène au serveur d'autorisation du Worker
    Quand Claude lit la description de la ressource protégée
    Alors elle désigne le Worker comme serveur d'autorisation
    Et la description du serveur d'autorisation annonce "/authorize", "/token" et "/register"

  Scénario: Avec un jeton obtenu par OAuth, l'outil bonjour répond
    Étant donné que je suis connecté par Cloudflare Access
    Et que je crée la tâche "Tester le connecteur"
    Et que Claude s'est enregistré comme client OAuth
    Quand j'autorise Claude sur la page de consentement
    Et que Claude échange le code contre un jeton
    Alors l'outil "bonjour" est proposé par le connecteur
    Et l'outil "bonjour" répond par un message qui commence par "Bonjour depuis Crazybrain !" et compte les tâches

  Scénario: La page d'autorisation exige la connexion Access
    Étant donné que Claude s'est enregistré comme client OAuth
    Et que je ne suis pas connecté
    Quand j'ouvre la page d'autorisation
    Alors l'accès est refusé

  Scénario: Le jeton du connecteur n'ouvre pas l'API de la page
    Étant donné que je suis connecté par Cloudflare Access
    Et que Claude s'est enregistré comme client OAuth
    Quand j'autorise Claude sur la page de consentement
    Et que Claude échange le code contre un jeton
    Et que Claude présente ce jeton à l'API de la page
    Alors l'accès est refusé

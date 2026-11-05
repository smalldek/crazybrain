"""Ce que le garde-fou Access utilise : où une application Access s'applique, et la liste exacte
des chemins que le connecteur Claude ouvre (décision 003).

Une application Access couvre une ou plusieurs « destinations » : un hôte (tout le site) ou un hôte
suivi d'un chemin (ce chemin et ce qui est dessous). Quand deux applications couvrent une adresse,
Access applique la plus précise : l'application du connecteur, posée sur ces chemins, l'emporte sur
celle du site entier.
"""

# Les adresses que les serveurs d'Anthropic appellent, sans la connexion Access d'Adrien. Chacune
# est protégée autrement : /mcp exige un jeton OAuth du Worker ; les autres sont la découverte,
# l'enregistrement d'un client et l'échange d'un code (qui exige le code et son secret PKCE).
# /authorize n'y est pas : c'est le navigateur d'Adrien qui l'ouvre, et elle reste derrière Access.
CHEMINS_CONNECTEUR = (
    '/mcp',
    '/token',
    '/register',
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-protected-resource',  # couvre aussi /.well-known/oauth-protected-resource/mcp
)


NOM_APP_CONNECTEUR = 'crazybrain-connecteur'


def destinations(app):
    """Les adresses couvertes par l'application, « hôte » ou « hôte/chemin », en minuscules, sans « / » final."""
    vues = {app.get('domain') or ''} | set(app.get('self_hosted_domains') or [])
    vues |= {d.get('uri') or '' for d in app.get('destinations') or []}
    return {v.lower().rstrip('/') for v in vues if v}


def hote_de(destination):
    return destination.split('/')[0]


def chemin_de(destination):
    reste = destination[len(hote_de(destination)):]
    return reste or ''


def couvre(app, hote):
    return any(hote_de(d) == hote for d in destinations(app))


def couvre_tout_le_site(app, hote):
    """Vrai si l'application s'applique à l'hôte entier (« hôte » ou « hôte/* »)."""
    return any(d in (hote, hote + '/*') for d in destinations(app))


def destinations_connecteur(hote):
    return {hote + c for c in CHEMINS_CONNECTEUR}


def est_ouverte(regle):
    """Une règle qui laisse entrer sans connexion : « bypass », « non_identity », ou « tout le monde »."""
    return regle.get('decision') in ('bypass', 'non_identity') or any(
        'everyone' in i for i in regle.get('include') or [])

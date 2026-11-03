#!/usr/bin/env python3
"""Garde-fou de la publication Cloudflare : le site ne part que derrière Cloudflare Access.

  python verifier_access.py avant   # avant le déploiement : une application Access couvre l'hôte,
                                    # avec au moins une règle « allow » et aucune règle ouverte
  python verifier_access.py aud     # imprime l'AUD (champ `aud`) de l'application Access de l'hôte,
                                    # que le Worker exige dans chaque jeton de connexion
  python verifier_access.py apres   # après : l'hôte répond par la connexion Access, jamais par une page

Copie du garde-fou du site du vault (dépôt privé `smalldek/vault`, `site/cloudflare/verifier_access.py`).

Variables : CF_TOKEN (jeton d'API, droit « Access: Apps and Policies Read »), CF_ACCOUNT, HOTE.
Code de sortie 1 au moindre doute : mieux vaut un site pas à jour qu'un site ouvert.
"""
import json
import os
import sys
import urllib.error
import urllib.request

API = 'https://api.cloudflare.com/client/v4'


def appel(chemin):
    req = urllib.request.Request(API + chemin, headers={'Authorization': 'Bearer ' + os.environ['CF_TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as r:
        donnees = json.load(r)
    if not donnees.get('success'):
        sys.exit(f'Réponse Cloudflare en échec sur {chemin} : {donnees.get("errors")}')
    return donnees['result']


def hotes(app):
    vus = {app.get('domain', '')} | set(app.get('self_hosted_domains') or [])
    vus |= {d.get('uri', '') for d in app.get('destinations') or []}
    return {h.split('/')[0].lower() for h in vus if h}


def avant(hote, compte):
    apps = [a for a in appel(f'/accounts/{compte}/access/apps') if hote in hotes(a)]
    if not apps:
        sys.exit(f'Aucune application Cloudflare Access ne couvre {hote} : publication refusée.')
    for app in apps:
        regles = app.get('policies') or appel(f'/accounts/{compte}/access/apps/{app["id"]}/policies')
        if not any(r.get('decision') == 'allow' for r in regles):
            sys.exit(f'Application Access « {app.get("name")} » sans règle « allow » : publication refusée.')
        for r in regles:
            if r.get('decision') in ('bypass', 'non_identity'):
                sys.exit(f'Règle « {r.get("name")} » en {r["decision"]} : le site serait ouvert, publication refusée.')
            if any('everyone' in i for i in r.get('include') or []):
                sys.exit(f'Règle « {r.get("name")} » ouverte à tout le monde : publication refusée.')
    print(f'{hote} protégé par Access ({", ".join(a.get("name", "?") for a in apps)}).')


def aud(hote, compte):
    """Imprime l'AUD de l'unique application Access qui couvre l'hôte ; refuse s'il y en a zéro ou plusieurs."""
    apps = [a for a in appel(f'/accounts/{compte}/access/apps') if hote in hotes(a)]
    tags = {a.get('aud') for a in apps if a.get('aud')}
    if len(tags) != 1:
        sys.exit(f'{len(tags)} AUD trouvée(s) pour {hote} (il en faut exactement une) : déploiement refusé.')
    print(tags.pop())


# Pages de blocage du pare-feu de la zone (règles par pays, contrôle du navigateur, « error code: 1010 ») :
# elles répondent avant Access, donc un 403 de leur part ne dit rien d'Access (constat du 04/10, runner
# GitHub aux États-Unis face à la règle « hors de France » de dekermadec.net).
PARE_FEU = ('Attention Required! | Cloudflare', 'Sorry, you have been blocked', 'error code: 10')


class SansRedirection(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def apres(hote):
    ouvreur = urllib.request.build_opener(SansRedirection)
    req = urllib.request.Request(f'https://{hote}/', headers={
        'User-Agent': 'Mozilla/5.0 (verifier_access.py)', 'Accept': 'text/html'})
    corps = ''
    try:
        r = ouvreur.open(req, timeout=30)
        code, lieu = r.status, r.headers.get('Location', '')
    except urllib.error.HTTPError as e:
        code, lieu = e.code, e.headers.get('Location', '')
        corps = e.read(8192).decode('utf-8', 'replace')
    except urllib.error.URLError as e:
        sys.exit(f'{hote} injoignable ({e.reason}) : vérification impossible, à refaire.')
    if code in (301, 302, 303, 307) and 'cloudflareaccess.com' in lieu:
        print(f'{hote} renvoie vers la connexion Access : bon.')
    elif code == 403 and any(m in corps for m in PARE_FEU):
        # Pas d'échec : le déploiement est fait, et un échec à chaque publication ne serait que du bruit.
        print(f'::warning::{hote} : le pare-feu de la zone répond avant Access depuis ce serveur (403) ; '
              f'la redirection vers Access n\'est pas vérifiable d\'ici (Access est contrôlé par « avant »).')
    elif code in (401, 403):
        print(f'{hote} refuse sans connexion ({code}) : bon.')
    else:
        sys.exit(f'ALERTE : {hote} répond {code} sans passer par Access. Couper la route dans Cloudflare.')


if __name__ == '__main__':
    etape = sys.argv[1] if len(sys.argv) > 1 else ''
    if etape == 'avant':
        avant(os.environ['HOTE'].lower(), os.environ['CF_ACCOUNT'])
    elif etape == 'aud':
        aud(os.environ['HOTE'].lower(), os.environ['CF_ACCOUNT'])
    elif etape == 'apres':
        apres(os.environ['HOTE'].lower())
    else:
        sys.exit(__doc__)

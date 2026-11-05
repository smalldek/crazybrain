#!/usr/bin/env python3
"""Garde-fou de la publication Cloudflare : le site ne part que derrière Cloudflare Access.

  python verifier_access.py avant   # avant le déploiement : une application Access couvre tout l'hôte,
                                    # avec au moins une règle « allow » et aucune règle ouverte ; la seule
                                    # ouverture permise est celle du connecteur Claude, sur la liste exacte
                                    # de ses chemins (commun_access.CHEMINS_CONNECTEUR, décision 003)
  python verifier_access.py aud     # imprime l'AUD (champ `aud`) de l'application Access de l'hôte,
                                    # que le Worker exige dans chaque jeton de connexion
  python verifier_access.py apres   # après : la page, l'API et /authorize répondent par la connexion Access,
                                    # jamais par une page ; /mcp sans jeton répond 401

Copie du garde-fou du site du vault (dépôt privé `smalldek/vault`, `site/cloudflare/verifier_access.py`).

Variables : CF_TOKEN (jeton d'API, droit « Access: Apps and Policies Read »), CF_ACCOUNT, HOTE.
Code de sortie 1 au moindre doute : mieux vaut un site pas à jour qu'un site ouvert.
"""
import json
import os
import sys
import urllib.error
import urllib.request

from commun_access import (CHEMINS_CONNECTEUR, chemin_de, couvre, couvre_tout_le_site, destinations,
                           destinations_connecteur, est_ouverte)

API = 'https://api.cloudflare.com/client/v4'


def appel(chemin):
    req = urllib.request.Request(API + chemin, headers={'Authorization': 'Bearer ' + os.environ['CF_TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as r:
        donnees = json.load(r)
    if not donnees.get('success'):
        sys.exit(f'Réponse Cloudflare en échec sur {chemin} : {donnees.get("errors")}')
    return donnees['result']


def regles_de(compte, app):
    return app.get('policies') or appel(f'/accounts/{compte}/access/apps/{app["id"]}/policies') or []


def avant(hote, compte):
    apps = [a for a in appel(f'/accounts/{compte}/access/apps') if couvre(a, hote)]
    site = [a for a in apps if couvre_tout_le_site(a, hote)]
    if not site:
        sys.exit(f'Aucune application Cloudflare Access ne couvre tout {hote} : publication refusée.')
    permises = destinations_connecteur(hote)
    for app in apps:
        regles = regles_de(compte, app)
        ouvertes = [r for r in regles if est_ouverte(r)]
        if app in site:
            # L'application du site entier : fermée, sans exception.
            if not any(r.get('decision') == 'allow' for r in regles):
                sys.exit(f'Application Access « {app.get("name")} » sans règle « allow » : publication refusée.')
            if ouvertes:
                sys.exit(f'Règle « {ouvertes[0].get("name")} » ouverte sur tout {hote} : publication refusée.')
            continue
        # Une application sur des chemins : ouverte seulement sur la liste exacte du connecteur.
        if ouvertes:
            hors_liste = sorted(chemin_de(d) or '/' for d in destinations(app) - permises)
            if hors_liste:
                sys.exit(f'Application Access « {app.get("name")} » ouverte sur {", ".join(hors_liste)}, '
                         f'hors de la liste du connecteur : publication refusée.')
    ouvertes = sorted({chemin_de(d) for a in apps if a not in site and any(est_ouverte(r) for r in regles_de(compte, a))
                       for d in destinations(a)})
    print(f'{hote} protégé par Access ({", ".join(a.get("name", "?") for a in site)}) ; '
          f'ouvert pour le connecteur : {", ".join(ouvertes) or "rien"} (permis : {", ".join(CHEMINS_CONNECTEUR)}).')


def aud(hote, compte):
    """Imprime l'AUD de l'application Access du site entier ; refuse s'il y en a zéro ou plusieurs."""
    apps = [a for a in appel(f'/accounts/{compte}/access/apps') if couvre_tout_le_site(a, hote)]
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


def lire(url, methode='GET', corps=None, entetes=None):
    """(code, en-têtes, début du corps) sans suivre les redirections ; None si l'hôte est injoignable."""
    ouvreur = urllib.request.build_opener(SansRedirection)
    req = urllib.request.Request(url, data=corps, method=methode, headers={
        'User-Agent': 'Mozilla/5.0 (verifier_access.py)', 'Accept': 'text/html', **(entetes or {})})
    try:
        r = ouvreur.open(req, timeout=30)
        return r.status, r.headers, ''
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read(8192).decode('utf-8', 'replace')
    except urllib.error.URLError as e:
        sys.exit(f'{url} injoignable ({e.reason}) : vérification impossible, à refaire.')


def bloque_par_pare_feu(code, corps):
    return code == 403 and any(m in corps for m in PARE_FEU)


def apres(hote):
    # La page, l'API et la page d'autorisation : la connexion Access, sinon un refus.
    for chemin in ('/', '/api/elements', '/authorize'):
        code, entetes, corps = lire(f'https://{hote}{chemin}')
        lieu = entetes.get('Location', '')
        if code in (301, 302, 303, 307) and 'cloudflareaccess.com' in lieu:
            print(f'{hote}{chemin} renvoie vers la connexion Access : bon.')
        elif bloque_par_pare_feu(code, corps):
            # Pas d'échec : le déploiement est fait, et un échec à chaque publication ne serait que du bruit.
            print(f'::warning::{hote}{chemin} : le pare-feu de la zone répond avant Access depuis ce serveur (403) ; '
                  f'la redirection vers Access n\'est pas vérifiable d\'ici (Access est contrôlé par « avant »).')
        elif code in (401, 403):
            print(f'{hote}{chemin} refuse sans connexion ({code}) : bon.')
        else:
            sys.exit(f'ALERTE : {hote}{chemin} répond {code} sans passer par Access. Couper la route dans Cloudflare.')

    # Le connecteur : sans jeton, 401 et l'adresse de la découverte.
    code, entetes, corps = lire(f'https://{hote}/mcp', 'POST', b'{}', {'Content-Type': 'application/json'})
    defi = entetes.get('WWW-Authenticate', '')
    if code == 401 and 'resource_metadata=' in defi:
        print(f'{hote}/mcp refuse sans jeton (401) et indique la découverte OAuth : bon.')
    elif bloque_par_pare_feu(code, corps):
        print(f'::warning::{hote}/mcp : le pare-feu de la zone bloque ce serveur ; il bloquera aussi claude.ai '
              f'tant que l\'exception du pare-feu manque (posée par smalldek/cluster, cloudflare/pare-feu.tf).')
    elif code in (301, 302, 303, 307) and 'cloudflareaccess.com' in entetes.get('Location', ''):
        print(f'::warning::{hote}/mcp renvoie encore vers Access : l\'ouverture du connecteur n\'est pas active.')
    else:
        sys.exit(f'ALERTE : {hote}/mcp répond {code} sans jeton. Couper la route dans Cloudflare.')


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

#!/usr/bin/env python3
"""Ouvre dans Cloudflare Access les seules adresses du connecteur Claude (décision 003).

  python outils/poser_ouverture_connecteur.py

Les serveurs d'Anthropic appellent /mcp et les adresses OAuth sans la connexion Access d'Adrien :
Access doit les laisser passer. Ce script pose une application Access « crazybrain-connecteur »
sur la liste exacte commun_access.CHEMINS_CONNECTEUR, avec une règle « bypass » (laisser passer).
Ces adresses restent gardées par le Worker : /mcp exige un jeton OAuth. Le reste du site, la page,
l'API et /authorize, reste derrière l'application « crazybrain ».

Idempotent : ne touche à rien si tout est déjà en place ; remet la liste exacte si elle a changé.
verifier_access.py avant refuse ensuite toute autre ouverture.

Variables : CF_TOKEN (droit « Access: Apps and Policies — Edit »), CF_ACCOUNT, HOTE.
"""
import os

from commun_access import CHEMINS_CONNECTEUR, NOM_APP_CONNECTEUR, destinations, destinations_connecteur
from poser_access import appel, regles


def corps_app(hote):
    return {
        'name': NOM_APP_CONNECTEUR,
        'type': 'self_hosted',
        'domain': hote + CHEMINS_CONNECTEUR[0],
        'destinations': [{'type': 'public', 'uri': hote + c} for c in CHEMINS_CONNECTEUR],
        'session_duration': '24h',
        # Pas de page de connexion ni de cookie sur ces adresses : ce sont des appels de serveur à serveur.
        'app_launcher_visible': False,
    }


REGLE = {'name': 'Connecteur Claude : laisser passer (le Worker exige le jeton OAuth)', 'decision': 'bypass',
         'include': [{'everyone': {}}], 'exclude': [], 'require': []}


def main():
    compte, hote = os.environ['CF_ACCOUNT'], os.environ['HOTE'].lower()
    voulues = destinations_connecteur(hote)
    apps = [a for a in appel('GET', f'/accounts/{compte}/access/apps') if a.get('name') == NOM_APP_CONNECTEUR]
    if len(apps) > 1:
        raise SystemExit(f'{len(apps)} applications « {NOM_APP_CONNECTEUR} » : à nettoyer à la main, rien n\'est changé.')

    if apps:
        app = apps[0]
        if destinations(app) != voulues:
            app = appel('PUT', f'/accounts/{compte}/access/apps/{app["id"]}', {**corps_app(hote), 'policies': [
                {'id': r['id'], 'precedence': i + 1} for i, r in enumerate(regles(compte, app)) if r.get('id')]})
            print(f'Application « {NOM_APP_CONNECTEUR} » remise sur la liste exacte des chemins.')
    else:
        app = appel('POST', f'/accounts/{compte}/access/apps', corps_app(hote))
        print(f'Application « {NOM_APP_CONNECTEUR} » créée.')

    if any(r.get('decision') == 'bypass' for r in regles(compte, app)):
        print(f'Ouverture du connecteur en place : {", ".join(CHEMINS_CONNECTEUR)}.')
        return
    # Deux façons d'attacher une règle selon la version de l'API (comme poser_access.py).
    if appel('POST', f'/accounts/{compte}/access/apps/{app["id"]}/policies', {**REGLE, 'precedence': 1},
             echec_fatal=False) is None:
        nouvelle = appel('POST', f'/accounts/{compte}/access/policies', REGLE)
        appel('PUT', f'/accounts/{compte}/access/apps/{app["id"]}',
              {**corps_app(hote), 'policies': [{'id': nouvelle['id'], 'precedence': 1}]})
    print(f'Règle « bypass » posée sur {", ".join(CHEMINS_CONNECTEUR)}.')


if __name__ == '__main__':
    main()

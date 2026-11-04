#!/usr/bin/env python3
"""Pose la porte Cloudflare Access devant Crazybrain, si elle n'y est pas déjà.

  python outils/poser_access.py

Cloudflare Access est le « portier » : personne n'atteint le site sans s'être connecté. Ce script
crée l'application Access de l'hôte entier (HOTE) quand elle manque, et ne touche à rien si elle
existe. L'ouverture limitée du connecteur Claude est posée à part (poser_ouverture_connecteur.py).

Qui a le droit d'entrer : la même règle que le site du vault (HOTE_MODELE). Le script recopie ses
conditions (l'adresse d'Adrien) sans jamais les afficher : le dépôt et les journaux des Actions
sont publics, aucune adresse ne doit y apparaître.

Variables : CF_TOKEN (droit « Access: Apps and Policies — Edit »), CF_ACCOUNT, HOTE, HOTE_MODELE.
"""
import json
import os
import sys
import urllib.error
import urllib.request

from commun_access import couvre_tout_le_site

API = 'https://api.cloudflare.com/client/v4'


def appel(methode, chemin, corps=None, echec_fatal=True):
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(API + chemin, data=donnees, method=methode, headers={
        'Authorization': 'Bearer ' + os.environ['CF_TOKEN'], 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            rep = json.load(r)
    except urllib.error.HTTPError as e:
        rep = json.loads(e.read() or b'{}')
    if not rep.get('success'):
        # Les messages d'erreur de Cloudflare ne contiennent pas les conditions envoyées.
        erreurs = [(x.get('code'), x.get('message')) for x in rep.get('errors') or []]
        if echec_fatal:
            sys.exit(f'Cloudflare refuse {methode} {chemin.split("?")[0]} : {erreurs}')
        print(f'(essai refusé par Cloudflare : {erreurs})')
        return None
    return rep['result']


def regles(compte, app):
    return app.get('policies') or appel('GET', f'/accounts/{compte}/access/apps/{app["id"]}/policies') or []


def main():
    compte, hote, modele = os.environ['CF_ACCOUNT'], os.environ['HOTE'].lower(), os.environ['HOTE_MODELE'].lower()
    apps = appel('GET', f'/accounts/{compte}/access/apps')
    existantes = [a for a in apps if couvre_tout_le_site(a, hote)]
    if existantes and any(r.get('decision') == 'allow' for r in regles(compte, existantes[0])):
        print(f'{hote} a déjà son application Access avec une règle « allow » : rien à faire.')
        return

    modeles = [a for a in apps if couvre_tout_le_site(a, modele)]
    if len(modeles) != 1:
        sys.exit(f'{len(modeles)} application(s) Access pour {modele} (il en faut une) : impossible de recopier la règle.')
    allow = [r for r in regles(compte, modeles[0]) if r.get('decision') == 'allow']
    if not allow:
        sys.exit(f'Pas de règle « allow » sur {modele} : rien à recopier.')
    if any('everyone' in i for r in allow for i in r.get('include') or []):
        sys.exit(f'La règle de {modele} est ouverte à tout le monde : refus de la recopier.')
    print(f'Règle recopiée depuis {modele} : {len(allow)} règle(s) « allow » (contenu non affiché).')

    if existantes:
        app = existantes[0]
        print(f'Application Access de {hote} trouvée sans règle « allow » : on la complète.')
    else:
        app = appel('POST', f'/accounts/{compte}/access/apps', {
            'name': 'crazybrain', 'domain': hote, 'type': 'self_hosted', 'session_duration': '24h'})
        print(f'Application Access « crazybrain » créée pour {hote}.')

    # Deux façons d'attacher une règle selon la version de l'API : la règle partagée du modèle
    # (« reusable »), sinon une copie propre à l'application.
    partagees = [{'id': r['id'], 'precedence': i + 1} for i, r in enumerate(allow) if r.get('reusable') and r.get('id')]
    if len(partagees) == len(allow):
        appel('PUT', f'/accounts/{compte}/access/apps/{app["id"]}',
              {'name': 'crazybrain', 'domain': hote, 'type': 'self_hosted', 'session_duration': '24h',
               'policies': partagees})
        print('Règle partagée du site du vault attachée.')
        return
    for i, r in enumerate(allow):
        copie = {'name': 'Adrien' if len(allow) == 1 else f'Adrien {i + 1}', 'decision': 'allow',
                 'include': r.get('include') or [], 'exclude': r.get('exclude') or [],
                 'require': r.get('require') or [], 'precedence': i + 1}
        if appel('POST', f'/accounts/{compte}/access/apps/{app["id"]}/policies', copie, echec_fatal=False) is None:
            copie.pop('precedence')
            nouvelle = appel('POST', f'/accounts/{compte}/access/policies', copie)
            appel('PUT', f'/accounts/{compte}/access/apps/{app["id"]}',
                  {'name': 'crazybrain', 'domain': hote, 'type': 'self_hosted', 'session_duration': '24h',
                   'policies': [{'id': nouvelle['id'], 'precedence': i + 1}]})
    print('Règle « allow » posée sur crazybrain.')


if __name__ == '__main__':
    main()

"""Lit le journal des échanges de connexion du connecteur (src/connecteur/journal-oauth.ts).

Lancé par le flux « Lire le journal du connecteur » (onglet Actions de GitHub, bouton « Run workflow »).
Les lignes ne contiennent ni jeton, ni code, ni identifiant : le journal de l'Action, public, peut les montrer.
Variables : CF_TOKEN, CF_ACCOUNT (les secrets du dépôt). Aucun argument.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

API = 'https://api.cloudflare.com/client/v4'
ESPACE = 'crazybrain-oauth'


def appel(chemin, brut=False):
    req = urllib.request.Request(f'{API}{chemin}', headers={'Authorization': f'Bearer {os.environ["CF_TOKEN"]}'})
    with urllib.request.urlopen(req, timeout=30) as r:
        corps = r.read().decode('utf-8')
    return corps if brut else json.loads(corps)


def main():
    compte = os.environ['CF_ACCOUNT']
    espaces = appel(f'/accounts/{compte}/storage/kv/namespaces?per_page=100')['result']
    espace = next((e['id'] for e in espaces if e['title'] == ESPACE), None)
    if not espace:
        sys.exit(f"Espace KV {ESPACE} introuvable.")
    base = f'/accounts/{compte}/storage/kv/namespaces/{espace}'
    cles, curseur = [], ''
    while True:
        page = appel(f'{base}/keys?prefix=journal:&limit=1000' + (f'&cursor={curseur}' if curseur else ''))
        cles += [c['name'] for c in page['result']]
        curseur = page.get('result_info', {}).get('cursor') or ''
        if not curseur:
            break
    if not cles:
        print('Journal vide : aucun appel aux adresses de connexion depuis 7 jours.')
        return
    print(f'{len(cles)} ligne(s), les plus anciennes d\'abord (heure UTC) :')
    for cle in sorted(cles):
        ligne = json.loads(appel(f'{base}/values/{urllib.parse.quote(cle, safe="")}', brut=True))
        details = ', '.join(f'{k}={ligne[k]}' for k in ('typeDemande', 'appelant', 'erreur') if k in ligne)
        print(f"{ligne['quand']}  {ligne['methode']:<4} {ligne['chemin']:<45} {ligne['statut']}  {details}")


if __name__ == '__main__':
    main()

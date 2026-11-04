#!/usr/bin/env python3
"""Exception au pare-feu de la zone pour le connecteur Claude (décision 003).

  python outils/poser_pare_feu.py           # pose l'exception si le jeton en a le droit, sinon explique
  python outils/poser_pare_feu.py consigne  # imprime seulement la marche à suivre dans le tableau de bord

La zone dekermadec.net a une règle de pare-feu qui bloque les visiteurs hors de France. Elle répond
avant Access et avant le Worker : elle bloquerait les serveurs d'Anthropic, surtout aux États-Unis.
L'exception est une règle « Skip » (passer les règles suivantes), placée en premier, limitée à
l'hôte de Crazybrain et à la liste exacte des chemins du connecteur (commun_access.CHEMINS_PARE_FEU).

Le jeton du dépôt n'a sans doute pas le droit de modifier le pare-feu (« Zone WAF — Edit ») : le
script ne contourne rien, il dit alors pas à pas ce qu'Adrien doit créer. Il n'échoue jamais : le
site lui-même ne dépend pas de cette exception. Aucun identifiant n'est affiché.

Variables : CF_TOKEN, HOTE, ZONE (dekermadec.net).
"""
import json
import os
import sys
import urllib.error
import urllib.request

from commun_access import CHEMINS_PARE_FEU

API = 'https://api.cloudflare.com/client/v4'
DESCRIPTION = 'crazybrain : connecteur Claude (decision 003)'
PHASE = 'http_request_firewall_custom'
# Ce que l'exception fait passer : les autres règles personnalisées (dont « hors de France »),
# le contrôle d'intégrité du navigateur (« error code: 1010 ») et le niveau de sécurité.
PARAMETRES = {'ruleset': 'current', 'products': ['bic', 'securityLevel']}


def expression(hote):
    chemins = ' '.join(f'"{c}"' for c in CHEMINS_PARE_FEU)
    return f'(http.host eq "{hote}" and http.request.uri.path in {{{chemins}}})'


def consigne(hote, zone):
    return f'''Exception à créer dans le tableau de bord Cloudflare (une fois) :
  1. dash.cloudflare.com, domaine {zone}, menu Security > WAF, onglet « Custom rules », « Create rule ».
  2. Rule name : {DESCRIPTION}
  3. À côté de « Expression Preview », cliquer « Edit expression » et coller :
       {expression(hote)}
  4. Choose action : « Skip ». Cocher « All remaining custom rules ».
     Dans « More components to skip », cocher aussi « Browser Integrity Check » et « Security Level ».
  5. « Place at » : First (la règle doit être AVANT la règle « hors de France »). « Deploy ».
  6. Vérifier dans la liste des règles qu'elle est bien la première.'''


def appel(methode, chemin, corps=None):
    """(succès, résultat, codes d'erreur Cloudflare). Les erreurs ne contiennent aucun identifiant affiché."""
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(API + chemin, data=donnees, method=methode, headers={
        'Authorization': 'Bearer ' + os.environ['CF_TOKEN'], 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            rep = json.load(r)
    except urllib.error.HTTPError as e:
        try:
            rep = json.loads(e.read() or b'{}')
        except ValueError:
            rep = {}
        rep.setdefault('status', e.code)
    return bool(rep.get('success')), rep.get('result'), [x.get('code') for x in rep.get('errors') or []] or [rep.get('status')]


def expliquer(raison, hote, zone):
    print(f'::warning::Exception du pare-feu non posée : {raison}. Adrien doit la créer (voir le résumé de l\'Action).')
    print(consigne(hote, zone))
    resume = os.environ.get('GITHUB_STEP_SUMMARY')
    if resume:
        with open(resume, 'a', encoding='utf-8') as f:
            f.write(f'### Pare-feu de la zone : exception à créer\n\nRaison : {raison}.\n\n```\n{consigne(hote, zone)}\n```\n')


def main():
    hote, zone = os.environ['HOTE'].lower(), os.environ['ZONE'].lower()
    if sys.argv[1:] == ['consigne']:
        print(consigne(hote, zone))
        return

    ok, zones, erreurs = appel('GET', f'/zones?name={zone}')
    if not ok or not zones:
        return expliquer(f'le jeton ne peut pas lire la zone ({erreurs})', hote, zone)
    id_zone = zones[0]['id']

    ok, jeu, erreurs = appel('GET', f'/zones/{id_zone}/rulesets/phases/{PHASE}/entrypoint')
    if not ok:
        return expliquer(f'le jeton ne peut pas lire les règles du pare-feu ({erreurs})', hote, zone)
    regles = jeu.get('rules') or []
    voulue = {'description': DESCRIPTION, 'expression': expression(hote), 'action': 'skip',
              'action_parameters': PARAMETRES, 'enabled': True, 'logging': {'enabled': True}}

    existante = next((r for r in regles if r.get('description') == DESCRIPTION), None)
    en_tete = bool(regles) and regles[0].get('description') == DESCRIPTION
    if existante and en_tete and existante.get('expression') == voulue['expression'] \
            and existante.get('action') == 'skip' and existante.get('enabled', True):
        print('Exception du pare-feu pour le connecteur en place, en première position.')
        return
    if existante:
        ok, _, erreurs = appel('PATCH', f'/zones/{id_zone}/rulesets/{jeu["id"]}/rules/{existante["id"]}',
                               {**voulue, 'position': {'index': 1}})
    else:
        ok, _, erreurs = appel('POST', f'/zones/{id_zone}/rulesets/{jeu["id"]}/rules', {**voulue, 'position': {'index': 1}})
    if not ok:
        return expliquer(f'le jeton ne peut pas modifier le pare-feu ({erreurs})', hote, zone)
    print(f'Exception du pare-feu posée en première position : {voulue["expression"]}')


if __name__ == '__main__':
    main()

"""Le garde-fou Access (outils/verifier_access.py avant) : le site reste fermé, et la seule ouverture
permise est celle du connecteur Claude, sur la liste exacte de ses chemins (décision 003).

  python3 -m unittest discover -s tests/outils

Les réponses de Cloudflare sont simulées : aucun appel réseau, aucune donnée réelle.
"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'outils'))

import verifier_access  # noqa: E402
from commun_access import CHEMINS_CONNECTEUR  # noqa: E402

HOTE = 'crazybrain.example.net'
ADRIEN = {'name': 'Adrien', 'decision': 'allow', 'include': [{'email': {'email': 'personne@example.com'}}]}
BYPASS = {'name': 'Connecteur', 'decision': 'bypass', 'include': [{'everyone': {}}]}


def app_site(*regles, aud='aud-site'):
    return {'id': 'site', 'name': 'crazybrain', 'domain': HOTE, 'aud': aud, 'policies': list(regles)}


def app_chemins(chemins, *regles, nom='crazybrain-connecteur'):
    return {'id': nom, 'name': nom, 'domain': HOTE + chemins[0], 'aud': 'aud-' + nom,
            'destinations': [{'type': 'public', 'uri': HOTE + c} for c in chemins], 'policies': list(regles)}


def verifier(*apps):
    with mock.patch.object(verifier_access, 'appel', return_value=list(apps)):
        verifier_access.avant(HOTE, 'compte')


def aud(*apps):
    with mock.patch.object(verifier_access, 'appel', return_value=list(apps)), \
            mock.patch('builtins.print') as imprime:
        verifier_access.aud(HOTE, 'compte')
    return imprime.call_args.args[0]


class GardeFou(unittest.TestCase):
    def test_site_ferme_sans_ouverture(self):
        verifier(app_site(ADRIEN))

    def test_site_ferme_avec_l_ouverture_exacte_du_connecteur(self):
        verifier(app_site(ADRIEN), app_chemins(list(CHEMINS_CONNECTEUR), BYPASS))

    def test_ouverture_d_une_partie_de_la_liste(self):
        verifier(app_site(ADRIEN), app_chemins(['/mcp'], BYPASS))

    def test_refuse_sans_application_sur_tout_le_site(self):
        with self.assertRaises(SystemExit):
            verifier(app_chemins(list(CHEMINS_CONNECTEUR), BYPASS))

    def test_refuse_le_site_entier_en_bypass(self):
        with self.assertRaises(SystemExit):
            verifier(app_site(ADRIEN, BYPASS))

    def test_refuse_l_api_ouverte(self):
        with self.assertRaises(SystemExit) as refus:
            verifier(app_site(ADRIEN), app_chemins(['/mcp', '/api'], BYPASS))
        self.assertIn('/api', str(refus.exception.code))

    def test_refuse_la_page_d_autorisation_ouverte(self):
        with self.assertRaises(SystemExit):
            verifier(app_site(ADRIEN), app_chemins(['/authorize'], BYPASS))

    def test_refuse_un_chemin_voisin(self):
        with self.assertRaises(SystemExit):
            verifier(app_site(ADRIEN), app_chemins(['/mcp-admin'], BYPASS))

    def test_refuse_la_racine_ouverte_par_une_application_de_chemins(self):
        with self.assertRaises(SystemExit):
            verifier(app_site(ADRIEN), app_chemins(['/mcp', '/'], BYPASS))

    def test_refuse_une_ouverture_a_tout_le_monde_deguisee_en_allow(self):
        tout_le_monde = {'name': 'Ouvert', 'decision': 'allow', 'include': [{'everyone': {}}]}
        with self.assertRaises(SystemExit):
            verifier(app_site(ADRIEN), app_chemins(['/api'], tout_le_monde))

    def test_refuse_non_identity(self):
        service = {'name': 'Service', 'decision': 'non_identity', 'include': [{'any_valid_service_token': {}}]}
        with self.assertRaises(SystemExit):
            verifier(app_site(ADRIEN), app_chemins(['/api'], service))

    def test_accepte_une_application_de_chemins_fermee(self):
        verifier(app_site(ADRIEN), app_chemins(['/api'], ADRIEN, nom='plus-strict'))

    def test_l_aud_est_celle_du_site_entier(self):
        self.assertEqual(aud(app_site(ADRIEN), app_chemins(list(CHEMINS_CONNECTEUR), BYPASS)), 'aud-site')


if __name__ == '__main__':
    unittest.main()

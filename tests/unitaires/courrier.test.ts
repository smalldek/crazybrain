// Un mail devient une tâche : qui est accepté, et ce qu'on en tire. Adresses inventées.
import { describe, expect, it } from 'vitest';
import { lireResultats, tacheDuCourrier, verdictCourrier } from '../../src/domaine/courrier';

const ADRIEN = 'adrien.essai@exemple.fr';
const BON = 'mx.cloudflare.net; dkim=pass header.d=exemple.fr header.s=s1 header.b=abc; spf=pass (domaine autorisé) smtp.mailfrom=adrien.essai@exemple.fr; dmarc=pass header.from=exemple.fr';
const base = { enveloppe: ADRIEN, de: ADRIEN, resultats: BON, autorises: [ADRIEN], authserv: 'mx.cloudflare.net' };

describe('lireResultats', () => {
  it('lit le serveur, SPF et chaque signature DKIM, sans les commentaires', () => {
    expect(lireResultats('mx.cloudflare.net; dkim=pass (bonne) header.d=a.fr; dkim=fail header.d=b.fr; spf=softfail smtp.mailfrom=x@a.fr')).toEqual({
      authserv: 'mx.cloudflare.net', spf: 'softfail',
      dkim: [{ resultat: 'pass', domaine: 'a.fr' }, { resultat: 'fail', domaine: 'b.fr' }],
    });
    expect(lireResultats('  ')).toBeNull();
  });
});

describe('verdictCourrier', () => {
  it('accepte un mail d’Adrien authentifié par le serveur reconnu', () => {
    expect(verdictCourrier(base)).toEqual({ accepte: true });
    expect(verdictCourrier({ ...base, de: 'Adrien.Essai@Exemple.FR', autorises: [' ADRIEN.essai@exemple.fr'] }).accepte).toBe(true);
  });

  it('refuse tout tant que rien n’est réglé', () => {
    expect(verdictCourrier({ ...base, autorises: [] })).toEqual({ accepte: false, raison: 'aucune adresse autorisée n’est réglée' });
    expect(verdictCourrier({ ...base, authserv: null }).accepte).toBe(false);
  });

  it('refuse un autre expéditeur, dans l’enveloppe ou dans l’en-tête', () => {
    expect(verdictCourrier({ ...base, enveloppe: 'intrus@ailleurs.fr' })).toEqual({ accepte: false, raison: 'expéditeur non autorisé' });
    expect(verdictCourrier({ ...base, de: 'intrus@ailleurs.fr' }).accepte).toBe(false);
    expect(verdictCourrier({ ...base, de: null }).accepte).toBe(false);
  });

  it('refuse un résultat écrit par un autre serveur : un faux « dkim=pass » glissé par l’expéditeur', () => {
    const faux = BON.replace('mx.cloudflare.net', 'mx.faussaire.example');
    expect(verdictCourrier({ ...base, resultats: faux })).toEqual({ accepte: false, raison: 'résultat écrit par « mx.faussaire.example », serveur non reconnu' });
    expect(verdictCourrier({ ...base, resultats: null })).toEqual({ accepte: false, raison: 'pas de résultat d’authentification' });
  });

  it('refuse sans SPF réussi, ou sans signature DKIM réussie du domaine de l’expéditeur', () => {
    expect(verdictCourrier({ ...base, resultats: BON.replace('spf=pass', 'spf=fail') })).toEqual({ accepte: false, raison: 'SPF fail' });
    expect(verdictCourrier({ ...base, resultats: BON.replace('dkim=pass', 'dkim=fail') }).accepte).toBe(false);
    expect(verdictCourrier({ ...base, resultats: BON.replace('header.d=exemple.fr', 'header.d=autre.fr') }))
      .toEqual({ accepte: false, raison: 'pas de signature DKIM valide de exemple.fr' });
  });
});

describe('tacheDuCourrier', () => {
  it('le sujet sans ses préfixes en titre, le texte en description', () => {
    expect(tacheDuCourrier('Fwd: TR : Appeler le plombier', 'Il passe jeudi.\r\nPrévoir 80 €.\n')).toEqual({ titre: 'Appeler le plombier', description: 'Il passe jeudi.\nPrévoir 80 €.' });
  });

  it('sans sujet, la première ligne du texte ; sans rien, un titre par défaut', () => {
    expect(tacheDuCourrier('  ', '\n\nAcheter du pain\nEt du beurre')).toEqual({ titre: 'Acheter du pain', description: 'Acheter du pain\nEt du beurre' });
    expect(tacheDuCourrier(null, null)).toEqual({ titre: 'Mail sans sujet', description: null });
  });

  it('coupe un sujet trop long', () => {
    const t = tacheDuCourrier('a'.repeat(300), null).titre;
    expect([...t].length).toBe(200);
    expect(t.endsWith('…')).toBe(true);
  });
});

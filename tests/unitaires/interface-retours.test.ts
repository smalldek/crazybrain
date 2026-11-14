// Les retours écrits à Claude depuis une page (étape 9).
import { describe, expect, it } from 'vitest';
import type { Element, Tag } from '../../ui/api';
import { adresseClaude, adresseValide, estRetour, messagePourClaude, ouverts, retourACreer, retoursDeLaPage, type Contexte } from '../../ui/retours';

const element = (id: string, champs: Partial<Element> = {}): Element => ({
  id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null, echeance: null,
  jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null,
  recurrence: null, horizon: null, faitLe: null, archiveLe: null, creeLe: '2026-11-11T10:00:00.000Z', modifieLe: '2026-11-11T10:00:00.000Z',
  ...champs,
});
const tag = (elementId: string, cle: string, valeur: string): Tag => ({ elementId, cle, valeur });

const contexte: Contexte = { vue: 'cercles', adresse: '/cercles?centre=abc', element: { id: 'abc', titre: 'Sport' }, largeur: 412, hauteur: 915 };

describe('retourACreer', () => {
  it('la première ligne en titre, le texte entier et le contexte en description', () => {
    expect(retourACreer('  Le texte dedans est trop long\nOn ne le lit pas  ', contexte)).toEqual({
      titre: 'Le texte dedans est trop long',
      description: 'Le texte dedans est trop long\nOn ne le lit pas\n\n---\nPage : Cercles (/cercles?centre=abc)\n'
        + 'Élément regardé : « Sport » (abc)\nÉcran : 412 × 915',
    });
  });

  it('sans élément regardé, pas de ligne pour lui ; un texte vide ne crée rien', () => {
    expect(retourACreer('Trop lent', { ...contexte, vue: 'liste', adresse: '/', element: null })?.description)
      .toBe('Trop lent\n\n---\nPage : Liste (/)\nÉcran : 412 × 915');
    expect(retourACreer('   \n ', contexte)).toBeNull();
  });

  it('coupe un titre trop long à 200 caractères', () => {
    const titre = retourACreer('é'.repeat(300), contexte)?.titre ?? '';
    expect([...titre]).toHaveLength(200);
    expect(titre.endsWith('…')).toBe(true);
  });
});

describe('retoursDeLaPage', () => {
  it('ne garde que les retours tagués de cette page, du plus ancien au plus récent', () => {
    const elements = [
      element('r2', { type: 'retour', creeLe: '2026-11-11T12:00:00.000Z' }),
      element('r1', { type: 'retour', creeLe: '2026-11-11T09:00:00.000Z' }),
      element('autre-page', { type: 'retour' }),
      element('tache-taguee'),
    ];
    const tags = [tag('r1', 'page', 'cercles'), tag('r2', 'page', 'cercles'), tag('autre-page', 'page', 'liste'), tag('tache-taguee', 'page', 'cercles')];
    expect(retoursDeLaPage(elements, tags, 'cercles').map((e) => e.id)).toEqual(['r1', 'r2']);
    expect(estRetour(elements[0]!)).toBe(true);
    expect(estRetour(elements[3]!)).toBe(false);
  });

  it('compte les retours encore ouverts', () => {
    expect(ouverts([element('a', { statut: 'fait' }), element('b'), element('c', { statut: 'en_cours' })])).toBe(2);
  });
});

describe('ouvrir Claude', () => {
  const message = messagePourClaude({ id: 'r1', titre: 'Trop lent' }, 'liste');

  it('le message nomme le retour, la page, et dit quoi faire', () => {
    expect(message).toContain('Retour Crazybrain r1 sur la page Liste : « Trop lent »');
    expect(message).toContain('lire_element');
    expect(message).toContain('commenter_element');
  });

  it('par défaut une nouvelle conversation claude.ai, le message pré-rempli', () => {
    expect(adresseClaude(null, message)).toBe(`https://claude.ai/new?q=${encodeURIComponent(message)}`);
  });

  it('une adresse réglée s’ouvre telle quelle ; une adresse qui n’est pas https est ignorée', () => {
    expect(adresseClaude('https://claude.ai/code/project/xyz', message)).toBe('https://claude.ai/code/project/xyz');
    expect(adresseClaude('javascript:alert(1)', message)).toBe(`https://claude.ai/new?q=${encodeURIComponent(message)}`);
    expect(adresseValide('pas une adresse')).toBeNull();
    expect(adresseValide('http://claude.ai')).toBeNull();
  });
});

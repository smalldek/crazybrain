// Règles de l'objet-valeur Titre (un titre de tâche).
import { describe, expect, it } from 'vitest';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { Titre, TITRE_LONGUEUR_MAX } from '../../src/domaine/titre';

describe('Titre', () => {
  it('garde le texte donné', () => {
    expect(Titre.creer('Acheter du pain').valeur).toBe('Acheter du pain');
  });

  it('retire les espaces au début et à la fin', () => {
    expect(Titre.creer('   Appeler le garage \n').valeur).toBe('Appeler le garage');
  });

  it('refuse un titre vide', () => {
    expect(() => Titre.creer('')).toThrow(ErreurDomaine);
  });

  it('refuse un titre fait seulement d’espaces', () => {
    expect(() => Titre.creer('   \t ')).toThrow(ErreurDomaine);
  });

  it(`accepte ${TITRE_LONGUEUR_MAX} caractères`, () => {
    expect(Titre.creer('a'.repeat(TITRE_LONGUEUR_MAX)).valeur).toHaveLength(TITRE_LONGUEUR_MAX);
  });

  it(`refuse plus de ${TITRE_LONGUEUR_MAX} caractères`, () => {
    expect(() => Titre.creer('a'.repeat(TITRE_LONGUEUR_MAX + 1))).toThrow(ErreurDomaine);
  });

  it('compte les caractères, pas les octets (accents, émojis)', () => {
    const texte = 'é'.repeat(TITRE_LONGUEUR_MAX - 1) + '🍞';
    expect(Titre.creer(texte).valeur).toBe(texte);
  });

  it('deux titres de même texte sont égaux (objet-valeur)', () => {
    expect(Titre.creer('Pain').egale(Titre.creer(' Pain '))).toBe(true);
  });
});

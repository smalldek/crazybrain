// Les petits objets-valeurs du modèle complet (tâche 1.3) : heure, priorité, description, estimation, type.
import { describe, expect, it } from 'vitest';
import { CodeType } from '../../src/domaine/code-type';
import { Description, DESCRIPTION_LONGUEUR_MAX } from '../../src/domaine/description';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { Estimation } from '../../src/domaine/estimation';
import { Heure } from '../../src/domaine/heure';
import { lirePriorite } from '../../src/domaine/priorite';

describe('Heure', () => {
  it('garde une heure HH:MM sur 24 heures', () => {
    expect(Heure.creer('00:00').valeur).toBe('00:00');
    expect(Heure.creer('23:59').valeur).toBe('23:59');
  });

  it('refuse le reste', () => {
    for (const texte of ['24:00', '9:30', '09:60', '09h30', '']) {
      expect(() => Heure.creer(texte), texte).toThrow(ErreurDomaine);
    }
  });
});

describe('Priorité', () => {
  it('connaît basse, normale, haute, urgente', () => {
    expect(lirePriorite('urgente')).toBe('urgente');
  });

  it('refuse une autre valeur', () => {
    expect(() => lirePriorite('critique')).toThrow(ErreurDomaine);
  });
});

describe('Description', () => {
  it('garde le Markdown, sans les espaces de fin', () => {
    expect(Description.creer('# Titre\n\n- un\n- deux\n\n')?.valeur).toBe('# Titre\n\n- un\n- deux');
  });

  it('vide ou faite d’espaces : pas de description', () => {
    expect(Description.creer('')).toBeNull();
    expect(Description.creer(' \n\t ')).toBeNull();
  });

  it('refuse un texte trop long', () => {
    expect(() => Description.creer('a'.repeat(DESCRIPTION_LONGUEUR_MAX + 1))).toThrow(ErreurDomaine);
  });
});

describe('Estimation', () => {
  it('compte en minutes entières, plus de zéro', () => {
    expect(Estimation.creer(45).minutes).toBe(45);
    expect(() => Estimation.creer(0)).toThrow(ErreurDomaine);
    expect(() => Estimation.creer(-5)).toThrow(ErreurDomaine);
    expect(() => Estimation.creer(1.5)).toThrow(ErreurDomaine);
  });
});

describe('CodeType', () => {
  it('accepte un code en minuscules sans accent', () => {
    expect(CodeType.creer('sous_projet').valeur).toBe('sous_projet');
  });

  it('refuse majuscules, accents, espaces', () => {
    for (const texte of ['Tache', 'tâche', 'sous projet', '1projet', '']) {
      expect(() => CodeType.creer(texte), texte).toThrow(ErreurDomaine);
    }
  });
});

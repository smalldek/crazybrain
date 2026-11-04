// Le message de l'outil « bonjour » du connecteur Claude (étape 1c).
import { describe, expect, it } from 'vitest';
import { messageBonjour } from '../../src/domaine/bonjour';

describe('messageBonjour', () => {
  it('dit qu’il n’y a aucune tâche quand la base est vide', () => {
    expect(messageBonjour(0)).toBe('Bonjour depuis Crazybrain ! Aucune tâche en base.');
  });

  it('accorde au singulier', () => {
    expect(messageBonjour(1)).toBe('Bonjour depuis Crazybrain ! 1 tâche en base.');
  });

  it('accorde au pluriel', () => {
    expect(messageBonjour(12)).toBe('Bonjour depuis Crazybrain ! 12 tâches en base.');
  });

  it('refuse un nombre négatif ou non entier', () => {
    expect(() => messageBonjour(-1)).toThrow(RangeError);
    expect(() => messageBonjour(1.5)).toThrow(RangeError);
  });
});

// Le partage avec les autres applis (tâches 5.3 et 5.4).
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { contenuAPartager, lirePartage } from '../../ui/partage';

const p = (q: Record<string, string>) => new URLSearchParams(q);

describe('lirePartage (ce qu’une autre appli nous envoie)', () => {
  it('un message WhatsApp : la première ligne en titre, le reste en description', () => {
    expect(lirePartage(p({ texte: 'Rappeler le garage\nIls ferment à 18 h\nMerci' })))
      .toEqual({ titre: 'Rappeler le garage', description: 'Ils ferment à 18 h\nMerci' });
  });

  it('une page du navigateur : son titre, et le lien en description', () => {
    expect(lirePartage(p({ titre: 'Recette du pain', lien: 'https://exemple.org/pain' })))
      .toEqual({ titre: 'Recette du pain', description: 'https://exemple.org/pain' });
  });

  it('ne répète pas le lien déjà dans le texte ; un lien seul devient le titre', () => {
    expect(lirePartage(p({ titre: 'À lire', texte: 'Voir https://exemple.org', lien: 'https://exemple.org' })))
      .toEqual({ titre: 'À lire', description: 'Voir https://exemple.org' });
    expect(lirePartage(p({ lien: 'https://exemple.org' }))).toEqual({ titre: 'https://exemple.org', description: null });
  });

  it('coupe un titre trop long et garde le texte entier en description', () => {
    const long = 'x'.repeat(250);
    const lu = lirePartage(p({ texte: long }));
    expect([...(lu?.titre ?? '')].length).toBe(200);
    expect(lu?.description).toBe(long);
  });

  it('rien de partagé : null', () => {
    expect(lirePartage(p({}))).toBeNull();
    expect(lirePartage(p({ texte: '   ' }))).toBeNull();
  });
});

describe('contenuAPartager (une tâche vers une autre appli)', () => {
  it('le titre, l’échéance, la description, et l’adresse de la tâche', () => {
    const e = { id: 'a b', titre: 'Payer', echeance: '2026-11-20', description: 'Facture EDF' } as Element;
    expect(contenuAPartager(e, 'https://crazybrain.exemple')).toEqual({
      title: 'Payer', text: 'Payer\nÉchéance : 20/11/2026\n\nFacture EDF', url: 'https://crazybrain.exemple/e/a%20b',
    });
  });
});

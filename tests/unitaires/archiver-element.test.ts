// Supprimer une tâche l'archive : elle quitte la liste, mais rien n'est perdu (journal, restauration).
import { describe, expect, it } from 'vitest';
import { archiverElement, restaurerElement } from '../../src/domaine/archiver-element';
import { Element } from '../../src/domaine/element';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { modifierElement } from '../../src/domaine/modifier-element';
import { Titre } from '../../src/domaine/titre';

const cree = new Date('2026-11-03T08:30:00.000Z');
const maintenant = new Date('2026-11-05T23:00:00.000Z');
const element = Element.creer({ id: 'el-1', titre: Titre.creer('Vieux truc'), maintenant: cree });

describe('archiverElement', () => {
  it('rend l’élément archivé et l’événement « element_archive »', () => {
    const { element: archive, evenement } = archiverElement({ element, idEvenement: 'ev-9', auteur: 'adrien', maintenant });

    expect(archive.archiveLe).toEqual(maintenant);
    expect(evenement).toMatchObject({ type: 'element_archive', elementId: 'el-1', avant: element.instantane(), apres: archive.instantane() });
  });

  it('restaurer rend l’événement « element_restaure »', () => {
    const { element: archive } = archiverElement({ element, idEvenement: 'ev-9', auteur: 'adrien', maintenant });
    const { element: restaure, evenement } = restaurerElement({ element: archive, idEvenement: 'ev-10', auteur: 'claude', maintenant });

    expect(restaure.archiveLe).toBeNull();
    expect(evenement).toMatchObject({ type: 'element_restaure', auteur: 'claude' });
  });

  it('une tâche archivée ne se modifie plus (il faut la restaurer d’abord)', () => {
    const { element: archive } = archiverElement({ element, idEvenement: 'ev-9', auteur: 'adrien', maintenant });

    expect(() => modifierElement({ element: archive, changements: { titre: 'Autre' }, idEvenement: 'ev-11', auteur: 'adrien', maintenant }))
      .toThrow(ErreurDomaine);
  });
});

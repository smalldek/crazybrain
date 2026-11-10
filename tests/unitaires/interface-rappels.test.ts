// Les mesures des rappels (tâche 5.5).
import { describe, expect, it } from 'vitest';
import type { EnvoiRappel } from '../../ui/api';
import { bilan, duree, octetsDeCle, retardDe } from '../../ui/rappels';

const envoi = (prevu: string, envoye: string, recu: string | null): EnvoiRappel =>
  ({ id: 'x', elementId: null, titre: 't', prevuLe: prevu, envoyeLe: envoye, statutHttp: 201, recuLe: recu });

describe('les retards', () => {
  it('au départ et à la réception, depuis l’heure prévue', () => {
    expect(retardDe(envoi('2026-11-10T08:00:00Z', '2026-11-10T08:00:40Z', '2026-11-10T08:01:10Z'))).toEqual({ depart: 40, reception: 70 });
    expect(retardDe(envoi('2026-11-10T08:00:00Z', '2026-11-10T08:00:40Z', null)).reception).toBeNull();
  });

  it('se lisent en secondes, minutes ou heures', () => {
    expect(duree(12)).toBe('12 s');
    expect(duree(180)).toBe('3 min');
    expect(duree(7500)).toBe('2 h 05');
  });

  it('le bilan : médiane et pire des réceptions signalées', () => {
    const b = bilan([
      envoi('2026-11-10T08:00:00Z', '2026-11-10T08:00:10Z', '2026-11-10T08:00:20Z'),
      envoi('2026-11-10T09:00:00Z', '2026-11-10T09:00:10Z', '2026-11-10T09:05:00Z'),
      envoi('2026-11-10T10:00:00Z', '2026-11-10T10:00:10Z', '2026-11-10T10:00:30Z'),
      envoi('2026-11-10T11:00:00Z', '2026-11-10T11:00:10Z', null),
    ]);
    expect(b).toEqual({ envoyes: 4, recus: 3, median: 30, pire: 300 });
    expect(bilan([])).toEqual({ envoyes: 0, recus: 0, median: null, pire: null });
  });
});

it('la clé publique se remet en octets', () => {
  expect([...octetsDeCle('AQID_w')]).toEqual([1, 2, 3, 255]);
});

-- Migration 0009 (tâche 5.5) : les rappels envoyés au téléphone par Web Push.

-- L'instant où le téléphone doit sonner (ISO, UTC), et l'instant où le rappel est parti. Changer le
-- rappel efface « envoyé » : le nouveau partira à son heure.
ALTER TABLE elements ADD COLUMN rappel TEXT;
ALTER TABLE elements ADD COLUMN rappel_envoye_le TEXT;
CREATE INDEX elements_rappel ON elements (rappel) WHERE rappel IS NOT NULL AND rappel_envoye_le IS NULL;

-- Les téléphones (et navigateurs) abonnés : l'adresse du service de notification (Google, pour
-- Chrome sur Android) et les deux clés que le navigateur donne pour chiffrer les messages.
-- Une donnée technique, sans événement au journal : ce n'est pas une modification d'Adrien.
CREATE TABLE abonnements_push (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  appareil TEXT,
  cree_le TEXT NOT NULL
);

-- Chaque envoi, pour mesurer le retard sur plusieurs jours (hypothèse « Web Push est assez fiable
-- sur Android ») : l'heure prévue, l'heure d'envoi, la réponse du service, l'heure de réception
-- quand le téléphone la signale.
CREATE TABLE envois_push (
  id TEXT PRIMARY KEY,
  element_id TEXT,
  titre TEXT NOT NULL,
  prevu_le TEXT NOT NULL,
  envoye_le TEXT NOT NULL,
  statut_http INTEGER,
  recu_le TEXT
);
CREATE INDEX envois_push_envoye ON envois_push (envoye_le);

DROP VIEW v_elements;
CREATE VIEW v_elements AS
  SELECT id, type, parent, titre, description, statut, priorite, echeance, jour_planifie, heure_planifiee,
         estimation, rang, poids, avancement, rappel, fait_le, cree_le, modifie_le
  FROM elements WHERE archive_le IS NULL;

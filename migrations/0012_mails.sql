-- Migration 0012 (étape 8) : chaque mail reçu par le Worker, accepté ou refusé, et pourquoi. Sert à
-- régler l'adresse (le premier vrai mail dit quel serveur signe le résultat d'authentification) et
-- à comprendre un refus. Ni le corps du mail ni ses en-têtes complets ne sont gardés.
CREATE TABLE mails_recus (
  id TEXT PRIMARY KEY,
  recu_le TEXT NOT NULL,
  expediteur TEXT NOT NULL,
  sujet TEXT,
  accepte INTEGER NOT NULL,
  raison TEXT,
  -- Le serveur qui a écrit le premier en-tête Authentication-Results, s'il y en a un.
  authserv TEXT,
  element_id TEXT
);
CREATE INDEX mails_recus_par_date ON mails_recus (recu_le);

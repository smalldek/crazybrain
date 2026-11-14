-- Migration 0013 (tâche 9.1) : le type « retour ». Un retour est ce qu'Adrien écrit à Claude depuis
-- une page de l'outil (étape 9) ; il porte le tag page:<vue>, et les commentaires sont le fil de la
-- discussion. Les vues de travail ne le montrent pas : seul le fil de sa page le montre.
INSERT INTO types (code, libelle, ordre) VALUES ('retour', 'Retour', 7);

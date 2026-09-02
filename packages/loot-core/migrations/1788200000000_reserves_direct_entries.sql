BEGIN TRANSACTION;

-- Les reserves ne se pilotent plus depuis les operations mais depuis leur
-- propre tableau. Deux sources, et deux seulement :
--
--   monthly_amount  un abondement recurrent, la meme somme chaque mois
--   savings_reserve_entries  des saisies ponctuelles, positives ou negatives
--
-- Le solde d'une reserve a fin de mois M vaut donc :
--   monthly_amount x (nombre de mois de start_month a M) + somme des saisies <= M
--
-- Rattacher une reserve a une operation a ete retire : deux mecanismes
-- alimentant le meme solde rendaient tout ecart impossible a rapprocher.

ALTER TABLE savings_reserves ADD COLUMN monthly_amount INTEGER DEFAULT 0;
ALTER TABLE savings_reserves ADD COLUMN start_month TEXT DEFAULT NULL;

CREATE TABLE savings_reserve_entries
  (id TEXT PRIMARY KEY,
   reserve_id TEXT,
   month TEXT,          -- 'YYYY-MM'
   amount INTEGER DEFAULT 0,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX reserve_entries_reserve ON savings_reserve_entries(reserve_id);
CREATE INDEX reserve_entries_month ON savings_reserve_entries(month);

-- Les vues doivent tomber AVANT la colonne : SQLite refuse de supprimer une
-- colonne qu'une vue mentionne, et v_transactions_internal la selectionne.
-- Elles sont regenerees juste apres par updateViews(), qui suit les migrations
-- au chargement du budget ; effacer le hash garantit qu'il les reconstruise
-- meme si le schema compile n'avait pas change par ailleurs.
DROP VIEW IF EXISTS v_transactions;
DROP VIEW IF EXISTS v_transactions_internal_alive;
DROP VIEW IF EXISTS v_transactions_internal;
DROP VIEW IF EXISTS v_schedules;
DROP VIEW IF EXISTS v_categories;
DROP VIEW IF EXISTS v_payees;
DELETE FROM __meta__ WHERE key = 'view-hash';

DROP INDEX IF EXISTS trans_reserve_id;
ALTER TABLE transactions DROP COLUMN reserve_id;

COMMIT;

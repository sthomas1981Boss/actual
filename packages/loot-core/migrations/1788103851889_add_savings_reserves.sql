BEGIN TRANSACTION;

-- Reserves: named provisions carved out of one or more off-budget savings
-- accounts (see the `savings-reserve-accounts` synced pref). Deliberately
-- separate from category groups: reserves must never surface in the budget,
-- which tracks monthly spending, while a reserve accumulates across months.
--
-- Named `reserves` rather than `envelopes` to avoid colliding with Actual's
-- envelope budgeting, which is an unrelated mechanism.
CREATE TABLE savings_reserves
  (id TEXT PRIMARY KEY,
   name TEXT,
   sort_order REAL,
   tombstone INTEGER DEFAULT 0);

-- Lives on transactions, so a split transfer can spread across several
-- reserves: each subtransaction carries its own.
ALTER TABLE transactions ADD COLUMN reserve_id TEXT DEFAULT NULL;

CREATE INDEX trans_reserve_id ON transactions(reserve_id);

COMMIT;

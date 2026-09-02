BEGIN TRANSACTION;

-- Le mois d'origine ne se regle plus a la main : c'est la premiere somme
-- saisie qui demarre le cumul, et le versement mensuel s'ajoute a partir du
-- mois suivant. Deduire l'origine des saisies plutot que la stocker supprime
-- tout risque d'incoherence entre les deux.
ALTER TABLE savings_reserves DROP COLUMN start_month;

COMMIT;

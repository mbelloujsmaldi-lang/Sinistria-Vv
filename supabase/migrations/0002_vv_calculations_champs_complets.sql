-- ============================================================
-- Sinistria-VV — 0002 : champs complets de vv_calculations
-- Complète les paramètres d'entrée et les résultats intermédiaires
-- du calcul, pour permettre l'audit et la reproduction exacte d'un
-- calcul lors d'une validation par un supérieur hiérarchique.
-- ============================================================

alter table vv_calculations
  add column carburant text,
  add column puissance_fiscale numeric,
  add column kilometrage_total numeric,
  add column type_kilometrage text,
  add column entretien text,
  add column correctif_commercial_pct numeric,
  add column correctif_beta_pct numeric,
  add column correctif_beta_montant numeric(12,2),
  add column correctif_lambda_pct numeric,
  add column correctif_lambda_montant numeric(12,2),
  add column vvade_sans_correctif numeric(12,2);

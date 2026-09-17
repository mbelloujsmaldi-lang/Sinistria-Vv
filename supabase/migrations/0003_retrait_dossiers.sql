-- ============================================================
-- Sinistria-VV — 0003 : retrait de la table dossiers
-- Décision architecturale : VV reste un service de calcul isolé,
-- appelable, sans donnée de dossier partagée. Sinistria-Site possède
-- déjà un système de dossier complet et mature (sociétaire, véhicule,
-- sinistre, workflow) — VV n'a besoin ni de le dupliquer ni de s'y
-- synchroniser pour effectuer ou rejouer un calcul.
-- ============================================================

alter table vv_calculations
  drop column if exists dossier_id,
  add column reference_dossier_externe text;

drop table if exists dossiers cascade;
drop type if exists dossier_statut;

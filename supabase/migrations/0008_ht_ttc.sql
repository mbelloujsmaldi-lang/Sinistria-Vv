-- ============================================================
-- Sinistria-VV — 0008 : distinction HT / TTC (Sprint 8bis)
-- La valeur à neuf et la VVADE restent toujours TTC ; le HT équivalent
-- est affiché en complément (obligatoire pour une personne physique en
-- activité professionnelle, utile dans les autres cas — FMSAR 2023).
--
-- Colonnes stockées au moment du calcul, PAS générées : si le taux de
-- TVA standard change un jour (loi de finances), les calculs déjà faits
-- doivent garder le taux qui a servi à l'époque, pas un taux "actuel"
-- réinterprété rétroactivement — même logique que le barème lui-même.
-- ============================================================

alter table vv_calculations
  add column taux_tva_applique numeric,
  add column vvade_finale_ht numeric(12,2);

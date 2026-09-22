-- ============================================================
-- Sinistria-VV — 0015 : rôle figé sur journal_audit (Sprint 15, suite)
--
-- Angle mort repéré en construisant la Phase C : journal_audit (0014)
-- n'a pas de colonne de rôle, alors que la vue unifiée doit afficher une
-- colonne "Rôle" pour CHAQUE ligne, comme l'ancien système. Même principe
-- que vv_calculations_historique.role_utilisateur (0014) : figé au
-- moment des faits, jamais reconstitué. Aucune ligne n'existe encore en
-- production dans journal_audit (table créée le jour même) — pas de
-- rattrapage nécessaire, mais la colonne reste nullable par prudence
-- (même discipline que role_utilisateur sur l'historique).
-- ============================================================
alter table journal_audit
  add column role_utilisateur text;

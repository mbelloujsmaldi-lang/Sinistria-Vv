-- ============================================================
-- Sinistria-VV — 0010 : modèle du véhicule (Sprint 9bis)
-- Même statut que marque/immatriculation (0009) : instantané immuable
-- capturé au moment du calcul, nullable, fourni par l'appelant. Sert
-- uniquement à l'identification du véhicule sur la fiche PDF — VV ne le
-- relit ni ne le resynchronise ailleurs.
-- ============================================================

alter table vv_calculations
  add column modele text;

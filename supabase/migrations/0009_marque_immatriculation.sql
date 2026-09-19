-- ============================================================
-- Sinistria-VV — 0009 : marque + immatriculation (Sprint 9)
-- Instantané immuable capturé au moment du calcul, fourni par l'appelant
-- (même statut que reference_dossier_externe) — PAS une réouverture de
-- l'isolation décidée au Sprint 3 : VV ne devient pas source de vérité
-- du véhicule, ne relit ni ne resynchronise jamais ces valeurs ailleurs
-- que sur la page de vérification publique (/verifier/[reference]).
--
-- Immatriculation stockée COMPLÈTE (comme l'ancien système —
-- Code.gs:307-308 masquait à l'affichage, pas au stockage) : le masquage
-- (2 premiers + 2 derniers caractères) se fait uniquement au rendu de la
-- page publique, jamais en base.
-- ============================================================

alter table vv_calculations
  add column marque text,
  add column immatriculation text;

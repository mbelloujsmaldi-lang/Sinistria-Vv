-- ============================================================
-- Sinistria-VV — 0006 : rate limiting sur /api/calculer (Sprint 6)
-- Protection contre un bug ou une boucle côté appelant (Sinistria-Site),
-- pas contre une vraie charge — le volume réel reste faible.
-- Table légère plutôt que Redis/KV : infra déjà en place, pas de
-- provisionnement supplémentaire pour un besoin aussi simple.
-- Global (pas par clé) : un seul appelant existe (Sprint 4).
-- ============================================================

create table vv_api_calls (
  id bigint generated always as identity primary key,
  called_at timestamptz not null default now()
);

-- Accès service_role uniquement (route API), pas de session utilisateur.
alter table vv_api_calls enable row level security;

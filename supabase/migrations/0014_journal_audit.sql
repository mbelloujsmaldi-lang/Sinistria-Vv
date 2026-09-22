-- ============================================================
-- Sinistria-VV — 0014 : journal d'audit global (Sprint 15)
--
-- Trois catégories, dont 2 absentes jusqu'ici (vérifié sur l'ancien
-- Code.gs, fonction auditLog_ et ses 11 points d'appel) :
--   1. Actions sur un calcul — déjà couvertes par vv_calculations_historique
--      (Sprint 8), affichées ensemble en vue unifiée, jamais dupliquées ici.
--   2. Connexions refusées — nouveau : écrites uniquement par la route
--      serveur dédiée /api/connexion-refusee (service_role), jamais par
--      une policy RLS ouverte à anon/authenticated (aucune policy INSERT
--      n'est créée pour ces rôles, ni ici ni ailleurs dans ce fichier).
--   3. Actions sur les comptes (Sprint 13) — nouveau : écrites par les
--      routes /api/comptes/* via le client admin, en plus de l'écriture
--      RLS existante sur profiles (inchangée).
-- ============================================================

-- ------------------------------------------------------------
-- 1. vv_calculations_historique : rôle figé au moment de l'action.
--    NULL pour toutes les lignes antérieures à cette migration — jamais
--    reconstitué après coup (le rôle actuel de la personne peut différer
--    de celui qu'elle avait alors).
-- ------------------------------------------------------------
alter table vv_calculations_historique
  add column role_utilisateur text;

-- ------------------------------------------------------------
-- 2. journal_audit — append-only. Aucune policy INSERT/UPDATE/DELETE :
--    seul le service_role (routes serveur) peut écrire, comme
--    vv_api_calls (0006). La lecture est réservée aux responsables et
--    au-dessus, même garde que la future page /audit.
-- ------------------------------------------------------------
create table journal_audit (
  id uuid primary key default gen_random_uuid(),
  horodatage timestamptz not null default now(),
  utilisateur_id uuid references profiles(id) on delete set null,
  utilisateur_label text not null,
  action text not null,
  ancienne_valeur text,
  nouvelle_valeur text,
  observation text,
  reference_calcul text
);

alter table journal_audit enable row level security;

create policy "journal_audit_select_responsable" on journal_audit
  for select using (current_role_niveau() >= role_niveau('responsable'));

-- ------------------------------------------------------------
-- 3. journal_audit_connexion_calls — limitation de débit de
--    /api/connexion-refusee, séparée de vv_api_calls (0006) qui protège
--    /api/calculer. Même mécanisme (horodatages, service_role only).
-- ------------------------------------------------------------
create table journal_audit_connexion_calls (
  id bigint generated always as identity primary key,
  called_at timestamptz not null default now()
);

alter table journal_audit_connexion_calls enable row level security;

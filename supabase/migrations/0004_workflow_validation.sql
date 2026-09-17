-- ============================================================
-- Sinistria-VV — 0004 : workflow de validation
-- Calqué sur le workflow réel du prototype "Vv Expertise Auto"
-- (en production, dossiers réels) : calcule -> soumis -> valide/rejete,
-- avec écart à la valeur définitive, justification, et journal d'audit.
--
-- NB : `valeur_definitive` et `validee_par` existent déjà depuis
-- 0001_init.sql — réutilisés ici tels quels, pas redéfinis.
-- ============================================================

alter table vv_calculations
  add column statut text not null default 'calcule'
    check (statut in ('calcule', 'soumis', 'valide', 'rejete')),
  add column ecart_dh numeric(12,2),
  add column ecart_pct numeric(6,2),
  add column justification_ecart text,
  add column valide_le timestamptz,
  add column motif_rejet text,
  add column soumis_par uuid references profiles(id),
  add column soumis_le timestamptz;

-- Le créateur peut soumettre son propre calcul (calcule -> soumis).
create policy "vv_calculations_update_soumission" on vv_calculations
  for update using (created_by = auth.uid() and statut = 'calcule');

-- Responsable et au-dessus peuvent valider/rejeter (soumis -> valide/rejete).
create policy "vv_calculations_update_validation" on vv_calculations
  for update using (current_role_niveau() >= role_niveau('responsable'));

-- Journal d'audit : qui a fait quoi, ancienne -> nouvelle valeur, observation.
create table vv_calculations_historique (
  id uuid primary key default gen_random_uuid(),
  vv_calculation_id uuid not null references vv_calculations(id) on delete cascade,
  utilisateur_id uuid not null references profiles(id),
  action text not null,
  ancienne_valeur numeric(12,2),
  nouvelle_valeur numeric(12,2),
  observation text,
  created_at timestamptz not null default now()
);

alter table vv_calculations_historique enable row level security;

create policy "vv_historique_select_all" on vv_calculations_historique
  for select using (auth.role() = 'authenticated');

create policy "vv_historique_insert_authenticated" on vv_calculations_historique
  for insert with check (utilisateur_id = auth.uid());

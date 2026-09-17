-- ============================================================
-- Sinistria-VV — schéma initial (Sprint 1)
-- Socle partagé (profiles, dossiers) + première brique métier (vv_calculations)
-- Ce socle est conçu pour accueillir les futurs modules Sinistria
-- (Sinistria-Doc, rendez-vous, réclamations...) via dossier_id.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Rôles et hiérarchie (8 niveaux, comme dans la version actuelle)
-- ------------------------------------------------------------
create type user_role as enum (
  'technicien',
  'gestionnaire',
  'chef_equipe',
  'superviseur',
  'responsable',
  'adjoint_directeur',
  'directeur',
  'admin_technique'
);

-- Niveau numérique du rôle, utilisé pour les comparaisons dans les policies RLS
create function role_niveau(r user_role) returns int
language sql immutable as $$
  select case r
    when 'technicien' then 1
    when 'gestionnaire' then 2
    when 'chef_equipe' then 3
    when 'superviseur' then 4
    when 'responsable' then 5
    when 'adjoint_directeur' then 6
    when 'directeur' then 7
    when 'admin_technique' then 8
  end
$$;

-- ------------------------------------------------------------
-- 2. Profils utilisateurs (étend auth.users de Supabase)
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  role user_role not null default 'technicien',
  bureau text not null,
  chef_hierarchique_id uuid references profiles(id),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Niveau hiérarchique de l'utilisateur courant (security definer : évalué avec les droits
-- de la fonction, pas de l'appelant, pour éviter une récursion sur profiles côté RLS)
create function current_role_niveau() returns int
language sql stable security definer as $$
  select role_niveau(role) from profiles where id = auth.uid()
$$;

alter table profiles enable row level security;

create policy "profiles_select_all" on profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_admin_write" on profiles
  for all using (current_role_niveau() >= role_niveau('admin_technique'));

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid());

-- ------------------------------------------------------------
-- 3. Dossiers — le cœur de la plateforme Sinistria
-- ------------------------------------------------------------
create type dossier_statut as enum (
  'brouillon',
  'en_cours',
  'soumis_validation',
  'valide',
  'rejete_a_corriger'
);

create table dossiers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  statut dossier_statut not null default 'brouillon',
  bureau text not null,

  -- Informations véhicule (communes aux futurs modules : VV, Épave, Réforme...)
  vehicule_immatriculation text,
  vehicule_marque text,
  vehicule_modele text,
  vehicule_date_circulation date,

  -- Informations client / assuré
  client_nom text,
  client_contact text,

  -- Affectation
  cree_par uuid not null references profiles(id),
  assigne_a uuid references profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dossiers enable row level security;

-- Lecture : tous les utilisateurs actifs voient tous les dossiers (comme dans la version actuelle)
create policy "dossiers_select_all" on dossiers
  for select using (auth.role() = 'authenticated');

create policy "dossiers_insert_own" on dossiers
  for insert with check (cree_par = auth.uid());

-- Le créateur ou l'assigné peuvent modifier tant que le dossier n'est pas validé
create policy "dossiers_update_owner" on dossiers
  for update using (
    (cree_par = auth.uid() or assigne_a = auth.uid())
    and statut in ('brouillon', 'en_cours', 'rejete_a_corriger')
  );

-- La validation (changement de statut vers "valide") est réservée à Responsable et au-dessus
create policy "dossiers_update_validation" on dossiers
  for update using (current_role_niveau() >= role_niveau('responsable'));

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dossiers_set_updated_at
  before update on dossiers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 4. Première brique métier : le calcul de valeur vénale
-- Rattachée à un dossier, mais pensée pour être appelable seule
-- (dossier_id nullable) — c'est le point d'entrée que Sinistria-Doc
-- ou un futur AI Agent de décision pourra appeler directement.
-- ------------------------------------------------------------
create table vv_calculations (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid references dossiers(id) on delete set null,

  valeur_neuve numeric(12,2) not null,
  date_mise_circulation date not null,
  date_sinistre date not null,
  categorie text not null,
  bareme_version text not null default '2023',

  valeur_calculee numeric(12,2) not null,
  valeur_definitive numeric(12,2),
  validee_par uuid references profiles(id),

  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table vv_calculations enable row level security;

create policy "vv_calculations_select_all" on vv_calculations
  for select using (auth.role() = 'authenticated');

create policy "vv_calculations_insert_own" on vv_calculations
  for insert with check (created_by = auth.uid());

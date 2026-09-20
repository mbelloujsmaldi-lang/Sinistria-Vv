-- ============================================================
-- Sinistria-VV — 0012 : accès réservé aux profils existants ET actifs
--
-- Faille corrigée (Sprint 13) : les policies de lecture et d'insertion de
-- profiles, vv_calculations et vv_calculations_historique testaient
-- seulement auth.role() = 'authenticated'. Or l'inscription publique
-- Supabase est ouverte : n'importe quel compte Auth SANS profil (constaté
-- par test réel) lisait toutes les tables via la clé publique. `actif`
-- n'était en outre appliqué nulle part.
--
-- Règle : il faut un profil existant avec actif = true. Exception
-- volontaire : chacun peut toujours lire SA PROPRE ligne de profiles, y
-- compris inactif (proxy.ts en a besoin pour afficher « compte désactivé »
-- plutôt que « sans profil »).
-- ============================================================

-- 1. Helper : l'utilisateur courant a-t-il un profil actif ?
--    security definer : évalué avec les droits du propriétaire (pas de
--    récursion RLS quand il est appelé depuis une policy de profiles).
create or replace function est_profil_actif()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and actif)
$$;

-- 2. current_role_niveau() renvoie null pour un profil inactif ou absent :
--    toutes les policies fondées sur le rang (validation, révision,
--    profiles_admin_write) et le trigger 0011 cessent de s'appliquer à lui.
create or replace function current_role_niveau()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select role_niveau(role) from profiles where id = auth.uid() and actif
$$;

-- 3. profiles
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles
  for select using (id = auth.uid() or est_profil_actif());

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles
  for update using (id = auth.uid() and est_profil_actif());

-- 4. vv_calculations
drop policy if exists "vv_calculations_select_all" on vv_calculations;
create policy "vv_calculations_select_all" on vv_calculations
  for select using (est_profil_actif());

drop policy if exists "vv_calculations_insert" on vv_calculations;
create policy "vv_calculations_insert" on vv_calculations
  for insert with check (
    est_profil_actif()
    and created_by = auth.uid()
    and (
      revision_de is null
      or exists (
        select 1 from vv_calculations orig
        where orig.id = vv_calculations.revision_de
          and orig.statut = 'valide'
          and current_role_niveau() > coalesce(
                role_niveau((select role from profiles where id = orig.validee_par)), 0)
      )
    )
  );

drop policy if exists "vv_calculations_update_soumission" on vv_calculations;
create policy "vv_calculations_update_soumission" on vv_calculations
  for update using (est_profil_actif() and created_by = auth.uid() and statut = 'calcule')
  with check (est_profil_actif() and created_by = auth.uid() and statut = 'soumis');

drop policy if exists "vv_calculations_update_edition" on vv_calculations;
create policy "vv_calculations_update_edition" on vv_calculations
  for update using (
    est_profil_actif() and created_by = auth.uid() and statut in ('calcule', 'rejete')
  )
  with check (
    est_profil_actif() and created_by = auth.uid() and statut in ('calcule', 'rejete')
  );

-- (vv_calculations_update_validation reste telle quelle : elle utilise
--  current_role_niveau(), désormais nul pour un profil inactif ou absent.)

-- 5. vv_calculations_historique
drop policy if exists "vv_historique_select_all" on vv_calculations_historique;
create policy "vv_historique_select_all" on vv_calculations_historique
  for select using (est_profil_actif());

drop policy if exists "vv_historique_insert_authenticated" on vv_calculations_historique;
create policy "vv_historique_insert_authenticated" on vv_calculations_historique
  for insert with check (est_profil_actif() and utilisateur_id = auth.uid());

-- ============================================================
-- Sinistria-VV — 0019 : discussion par dossier, annonces de bureau,
-- notifications (Sprint 27)
--
-- Remplace le système "proposition d'e-mail" de l'ancien Google Apps
-- Script par un système interne : chaque événement du circuit de
-- validation (soumission/validation/retour pour correction/révision)
-- génère un message SYSTÈME dans la discussion du dossier concerné, plus
-- une notification dans le clochette de chaque destinataire concerné.
--
-- Décisions verrouillées avec l'utilisateur avant cette migration :
-- - Discussion par dossier : participants = créateur du dossier + tout
--   profil avec pouvoir de validation (responsable et au-dessus) — pas
--   "tout profil actif" comme la lecture du Registre elle-même.
-- - Notification de soumission : validateurs du MÊME bureau que le
--   créateur du dossier uniquement (bureau = texte libre sur profiles,
--   comparaison exacte — pas de table "bureaux" séparée aujourd'hui).
-- - Annonces de bureau : admin_technique exclusivement peut publier,
--   visibles par tout profil actif du bureau ciblé.
-- - Écriture de notifications : permissive (est_profil_actif()), sans
--   vérifier que destinataire_id = auth.uid() — une notification est un
--   simple ping UI, pas une donnée sensible, et le modèle de confiance de
--   l'appli autorise déjà tout profil actif à lire tout le Registre et
--   tous les profils (0012).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Discussion par dossier
-- ------------------------------------------------------------
create table dossier_messages (
  id uuid primary key default gen_random_uuid(),
  vv_calculation_id uuid not null references vv_calculations(id) on delete cascade,
  auteur_id uuid not null references profiles(id),
  type text not null default 'utilisateur' check (type in ('utilisateur', 'systeme')),
  corps text not null,
  created_at timestamptz not null default now()
);

create index dossier_messages_calcul_idx on dossier_messages (vv_calculation_id, created_at);

alter table dossier_messages enable row level security;

-- Participant = créateur du dossier OU profil avec pouvoir de validation.
create or replace function est_participant_dossier_(p_calcul_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from vv_calculations c
      where c.id = p_calcul_id and c.created_by = auth.uid()
    )
    or current_role_niveau() >= role_niveau('responsable')
$$;

create policy "dossier_messages_select" on dossier_messages
  for select using (est_profil_actif() and est_participant_dossier_(vv_calculation_id));

create policy "dossier_messages_insert" on dossier_messages
  for insert with check (
    est_profil_actif()
    and auteur_id = auth.uid()
    and est_participant_dossier_(vv_calculation_id)
  );

-- ------------------------------------------------------------
-- 2. Annonces de bureau (diffusion admin_technique -> un bureau)
-- ------------------------------------------------------------
create table bureau_annonces (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references profiles(id),
  bureau text not null,
  titre text not null,
  corps text not null,
  created_at timestamptz not null default now()
);

create index bureau_annonces_bureau_idx on bureau_annonces (bureau, created_at);

alter table bureau_annonces enable row level security;

create policy "bureau_annonces_select" on bureau_annonces
  for select using (
    est_profil_actif()
    and bureau = (select p.bureau from profiles p where p.id = auth.uid())
  );

create policy "bureau_annonces_insert" on bureau_annonces
  for insert with check (
    auteur_id = auth.uid()
    and current_role_niveau() >= role_niveau('admin_technique')
  );

-- ------------------------------------------------------------
-- 3. Notifications (clochette)
-- ------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  destinataire_id uuid not null references profiles(id),
  type text not null check (type in ('soumission', 'validation', 'rejet', 'revision', 'annonce')),
  titre text not null,
  corps text,
  lien text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_destinataire_idx on notifications (destinataire_id, lu, created_at);

alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select using (destinataire_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

-- Permissive par conception (voir note en tête de fichier) : un profil actif
-- peut créer une notification pour un AUTRE destinataire, effet de bord
-- normal d'une action légitime (soumission/validation/annonce...).
create policy "notifications_insert_any_active" on notifications
  for insert with check (est_profil_actif());

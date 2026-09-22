-- ============================================================
-- Sinistria-VV — 0018 : support technique (Sprint 23)
--
-- Tout profil actif peut créer un message et lire UNIQUEMENT les siens
-- (y compris la réponse une fois donnée). Lecture de TOUS les messages et
-- écriture de statut/réponse : admin_technique EXCLUSIVEMENT — palier
-- différent de responsable/référentiel/journal d'audit, décision explicite
-- du sprint (pas une omission).
--
-- INSERT verrouillé sur statut='nouveau' + reponse/repondu_par/repondu_le
-- NULL : sans ça, un utilisateur pourrait créer directement un message déjà
-- "résolu" avec une fausse réponse attribuée à n'importe quel profil (RLS
-- ne l'empêcherait pas autrement, l'INSERT ne vérifie que auteur_id).
-- ============================================================

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references profiles(id),
  sujet text not null,
  message text not null,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'resolu')),
  reponse text,
  repondu_par uuid references profiles(id),
  repondu_le timestamptz,
  created_at timestamptz not null default now()
);

alter table support_messages enable row level security;

create policy "support_messages_select" on support_messages
  for select using (
    (auteur_id = auth.uid() and est_profil_actif())
    or current_role_niveau() >= role_niveau('admin_technique')
  );

create policy "support_messages_insert" on support_messages
  for insert with check (
    auteur_id = auth.uid()
    and est_profil_actif()
    and statut = 'nouveau'
    and reponse is null
    and repondu_par is null
    and repondu_le is null
  );

create policy "support_messages_update_admin" on support_messages
  for update using (current_role_niveau() >= role_niveau('admin_technique'))
  with check (current_role_niveau() >= role_niveau('admin_technique'));

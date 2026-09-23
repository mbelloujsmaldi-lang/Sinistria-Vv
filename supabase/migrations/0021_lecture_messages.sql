-- ============================================================
-- Sinistria-VV — 0021 : accusés de lecture de la discussion (Sprint 31)
--
-- Onglet "Discussion" demandé façon WhatsApp : qui a lu un message, et
-- quand. Table séparée (pas une colonne jsonb sur dossier_messages) —
-- même discipline relationnelle que vv_calculations_historique et
-- notifications : une ligne par lecture, jamais une liste dénormalisée
-- à parser côté application.
-- ============================================================

create table dossier_messages_lectures (
  message_id uuid not null references dossier_messages(id) on delete cascade,
  utilisateur_id uuid not null references profiles(id),
  lu_le timestamptz not null default now(),
  primary key (message_id, utilisateur_id)
);

alter table dossier_messages_lectures enable row level security;

-- Même périmètre que dossier_messages : participant du dossier concerné
-- (créateur ou profil avec pouvoir de validation), via le message visé.
create policy "dossier_messages_lectures_select" on dossier_messages_lectures
  for select using (
    est_profil_actif()
    and exists (
      select 1 from dossier_messages m
      where m.id = dossier_messages_lectures.message_id
        and est_participant_dossier_(m.vv_calculation_id)
    )
  );

create policy "dossier_messages_lectures_insert" on dossier_messages_lectures
  for insert with check (
    utilisateur_id = auth.uid()
    and exists (
      select 1 from dossier_messages m
      where m.id = dossier_messages_lectures.message_id
        and est_participant_dossier_(m.vv_calculation_id)
    )
  );

-- ============================================================
-- Sinistria-VV — 0022 : discussion ouverte à tout profil actif (Sprint 31bis)
--
-- Décision explicite de l'utilisateur : la discussion d'un dossier n'est
-- PAS une messagerie privée entre créateur et validateurs — elle doit
-- être visible (et alimentable) par tout profil actif, sans exception,
-- même palier de confiance que le Registre lui-même
-- (vv_calculations_select_all, 0001/0012). Une messagerie réellement
-- privée est un besoin différent, prévu plus tard sous la forme d'un
-- "Mail" séparé — pas ce canal.
--
-- Remplace le périmètre "créateur + pouvoir de validation" de
-- est_participant_dossier_() (0019) par est_profil_actif() seul, sur les
-- deux tables concernées (messages + accusés de lecture). La fonction
-- est_participant_dossier_() elle-même n'est plus référencée après cette
-- migration — conservée (pas droppée) au cas où un usage futur en aurait
-- de nouveau besoin, coût nul à la garder inerte.
-- ============================================================

drop policy "dossier_messages_select" on dossier_messages;
create policy "dossier_messages_select" on dossier_messages
  for select using (est_profil_actif());

drop policy "dossier_messages_insert" on dossier_messages;
create policy "dossier_messages_insert" on dossier_messages
  for insert with check (est_profil_actif() and auteur_id = auth.uid());

drop policy "dossier_messages_lectures_select" on dossier_messages_lectures;
create policy "dossier_messages_lectures_select" on dossier_messages_lectures
  for select using (est_profil_actif());

drop policy "dossier_messages_lectures_insert" on dossier_messages_lectures;
create policy "dossier_messages_lectures_insert" on dossier_messages_lectures
  for insert with check (est_profil_actif() and utilisateur_id = auth.uid());

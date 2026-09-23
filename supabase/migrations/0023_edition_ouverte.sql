-- ============================================================
-- Sinistria-VV — 0023 : édition du dossier ouverte à tout profil actif
-- (Sprint 32)
--
-- Décision explicite de l'utilisateur, même logique que 0022 (discussion
-- ouverte) : tant qu'un dossier est "calcule" ou "rejete", N'IMPORTE QUEL
-- profil actif peut corriger ses données — plus seulement son créateur.
-- Chaque modification reste tracée dans vv_calculations_historique
-- (déjà fait par modifierCalcul, inchangé ici).
--
-- La soumission (calcule -> soumis) reste réservée au créateur
-- (vv_calculations_update_soumission, inchangée) : le contenu devient
-- collaboratif, la décision de soumettre reste de son ressort.
-- ============================================================

drop policy "vv_calculations_update_edition" on vv_calculations;
create policy "vv_calculations_update_edition" on vv_calculations
  for update using (
    est_profil_actif() and statut in ('calcule', 'rejete')
  )
  with check (
    est_profil_actif() and statut in ('calcule', 'rejete')
  );

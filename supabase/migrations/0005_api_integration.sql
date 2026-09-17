-- ============================================================
-- Sinistria-VV — 0005 : intégration API (Sprint 4)
-- Les appels serveur-à-serveur (Sinistria-Site, via clé API partagée)
-- n'ont pas d'utilisateur Supabase Auth réel — created_by devient
-- nullable pour ces lignes. NULL a un sens unique et sans ambiguïté dans
-- tout le système : "créé via l'API, pas par un humain authentifié".
-- Toute création manuelle passe par un utilisateur authentifié (userId
-- toujours présent), donc cette règle est respectée sans mécanisme
-- supplémentaire — pas de colonne "source" séparée.
-- ============================================================

alter table vv_calculations
  alter column created_by drop not null;

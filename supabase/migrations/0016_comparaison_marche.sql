-- ============================================================
-- Sinistria-VV — 0016 : comparaison face au marché (Sprint 17)
--
-- Fonction serveur qui ne renvoie QUE des agrégats (nombre, moyenne,
-- min, max, plage de dates) — jamais les lignes individuelles des
-- dossiers comparés, jamais leur référence/immatriculation/bureau/
-- créateur. C'est la fonction elle-même qui garantit cette
-- confidentialité (elle ne SELECT même pas ces colonnes), pas une
-- précaution côté application qui pourrait être oubliée un jour.
--
-- Sécurité : SECURITY INVOKER (par défaut) — la requête à l'intérieur
-- de la fonction reste soumise à la RLS de vv_calculations
-- (vv_calculations_select_all, migration 0012 : est_profil_actif()).
-- Un appelant inactif ou sans session obtient donc naturellement 0
-- ligne agrégée, sans erreur ni fuite — même comportement que s'il
-- interrogeait la table directement.
--
-- Appariement : marque + modèle en texte normalisé (minuscules, espaces
-- de bord et internes réduits — même logique que lib/referentiel-
-- vehicules.ts, Sprint 14) + année de mise en circulation (pas la date
-- exacte). Uniquement statut = 'valide'. Le dossier consulté est
-- toujours exclu de son propre groupe.
-- ============================================================

create or replace function comparaison_marche(
  p_marque text,
  p_modele text,
  p_annee int,
  p_exclure_id uuid
)
returns table (
  n int,
  moyenne numeric,
  min_valeur numeric,
  max_valeur numeric,
  date_min date,
  date_max date
)
language sql
stable
as $$
  select
    count(*)::int as n,
    avg(c.valeur_definitive) as moyenne,
    min(c.valeur_definitive) as min_valeur,
    max(c.valeur_definitive) as max_valeur,
    min(c.date_sinistre) as date_min,
    max(c.date_sinistre) as date_max
  from vv_calculations c
  where c.statut = 'valide'
    and c.id <> p_exclure_id
    and c.marque is not null
    and c.modele is not null
    and lower(btrim(regexp_replace(c.marque, '\s+', ' ', 'g')))
      = lower(btrim(regexp_replace(p_marque, '\s+', ' ', 'g')))
    and lower(btrim(regexp_replace(c.modele, '\s+', ' ', 'g')))
      = lower(btrim(regexp_replace(p_modele, '\s+', ' ', 'g')))
    and extract(year from c.date_mise_circulation) = p_annee;
$$;

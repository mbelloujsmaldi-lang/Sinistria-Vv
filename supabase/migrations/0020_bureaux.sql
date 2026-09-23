-- ============================================================
-- Sinistria-VV — 0020 : table bureaux (Sprint 30, point 6)
--
-- Jusqu'ici "bureau" était un simple texte libre porté par chaque compte
-- (profiles.bureau), sans liste séparée — "créer un bureau" revenait juste
-- à le taper lors de la création d'un compte. L'utilisateur demande
-- maintenant de VRAIES fiches bureau (ville, adresse, email officiel) et
-- une liste déroulante de villes marocaines : il faut donc une table.
--
-- Décision : ADDITIVE, pas une migration de profiles.bureau en clé
-- étrangère. profiles.bureau reste du texte (comparaisons exactes déjà
-- utilisées partout : bureau_annonces, notifications.ts, RLS...) — la
-- discipline "bureau doit exister dans bureaux" est appliquée côté
-- application (le formulaire de création de compte devient un menu
-- déroulant alimenté par cette table, Sprint 30 point 7), pas en base,
-- pour ne rien casser des bureaux déjà en place.
-- ============================================================

create table bureaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  ville text,
  adresse text,
  email_officiel text,
  created_at timestamptz not null default now()
);

alter table bureaux enable row level security;

create policy "bureaux_select_all" on bureaux
  for select using (est_profil_actif());

create policy "bureaux_write_admin_technique" on bureaux
  for all using (current_role_niveau() >= role_niveau('admin_technique'))
  with check (current_role_niveau() >= role_niveau('admin_technique'));

-- Rattrapage : un bureau par nom déjà présent sur au moins un compte
-- existant, pour que la liste déroulante de création de compte parte de
-- l'état réel plutôt que vide (ville/adresse/email laissés null — à
-- compléter par l'administrateur au besoin, pas déduits).
insert into bureaux (nom)
select distinct bureau from profiles
on conflict (nom) do nothing;

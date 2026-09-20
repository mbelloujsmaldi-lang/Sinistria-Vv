-- ============================================================
-- Sinistria-VV — 0011 : colonnes sensibles de profiles protégées
--
-- Faille corrigée : la policy "profiles_self_update" (0001) autorise
-- tout utilisateur connecté à modifier TOUTES les colonnes de sa propre
-- ligne, donc à se promouvoir role = 'admin_technique' (constaté par test
-- réel, Sprint 13 Phase A). Une policy RLS ne restreint pas les colonnes ;
-- un trigger BEFORE UPDATE le fait.
--
-- Règle : seuls l'admin_technique et le service_role (routes serveur,
-- éditeur SQL : aucune identité utilisateur, auth.uid() est null) peuvent
-- modifier role, actif, bureau, chef_hierarchique_id, id, created_at.
-- Tout autre utilisateur peut encore modifier son propre nom.
-- ============================================================

create or replace function profiles_protege_colonnes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pas d'identité utilisateur (service_role, éditeur SQL) : autorisé.
  if auth.uid() is null then
    return new;
  end if;

  -- Administrateur technique : autorisé.
  if current_role_niveau() >= role_niveau('admin_technique') then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.actif is distinct from old.actif
     or new.bureau is distinct from old.bureau
     or new.chef_hierarchique_id is distinct from old.chef_hierarchique_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Modification non autorisée : seul un administrateur technique peut modifier le rôle, le statut, le bureau ou le responsable hiérarchique.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protege_colonnes on profiles;
create trigger profiles_protege_colonnes
  before update on profiles
  for each row execute function profiles_protege_colonnes();

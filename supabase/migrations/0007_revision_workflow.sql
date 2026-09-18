-- ============================================================
-- Sinistria-VV — 0007 : mécanisme de révision (Sprint 8)
-- Parité avec l'ancienne version (Vv Expertise Auto Pro, Code.gs:771-863) :
-- un calcul déjà validé n'est jamais écrasé — une révision crée une
-- nouvelle ligne, liée par lignée, avec référence lisible VV-000001,
-- VV-000001-V1, VV-000001-V2... Un calcul non encore validé reste
-- modifiable en place (nouvelle policy UPDATE, absente jusqu'ici).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Référence lisible + lignée de révision
-- ------------------------------------------------------------
create sequence vv_calculations_numero_seq start 1;

alter table vv_calculations
  add column numero bigint not null default nextval('vv_calculations_numero_seq'),
  add column revision_index int not null default 0,
  add column revision_de uuid references vv_calculations(id),
  add column reference text generated always as (
    'VV-' || lpad(numero::text, 6, '0')
    || case when revision_index > 0 then '-V' || revision_index else '' end
  ) stored;

-- Force numero/revision_index depuis la lignée d'origine plutôt que de
-- faire confiance au code appelant à chaque point d'insertion futur
-- (mêmes valeurs, jamais improvisées côté application).
create function set_revision_lineage() returns trigger
language plpgsql as $$
begin
  if new.revision_de is not null then
    select numero, revision_index + 1
      into new.numero, new.revision_index
      from vv_calculations
      where id = new.revision_de;
  end if;
  return new;
end;
$$;

create trigger vv_calculations_set_lineage
  before insert on vv_calculations
  for each row execute function set_revision_lineage();

-- ------------------------------------------------------------
-- 2. Garantie structurelle : un calcul "valide" a toujours un validateur
-- ------------------------------------------------------------
alter table vv_calculations
  add constraint vv_calculations_valide_requiert_validateur
  check (statut != 'valide' or validee_par is not null);

-- ------------------------------------------------------------
-- 3. Édition en place avant validation (fonctionnalité absente jusqu'ici :
--    aucune policy UPDATE ne couvrait la modification des paramètres
--    d'un calcul, seulement les transitions de statut de 0004).
--    Réservée au créateur, tant que le calcul n'est pas validé.
-- ------------------------------------------------------------
create policy "vv_calculations_update_edition" on vv_calculations
  for update using (
    created_by = auth.uid() and statut in ('calcule', 'rejete')
  )
  with check (
    created_by = auth.uid() and statut in ('calcule', 'rejete')
  );

-- ------------------------------------------------------------
-- 4. Correction : les 2 policies UPDATE de 0004 n'avaient pas de WITH
--    CHECK explicite. Sans lui, Postgres réutilise USING comme WITH
--    CHECK — appliqué à la ligne APRÈS modification. Résultat : la
--    transition calcule -> soumis viole son propre USING (statut n'est
--    plus 'calcule'), donc le UPDATE échoue pour tout rôle dont le
--    rang est sous responsable (masqué jusqu'ici car tous les tests
--    réels ont été faits en admin_technique, dont le rang satisfait
--    TOUJOURS vv_calculations_update_validation quel que soit le statut).
-- ------------------------------------------------------------
drop policy "vv_calculations_update_soumission" on vv_calculations;
create policy "vv_calculations_update_soumission" on vv_calculations
  for update using (created_by = auth.uid() and statut = 'calcule')
  with check (created_by = auth.uid() and statut = 'soumis');

drop policy "vv_calculations_update_validation" on vv_calculations;
create policy "vv_calculations_update_validation" on vv_calculations
  for update using (current_role_niveau() >= role_niveau('responsable'))
  with check (current_role_niveau() >= role_niveau('responsable'));

-- ------------------------------------------------------------
-- 5. INSERT : autoriser la création d'une révision uniquement si le
--    demandeur a un rang strictement supérieur à celui du validateur
--    de la ligne la plus récente de la lignée (revision_de), et que
--    cette ligne est bien "valide". Remplace l'ancienne policy INSERT
--    (aucune restriction sur revision_de) par une version qui couvre
--    les deux cas : création normale ET révision.
-- ------------------------------------------------------------
drop policy "vv_calculations_insert_own" on vv_calculations;
create policy "vv_calculations_insert" on vv_calculations
  for insert with check (
    created_by = auth.uid()
    and (
      revision_de is null
      or exists (
        -- orig a elle-même une colonne revision_de : "revision_de" non qualifié
        -- se lierait à orig.revision_de (toujours faux) au lieu de la ligne en
        -- cours d'insertion. Qualifier avec vv_calculations.revision_de lève
        -- l'ambiguïté (repéré en testant le parcours de révision, pas en lecture).
        select 1 from vv_calculations orig
        where orig.id = vv_calculations.revision_de
          and orig.statut = 'valide'
          and current_role_niveau() > coalesce(
                role_niveau((select role from profiles where id = orig.validee_par)), 0)
      )
    )
  );

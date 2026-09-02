-- =============================================================
-- MyGigs — akkoord met de huisregels vastleggen.
--
-- We bewaren het moment én de versie van de tekst. Wijzigen de regels, dan
-- verhoogt HOUSE_RULES_VERSION in lib/rules.ts en vragen we opnieuw akkoord.
-- Zonder die versie kun je achteraf niet aantonen waar iemand mee akkoord ging.
-- =============================================================

alter table artists
  add column if not exists rules_accepted_at timestamptz,
  add column if not exists rules_version     int;

comment on column artists.rules_accepted_at is
  'Moment waarop de DJ akkoord ging met de huisregels.';
comment on column artists.rules_version is
  'Versie van de huisregels waarmee akkoord is gegaan (lib/rules.ts).';

create index if not exists artists_rules_accepted_idx
  on artists (rules_accepted_at);

-- De DJ mag deze twee kolommen op zijn eigen rij zetten; RLS regelt de rest.
do $$
begin
  execute 'grant update (rules_accepted_at, rules_version) on artists to authenticated';
exception when others then
  null;
end $$;

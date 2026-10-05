-- =============================================================
-- Sam, de poortwachter.
--
-- Hij zet een advies op elke nieuwe DJ-aanmelding: groen, oranje of rood, met
-- een korte onderbouwing. Goedkeuren blijft een knop die jij indrukt. Dat is
-- niet alleen de afspraak uit het plan; de AVG wil een mens in de lus bij een
-- besluit over een persoon.
--
-- Drie kolommen op dj_leads. advised_at is tegelijk de markering: staat die
-- leeg, dan heeft Sam er nog niet naar gekeken. Wil je een aanmelding opnieuw
-- laten beoordelen, dan maak je advised_at leeg.
-- =============================================================

alter table public.dj_leads
  add column if not exists advice_level text,
  add column if not exists advice_text  text,
  add column if not exists advised_at   timestamptz;

do $$
begin
  alter table public.dj_leads
    add constraint dj_leads_advice_level_check
    check (advice_level is null or advice_level in ('groen', 'oranje', 'rood'));
exception when duplicate_object then
  raise notice 'controle op advice_level bestond al';
end $$;

do $$
begin
  alter table public.dj_leads
    add constraint dj_leads_advice_text_len
    check (advice_text is null or char_length(advice_text) <= 2000);
exception when duplicate_object then
  raise notice 'controle op advice_text bestond al';
end $$;

comment on column public.dj_leads.advice_level is 'Sam: groen, oranje of rood. Advies, geen besluit.';
comment on column public.dj_leads.advice_text is 'Sam: onderbouwing, een reden per regel.';
comment on column public.dj_leads.advised_at is 'Sam: wanneer hij keek. Leeg betekent nog niet beoordeeld.';

-- De wachtrij van Sam: wat nog beoordeeld moet worden.
create index if not exists dj_leads_te_beoordelen_idx
  on public.dj_leads (received_at)
  where advised_at is null;

-- =============================================================
-- Sam aanzetten
--
-- De tarieven staan hier en niet in de code, zodat een prijswijziging bij
-- Anthropic geen deploy kost. Bedragen in euro per miljoen tokens, omgerekend
-- van 1 en 5 dollar.
-- =============================================================
update public.agent_settings
set enabled = true,
    schedule = 'elke 10 minuten',
    config = jsonb_build_object(
      'max_per_run', 10,
      'prijs_invoer_eur_per_mtok', 0.92,
      'prijs_uitvoer_eur_per_mtok', 4.6
    ),
    max_actions = 25
where agent = 'poortwachter';

select cron.schedule(
  'poortwachter',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://mygigs-app-t7ve.vercel.app/api/agents/poortwachter',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

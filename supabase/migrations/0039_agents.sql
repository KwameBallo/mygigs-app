-- =============================================================
-- MyGigs: de agents die het bedrijf draaiende houden.
--
-- Drie tabellen, meer niet:
--   agent_settings  welke agent aan staat en met welke grenswaarden
--   agent_runs      elke keer dat een agent heeft gedraaid, met het resultaat
--   agent_alerts    wat een agent gevonden heeft en of het is opgelost
--
-- De agents zelf zijn routes onder app/api/agents/, gestart door de planner en
-- beveiligd met CRON_SECRET, net als de bestaande taken. Ze draaien met de
-- service role; niemand in de browser komt bij deze tabellen.
--
-- Zie docs/agents.md voor het plan en de grenzen (geen agent raakt geld aan,
-- geen agent keurt zelf een DJ goed).
-- =============================================================

do $$
begin
  create type agent_alert_level as enum (
    'info',      -- ter kennisgeving
    'warn',      -- kijk ernaar als je tijd hebt
    'critical'   -- nu kijken, hier lopen klanten op vast
  );
exception when duplicate_object then null;
end $$;

-- =============================================================
-- Instellingen per agent
-- =============================================================
create table if not exists public.agent_settings (
  agent        text primary key,
  enabled      boolean not null default false,

  -- Beschrijving van het tijdschema, puur ter informatie voor het
  -- beheerscherm. De planner van Vercel bepaalt wanneer er echt gedraaid
  -- wordt; dit veld houdt de twee leesbaar bij elkaar.
  schedule     text,

  -- Grenswaarden en instellingen, per agent anders. Bijvoorbeeld na hoeveel
  -- uur de boekingsbewaker een DJ port.
  config       jsonb not null default '{}'::jsonb,

  -- Zachte rem: hoeveel keer een agent per run iets mag doen. Voorkomt dat een
  -- fout in één keer honderd mails de deur uit stuurt.
  max_actions  integer not null default 50,

  updated_at   timestamptz not null default now(),

  constraint agent_settings_agent_len check (char_length(agent) between 2 and 40),
  constraint agent_settings_max_actions check (max_actions between 1 and 1000)
);

-- =============================================================
-- Wat er per run gebeurd is
-- =============================================================
create table if not exists public.agent_runs (
  id           uuid primary key default gen_random_uuid(),
  agent        text not null references public.agent_settings (agent) on delete cascade,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,

  -- null zolang de run bezig is, daarna true of false
  ok           boolean,

  items_seen   integer not null default 0,   -- hoeveel bekeken
  items_acted  integer not null default 0,   -- hoeveel keer iets gedaan
  error        text,

  -- Kosten van de AI voor deze run, in euro. Blijft 0 bij de agents die geen
  -- AI gebruiken. Zo zie je in het beheerscherm meteen wat het maandelijks doet.
  ai_cost_eur  numeric(10,4) not null default 0,

  meta         jsonb not null default '{}'::jsonb,

  constraint agent_runs_counts check (items_seen >= 0 and items_acted >= 0),
  constraint agent_runs_cost check (ai_cost_eur >= 0),
  constraint agent_runs_error_len check (error is null or char_length(error) <= 4000)
);

create index if not exists agent_runs_agent_started_idx
  on public.agent_runs (agent, started_at desc);

-- Loopt er nog iets? Handig om een vastgelopen run te vinden.
create index if not exists agent_runs_unfinished_idx
  on public.agent_runs (started_at desc)
  where finished_at is null;

-- =============================================================
-- Meldingen
--
-- Een melding wordt ontdubbeld op (agent, key). Ziet de waakhond hetzelfde
-- probleem tien keer, dan blijft het één regel met een teller. Pas als jij hem
-- afvinkt verdwijnt hij uit de open lijst; komt het daarna terug, dan is het
-- een nieuwe melding.
-- =============================================================
create table if not exists public.agent_alerts (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null references public.agent_settings (agent) on delete cascade,

  -- Vaste sleutel voor hetzelfde probleem, bijvoorbeeld
  -- 'stuck_booking:9f3c...' of 'cron_missed:booking-reminders'.
  key           text not null,

  level         agent_alert_level not null default 'warn',
  title         text not null,
  detail        text,

  -- Waar hoort dit bij, zodat het beheerscherm kan doorlinken.
  target_type   text,
  target_id     text,

  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  seen_count    integer not null default 1,

  -- Wanneer is er een bericht over verstuurd. null betekent: nog niet gemeld.
  notified_at   timestamptz,

  -- Afgevinkt door een beheerder, of automatisch opgelost door de agent zelf.
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users (id) on delete set null,
  resolve_note  text,

  constraint agent_alerts_key_len check (char_length(key) between 2 and 200),
  constraint agent_alerts_title_len check (char_length(title) between 2 and 200),
  constraint agent_alerts_detail_len check (detail is null or char_length(detail) <= 4000),
  constraint agent_alerts_note_len check (resolve_note is null or char_length(resolve_note) <= 1000),
  constraint agent_alerts_seen_count check (seen_count >= 1),
  -- Opgelost hoort bij elkaar: wie het oploste mag alleen ingevuld zijn als er
  -- ook een tijdstip staat.
  constraint agent_alerts_resolved_pair check (resolved_by is null or resolved_at is not null)
);

-- Eén open melding per probleem.
create unique index if not exists agent_alerts_open_uidx
  on public.agent_alerts (agent, key)
  where resolved_at is null;

create index if not exists agent_alerts_open_level_idx
  on public.agent_alerts (level, last_seen_at desc)
  where resolved_at is null;

-- Nog niet gemeld en nog open: dit is de wachtrij voor het bericht naar
-- info@mygigs.nl.
create index if not exists agent_alerts_to_notify_idx
  on public.agent_alerts (first_seen_at)
  where resolved_at is null and notified_at is null;

-- =============================================================
-- updated_at bijhouden bij de instellingen
-- =============================================================
create or replace function public.agent_settings_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists agent_settings_touch_updated_at on public.agent_settings;
create trigger agent_settings_touch_updated_at
  before update on public.agent_settings
  for each row execute function public.agent_settings_touch_updated_at();

-- =============================================================
-- De agents zelf, allemaal uit behalve de eerste twee die we nu bouwen
-- =============================================================
insert into public.agent_settings (agent, enabled, schedule, config, max_actions) values
  ('waakhond', true, 'elk kwartier', jsonb_build_object(
      'stuck_booking_hours', 48,
      'unfinished_payment_minutes', 45,
      'cron_grace_minutes', 90
    ), 100),
  ('boekingsbewaker', true, 'elk uur', jsonb_build_object(
      'nudge_unopened_hours', 4,
      'remind_no_reply_hours', 24,
      'close_no_reply_hours', 48,
      'contract_reminder_days', 7
    ), 50),
  ('geldloper', false, 'dagelijks', '{}'::jsonb, 50),
  ('klantcontact', false, 'elke 10 minuten', '{}'::jsonb, 25),
  ('poortwachter', false, 'bij elke aanmelding', '{}'::jsonb, 25),
  ('kwaliteit', false, 'wekelijks', '{}'::jsonb, 50),
  ('groei', false, 'wekelijks', '{}'::jsonb, 20),
  ('opruimer', false, 'dagelijks', jsonb_build_object('rejected_lead_days', 90), 200)
on conflict (agent) do nothing;

-- =============================================================
-- Toegang
--
-- RLS aan, en bewust geen regels voor anon of authenticated: vanuit de browser
-- komt niemand bij deze tabellen, ook een ingelogde beheerder niet. Alleen
-- servercode met de service role leest en schrijft, en die controleert eerst of
-- de aanroeper beheerder is met bevestigde 2FA, of dat het de planner is met
-- de juiste sleutel. Zelfde aanpak als bij audit_log en dj_leads.
-- =============================================================

alter table public.agent_settings enable row level security;
alter table public.agent_runs     enable row level security;
alter table public.agent_alerts   enable row level security;

revoke all on public.agent_settings from anon, authenticated;
revoke all on public.agent_runs     from anon, authenticated;
revoke all on public.agent_alerts   from anon, authenticated;
revoke all on function public.agent_settings_touch_updated_at() from public, anon, authenticated;

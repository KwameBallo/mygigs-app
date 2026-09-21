-- =============================================================
-- MyGigs: wachtrij voor nieuwe DJ's (de aanmeldbot).
--
-- Hier komt alles binnen waar later een DJ-profiel van kan worden: een mail
-- naar aanmelden@mygigs.nl, een Instagram-bericht, een bio die iemand op de
-- site plakt, of een DJ die de beheerder zelf heeft gevonden. Een beheerder
-- kijkt elke regel na voordat er iets mee gebeurt.
--
-- Dit is bewust een aparte tabel en niet meteen een rij in artists. Zo komt er
-- niets op de site dat niemand heeft nagekeken, en blijft het ruwe bericht
-- bewaard naast wat de bot eruit heeft gehaald.
--
-- Zie docs/dj-aanmeldbot.md voor het hele plan.
-- =============================================================

do $$
begin
  create type dj_lead_source as enum ('email', 'instagram', 'form', 'manual');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type dj_lead_status as enum (
    'new',        -- net binnen, nog niet bekeken
    'reviewing',  -- beheerder is ermee bezig
    'approved',   -- goedgekeurd, klaar om een profiel van te maken
    'rejected',   -- afgewezen
    'claimed'     -- de DJ heeft het profiel zelf opgeeist
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.dj_leads (
  id                uuid primary key default gen_random_uuid(),
  source            dj_lead_source not null,
  status            dj_lead_status not null default 'new',

  -- Stuurde de DJ dit zelf in, of heeft de beheerder hem gevonden? Dat
  -- verschil telt voor de AVG: zonder eigen aanvraag moet de DJ binnen een
  -- maand horen dat we zijn gegevens hebben, en mag er niets openbaar tot hij
  -- het profiel zelf opeist.
  self_submitted    boolean not null default false,

  -- Wat er letterlijk binnenkwam. Nooit overschrijven: dit is het bewijs van
  -- waar de gegevens vandaan komen.
  raw_text          text,
  raw_from          text,
  raw_subject       text,
  received_at       timestamptz not null default now(),

  -- Bij een zelf gevonden DJ: waar kwam de informatie vandaan (link naar de
  -- Instagram-bio, de website). Verplicht bij bron 'manual', zie de check.
  source_note       text,

  -- Wat de bot eruit haalde. De beheerder mag dit aanpassen.
  stage_name        text,
  email             text,
  home_city         text,
  genres            text[] not null default '{}',
  base_gage         numeric(10, 2),
  bio               text,
  instagram_handle  text,
  soundcloud_url    text,
  mixcloud_url      text,
  spotify_url       text,
  website_url       text,

  -- Wie de velden invulde: de AI, de eenvoudige herkenning of de beheerder.
  extracted_by      text,
  extracted_at      timestamptz,

  -- Afhandeling door de beheerder.
  reviewed_by       uuid references auth.users (id) on delete set null,
  reviewed_at       timestamptz,
  reject_reason     text,

  -- Het profiel dat hieruit is ontstaan.
  artist_id         uuid references public.artists (id) on delete set null,

  -- Opeislink voor de DJ. We bewaren alleen de hash, nooit de link zelf: wie
  -- de database kan lezen, kan daarmee dus geen profiel kapen.
  claim_token_hash  text unique,
  claim_expires_at  timestamptz,
  claimed_at        timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Grenzen, zodat een kwaadwillende afzender de tabel niet kan volproppen.
  constraint dj_leads_raw_text_len     check (raw_text is null or char_length(raw_text) <= 20000),
  constraint dj_leads_raw_from_len     check (raw_from is null or char_length(raw_from) <= 320),
  constraint dj_leads_raw_subject_len  check (raw_subject is null or char_length(raw_subject) <= 500),
  constraint dj_leads_source_note_len  check (source_note is null or char_length(source_note) <= 1000),
  constraint dj_leads_stage_name_len   check (stage_name is null or char_length(stage_name) <= 120),
  constraint dj_leads_email_len        check (email is null or char_length(email) <= 320),
  constraint dj_leads_city_len         check (home_city is null or char_length(home_city) <= 120),
  constraint dj_leads_bio_len          check (bio is null or char_length(bio) <= 4000),
  constraint dj_leads_handle_len       check (instagram_handle is null or char_length(instagram_handle) <= 60),
  constraint dj_leads_genres_count     check (cardinality(genres) <= 12),
  constraint dj_leads_gage_range       check (base_gage is null or (base_gage >= 0 and base_gage <= 1000000)),

  -- Een zelf gevonden DJ zonder bronvermelding mag niet: dan kun je later
  -- niet uitleggen waar je zijn gegevens vandaan had.
  constraint dj_leads_manual_needs_source check (
    source <> 'manual' or (source_note is not null and char_length(btrim(source_note)) > 0)
  ),

  -- Afwijzen zonder reden maakt de wachtrij achteraf onleesbaar.
  constraint dj_leads_reject_needs_reason check (
    status <> 'rejected' or (reject_reason is not null and char_length(btrim(reject_reason)) > 0)
  )
);

comment on table public.dj_leads is
  'Binnenkomende DJ-aanmeldingen voor de aanmeldbot. Alleen via de server (service role) toegankelijk.';

-- Wachtrij per status, nieuwste eerst.
create index if not exists dj_leads_status_received_idx
  on public.dj_leads (status, received_at desc);

-- Ontdubbelen: per e-mailadres en per Instagram-naam maximaal één openstaande
-- aanmelding. Na afwijzen of afhandelen mag dezelfde DJ zich opnieuw melden.
create unique index if not exists dj_leads_open_email_uidx
  on public.dj_leads (lower(email))
  where email is not null and status in ('new', 'reviewing');

create unique index if not exists dj_leads_open_handle_uidx
  on public.dj_leads (lower(instagram_handle))
  where instagram_handle is not null and status in ('new', 'reviewing');

-- updated_at bijhouden.
create or replace function public.dj_leads_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dj_leads_touch_updated_at on public.dj_leads;
create trigger dj_leads_touch_updated_at
  before update on public.dj_leads
  for each row execute function public.dj_leads_touch_updated_at();

-- =============================================================
-- Toegang
--
-- RLS staat aan en er zijn bewust GEEN regels voor anon of authenticated. Dat
-- betekent: vanuit de browser kan niemand deze tabel lezen of beschrijven, ook
-- niet een ingelogde DJ. Alleen servercode met de service role komt erbij, en
-- die controleert eerst of de aanroeper beheerder is met bevestigde 2FA.
--
-- Zo gaat het ook bij audit_log. Rechten worden daarnaast expliciet ingetrokken,
-- zodat een vergeten regel in de toekomst niet per ongeluk alles openzet.
-- =============================================================

alter table public.dj_leads enable row level security;

revoke all on public.dj_leads from anon, authenticated;
revoke all on function public.dj_leads_touch_updated_at() from public, anon, authenticated;

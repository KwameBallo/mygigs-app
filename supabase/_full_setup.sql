-- MyGigs — volledige database-opzet (alle migraties, in volgorde)
-- Plak dit in de Supabase SQL Editor van je eigen 'mygigs'-project en klik Run.
-- Gegenereerd uit supabase/migrations/. NIET committen als je 't niet wilt (los hulpbestand).

-- ============================================================
-- >>> 0000_base_schema.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  BASE SCHEMA (reconstructed)
-- Project qvenjlozeggrxfyycpsn.
--
-- This migration reconstructs the original base schema that was
-- created directly on the remote DB before migration 0001. The
-- repo's migrations start at 0001 with ALTER statements against
-- tables that were never CREATEd in-repo. This file recreates
-- those tables in their PRE-0001 state, so migrations 0001-0012
-- apply cleanly on top and a fresh project can be fully rebuilt.
--
-- Reconstructed from types/database.ts, minus every column that a
-- later migration (0001,0002,0003,0004,0009,0010,0011,0012) adds.
-- Tables created by later migrations (suppliers, clubs, events,
-- event_artists, ads, chat_flags) are NOT created here.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Enums (only the 5 that later migrations do not create)
-- -------------------------------------------------------------
create type user_role as enum ('booker', 'artist', 'both', 'admin');
create type availability_status as enum ('available', 'booked');
create type booking_status as enum (
  'pending', 'accepted', 'declined', 'cancelled', 'completed', 'paid'
);
create type payment_status as enum (
  'pending', 'held', 'released', 'refunded', 'failed'
);
create type payout_status as enum ('scheduled', 'paid', 'failed');

-- -------------------------------------------------------------
-- 2. Tables (in FK dependency order)
-- -------------------------------------------------------------

-- profiles: one row per auth user. Bootstrapped by handle_new_user().
-- Excluded (re-added by later migrations):
--   subscription_status, subscription_plan, subscription_trial_end,
--   subscription_current_period_end, stripe_customer_id,
--   stripe_subscription_id            -> 0004
--   flagged, flag_count               -> 0009
--   company_name, vat_number, invoice_email, invoice_address -> 0011
create table profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  full_name         text,
  avatar_url        text,
  phone             text,
  city              text,
  company           text,
  role              user_role not null default 'booker',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- genres: reference lookup (integer PK). Full definition from types.
create table genres (
  id    serial primary key,
  name  text not null,
  slug  text not null
);

-- artists: DJ / act profiles owned by a user.
-- Excluded (re-added by later migrations):
--   instagram_url, instagram_handle, instagram_followers,
--   spotify_followers                 -> 0002
--   tiktok_url, tiktok_handle, tiktok_followers -> 0003
--   act_type, verified, total_bookings, response_minutes -> 0011
create table artists (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles (id) on delete set null,
  genre_id            integer references genres (id) on delete set null,
  stage_name          text not null,
  bio                 text,
  avatar_url          text,
  home_city           text,
  lat                 numeric,
  lng                 numeric,
  base_gage           numeric not null default 0,
  equipment           text,
  online              boolean not null default false,
  rating              numeric not null default 0,
  reviews_count       integer not null default 0,
  bookings_30d        integer not null default 0,
  spotify_url         text,
  soundcloud_url      text,
  mixcloud_url        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- artist_availability: calendar of available/booked dates.
-- Not altered by any migration -> created in full from types.
create table artist_availability (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references artists (id) on delete cascade,
  date        date not null,
  status      availability_status not null default 'available'
);

-- bookings: a booker books an artist.
-- Excluded (re-added by later migrations):
--   is_public                         -> 0001
--   booking_type, occasion, company_name, vat_number, invoice_email -> 0010
--   shortlist_id                      -> 0012
create table bookings (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id) on delete cascade,
  booker_id     uuid not null references profiles (id) on delete cascade,
  event_date    date not null,
  start_time    time,
  end_time      time,
  venue_name    text,
  address       text,
  city          text,
  message       text,
  gage          numeric not null,
  service_fee   numeric not null,
  total         numeric not null,
  status        booking_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- conversations: chat thread between a booker and an artist.
-- Excluded (re-added by later migrations):
--   flagged, flag_reason, flagged_at  -> 0009
create table conversations (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id) on delete cascade,
  booker_id     uuid not null references profiles (id) on delete cascade,
  booking_id    uuid references bookings (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- messages: individual chat messages. Not altered by any migration.
create table messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references conversations (id) on delete cascade,
  sender_id         uuid not null references profiles (id) on delete cascade,
  body              text not null,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- payments: escrow / payment record for a booking. Written by webhooks.
-- Not altered by any migration.
create table payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings (id) on delete cascade,
  amount        numeric not null,
  currency      text not null default 'eur',
  provider      text,
  provider_ref  text,
  status        payment_status not null default 'pending',
  created_at    timestamptz not null default now()
);

-- payouts: payout to an artist. Not altered by any migration.
create table payouts (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id) on delete cascade,
  booking_id    uuid references bookings (id) on delete set null,
  amount        numeric not null,
  status        payout_status not null default 'scheduled',
  created_at    timestamptz not null default now()
);

-- reviews: rating + comment for an artist. Not altered by any migration.
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id) on delete cascade,
  booker_id     uuid references profiles (id) on delete set null,
  booking_id    uuid references bookings (id) on delete set null,
  rating        integer not null,
  comment       text,
  reviewer_name text,
  created_at    timestamptz not null default now()
);

-- favorites: a booker's saved artists. Not altered by any migration.
create table favorites (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id) on delete cascade,
  booker_id     uuid not null references profiles (id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 3. Helper function: is_artist_owner
--    True when the current auth user owns the given artist row.
-- -------------------------------------------------------------
create or replace function is_artist_owner(a_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.artists
    where id = a_id and user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------
-- 4. Profile bootstrap: auto-create a profile row on signup.
-- -------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'booker')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -------------------------------------------------------------
-- 5. Row Level Security + policies
-- -------------------------------------------------------------
alter table profiles             enable row level security;
alter table genres               enable row level security;
alter table artists              enable row level security;
alter table artist_availability  enable row level security;
alter table bookings             enable row level security;
alter table conversations        enable row level security;
alter table messages             enable row level security;
alter table payments             enable row level security;
alter table payouts              enable row level security;
alter table reviews              enable row level security;
alter table favorites            enable row level security;

-- profiles: public read (needed for public DJ profiles/names);
-- users manage only their own row.
create policy "profiles_public_read" on profiles
  for select using (true);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- genres: public read; no public writes.
create policy "genres_public_read" on genres
  for select using (true);

-- artists: public read; owner manages own rows.
create policy "artists_public_read" on artists
  for select using (true);
create policy "artists_insert_own" on artists
  for insert with check (user_id = auth.uid());
create policy "artists_update_own" on artists
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "artists_delete_own" on artists
  for delete using (user_id = auth.uid());

-- artist_availability: public read; owner (via artist) writes.
create policy "availability_public_read" on artist_availability
  for select using (true);
create policy "availability_insert_owner" on artist_availability
  for insert with check (is_artist_owner(artist_id));
create policy "availability_update_owner" on artist_availability
  for update using (is_artist_owner(artist_id)) with check (is_artist_owner(artist_id));
create policy "availability_delete_owner" on artist_availability
  for delete using (is_artist_owner(artist_id));

-- bookings: participants only. (Public-read of is_public added in 0001.)
create policy "bookings_participants_read" on bookings
  for select using (auth.uid() = booker_id or is_artist_owner(artist_id));
create policy "bookings_insert_booker" on bookings
  for insert with check (auth.uid() = booker_id);
create policy "bookings_update_participants" on bookings
  for update using (auth.uid() = booker_id or is_artist_owner(artist_id))
  with check (auth.uid() = booker_id or is_artist_owner(artist_id));

-- conversations: participants only.
create policy "conversations_participants_read" on conversations
  for select using (auth.uid() = booker_id or is_artist_owner(artist_id));
create policy "conversations_insert_participants" on conversations
  for insert with check (auth.uid() = booker_id or is_artist_owner(artist_id));

-- messages: sender or conversation participant can read; sender inserts.
create policy "messages_participants_read" on messages
  for select using (
    sender_id = auth.uid()
    or exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.booker_id or is_artist_owner(c.artist_id))
    )
  );
create policy "messages_insert_sender" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.booker_id or is_artist_owner(c.artist_id))
    )
  );

-- payments: read for participants of the related booking; no client writes.
create policy "payments_participants_read" on payments
  for select using (
    exists (
      select 1 from bookings b
      where b.id = payments.booking_id
        and (auth.uid() = b.booker_id or is_artist_owner(b.artist_id))
    )
  );

-- payouts: read for the owning artist; no client writes.
create policy "payouts_owner_read" on payouts
  for select using (is_artist_owner(artist_id));

-- reviews: public read; booker inserts own reviews.
create policy "reviews_public_read" on reviews
  for select using (true);
create policy "reviews_insert_booker" on reviews
  for insert with check (auth.uid() = booker_id);

-- favorites: owner only.
create policy "favorites_owner_read" on favorites
  for select using (auth.uid() = booker_id);
create policy "favorites_insert_owner" on favorites
  for insert with check (auth.uid() = booker_id);
create policy "favorites_delete_owner" on favorites
  for delete using (auth.uid() = booker_id);

-- -------------------------------------------------------------
-- 6. Indexes
-- -------------------------------------------------------------
create index if not exists artists_user_id_idx            on artists (user_id);
create index if not exists artists_genre_id_idx           on artists (genre_id);
create index if not exists bookings_artist_id_idx         on bookings (artist_id);
create index if not exists bookings_booker_id_idx         on bookings (booker_id);
create index if not exists bookings_status_idx            on bookings (status);
create index if not exists conversations_booker_id_idx    on conversations (booker_id);
create index if not exists conversations_artist_id_idx    on conversations (artist_id);
create index if not exists messages_conversation_id_idx   on messages (conversation_id);
create index if not exists messages_sender_id_idx         on messages (sender_id);
create index if not exists favorites_booker_id_idx        on favorites (booker_id);
create index if not exists reviews_artist_id_idx          on reviews (artist_id);
create index if not exists artist_availability_artist_id_idx on artist_availability (artist_id);
create index if not exists payments_booking_id_idx        on payments (booking_id);
create index if not exists payouts_artist_id_idx          on payouts (artist_id);
create index if not exists payouts_booking_id_idx         on payouts (booking_id);


-- ============================================================
-- >>> 0001_bookings_is_public.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  publieke optredens op het artiestprofiel
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Voegt een is_public vlag toe aan bookings. Artiesten kunnen
-- bevestigde gigs zichtbaar maken op hun publieke profiel, zodat
-- fans naar hun shows kunnen komen. PrivÃ©boekingen blijven privÃ©.
-- =============================================================

alter table bookings
  add column if not exists is_public boolean not null default false;

-- Fans (incl. niet-ingelogd) mogen openbare optredens lezen.
drop policy if exists "Public shows are viewable by everyone" on bookings;
create policy "Public shows are viewable by everyone"
  on bookings
  for select
  using (is_public = true);


-- ============================================================
-- >>> 0002_artist_socials.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  social-koppelingen + volgers voor AI-zoeken
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Voegt Instagram/Spotify-velden en volgersaantallen toe aan
-- artists, zodat de AI-zoekbalk kan filteren op bv. "artiest met
-- minimaal 20.000 volgers in omgeving Utrecht". Spotify- en
-- Instagram-OAuth volgen later; deze kolommen vormen de basis.
-- =============================================================

alter table artists
  add column if not exists instagram_url text,
  add column if not exists instagram_handle text,
  add column if not exists instagram_followers integer not null default 0,
  add column if not exists spotify_followers integer not null default 0;


-- ============================================================
-- >>> 0003_artist_tiktok.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  TikTok-koppeling
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Voegt TikTok-velden + volgersaantal toe aan artists, gelijk aan
-- de bestaande Instagram-/Spotify-kolommen.
-- =============================================================

alter table artists
  add column if not exists tiktok_url text,
  add column if not exists tiktok_handle text,
  add column if not exists tiktok_followers integer not null default 0;


-- ============================================================
-- >>> 0004_artist_subscriptions.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  abonnementen voor artiesten (verdienmodel)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Het verdienmodel verschuift van een 7% boekingsfee naar een
-- abonnement: om artiest te worden op de tool sluit je een
-- abonnement af (maand of jaar), met 14 dagen gratis proefperiode.
-- =============================================================

do $$ begin
  create type subscription_status as enum (
    'inactive', 'trialing', 'active', 'past_due', 'canceled'
  );
exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists subscription_status subscription_status
    not null default 'inactive',
  add column if not exists subscription_plan text,
  add column if not exists subscription_trial_end timestamptz,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;


-- ============================================================
-- >>> 0006_suppliers.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  leveranciers van apparatuur (nieuwe dimensie)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Niet elke artiest heeft eigen geluid/licht. Via MyGigs kun je
-- ook leveranciers vinden voor apparatuur: geluid, licht, podium,
-- DJ-gear en backline. Publiek doorzoekbaar; eigenaar beheert.
-- =============================================================

do $$ begin
  create type supplier_category as enum (
    'sound', 'light', 'stage', 'dj_gear', 'backline', 'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  category supplier_category not null default 'sound',
  city text,
  lat double precision,
  lng double precision,
  description text,
  day_rate integer,
  image_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  rating numeric not null default 0,
  reviews_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_category_idx on suppliers (category);
create index if not exists suppliers_city_idx on suppliers (city);

alter table suppliers enable row level security;

-- Iedereen mag leveranciers bekijken (directory is publiek).
do $$ begin
  create policy "suppliers_public_read" on suppliers
    for select using (true);
exception when duplicate_object then null; end $$;

-- Eigenaar mag zijn eigen leverancier aanmaken.
do $$ begin
  create policy "suppliers_owner_insert" on suppliers
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Eigenaar mag zijn eigen leverancier bijwerken.
do $$ begin
  create policy "suppliers_owner_update" on suppliers
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


-- ============================================================
-- >>> 0007_clubs_events.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  clubs & evenementen (party-agenda, Ã  la DJ Guide)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Clubs/locaties maken hun eigen profiel aan en uploaden
-- evenementen. Elk evenement heeft een line-up van artiesten
-- (koppeling naar de bestaande artists-tabel). De agenda is
-- publiek doorzoekbaar; de organisator beheert eigen content.
-- =============================================================

-- ---------- clubs / locaties ----------
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  city text,
  address text,
  lat double precision,
  lng double precision,
  description text,
  image_url text,
  capacity integer,
  website_url text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clubs_city_idx on clubs (city);
create index if not exists clubs_user_idx on clubs (user_id);

alter table clubs enable row level security;

do $$ begin
  create policy "clubs_public_read" on clubs
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "clubs_owner_insert" on clubs
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "clubs_owner_update" on clubs
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "clubs_owner_delete" on clubs
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ---------- evenementen ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  organizer_id uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  genre_id integer references genres(id) on delete set null,
  city text,
  flyer_url text,
  ticket_url text,
  ticket_price integer,
  min_age integer,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_date_idx on events (event_date);
create index if not exists events_club_idx on events (club_id);
create index if not exists events_city_idx on events (city);
create index if not exists events_genre_idx on events (genre_id);

alter table events enable row level security;

-- Iedereen ziet gepubliceerde evenementen; organisator ziet ook eigen concepten.
do $$ begin
  create policy "events_public_read" on events
    for select using (published or auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "events_owner_insert" on events
    for insert with check (auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "events_owner_update" on events
    for update using (auth.uid() = organizer_id)
    with check (auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "events_owner_delete" on events
    for delete using (auth.uid() = organizer_id);
exception when duplicate_object then null; end $$;

-- ---------- line-up: evenement <-> artiest ----------
create table if not exists event_artists (
  event_id uuid not null references events(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (event_id, artist_id)
);

create index if not exists event_artists_artist_idx on event_artists (artist_id);

alter table event_artists enable row level security;

-- Line-up is publiek leesbaar (hoort bij de publieke agenda).
do $$ begin
  create policy "event_artists_public_read" on event_artists
    for select using (true);
exception when duplicate_object then null; end $$;

-- Alleen de organisator van het bijbehorende evenement mag de line-up beheren.
do $$ begin
  create policy "event_artists_owner_insert" on event_artists
    for insert with check (
      exists (
        select 1 from events e
        where e.id = event_id and e.organizer_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "event_artists_owner_delete" on event_artists
    for delete using (
      exists (
        select 1 from events e
        where e.id = event_id and e.organizer_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;


-- ============================================================
-- >>> 0008_ads.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  advertenties (sponsored banners, bv. drankmerken)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Extra verdienmodel naast de artiest-abonnementen: merken
-- (drank, energy, etc.) plaatsen banners op de publieke agenda
-- en eventpagina's. Self-serve: adverteerder beheert eigen ads.
-- =============================================================

do $$ begin
  create type ad_placement as enum (
    'events_top', 'event_detail', 'discover', 'sidebar'
  );
exception when duplicate_object then null; end $$;

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete set null,
  brand_name text not null,
  title text,
  image_url text,
  target_url text,
  placement ad_placement not null default 'events_top',
  active boolean not null default true,
  starts_at date,
  ends_at date,
  weight integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_placement_idx on ads (placement);
create index if not exists ads_active_idx on ads (active);
create index if not exists ads_creator_idx on ads (created_by);

alter table ads enable row level security;

-- Actieve advertenties zijn publiek zichtbaar; de adverteerder ziet ook eigen
-- (ook niet-actieve) advertenties.
do $$ begin
  create policy "ads_public_read" on ads
    for select using (active or auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ads_owner_insert" on ads
    for insert with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ads_owner_update" on ads
    for update using (auth.uid() = created_by)
    with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ads_owner_delete" on ads
    for delete using (auth.uid() = created_by);
exception when duplicate_object then null; end $$;


-- ============================================================
-- >>> 0009_chat_guard.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  chat-bewaking (exclusiviteit)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Wanneer iemand in de chat persoonlijke contactgegevens deelt
-- (telefoonnummer, e-mail) of probeert buiten MyGigs om een deal
-- te maken, wordt het gesprek en worden beide partijen geflagd.
-- Schrijven gebeurt server-side met de service-role (bypasst RLS).
-- =============================================================

-- Vlaggen op het gesprek.
alter table conversations
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists flagged_at timestamptz;

-- Vlaggen op de profielen (artiest Ã©n consument).
alter table profiles
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_count integer not null default 0;

-- Logboek van incidenten voor beoordeling.
create table if not exists chat_flags (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  counterparty_id uuid references profiles(id) on delete set null,
  reason text not null,
  snippet text,
  created_at timestamptz not null default now()
);

create index if not exists chat_flags_conversation_idx
  on chat_flags (conversation_id);
create index if not exists chat_flags_sender_idx on chat_flags (sender_id);

alter table chat_flags enable row level security;

-- Betrokkenen mogen hun eigen incidenten inzien; service-role schrijft.
do $$ begin
  create policy "chat_flags_self_read" on chat_flags
    for select using (
      auth.uid() = sender_id or auth.uid() = counterparty_id
    );
exception when duplicate_object then null; end $$;


-- ============================================================
-- >>> 0010_booking_type.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  zakelijk of privÃ© boeken
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Net als Showbird kun je een artiest privÃ© (bruiloft, verjaardag)
-- of zakelijk (bedrijfsfeest, congres) boeken. Bij zakelijk leggen we
-- factuurgegevens vast (bedrijfsnaam, BTW-nummer, factuur-e-mail).
-- =============================================================

do $$ begin
  create type booking_type as enum ('prive', 'zakelijk');
exception when duplicate_object then null; end $$;

alter table bookings
  add column if not exists booking_type booking_type not null default 'prive',
  add column if not exists occasion text,
  add column if not exists company_name text,
  add column if not exists vat_number text,
  add column if not exists invoice_email text;

create index if not exists bookings_type_idx on bookings (booking_type);


-- ============================================================
-- >>> 0011_acts_trust_company.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  act-categorieÃ«n, vertrouwens-signalen & bedrijfsgegevens
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- 1. act_type  : breder dan alleen DJ (band, zanger, mc, muzikant, ...).
-- 3. trust      : geverifieerd-badge + "X keer geboekt" + responstijd.
-- 8. bedrijfs-  : opgeslagen factuurgegevens op het profiel, zodat een
--    account      booker ze bij elke zakelijke boeking kan hergebruiken.
-- =============================================================

-- 1. Act-categorieÃ«n -----------------------------------------------------
do $$ begin
  create type act_type as enum ('dj', 'band', 'singer', 'mc', 'musician', 'duo', 'other');
exception when duplicate_object then null; end $$;

alter table artists
  add column if not exists act_type act_type not null default 'dj';

create index if not exists artists_act_type_idx on artists (act_type);

-- 3. Vertrouwens-signalen ------------------------------------------------
alter table artists
  add column if not exists verified boolean not null default false,
  add column if not exists total_bookings integer not null default 0,
  add column if not exists response_minutes integer;

-- 8. Bedrijfs-/factuurgegevens op het profiel ----------------------------
alter table profiles
  add column if not exists company_name text,
  add column if not exists vat_number text,
  add column if not exists invoice_email text,
  add column if not exists invoice_address text;


-- ============================================================
-- >>> 0012_shortlist.sql
-- ============================================================
-- =============================================================
-- MyGigs  â€”  aanvraag naar meerdere acts tegelijk (shortlist)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Showbird-learning #10: een boeker kan dezelfde aanvraag in Ã©Ã©n keer naar
-- meerdere artiesten sturen. We hergebruiken de bookings-tabel: per artiest
-- maken we een boeking met een gedeelde shortlist_id, zodat alle bestaande
-- accept/decline-, betaal- en factuurstromen blijven werken.
-- =============================================================

alter table bookings
  add column if not exists shortlist_id uuid;

create index if not exists bookings_shortlist_idx on bookings (shortlist_id);



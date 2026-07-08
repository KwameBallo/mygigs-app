-- =============================================================
-- MyGigs  —  BASE SCHEMA (reconstructed)
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

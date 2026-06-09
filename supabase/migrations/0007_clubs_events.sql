-- =============================================================
-- MyGigs  —  clubs & evenementen (party-agenda, à la DJ Guide)
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

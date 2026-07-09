-- =============================================================
-- MyGigs — DJ-profiel: provincie, apparatuur, meerdere genres,
-- prijs + bereik per provincie.
-- =============================================================

-- Provincie (thuisbasis) + apparatuur-vlaggen op de artiest.
alter table artists
  add column if not exists province text,
  add column if not exists has_sound boolean not null default false,
  add column if not exists has_light boolean not null default false;

-- Meerdere genres per DJ (naast de bestaande primaire genre_id).
create table if not exists artist_genres (
  artist_id uuid not null references artists (id) on delete cascade,
  genre_id  integer not null references genres (id) on delete cascade,
  primary key (artist_id, genre_id)
);
create index if not exists artist_genres_genre_idx on artist_genres (genre_id);

alter table artist_genres enable row level security;
create policy "artist_genres_public_read" on artist_genres
  for select using (true);
create policy "artist_genres_owner_write" on artist_genres
  for all using (is_artist_owner(artist_id)) with check (is_artist_owner(artist_id));

-- Prijs + bereik per provincie. Een rij = beschikbaar in die provincie
-- voor dat bedrag. Geen rij = daar niet boekbaar.
create table if not exists artist_province_rates (
  id        uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  province  text not null,
  gage      numeric not null,
  unique (artist_id, province)
);
create index if not exists artist_province_rates_province_idx
  on artist_province_rates (province);
create index if not exists artist_province_rates_artist_idx
  on artist_province_rates (artist_id);

alter table artist_province_rates enable row level security;
create policy "artist_rates_public_read" on artist_province_rates
  for select using (true);
create policy "artist_rates_owner_write" on artist_province_rates
  for all using (is_artist_owner(artist_id)) with check (is_artist_owner(artist_id));

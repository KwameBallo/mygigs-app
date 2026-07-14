-- =============================================================
-- MyGigs — herstel schema (0013/0014/0016) + ontdubbelen + sterren.
-- Volledig idempotent: veilig om (meerdere keren) te draaien.
-- =============================================================

-- 1) Ontbrekende kolommen op artists aanvullen.
alter table artists
  add column if not exists province text,
  add column if not exists has_sound boolean not null default false,
  add column if not exists has_light boolean not null default false,
  add column if not exists equipment_items text[] not null default '{}',
  add column if not exists equipment_prices jsonb not null default '{}'::jsonb;

-- 2) Meerdere genres per DJ.
create table if not exists artist_genres (
  artist_id uuid not null references artists (id) on delete cascade,
  genre_id  integer not null references genres (id) on delete cascade,
  primary key (artist_id, genre_id)
);
create index if not exists artist_genres_genre_idx on artist_genres (genre_id);
alter table artist_genres enable row level security;
drop policy if exists "artist_genres_public_read" on artist_genres;
create policy "artist_genres_public_read" on artist_genres
  for select using (true);
drop policy if exists "artist_genres_owner_write" on artist_genres;
create policy "artist_genres_owner_write" on artist_genres
  for all using (is_artist_owner(artist_id)) with check (is_artist_owner(artist_id));

-- 3) Prijs + bereik per provincie.
create table if not exists artist_province_rates (
  id        uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  province  text not null,
  gage      numeric not null,
  unique (artist_id, province)
);
create index if not exists artist_province_rates_province_idx on artist_province_rates (province);
create index if not exists artist_province_rates_artist_idx on artist_province_rates (artist_id);
alter table artist_province_rates enable row level security;
drop policy if exists "artist_rates_public_read" on artist_province_rates;
create policy "artist_rates_public_read" on artist_province_rates
  for select using (true);
drop policy if exists "artist_rates_owner_write" on artist_province_rates;
create policy "artist_rates_owner_write" on artist_province_rates
  for all using (is_artist_owner(artist_id)) with check (is_artist_owner(artist_id));

-- 4) Dubbele DJ's verwijderen — houd de oudste per stage_name.
delete from reviews where artist_id in (
  select id from (select id, row_number() over (partition by stage_name order by created_at, id) rn from artists) t where t.rn > 1
);
delete from artist_availability where artist_id in (
  select id from (select id, row_number() over (partition by stage_name order by created_at, id) rn from artists) t where t.rn > 1
);
delete from bookings where artist_id in (
  select id from (select id, row_number() over (partition by stage_name order by created_at, id) rn from artists) t where t.rn > 1
);
delete from artists where id in (
  select id from (select id, row_number() over (partition by stage_name order by created_at, id) rn from artists) t where t.rn > 1
);

-- 5) Bekende DJ's met realistische headliner-gage.
insert into artists
  (stage_name, base_gage, home_city, province, lat, lng, genre_id,
   rating, reviews_count, total_bookings, verified, online, has_sound, has_light, bio)
select 'Martin Garrix', 250000, 'Amstelveen', 'Noord-Holland', 52.31, 4.86,
  (select id from genres where name ilike '%big room%' or name ilike '%progressive%' or name ilike '%house%' order by id limit 1),
  4.9, 1200, 300, true, true, true, true,
  'Nederlandse superster-DJ. Wereldwijde headliner op Tomorrowland, Ultra en EDC.'
where not exists (select 1 from artists where stage_name = 'Martin Garrix');

insert into artists
  (stage_name, base_gage, home_city, province, lat, lng, genre_id,
   rating, reviews_count, total_bookings, verified, online, has_sound, has_light, bio)
select 'Tiësto', 200000, 'Breda', 'Noord-Brabant', 51.57, 4.77,
  (select id from genres where name ilike '%trance%' or name ilike '%house%' or name ilike '%edm%' order by id limit 1),
  4.9, 2000, 500, true, true, true, true,
  'Grammy-winnende Nederlandse DJ-legende. Residencies in Las Vegas, wereldtournees.'
where not exists (select 1 from artists where stage_name = 'Tiësto');

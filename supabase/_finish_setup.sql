-- MyGigs — Gecombineerd setup-blok (idempotent; veilig meerdere keren te draaien).
-- Plak in de Supabase SQL Editor en klik Run.

begin;

-- 1. Sterren-prijzen -----------------------------------------------------
update artists set base_gage = 150000 where stage_name = 'Martin Garrix';
update artists set base_gage = 100000 where stage_name ilike 'ti_sto';  -- Tiësto/Tiesto

-- 2. Uurtarief: duur-kolom op boekingen ----------------------------------
alter table public.bookings add column if not exists hours numeric(4,1) not null default 1;

-- 3. Audit-log-tabel -----------------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_action_idx     on public.audit_log (action);
alter table public.audit_log enable row level security;

-- 4. Beginnende DJ's (alleen toevoegen als ze nog niet bestaan) ----------
insert into artists (
  stage_name, genre_id, home_city, lat, lng, base_gage, bio,
  rating, reviews_count, instagram_followers, verified, online, total_bookings
)
select v.stage_name, (select id from genres where slug = v.slug), v.home_city,
       v.lat, v.lng, v.base_gage, v.bio, v.rating, v.reviews_count,
       v.followers, false, v.online, v.bookings
from (values
  ('Jonas Beat',  'house',    'Zwolle',     52.512, 6.093,  50, 'Startende DJ, scherpe prijs, veel energie.',             0.0, 0,  320, true,  0),
  ('Fleur',       'latin',    'Delft',      52.011, 4.357,  50, 'Net begonnen — latin & feesthits voor kleine feesten.',  0.0, 0,  540, false, 0),
  ('Milan D',     'techno',   'Deventer',   52.255, 6.160,  50, 'Beginnende techno-DJ, leergierig en betaalbaar.',        4.8, 2,  810, true,  2),
  ('DJ Pico',     'hiphop',   'Almere',     52.350, 5.260, 100, 'Hip-hop & r&b, opkomend talent.',                        4.6, 3, 1500, true,  3),
  ('Naomi Waves', 'afro',     'Arnhem',     51.985, 5.899, 100, 'Afrohouse met frisse energie, nieuw op MyGigs.',         5.0, 1, 1200, false, 1),
  ('Sem',         'house',    'Amersfoort', 52.156, 5.388, 100, 'Toegankelijke house tegen een startprijs.',              0.0, 0,  210, false, 0),
  ('Timo K',      'amapiano', 'Enschede',   52.220, 6.895, 150, 'Amapiano & afrobeats, ambitieuze nieuwkomer.',           4.7, 4, 2600, true,  4),
  ('Lisa Groove', 'disco',    'Leiden',     52.160, 4.490, 150, 'Nu-disco en funk voor bruiloften en borrels.',           4.5, 2, 1700, true,  2),
  ('Ravi Jr',     'dnb',      'Nijmegen',   51.840, 5.860, 150, 'Drum & bass, jong en gedreven.',                         4.9, 1,  950, false, 1)
) as v(stage_name, slug, home_city, lat, lng, base_gage, bio, rating, reviews_count, followers, online, bookings)
where not exists (select 1 from artists a where a.stage_name = v.stage_name);

-- 5. Beheerder-account ---------------------------------------------------
update profiles set role = 'admin' where email = 'ballokwame+klant@gmail.com';

commit;

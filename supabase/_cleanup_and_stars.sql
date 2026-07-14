-- =============================================================
-- MyGigs — opschonen + sterren toevoegen
-- 1) Verwijder dubbele DJ's (zelfde naam) — houd de oudste per naam.
-- 2) Voeg 2 bekende DJ's toe met realistische gage.
-- Veilig herhaalbaar.
-- =============================================================

-- Herbruikbare subquery: id's van dubbele artiesten (alle behalve de eerste
-- per stage_name, gesorteerd op aanmaakdatum).
-- We verwijderen eerst de losse verwijzingen, dan de artiesten zelf.

delete from reviews
where artist_id in (
  select id from (
    select id, row_number() over (partition by stage_name order by created_at, id) rn
    from artists
  ) t where t.rn > 1
);

delete from artist_availability
where artist_id in (
  select id from (
    select id, row_number() over (partition by stage_name order by created_at, id) rn
    from artists
  ) t where t.rn > 1
);

delete from bookings
where artist_id in (
  select id from (
    select id, row_number() over (partition by stage_name order by created_at, id) rn
    from artists
  ) t where t.rn > 1
);

delete from artists
where id in (
  select id from (
    select id, row_number() over (partition by stage_name order by created_at, id) rn
    from artists
  ) t where t.rn > 1
);

-- 2) Bekende DJ's — realistische headliner-gage (per show, festivalniveau).
insert into artists
  (stage_name, base_gage, home_city, province, lat, lng, genre_id,
   rating, reviews_count, total_bookings, verified, online, has_sound, has_light, bio)
select 'Martin Garrix', 250000, 'Amstelveen', 'Noord-Holland', 52.31, 4.86,
  (select id from genres
     where name ilike '%big room%' or name ilike '%progressive%' or name ilike '%house%'
     order by id limit 1),
  4.9, 1200, 300, true, true, true, true,
  'Nederlandse superster-DJ. Wereldwijde headliner op Tomorrowland, Ultra en EDC.'
where not exists (select 1 from artists where stage_name = 'Martin Garrix');

insert into artists
  (stage_name, base_gage, home_city, province, lat, lng, genre_id,
   rating, reviews_count, total_bookings, verified, online, has_sound, has_light, bio)
select 'Tiësto', 200000, 'Breda', 'Noord-Brabant', 51.57, 4.77,
  (select id from genres
     where name ilike '%trance%' or name ilike '%house%' or name ilike '%edm%'
     order by id limit 1),
  4.9, 2000, 500, true, true, true, true,
  'Grammy-winnende Nederlandse DJ-legende. Residencies in Las Vegas, wereldtournees.'
where not exists (select 1 from artists where stage_name = 'Tiësto');

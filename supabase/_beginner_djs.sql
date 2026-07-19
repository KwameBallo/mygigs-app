-- MyGigs — demo-data: 9 beginnende DJ's met lage tarieven (€50/€100/€150).
-- Fictieve namen; geen echte personen. Plak in de Supabase SQL Editor en Run.
-- Eén keer draaien (niet idempotent — draai je 't twee keer, dan staan ze dubbel).

insert into artists (
  stage_name, genre_id, home_city, lat, lng, base_gage, bio,
  rating, reviews_count, instagram_followers, verified, online, total_bookings
) values
  ('Jonas Beat',  (select id from genres where slug='house'),    'Zwolle',     52.512, 6.093,  50, 'Startende DJ, scherpe prijs, veel energie.',             0,   0,   320, false, true,  0),
  ('Fleur',       (select id from genres where slug='latin'),    'Delft',      52.011, 4.357,  50, 'Net begonnen — latin & feesthits voor kleine feesten.',  0,   0,   540, false, false, 0),
  ('Milan D',     (select id from genres where slug='techno'),   'Deventer',   52.255, 6.160,  50, 'Beginnende techno-DJ, leergierig en betaalbaar.',        4.8, 2,   810, false, true,  2),
  ('DJ Pico',     (select id from genres where slug='hiphop'),   'Almere',     52.350, 5.260, 100, 'Hip-hop & r&b, opkomend talent.',                        4.6, 3,  1500, false, true,  3),
  ('Naomi Waves', (select id from genres where slug='afro'),     'Arnhem',     51.985, 5.899, 100, 'Afrohouse met frisse energie, nieuw op MyGigs.',         5.0, 1,  1200, false, false, 1),
  ('Sem',         (select id from genres where slug='house'),    'Amersfoort', 52.156, 5.388, 100, 'Toegankelijke house tegen een startprijs.',              0,   0,   210, false, false, 0),
  ('Timo K',      (select id from genres where slug='amapiano'), 'Enschede',   52.220, 6.895, 150, 'Amapiano & afrobeats, ambitieuze nieuwkomer.',           4.7, 4,  2600, false, true,  4),
  ('Lisa Groove', (select id from genres where slug='disco'),    'Leiden',     52.160, 4.490, 150, 'Nu-disco en funk voor bruiloften en borrels.',           4.5, 2,  1700, false, true,  2),
  ('Ravi Jr',     (select id from genres where slug='dnb'),      'Nijmegen',   51.840, 5.860, 150, 'Drum & bass, jong en gedreven.',                         4.9, 1,   950, false, false, 1);

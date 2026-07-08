-- MyGigs — demo-data: genres + 12 fictieve DJ's door heel Nederland.
-- Plak dit in de Supabase SQL Editor (mygigs-project) en klik Run.
-- Fictieve namen; geen echte personen. Eén keer draaien.

-- Genres (idempotent op slug) -------------------------------------------
insert into genres (name, slug)
select v.name, v.slug
from (values
  ('Techno', 'techno'),
  ('House', 'house'),
  ('Afro', 'afro'),
  ('Amapiano', 'amapiano'),
  ('Drum & bass', 'dnb'),
  ('Latin', 'latin'),
  ('Disco', 'disco'),
  ('Hip-hop', 'hiphop')
) as v(name, slug)
where not exists (select 1 from genres g where g.slug = v.slug);

-- DJ's (act_type valt terug op default 'dj'; user_id blijft leeg) --------
insert into artists (
  stage_name, genre_id, home_city, lat, lng, base_gage, bio,
  rating, reviews_count, instagram_followers, verified, online, total_bookings
) values
  ('DJ Nova',       (select id from genres where slug='techno'),   'Amsterdam', 52.370, 4.900, 450, 'Melodische techno voor clubs en festivals.', 4.9, 32, 24000, true,  true,  40),
  ('Lena Vale',     (select id from genres where slug='house'),    'Rotterdam', 51.920, 4.480, 600, 'Deep & soulful house, warme sets.',          4.7, 18, 12000, true,  false, 22),
  ('Koba',          (select id from genres where slug='afro'),     'Den Haag',  52.080, 4.310, 400, 'Afrohouse en amapiano-vibes.',               4.8, 27, 31000, false, true,  35),
  ('Marlow',        (select id from genres where slug='techno'),   'Utrecht',   52.090, 5.120, 350, 'Rauwe warehouse-techno.',                    4.5,  9,  5400, false, false,  8),
  ('Aisha K',       (select id from genres where slug='amapiano'), 'Amsterdam', 52.360, 4.890, 500, 'Amapiano-specialist, veel gevraagd.',        4.9, 41, 46000, true,  true,  55),
  ('Sander Rey',    (select id from genres where slug='house'),    'Eindhoven', 51.440, 5.480, 300, 'Tech-house, energieke opbouw.',              4.4,  6,  2100, false, false,  4),
  ('Nightframe',    (select id from genres where slug='dnb'),      'Groningen', 53.220, 6.570, 550, 'Drum & bass, liquid tot neuro.',             4.6, 15,  8700, false, false, 14),
  ('Diego Sol',     (select id from genres where slug='latin'),    'Breda',     51.590, 4.780, 650, 'Latin & reggaeton voor feesten.',            4.8, 22, 15000, true,  false, 19),
  ('Fenna',         (select id from genres where slug='disco'),    'Haarlem',   52.380, 4.640, 400, 'Nu-disco en funk.',                          4.7, 12,  6100, false, true,  11),
  ('Ravi B',        (select id from genres where slug='hiphop'),   'Tilburg',   51.560, 5.090, 500, 'Hip-hop & r&b classics.',                    4.5,  8,  9800, false, false,  7),
  ('MC Zenith',     (select id from genres where slug='hiphop'),   'Nijmegen',  51.840, 5.860, 700, 'MC + DJ, brengt elke zaal op gang.',         4.9, 30, 21000, true,  true,  33),
  ('Vibe Republic', (select id from genres where slug='house'),    'Maastricht',50.850, 5.690, 800, 'House-duo voor grote events.',               4.6, 14, 11000, false, false, 12);

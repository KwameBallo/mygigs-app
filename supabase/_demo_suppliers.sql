-- =============================================================
-- MyGigs — demo-verhuurpartijen (apparatuur) om de verhuur-flow
-- op het DJ-profiel te testen. Idempotent: draait veilig opnieuw.
-- =============================================================

insert into suppliers (name, category, city, lat, lng, description, day_rate, rating, reviews_count)
select v.name, v.category::supplier_category, v.city, v.lat, v.lng, v.description, v.day_rate, v.rating, v.reviews_count
from (values
  ('SoundRent Amsterdam', 'sound',  'Amsterdam',  52.37, 4.90, 'Complete PA-sets, van klein tot festival.', 250, 4.8, 34),
  ('BassLine Verhuur',     'sound',  'Rotterdam',  51.92, 4.48, 'Krachtige speakers en subs voor elk feest.',  195, 4.6, 21),
  ('Utrecht Audio Hire',   'sound',  'Utrecht',    52.09, 5.12, 'Betrouwbare geluidssets incl. bezorging.',    220, 4.7, 18),
  ('LightupEvents',        'light',  'Amsterdam',  52.36, 4.89, 'Sfeer- en podiumverlichting, movingheads.',    180, 4.9, 27),
  ('Shine Verlichting',    'light',  'Eindhoven',  51.44, 5.48, 'LED-pakketten en lichtshows op maat.',         160, 4.5, 12),
  ('ProLight Noord',       'light',  'Groningen',  53.22, 6.57, 'Verlichting voor bruiloften en clubs.',        140, 4.4, 9)
) as v(name, category, city, lat, lng, description, day_rate, rating, reviews_count)
where not exists (select 1 from suppliers s where s.name = v.name);

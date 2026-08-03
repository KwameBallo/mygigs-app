-- =============================================================
-- MyGigs — 0024: "DJ is onderweg" + ETA + onvervalsbaar aanwezigheidsbewijs
--
-- 1. Onderweg + verwachte aankomsttijd: de DJ meldt zich onderweg; wij
--    berekenen de rijtijd naar het event-adres en bewaren een verwachte
--    aankomsttijd (eta). De klant ziet ALLEEN status "onderweg" + het
--    tijdstip — nooit de locatie van de DJ (privacy/AVG).
--
-- 2. Anti-fraude op de check-in: bij de GPS-check-in bepalen we server-side of
--    hij geldig is (op locatie + binnen het tijdvenster van het event + redelijke
--    GPS-nauwkeurigheid) en leggen dat vast in checkin_verified. Zo kan een DJ
--    geen aanwezigheid faken op een willekeurig moment/plek.
--
-- 3. Tweezijdig bewijs: de klant bevestigt dat de DJ er was
--    (booker_confirmed_at). DJ-check-in + klantbevestiging samen maken een
--    no-show onmogelijk te faken (van beide kanten).
-- =============================================================

alter table bookings
  add column if not exists enroute_at         timestamptz, -- wanneer de DJ vertrok
  add column if not exists eta                timestamptz, -- verwachte aankomsttijd
  add column if not exists checkin_verified   boolean not null default false,
  add column if not exists booker_confirmed_at timestamptz; -- klant bevestigt aanwezigheid

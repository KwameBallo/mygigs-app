-- =============================================================
-- MyGigs — 0023: geverifieerd adres + navigatie + aanwezigheidsbewijs
--
-- 1. Geverifieerd event-adres op de boeking (PDOK/BAG): coördinaten +
--    postcode + een vlag dat het adres bestaat. Zo weet de DJ zeker naar
--    welk bestaand adres hij rijdt en kunnen we navigatie aanbieden.
-- 2. Check-in als aanwezigheidsbewijs: bij aankomst legt de DJ zijn GPS +
--    tijdstip vast. We bewaren de afstand tot het event-adres als bewijs.
--
-- AVG: de check-in-locatie is persoonsgegeven van de DJ. Grondslag =
-- uitvoering van de overeenkomst (bewijs van optreden) + expliciete
-- toestemming in de UI vóór het delen. Alleen zichtbaar voor de betrokken
-- DJ en boeker (RLS op bookings), niet openbaar.
-- =============================================================

alter table bookings
  add column if not exists postal_code      text,
  add column if not exists lat              numeric,
  add column if not exists lng              numeric,
  add column if not exists address_verified boolean not null default false,
  -- Aanwezigheidsbewijs (check-in op locatie).
  add column if not exists checkin_at         timestamptz,
  add column if not exists checkin_lat        numeric,
  add column if not exists checkin_lng        numeric,
  add column if not exists checkin_distance_m numeric,   -- afstand tot event-adres
  add column if not exists checkin_accuracy_m numeric;   -- GPS-nauwkeurigheid

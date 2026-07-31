-- Eén review per boeking: backstop tegen dubbele reviews (naast de check in de
-- server-action). Alleen voor rijen met een booking_id (losse/geseede reviews
-- zonder boeking blijven toegestaan).
create unique index if not exists reviews_booking_uidx
  on public.reviews (booking_id)
  where booking_id is not null;

-- Herinneringen per fase binnen een eigen venster houden. Zonder ondergrens gaf
-- de functie een boeking terug zodra die binnen 48u (of 24u) viel, waardoor een
-- last-minute boeking ook de "over twee dagen"-mail kreeg. Nu heeft elke fase een
-- ondergrens: 48u = tussen 24u en 48u, 24u = tussen 3u en 24u, 3u = binnen 3u.
create or replace function public.bookings_due_for_gig_reminder(stage_hours integer)
returns table (
  id         uuid,
  artist_id  uuid,
  booker_id  uuid,
  starts_at  timestamptz,
  city       text,
  venue_name text,
  occasion   text
)
language sql
stable
set search_path = ''
as $$
  select
    b.id,
    b.artist_id,
    b.booker_id,
    ((b.event_date + coalesce(b.start_time, time '20:00'))::timestamp
      at time zone 'Europe/Amsterdam') as starts_at,
    b.city,
    b.venue_name,
    b.occasion
  from public.bookings b
  where b.status in ('accepted', 'paid')
    and ((b.event_date + coalesce(b.start_time, time '20:00'))::timestamp
          at time zone 'Europe/Amsterdam')
        between now() + make_interval(hours =>
                 case stage_hours when 48 then 24 when 24 then 3 else 0 end)
            and now() + make_interval(hours => stage_hours)
  order by 4
  limit 200;
$$;

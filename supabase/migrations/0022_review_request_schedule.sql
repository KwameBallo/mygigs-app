-- Review-verzoek wordt automatisch 3 uur ná het einde van het optreden
-- verstuurd (i.p.v. bij handmatig 'afronden'). We houden bij wanneer het
-- verzoek is verstuurd, zodat het maar één keer gaat.
alter table public.bookings
  add column if not exists review_request_sent_at timestamptz;

-- Boekingen die klaar zijn voor een review-verzoek: betaald/afgerond, nog niet
-- verstuurd, en het optreden is (in Europe/Amsterdam) minstens 3 uur geleden
-- afgelopen. Einde = end_time, anders start_time + duur, anders 23:00.
create or replace function public.bookings_due_for_review()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  where b.status in ('paid', 'completed')
    and b.review_request_sent_at is null
    and (
      (
        case
          when b.end_time is not null then (b.event_date + b.end_time)
          when b.start_time is not null
            then ((b.event_date + b.start_time) + (b.hours * interval '1 hour'))
          else (b.event_date + time '23:00')
        end
      ) at time zone 'Europe/Amsterdam'
    ) + interval '3 hours' <= now();
$$;

grant execute on function public.bookings_due_for_review() to service_role;

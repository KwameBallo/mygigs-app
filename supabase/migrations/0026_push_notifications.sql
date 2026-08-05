-- =============================================================
-- MyGigs — 0026: web-push meldingen (DJ + organisator)
--
-- 1. push_subscriptions: per gebruiker de push-abonnementen van hun apparaten.
-- 2. bookings.reminder_sent_at: markeert dat de 24u-herinnering verstuurd is.
-- 3. bookings_due_for_reminder(): boekingen waarvan de starttijd binnen 24 uur
--    valt en waarvoor nog geen herinnering is gestuurd (NL-tijd correct).
-- =============================================================

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_own_all" on push_subscriptions;
create policy "push_own_all" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table bookings
  add column if not exists reminder_sent_at timestamptz;

-- Boekingen waarvan het optreden binnen 24 uur begint (NL-tijd) en die nog geen
-- herinnering hebben gehad. Alleen bevestigde/betaalde boekingen.
create or replace function bookings_due_for_reminder()
returns setof bookings
language sql
security definer
set search_path = public
as $$
  select *
  from bookings
  where status in ('accepted', 'paid')
    and reminder_sent_at is null
    and ((event_date + coalesce(start_time, '00:00'::time))
          at time zone 'Europe/Amsterdam') > now()
    and ((event_date + coalesce(start_time, '00:00'::time))
          at time zone 'Europe/Amsterdam') <= now() + interval '24 hours';
$$;

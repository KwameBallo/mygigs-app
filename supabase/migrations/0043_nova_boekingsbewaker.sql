-- =============================================================
-- Nova, de boekingsbewaker.
--
-- Twee taken:
--   1. herinneren aan een optreden: 48 uur, 24 uur en 3 uur van tevoren,
--      naar de DJ en naar de boeker
--   2. aanvragen die blijven liggen: de DJ porren na 4 uur, herinneren na
--      24 uur, en na 48 uur de aanvraag sluiten zodat de boeker verder kan
--
-- Per moment één kolom, zodat een herinnering nooit dubbel gestuurd kan worden:
-- de agent claimt het moment met een update die alleen slaagt als de kolom nog
-- leeg is. Draait er per ongeluk twee keer een run tegelijk, dan wint er één.
--
-- De tijdrekening zit bewust hier en niet in de code: 'Europe/Amsterdam' kent
-- de zomertijd, een berekening in JavaScript op een server die in UTC staat
-- niet.
-- =============================================================

alter table public.bookings
  add column if not exists reminder_48_at   timestamptz,
  add column if not exists reminder_24_at   timestamptz,
  add column if not exists reminder_3_at    timestamptz,
  add column if not exists nudge_4h_at      timestamptz,
  add column if not exists nudge_24h_at     timestamptz,
  add column if not exists auto_declined_at timestamptz;

comment on column public.bookings.reminder_48_at is 'Nova: herinnering 48 uur voor aanvang verstuurd';
comment on column public.bookings.reminder_24_at is 'Nova: herinnering 24 uur voor aanvang verstuurd';
comment on column public.bookings.reminder_3_at is 'Nova: herinnering 3 uur voor aanvang verstuurd';
comment on column public.bookings.nudge_4h_at is 'Nova: DJ gepord omdat de aanvraag 4 uur open stond';
comment on column public.bookings.nudge_24h_at is 'Nova: DJ herinnerd en boeker ingelicht na 24 uur';
comment on column public.bookings.auto_declined_at is 'Nova: aanvraag gesloten omdat de DJ niet reageerde';

-- Aanvragen die nog leven, dat is het enige waar Nova in kijkt.
create index if not exists bookings_nova_idx
  on public.bookings (status, event_date)
  where status in ('pending', 'accepted', 'paid');

-- =============================================================
-- Welke optredens komen eraan?
--
-- Geeft alles terug dat binnen het opgegeven aantal uur begint. De agent kijkt
-- daarna zelf welk moment nog niet verstuurd is. Daardoor haalt hij een gemiste
-- run vanzelf in: staat de 24-uursmelding er nog niet als het optreden over 20
-- uur is, dan gaat hij alsnog.
-- =============================================================
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
        between now() and now() + make_interval(hours => stage_hours)
  order by 4
  limit 200;
$$;

-- Alleen de server mag dit opvragen, niemand in de browser.
revoke all on function public.bookings_due_for_gig_reminder(integer) from public, anon, authenticated;
grant execute on function public.bookings_due_for_gig_reminder(integer) to service_role;

-- =============================================================
-- Nova aanzetten met haar grenswaarden
-- =============================================================
update public.agent_settings
set enabled = true,
    schedule = 'elk kwartier',
    config = jsonb_build_object(
      'nudge_unopened_hours', 4,     -- DJ porren
      'remind_no_reply_hours', 24,   -- DJ herinneren, boeker inlichten
      'close_no_reply_hours', 48,    -- aanvraag sluiten
      'auto_close', true             -- uit: Nova meldt het alleen
    ),
    max_actions = 60
where agent = 'boekingsbewaker';

-- =============================================================
-- Tijdschema
--
-- Elk kwartier, want de herinnering van 3 uur van tevoren moet op tijd zijn.
-- De oude taak booking-reminders gaat eruit: die stuurde alleen een melding op
-- de telefoon, 24 uur van tevoren, en Nova neemt dat over inclusief e-mail. Ze
-- vult daarbij ook reminder_sent_at, zodat Wolf zijn controle blijft kloppen.
-- =============================================================
do $$
begin
  perform cron.unschedule('booking-reminders');
exception when others then
  raise notice 'booking-reminders stond al niet meer ingepland';
end $$;

select cron.schedule(
  'boekingsbewaker',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://mygigs-app-t7ve.vercel.app/api/agents/boekingsbewaker',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);

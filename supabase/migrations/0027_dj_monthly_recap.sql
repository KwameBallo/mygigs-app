-- Maandelijkse DJ-terugblik: houd bij welke DJ voor welke periode al een
-- terugblik heeft gehad, zodat de (dagelijks draaiende) cron per DJ maar één
-- mail/push per maand stuurt.
create table if not exists public.dj_monthly_recap (
  artist_id uuid not null references public.artists(id) on delete cascade,
  period text not null,                 -- 'YYYY-MM' van de maand waarover de recap gaat
  sent_at timestamptz not null default now(),
  primary key (artist_id, period)
);

alter table public.dj_monthly_recap enable row level security;
-- Geen policies: alleen de service-role (cron-endpoint) leest/schrijft. Clients
-- (anon/authenticated) hebben geen toegang.

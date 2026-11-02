-- Meldingen (reports) en blokkades (user_blocks) voor UGC-moderatie.
-- Apple App Store richtlijn 1.2 vereist dat gebruikers content/personen kunnen
-- melden en blokkeren. De beheerder ziet meldingen in /admin/meldingen.

create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid references auth.users (id) on delete set null,
  target_type      text not null check (target_type in ('artist','conversation','review','message')),
  target_id        uuid,
  reason           text not null,
  details          text,
  status           text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at       timestamptz not null default now()
);
create index if not exists reports_status_idx   on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx on public.reports (reporter_id);

create table if not exists public.user_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.reports     enable row level security;
alter table public.user_blocks enable row level security;

-- Reports: een ingelogde gebruiker maakt alleen een eigen melding aan. Lezen en
-- bijwerken gebeurt door de beheerder via de service-role (bypasst RLS), dus er
-- is geen brede SELECT-policy nodig.
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- user_blocks: je beheert uitsluitend je eigen blokkades.
drop policy if exists blocks_select_own on public.user_blocks;
create policy blocks_select_own on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
drop policy if exists blocks_insert_own on public.user_blocks;
create policy blocks_insert_own on public.user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
drop policy if exists blocks_delete_own on public.user_blocks;
create policy blocks_delete_own on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

grant select, insert           on public.reports     to authenticated;
grant select, insert, delete   on public.user_blocks to authenticated;

-- MyGigs — DJ-aanvragen (organisator → DJ vereist goedkeuring van een beheerder).
-- Plak in de Supabase SQL Editor en Run. Idempotent.

create table if not exists public.dj_applications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending',   -- pending | approved | rejected
  motivation  text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index if not exists dj_applications_user_uidx
  on public.dj_applications (user_id);

alter table public.dj_applications enable row level security;

-- Je mag alleen je eigen aanvraag lezen en aanmaken. Beoordelen (goedkeuren/
-- afwijzen) en opnieuw indienen gebeurt server-side via de service-role, zodat
-- niemand zichzelf kan goedkeuren.
drop policy if exists "dj_app_own_read"   on public.dj_applications;
drop policy if exists "dj_app_own_insert" on public.dj_applications;
create policy "dj_app_own_read"   on public.dj_applications
  for select using (user_id = auth.uid());
create policy "dj_app_own_insert" on public.dj_applications
  for insert with check (user_id = auth.uid());

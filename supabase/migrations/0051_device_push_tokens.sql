-- Native push-tokens (APNs voor iOS, later FCM voor Android). Los van de
-- web-push abonnementen (push_subscriptions), want dat is een ander formaat.
-- Schrijven gaat via de service-role (de /api/push/native endpoint), dus geen
-- brede RLS-policy nodig.

create table if not exists public.device_push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  platform   text not null check (platform in ('ios','android')),
  token      text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_push_tokens_user_idx on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

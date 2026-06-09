-- =============================================================
-- MyGigs  —  chat-bewaking (exclusiviteit)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Wanneer iemand in de chat persoonlijke contactgegevens deelt
-- (telefoonnummer, e-mail) of probeert buiten MyGigs om een deal
-- te maken, wordt het gesprek en worden beide partijen geflagd.
-- Schrijven gebeurt server-side met de service-role (bypasst RLS).
-- =============================================================

-- Vlaggen op het gesprek.
alter table conversations
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists flagged_at timestamptz;

-- Vlaggen op de profielen (artiest én consument).
alter table profiles
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_count integer not null default 0;

-- Logboek van incidenten voor beoordeling.
create table if not exists chat_flags (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  counterparty_id uuid references profiles(id) on delete set null,
  reason text not null,
  snippet text,
  created_at timestamptz not null default now()
);

create index if not exists chat_flags_conversation_idx
  on chat_flags (conversation_id);
create index if not exists chat_flags_sender_idx on chat_flags (sender_id);

alter table chat_flags enable row level security;

-- Betrokkenen mogen hun eigen incidenten inzien; service-role schrijft.
do $$ begin
  create policy "chat_flags_self_read" on chat_flags
    for select using (
      auth.uid() = sender_id or auth.uid() = counterparty_id
    );
exception when duplicate_object then null; end $$;

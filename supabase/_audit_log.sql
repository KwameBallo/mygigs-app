-- MyGigs — Audit-log (ISO/IEC 27002:2022 A.8.15 logging, A.8.16 monitoring).
-- Append-only logboek van beveiligings- en financieel relevante gebeurtenissen.
-- Plak in de Supabase SQL Editor en klik Run. Idempotent.
--
-- Toegang: RLS staat aan en er zijn GEEN policies → alleen de service-role
-- (server-side) kan schrijven en lezen. Clients kunnen er niet bij.

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,                                   -- wie (auth user); null = systeem
  action      text not null,                          -- bv. 'role.change', 'payment.hold'
  target_type text,                                   -- bv. 'booking', 'profile'
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_action_idx     on public.audit_log (action);

alter table public.audit_log enable row level security;
-- Bewust geen policies: uitsluitend de service-role heeft toegang.

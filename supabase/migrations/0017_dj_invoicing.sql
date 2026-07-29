-- 0017_dj_invoicing.sql
-- DJ-facturatie: verkoopfactuur (DJ -> klant) + commissie-factuur (MyGigs -> DJ).
-- AVG/ISO 27001/27002: facturatie-PII staat apart met owner-only RLS (artists is
-- publiek leesbaar voor discovery), facturen zijn immutable + sequentieel genummerd,
-- schrijven kan alleen via de service-role, lezen alleen door betrokkenen.

-- 1. Facturatie-identiteit van de DJ (aparte tabel = PII-isolatie).
create table if not exists public.artist_billing (
  artist_id uuid primary key references public.artists(id) on delete cascade,
  invoice_name text,                                  -- (bedrijfs)naam op de factuur
  invoice_address text,                               -- straat, postcode, plaats
  kvk_number text,
  vat_number text,
  is_vat_registered boolean not null default false,   -- false = KOR (geen btw)
  updated_at timestamptz not null default now()
);

alter table public.artist_billing enable row level security;

drop policy if exists artist_billing_owner_sel on public.artist_billing;
create policy artist_billing_owner_sel on public.artist_billing for select
  using (exists (select 1 from public.artists a
                 where a.id = artist_billing.artist_id and a.user_id = auth.uid()));

drop policy if exists artist_billing_owner_ins on public.artist_billing;
create policy artist_billing_owner_ins on public.artist_billing for insert
  with check (exists (select 1 from public.artists a
                      where a.id = artist_billing.artist_id and a.user_id = auth.uid()));

drop policy if exists artist_billing_owner_upd on public.artist_billing;
create policy artist_billing_owner_upd on public.artist_billing for update
  using (exists (select 1 from public.artists a
                 where a.id = artist_billing.artist_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.artists a
                      where a.id = artist_billing.artist_id and a.user_id = auth.uid()));

-- 2. Facturen (immutable). Snapshot van namen/adressen/bedragen bij uitgifte.
do $$ begin
  create type public.invoice_kind as enum ('dj_sale', 'mg_commission');
exception when duplicate_object then null; end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  kind public.invoice_kind not null,
  number text not null unique,
  issued_at timestamptz not null default now(),
  -- afzender (issuer) snapshot
  issuer_name text not null,
  issuer_address text,
  issuer_vat text,
  issuer_kvk text,
  -- ontvanger (recipient) snapshot
  recipient_name text not null,
  recipient_address text,
  recipient_vat text,
  -- bedragen in euro (2 decimalen)
  description text not null,
  net numeric(10,2) not null,
  vat_rate numeric(5,4) not null default 0,
  vat_amount numeric(10,2) not null default 0,
  gross numeric(10,2) not null,
  vat_note text,                                      -- bv. 'Kleineondernemersregeling (geen btw)'
  artist_id uuid not null references public.artists(id),
  booker_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (booking_id, kind)                           -- max. 1 factuur per soort per boeking
);
create index if not exists invoices_booking_idx on public.invoices(booking_id);
create index if not exists invoices_artist_idx on public.invoices(artist_id);
create index if not exists invoices_booker_idx on public.invoices(booker_id);

alter table public.invoices enable row level security;

-- Lezen: de betrokken DJ (via artists.user_id) of de boeker. Geen client-writes.
drop policy if exists invoices_select_participant on public.invoices;
create policy invoices_select_participant on public.invoices for select
  using (
    booker_id = auth.uid()
    or exists (select 1 from public.artists a
               where a.id = invoices.artist_id and a.user_id = auth.uid())
  );

-- 3. Sequentiële nummering per scope + jaar (fiscale eis).
create table if not exists public.invoice_counters (
  scope text not null,
  year int not null,
  seq int not null default 0,
  primary key (scope, year)
);
alter table public.invoice_counters enable row level security;  -- geen policies = alleen service-role

create or replace function public.next_invoice_number(p_scope text, p_prefix text, p_year int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_seq int;
begin
  insert into public.invoice_counters(scope, year, seq)
    values (p_scope, p_year, 1)
    on conflict (scope, year)
      do update set seq = public.invoice_counters.seq + 1
    returning seq into v_seq;
  return p_prefix || '-' || p_year::text || '-' || lpad(v_seq::text, 5, '0');
end;
$$;

revoke all on function public.next_invoice_number(text, text, int) from public, anon, authenticated;

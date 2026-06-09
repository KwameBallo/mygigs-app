-- =============================================================
-- MyGigs  —  act-categorieën, vertrouwens-signalen & bedrijfsgegevens
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- 1. act_type  : breder dan alleen DJ (band, zanger, mc, muzikant, ...).
-- 3. trust      : geverifieerd-badge + "X keer geboekt" + responstijd.
-- 8. bedrijfs-  : opgeslagen factuurgegevens op het profiel, zodat een
--    account      booker ze bij elke zakelijke boeking kan hergebruiken.
-- =============================================================

-- 1. Act-categorieën -----------------------------------------------------
do $$ begin
  create type act_type as enum ('dj', 'band', 'singer', 'mc', 'musician', 'duo', 'other');
exception when duplicate_object then null; end $$;

alter table artists
  add column if not exists act_type act_type not null default 'dj';

create index if not exists artists_act_type_idx on artists (act_type);

-- 3. Vertrouwens-signalen ------------------------------------------------
alter table artists
  add column if not exists verified boolean not null default false,
  add column if not exists total_bookings integer not null default 0,
  add column if not exists response_minutes integer;

-- 8. Bedrijfs-/factuurgegevens op het profiel ----------------------------
alter table profiles
  add column if not exists company_name text,
  add column if not exists vat_number text,
  add column if not exists invoice_email text,
  add column if not exists invoice_address text;

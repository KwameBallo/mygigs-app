-- =============================================================
-- MyGigs  —  zakelijk of privé boeken
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Net als Showbird kun je een artiest privé (bruiloft, verjaardag)
-- of zakelijk (bedrijfsfeest, congres) boeken. Bij zakelijk leggen we
-- factuurgegevens vast (bedrijfsnaam, BTW-nummer, factuur-e-mail).
-- =============================================================

do $$ begin
  create type booking_type as enum ('prive', 'zakelijk');
exception when duplicate_object then null; end $$;

alter table bookings
  add column if not exists booking_type booking_type not null default 'prive',
  add column if not exists occasion text,
  add column if not exists company_name text,
  add column if not exists vat_number text,
  add column if not exists invoice_email text;

create index if not exists bookings_type_idx on bookings (booking_type);

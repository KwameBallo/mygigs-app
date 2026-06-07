-- =============================================================
-- MyGigs  —  leveranciers van apparatuur (nieuwe dimensie)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Niet elke artiest heeft eigen geluid/licht. Via MyGigs kun je
-- ook leveranciers vinden voor apparatuur: geluid, licht, podium,
-- DJ-gear en backline. Publiek doorzoekbaar; eigenaar beheert.
-- =============================================================

do $$ begin
  create type supplier_category as enum (
    'sound', 'light', 'stage', 'dj_gear', 'backline', 'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  category supplier_category not null default 'sound',
  city text,
  lat double precision,
  lng double precision,
  description text,
  day_rate integer,
  image_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  rating numeric not null default 0,
  reviews_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_category_idx on suppliers (category);
create index if not exists suppliers_city_idx on suppliers (city);

alter table suppliers enable row level security;

-- Iedereen mag leveranciers bekijken (directory is publiek).
do $$ begin
  create policy "suppliers_public_read" on suppliers
    for select using (true);
exception when duplicate_object then null; end $$;

-- Eigenaar mag zijn eigen leverancier aanmaken.
do $$ begin
  create policy "suppliers_owner_insert" on suppliers
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Eigenaar mag zijn eigen leverancier bijwerken.
do $$ begin
  create policy "suppliers_owner_update" on suppliers
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

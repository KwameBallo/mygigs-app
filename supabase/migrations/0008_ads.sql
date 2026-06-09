-- =============================================================
-- MyGigs  —  advertenties (sponsored banners, bv. drankmerken)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Extra verdienmodel naast de artiest-abonnementen: merken
-- (drank, energy, etc.) plaatsen banners op de publieke agenda
-- en eventpagina's. Self-serve: adverteerder beheert eigen ads.
-- =============================================================

do $$ begin
  create type ad_placement as enum (
    'events_top', 'event_detail', 'discover', 'sidebar'
  );
exception when duplicate_object then null; end $$;

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete set null,
  brand_name text not null,
  title text,
  image_url text,
  target_url text,
  placement ad_placement not null default 'events_top',
  active boolean not null default true,
  starts_at date,
  ends_at date,
  weight integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ads_placement_idx on ads (placement);
create index if not exists ads_active_idx on ads (active);
create index if not exists ads_creator_idx on ads (created_by);

alter table ads enable row level security;

-- Actieve advertenties zijn publiek zichtbaar; de adverteerder ziet ook eigen
-- (ook niet-actieve) advertenties.
do $$ begin
  create policy "ads_public_read" on ads
    for select using (active or auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ads_owner_insert" on ads
    for insert with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ads_owner_update" on ads
    for update using (auth.uid() = created_by)
    with check (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ads_owner_delete" on ads
    for delete using (auth.uid() = created_by);
exception when duplicate_object then null; end $$;

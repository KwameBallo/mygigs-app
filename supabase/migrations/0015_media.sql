-- =============================================================
-- MyGigs — DJ-media: foto's & video's via Supabase Storage.
-- =============================================================

-- Publieke bucket (media is zichtbaar op het publieke DJ-profiel).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Storage-policies: iedereen mag lezen; ingelogde users beheren
-- uitsluitend hun eigen map (pad begint met hun user-id).
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_owner_insert" on storage.objects;
create policy "media_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Media-galerij per DJ.
create table if not exists artist_media (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references artists (id) on delete cascade,
  url        text not null,
  path       text,
  kind       text not null default 'photo', -- 'photo' | 'video'
  created_at timestamptz not null default now()
);
create index if not exists artist_media_artist_idx on artist_media (artist_id);

alter table artist_media enable row level security;
create policy "artist_media_public_read" on artist_media
  for select using (true);
create policy "artist_media_owner_write" on artist_media
  for all using (is_artist_owner(artist_id)) with check (is_artist_owner(artist_id));

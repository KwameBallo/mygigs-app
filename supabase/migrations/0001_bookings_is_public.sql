-- =============================================================
-- MyGigs  —  publieke optredens op het artiestprofiel
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Voegt een is_public vlag toe aan bookings. Artiesten kunnen
-- bevestigde gigs zichtbaar maken op hun publieke profiel, zodat
-- fans naar hun shows kunnen komen. Privéboekingen blijven privé.
-- =============================================================

alter table bookings
  add column if not exists is_public boolean not null default false;

-- Fans (incl. niet-ingelogd) mogen openbare optredens lezen.
drop policy if exists "Public shows are viewable by everyone" on bookings;
create policy "Public shows are viewable by everyone"
  on bookings
  for select
  using (is_public = true);

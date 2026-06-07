-- =============================================================
-- MyGigs  —  social-koppelingen + volgers voor AI-zoeken
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Voegt Instagram/Spotify-velden en volgersaantallen toe aan
-- artists, zodat de AI-zoekbalk kan filteren op bv. "artiest met
-- minimaal 20.000 volgers in omgeving Utrecht". Spotify- en
-- Instagram-OAuth volgen later; deze kolommen vormen de basis.
-- =============================================================

alter table artists
  add column if not exists instagram_url text,
  add column if not exists instagram_handle text,
  add column if not exists instagram_followers integer not null default 0,
  add column if not exists spotify_followers integer not null default 0;

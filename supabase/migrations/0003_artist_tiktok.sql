-- =============================================================
-- MyGigs  —  TikTok-koppeling
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Voegt TikTok-velden + volgersaantal toe aan artists, gelijk aan
-- de bestaande Instagram-/Spotify-kolommen.
-- =============================================================

alter table artists
  add column if not exists tiktok_url text,
  add column if not exists tiktok_handle text,
  add column if not exists tiktok_followers integer not null default 0;

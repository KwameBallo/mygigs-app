-- =============================================================
-- MyGigs — huurprijs per apparatuur-item dat de DJ meebrengt.
-- De DJ verhuurt z'n eigen apparatuur; bepaalt zelf het bedrag.
-- Opslag als JSON-map, bv. {"Speakers": 50, "Microfoon": 15}.
-- =============================================================

alter table artists
  add column if not exists equipment_prices jsonb not null default '{}'::jsonb;

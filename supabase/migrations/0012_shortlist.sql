-- =============================================================
-- MyGigs  —  aanvraag naar meerdere acts tegelijk (shortlist)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Showbird-learning #10: een boeker kan dezelfde aanvraag in één keer naar
-- meerdere artiesten sturen. We hergebruiken de bookings-tabel: per artiest
-- maken we een boeking met een gedeelde shortlist_id, zodat alle bestaande
-- accept/decline-, betaal- en factuurstromen blijven werken.
-- =============================================================

alter table bookings
  add column if not exists shortlist_id uuid;

create index if not exists bookings_shortlist_idx on bookings (shortlist_id);

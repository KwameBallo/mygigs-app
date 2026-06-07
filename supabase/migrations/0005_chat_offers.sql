-- =============================================================
-- MyGigs  —  offers in de chat
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Artiesten kunnen direct in het gesprek een bod doen (bedrag +
-- datum). De boeker accepteert of wijst af; bij acceptatie wordt
-- een boeking aangemaakt of bijgewerkt.
-- =============================================================

alter table messages
  add column if not exists offer_amount integer,
  add column if not exists offer_event_date date,
  add column if not exists offer_status text;

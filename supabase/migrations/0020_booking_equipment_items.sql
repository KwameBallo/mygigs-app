-- Apparatuur (draaitafel, speakers, microfoon, ...) die de boeker bij de DJ
-- bijboekt, opslaan als regelitems op de boeking, zodat ze als aparte regels op
-- de verkoopfactuur getoond kunnen worden. Vorm: [{ "item": "Draaitafel",
-- "price": 75 }, ...]. Default lege lijst zodat bestaande boekingen blijven werken.
alter table public.bookings
  add column if not exists equipment_items jsonb not null default '[]'::jsonb;

-- Immutabele factuur-regelitems (snapshot bij het aanmaken van de factuur).
-- Alleen de verkoopfactuur (dj_sale) vult dit; de commissie-factuur blijft één
-- regel. Nullable, zodat oude facturen (zonder itemisatie) geldig blijven en de
-- factuurpagina terugvalt op de enkele omschrijving.
alter table public.invoices
  add column if not exists line_items jsonb;

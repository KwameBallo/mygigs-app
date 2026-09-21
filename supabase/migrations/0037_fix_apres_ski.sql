-- =============================================================
-- MyGigs: kapotte letter in het genre "Feest / Après-ski" herstellen.
--
-- Het genre stond als "Feest / AprÃ¨s-ski" in de database. Dat gebeurt als
-- tekst met een è als UTF-8 wordt opgeslagen maar onderweg als Latin-1 is
-- gelezen. Het bronbestand supabase/_more_genres.sql is wel goed; alleen de
-- rij in de database was kapot. Andere genres en DJ-namen zijn gecontroleerd
-- en hebben dit probleem niet.
--
-- Alleen de naam verandert. Het id blijft 30, dus DJ's met dit genre houden
-- het gewoon.
-- =============================================================

update public.genres
set name = 'Feest / Après-ski'
where id = 30
  and name = 'Feest / AprÃ¨s-ski';

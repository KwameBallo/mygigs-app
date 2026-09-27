-- =============================================================
-- MyGigs: de agent voor klantcontact heet vanaf nu Fleur, niet Iris.
--
-- Alleen de naam die mensen zien verandert. De sleutel 'klantcontact' blijft,
-- dus er breekt geen code en alle runs en meldingen blijven aan haar hangen.
-- =============================================================

update public.agent_settings
set display_name = 'Fleur'
where agent = 'klantcontact';

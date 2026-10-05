-- =============================================================
-- Twee agents hernoemd.
--
-- De sleutel waarmee de code werkt (agent) blijft ongewijzigd; alleen de naam
-- die je in het beheerscherm en in de mails ziet verandert. Daarom kan dit met
-- twee regels en breekt er niets.
-- =============================================================

update public.agent_settings set display_name = 'Michael' where agent = 'kwaliteit';
update public.agent_settings set display_name = 'Eray'    where agent = 'geldloper';

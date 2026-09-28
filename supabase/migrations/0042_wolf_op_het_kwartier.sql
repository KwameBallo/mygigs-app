-- =============================================================
-- Wolf elk kwartier laten draaien.
--
-- De geplande taken van MyGigs draaien niet via de planner van Vercel maar via
-- pg_cron hier in de database, die de route aanroept met de sleutel uit de
-- vault. Wolf hoort in datzelfde rijtje thuis. Voordeel: geen last van de
-- beperkingen van het Hobby-abonnement, en alle taken staan op één plek.
--
-- cron.schedule met een naam vervangt een bestaande taak met diezelfde naam,
-- dus deze migratie kan zonder bezwaar nog eens draaien.
-- =============================================================

select cron.schedule(
  'waakhond',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://mygigs-app-t7ve.vercel.app/api/agents/waakhond',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);

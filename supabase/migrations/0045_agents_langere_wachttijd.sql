-- =============================================================
-- De planner langer laten wachten op een agent.
--
-- pg_net kapt een aanroep standaard na 5 seconden af. Wolf doet er langer over
-- dan dat: hij loopt zeven controles na en verstuurt ook nog een mail. Het werk
-- ging goed, maar de database zag alleen een timeout. Gevolg: een logboek vol
-- fouten die niets betekenen, en daarin valt een echte fout niet meer op.
--
-- Dertig seconden is ruim voor deze agents en ver onder de limiet van de
-- serverless-functie zelf.
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
    ),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'boekingsbewaker',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://mygigs-app-t7ve.vercel.app/api/agents/boekingsbewaker',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'opruimer',
  '20 3 * * *',
  $$
  select net.http_get(
    url := 'https://mygigs-app-t7ve.vercel.app/api/agents/opruimer',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

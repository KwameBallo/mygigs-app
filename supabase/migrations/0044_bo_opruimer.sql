-- =============================================================
-- Bo, de opruimer.
--
-- Gegevens niet langer bewaren dan nodig. Elke bewaartermijn staat in
-- agent_settings, niet in de code, zodat je hem kunt bijstellen zonder een
-- deploy.
--
-- Bo begint in de proefstand: hij telt wat hij zou opruimen en meldt dat, maar
-- verwijdert niets. Zet dry_run op false zodra je de eerste lijst hebt gezien:
--
--   update public.agent_settings
--   set config = config || '{"dry_run": false}'::jsonb
--   where agent = 'opruimer';
-- =============================================================

-- =============================================================
-- Halve aanmeldingen opzoeken
--
-- Accounts die nooit bevestigd zijn, nooit hebben ingelogd en waar niets aan
-- hangt. De controles staan hier in SQL zodat de agent nooit per ongeluk een
-- account kan raken waar wel iets aan vastzit.
-- =============================================================
create or replace function public.stale_unconfirmed_users(older_than_days integer)
returns table (id uuid, created_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select u.id, u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at < now() - make_interval(days => older_than_days)
    and coalesce(p.role::text, '') <> 'admin'
    and not exists (select 1 from public.bookings b where b.booker_id = u.id)
    and not exists (select 1 from public.artists a where a.user_id = u.id)
    and not exists (select 1 from public.reviews r where r.booker_id = u.id)
    and not exists (select 1 from public.clubs c where c.user_id = u.id)
    and not exists (select 1 from public.suppliers s where s.user_id = u.id)
    and not exists (select 1 from public.dj_applications d where d.user_id = u.id)
    and not exists (select 1 from public.messages m where m.sender_id = u.id)
  order by u.created_at
  limit 200;
$$;

revoke all on function public.stale_unconfirmed_users(integer) from public, anon, authenticated;
grant execute on function public.stale_unconfirmed_users(integer) to service_role;

-- =============================================================
-- Bo aanzetten, in de proefstand
-- =============================================================
update public.agent_settings
set enabled = true,
    schedule = 'dagelijks',
    config = jsonb_build_object(
      'dry_run', true,                  -- eerst laten zien, nog niet weggooien
      'rejected_lead_days', 90,         -- afgewezen DJ-aanmeldingen
      'audit_log_days', 365,            -- logregels
      'agent_run_days', 90,             -- runs van de agents zelf
      'resolved_alert_days', 180,       -- afgevinkte meldingen
      'spam_log_days', 365,             -- het spoor van de aanmeldspam
      'unconfirmed_account_days', 30    -- nooit bevestigde accounts
    ),
    max_actions = 500
where agent = 'opruimer';

-- =============================================================
-- Tijdschema: 's nachts, als er niemand op de app zit.
-- =============================================================
select cron.schedule(
  'opruimer',
  '20 3 * * *',
  $$
  select net.http_get(
    url := 'https://mygigs-app-t7ve.vercel.app/api/agents/opruimer',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);

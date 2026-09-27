-- =============================================================
-- MyGigs: de aanmeldspam van september 2026 opruimen.
--
-- Tussen 24 en 27 september zijn er 38 accounts aangemaakt door een bot die
-- het aanmeldformulier als verzendmachine gebruikte. Kenmerken: de naam is een
-- willekeurige letterreeks zonder spatie, er is nooit ingelogd, er is geen
-- boeking, geen DJ-profiel en geen review, en de e-mailadressen staan op 24
-- verschillende buitenlandse domeinen.
--
-- Deze migratie doet twee dingen:
--   1. het domein en het tijdstip bewaren in spam_signup_log, zonder het
--      e-mailadres zelf. Zo kun je een volgende golf herkennen en houden we
--      geen persoonsgegevens langer dan nodig (AVG).
--   2. de accounts verwijderen. Profielen en DJ-aanvragen gaan mee via de
--      bestaande cascade.
--
-- De selectie staat vast op deze periode en op alle vier de kenmerken samen,
-- zodat een echte aanmelding uit dezelfde dagen niet geraakt wordt. Er zit een
-- veiligheidsrem op: boven de 200 accounts stopt de migratie met een fout.
-- =============================================================

-- =============================================================
-- Het spoor dat we bewaren
-- =============================================================
create table if not exists public.spam_signup_log (
  id            uuid primary key default gen_random_uuid(),

  -- Alleen het domein, nooit het volledige e-mailadres. Genoeg om een patroon
  -- te zien, niet genoeg om iemand te herkennen.
  email_domain  text not null,

  signed_up_at  timestamptz not null,
  removed_at    timestamptz not null default now(),
  reason        text not null default '',

  constraint spam_signup_log_domain_len check (char_length(email_domain) between 3 and 253),
  constraint spam_signup_log_reason_len check (char_length(reason) <= 200)
);

create index if not exists spam_signup_log_domain_idx
  on public.spam_signup_log (email_domain);

create index if not exists spam_signup_log_removed_idx
  on public.spam_signup_log (removed_at desc);

-- RLS aan zonder regels: alleen servercode met de service role komt erbij,
-- net als bij audit_log, dj_leads en de agent-tabellen.
alter table public.spam_signup_log enable row level security;
revoke all on public.spam_signup_log from anon, authenticated;

-- =============================================================
-- Opruimen
-- =============================================================
do $$
declare
  ids    uuid[];
  aantal integer;
begin
  select array_agg(u.id) into ids
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.created_at >= '2026-09-24'::timestamptz
    and u.created_at <  '2026-09-28'::timestamptz
    -- nooit ingelogd
    and u.last_sign_in_at is null
    -- naam is een willekeurige letterreeks: geen spatie, alleen letters, lang
    and coalesce(p.full_name, u.raw_user_meta_data->>'full_name') ~ '^[A-Za-z]{12,}$'
    -- geen enkel spoor van echt gebruik
    and not exists (select 1 from public.bookings b where b.booker_id = u.id)
    and not exists (select 1 from public.artists a where a.user_id = u.id)
    and not exists (select 1 from public.reviews r where r.booker_id = u.id)
    and not exists (select 1 from public.clubs c where c.user_id = u.id)
    and not exists (select 1 from public.suppliers s where s.user_id = u.id)
    -- en zeker geen beheerder
    and coalesce(p.role::text, '') <> 'admin';

  aantal := coalesce(array_length(ids, 1), 0);

  if aantal = 0 then
    raise notice 'aanmeldspam: niets te verwijderen';
    return;
  end if;

  if aantal > 200 then
    raise exception
      'veiligheidsrem: % accounts geselecteerd. Dat is te veel voor een automatische opruiming, kijk er eerst zelf naar.',
      aantal;
  end if;

  insert into public.spam_signup_log (email_domain, signed_up_at, reason)
  select split_part(u.email, '@', 2), u.created_at, 'aanmeldspam september 2026'
  from auth.users u
  where u.id = any (ids);

  delete from auth.users where id = any (ids);

  raise notice 'aanmeldspam: % nepaccounts verwijderd', aantal;
end $$;

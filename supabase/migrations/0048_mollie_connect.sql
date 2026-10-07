-- =============================================================
-- Mollie Connect: de velden waarin de echte betalingen gaan landen.
--
-- Dit is alleen de ruimte, nog geen gedrag. Alle kolommen mogen leeg zijn, dus
-- de gesimuleerde betalingen die er nu staan blijven gewoon werken en er
-- verandert vandaag niets aan de app.
--
-- Het besluit en de afweging staan in docs/betaalprovider-keuze.md.
--
-- Twee dingen bewust niet gedaan:
--   - geen nieuwe statussen. payment_status kent al pending, held, released,
--     refunded en failed, en dat is precies de keten die Mollie doorloopt.
--   - geen RLS-wijzigingen. Deze tabellen staan al op alleen-server, en
--     betaalgegevens horen daar te blijven.
-- =============================================================

-- -------------------------------------------------------------
-- payments: welke betaling bij Mollie hoort bij welke boeking
-- -------------------------------------------------------------

alter table public.payments
  add column if not exists provider_payment_id text,
  add column if not exists provider_status     text,
  add column if not exists route_id            text,
  add column if not exists paid_at             timestamptz;

comment on column public.payments.provider_payment_id is
  'Het tr_... nummer van Mollie. Leeg bij de oude gesimuleerde betalingen.';
comment on column public.payments.provider_status is
  'De status zoals Mollie hem noemt (open, paid, expired, failed). Rauw bewaard, zodat we bij twijfel kunnen zien wat de provider zelf zei.';
comment on column public.payments.route_id is
  'De vertraagde routering waarmee het geld later naar de DJ gaat.';
comment on column public.payments.paid_at is
  'Wanneer Mollie bevestigde dat er betaald is. Niet wanneer wij het verwerkten.';

-- Een betaling bij Mollie hoort bij precies één rij hier. Dit is de rem op een
-- webhook die twee keer binnenkomt, en dat gebeurt: Mollie probeert het
-- opnieuw als wij traag antwoorden.
create unique index if not exists payments_provider_payment_id_uidx
  on public.payments (provider_payment_id)
  where provider_payment_id is not null;

-- -------------------------------------------------------------
-- payouts: de overboeking naar de DJ
-- -------------------------------------------------------------

alter table public.payouts
  add column if not exists provider_transfer_id text,
  add column if not exists routed_at            timestamptz,
  add column if not exists fail_reason          text;

comment on column public.payouts.provider_transfer_id is
  'Het nummer van de routering bij Mollie.';
comment on column public.payouts.routed_at is
  'Wanneer het geld richting de DJ is gezet. Leeg betekent: staat nog bij Mollie.';
comment on column public.payouts.fail_reason is
  'Waarom een uitbetaling misging, in de woorden van de provider. Voor Eray.';

create unique index if not exists payouts_provider_transfer_id_uidx
  on public.payouts (provider_transfer_id)
  where provider_transfer_id is not null;

-- -------------------------------------------------------------
-- artists: de koppeling van de DJ met zijn eigen Mollie-organisatie
--
-- Dit is het stuk dat maakt dat MyGigs geen bank hoeft te zijn. Het geld gaat
-- van Mollie naar de rekening van de DJ, niet via ons. Zijn identiteitscontrole
-- ligt daarmee ook bij Mollie, en dat is precies waar die hoort.
-- -------------------------------------------------------------

alter table public.artists
  add column if not exists mollie_organization_id text,
  add column if not exists onboarding_status      text,
  add column if not exists can_receive_payments   boolean not null default false,
  add column if not exists onboarding_checked_at  timestamptz;

comment on column public.artists.mollie_organization_id is
  'De org_... van de DJ bij Mollie.';
comment on column public.artists.onboarding_status is
  'needs-data, in-review of completed, zoals Mollie het noemt.';
comment on column public.artists.can_receive_payments is
  'Pas als dit waar is mag de DJ een boeking aannemen. Anders komt er geld binnen dat nergens heen kan.';
comment on column public.artists.onboarding_checked_at is
  'Wanneer we die status voor het laatst bij Mollie hebben opgehaald.';

do $$
begin
  alter table public.artists
    add constraint artists_onboarding_status_check
    check (
      onboarding_status is null
      or onboarding_status in ('needs-data', 'in-review', 'completed')
    );
exception when duplicate_object then
  raise notice 'controle op onboarding_status bestond al';
end $$;

create unique index if not exists artists_mollie_organization_uidx
  on public.artists (mollie_organization_id)
  where mollie_organization_id is not null;

-- De wachtrij voor de agent die de onboardingstatus bijhoudt: DJ's die wel
-- gekoppeld zijn maar nog niet betaald kunnen krijgen.
create index if not exists artists_onboarding_open_idx
  on public.artists (onboarding_checked_at)
  where mollie_organization_id is not null and can_receive_payments = false;

-- -------------------------------------------------------------
-- De tokens, in een eigen tabel
--
-- Het vernieuwingstoken is het gevoeligste wat er in deze database komt te
-- staan: daarmee kun je namens een DJ bij Mollie. Het staat daarom niet op
-- artists.
--
-- De reden is concreet, geen principe: app/(artist)/profile/page.tsx doet
-- select("*") op artists met de sleutel van de ingelogde DJ. Een kolom daar
-- afschermen laat die pagina stuklopen op een rechtenfout. Een eigen tabel die
-- de client helemaal niet kent heeft dat probleem niet, en is ook eerlijker:
-- deze gegevens horen niet tussen de profielvelden.
--
-- RLS aan zonder regels, net als dj_leads: alleen de service role komt erbij.
-- -------------------------------------------------------------

create table if not exists public.mollie_connections (
  artist_id       uuid primary key references public.artists (id) on delete cascade,
  refresh_token   text not null,
  scopes          text,
  connected_at    timestamptz not null default now(),
  last_refresh_at timestamptz
);

comment on table public.mollie_connections is
  'Vernieuwingstokens voor Mollie Connect, per DJ. Alleen server-side. Nooit naar de browser, nooit in een log.';

alter table public.mollie_connections enable row level security;
revoke all on public.mollie_connections from anon, authenticated;

-- =============================================================
-- MyGigs — afmelden vastleggen.
--
-- Huisregel 2 verwijst naar een afmeldknop. Die knop schrijft hier naartoe:
-- wie annuleerde, waarom, wanneer, en hoeveel uur van tevoren. Dat laatste
-- veld bewaren we uitgerekend, zodat je achteraf zonder rekenwerk ziet of het
-- op tijd was. Zonder die vastlegging kun je je nooit op de regel beroepen.
-- =============================================================

alter table bookings
  add column if not exists cancelled_by        text,
  add column if not exists cancel_reason_code  text,
  add column if not exists cancel_reason       text,
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancel_notice_hours numeric;

comment on column bookings.cancelled_by is
  'Wie annuleerde: artist, booker of admin.';
comment on column bookings.cancel_reason_code is
  'Gekozen reden uit de lijst (ziekte, ongeval, dubbel, vervoer, prive, anders).';
comment on column bookings.cancel_reason is
  'Vrije toelichting van degene die annuleerde.';
comment on column bookings.cancelled_at is
  'Moment van annuleren.';
comment on column bookings.cancel_notice_hours is
  'Uren tussen het annuleren en de starttijd van het optreden. Onder de 24 is een late afmelding.';

-- Alleen deze drie waarden, zodat er nooit een vierde soort in de kolom sluipt.
alter table bookings drop constraint if exists bookings_cancelled_by_check;
alter table bookings add constraint bookings_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('artist', 'booker', 'admin'));

create index if not exists bookings_cancelled_at_idx on bookings (cancelled_at);

-- Let op: deze kolommen worden alleen server-side geschreven (service-role via
-- de server action). De DJ krijgt er dus bewust GEEN update-recht op: anders kan
-- iemand met de client-sleutel zijn eigen afmeldtijd terugzetten.

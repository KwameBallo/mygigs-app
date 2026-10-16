-- Test-DJ bot. Een DJ met auto_accept = true accepteert een nieuwe boeking
-- meteen en stuurt een chatbericht aan de boeker (zie createBooking). Alleen
-- bedoeld voor testaccounts, echte DJ's staan op false.
alter table public.artists
  add column if not exists auto_accept boolean not null default false;

comment on column public.artists.auto_accept is
  'Test-DJ bot: accepteert boekingen automatisch en stuurt een chatbericht. Alleen voor testaccounts.';

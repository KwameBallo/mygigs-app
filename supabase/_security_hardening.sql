-- MyGigs — Security hardening (ISO/IEC 27002:2022 A.8.3 access control,
-- A.8.28 secure coding). Plak dit in de Supabase SQL Editor van het mygigs-
-- project en klik Run. Idempotent: veilig meerdere keren te draaien.
--
-- Dicht de kritieke bevindingen uit de beveiligingsaudit:
--  1. Rechten-escalatie naar role='admin' (via UPDATE en via de signup-trigger)
--  2. Betaal-integriteit: deelnemers konden gage/total/service_fee overschrijven
--  3. Zwakke review-integriteit
--
-- NB: het publieke PII-leesrecht op profiles/bookings wordt hier NIET aangepast
-- (dat vergt bijbehorende code-wijzigingen) — zie het control-mapping-document.

begin;

-- 0. Zorg dat de gender-kolom bestaat (nodig voor de grant hieronder). Veilig
--    om te draaien, ook als je 'm al eerder had toegevoegd.
alter table public.profiles add column if not exists gender text;

-- 1a. Kolom-niveau: authenticated mag alleen eigen, niet-gevoelige profielvelden
--     bijwerken. role, subscription_* , stripe_* , flagged, flag_count kunnen
--     hierna NIET meer door de gebruiker gezet worden (alleen via service-role).
revoke update on public.profiles from authenticated;
grant update (
  full_name, gender, phone, city, company,
  company_name, vat_number, invoice_email, invoice_address, avatar_url
) on public.profiles to authenticated;

-- 1b. Signup-trigger: rol uit de client-metadata beperken tot toegestane rollen.
--     Voorheen werd 'admin' klakkeloos overgenomen.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
  safe_role user_role :=
    case when requested in ('booker', 'artist', 'both')
         then requested::user_role
         else 'booker' end;
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', safe_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Boekingen: authenticated mag alleen status en zichtbaarheid wijzigen.
--    Prijs- en factuurkolommen (gage, service_fee, total, ...) worden hierna
--    alleen bij het aanmaken (insert) gezet en zijn niet meer client-wijzigbaar.
revoke update on public.bookings from authenticated;
grant update (status, is_public) on public.bookings to authenticated;

-- 3. Reviews: alleen een boeker met een afgeronde/betaalde boeking bij die DJ
--    mag een review plaatsen.
drop policy if exists "reviews_insert_booker" on public.reviews;
create policy "reviews_insert_booker" on public.reviews
  for insert with check (
    auth.uid() = booker_id
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.booker_id = auth.uid()
        and b.status in ('completed', 'paid')
    )
  );

-- 4. Profielen: publiek leesrecht op ÁLLE kolommen (incl. e-mail/telefoon/BTW)
--    vervangen. Voortaan lees je alleen je eigen profiel, plus — als DJ — het
--    profiel van een klant met wie je een boeking of gesprek deelt (nodig om
--    de klantnaam te tonen). Anonieme bezoekers krijgen niets meer.
--    NB: een DJ kan hiermee nog wel de volledige rij van zo'n klant opvragen;
--    kolom-niveau ("alleen naam") is een latere verscherping via een view.
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_read_own_or_participant" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.booker_id = profiles.id and is_artist_owner(b.artist_id)
    )
    or exists (
      select 1 from public.conversations c
      where c.booker_id = profiles.id and is_artist_owner(c.artist_id)
    )
  );

commit;

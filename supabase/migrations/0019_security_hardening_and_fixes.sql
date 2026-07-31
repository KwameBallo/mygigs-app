-- 0019_security_hardening_and_fixes.sql
-- Trekt de losse hardening/audit/dj-applications-scripts in de migratieketen en
-- dicht de audit-bevindingen. Idempotent: veilig meerdere keren te draaien.
-- ISO/IEC 27002:2022 A.8.3 (access control), A.8.15/16 (logging/monitoring),
-- A.8.28 (secure coding). AVG art. 17 (recht op verwijdering), art. 32 (integriteit).

begin;

-- ============================================================================
-- 1. PROFIELEN — rechten-escalatie & PII-lek (was _security_hardening.sql)
-- ============================================================================
alter table public.profiles add column if not exists gender text;

revoke update on public.profiles from authenticated;
grant update (
  full_name, gender, phone, city, company,
  company_name, vat_number, invoice_email, invoice_address, avatar_url,
  email_opt_out
) on public.profiles to authenticated;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
  safe_role user_role :=
    case when requested in ('booker','artist','both') then requested::user_role
         else 'booker' end;
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', safe_role)
  on conflict (id) do nothing;
  return new;
end; $$;

drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_read_own_or_participant" on public.profiles;
-- FIX #7: een DJ mag het profiel van een klant alleen zien bij een ECHTE booking
-- (geen zelf-aangemaakt gesprek meer als sleutel — dat was IDOR).
create policy "profiles_read_own_or_participant" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.booker_id = profiles.id and is_artist_owner(b.artist_id)
    )
  );

-- ============================================================================
-- 2. BOEKINGEN — status niet meer client-schrijfbaar (FIX #2, escrow-bypass)
--    Alleen is_public mag de client zetten; alle statuswissels lopen server-side
--    via de service-role (payBooking / updateBookingStatus / cancelBooking).
-- ============================================================================
revoke update on public.bookings from authenticated;
grant update (is_public) on public.bookings to authenticated;

-- Reviews: alleen na een afgeronde/betaalde boeking bij die DJ.
drop policy if exists "reviews_insert_booker" on public.reviews;
create policy "reviews_insert_booker" on public.reviews for insert with check (
  auth.uid() = booker_id
  and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id and b.booker_id = auth.uid()
      and b.status in ('completed','paid')
  )
);

-- ============================================================================
-- 3. GESPREKKEN — insert vastzetten aan een echte booking (FIX #7 sluitstuk)
-- ============================================================================
drop policy if exists "conversations_insert_participants" on public.conversations;
create policy "conversations_insert_participants" on public.conversations
  for insert with check (
    auth.uid() = booker_id
    or (
      is_artist_owner(artist_id)
      and exists (
        select 1 from public.bookings b
        where b.artist_id = conversations.artist_id
          and b.booker_id = conversations.booker_id
      )
    )
  );

-- ============================================================================
-- 4. UITBETALINGEN — geen dubbele payout per boeking (FIX #3)
-- ============================================================================
create unique index if not exists payouts_booking_uidx
  on public.payouts (booking_id) where booking_id is not null;

-- ============================================================================
-- 5. FACTUREN — FK's naar 'set null' zodat AVG-verwijdering kan slagen (FIX #9)
--    De factuur behoudt zijn nummer + bedragen (fiscale bewaarplicht); de
--    persoonsgegevens erin worden bij verwijdering geanonimiseerd (in code).
-- ============================================================================
alter table public.invoices alter column booking_id drop not null;
alter table public.invoices alter column artist_id  drop not null;
alter table public.invoices alter column booker_id  drop not null;
alter table public.invoices drop constraint if exists invoices_booking_id_fkey;
alter table public.invoices add  constraint invoices_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete set null;
alter table public.invoices drop constraint if exists invoices_artist_id_fkey;
alter table public.invoices add  constraint invoices_artist_id_fkey
  foreign key (artist_id) references public.artists(id) on delete set null;
alter table public.invoices drop constraint if exists invoices_booker_id_fkey;
alter table public.invoices add  constraint invoices_booker_id_fkey
  foreign key (booker_id) references public.profiles(id) on delete set null;

-- ============================================================================
-- 6. AUDIT-LOG (was _audit_log.sql) + append-only afdwingen (FIX #17)
-- ============================================================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid, action text not null, target_type text, target_id text,
  metadata jsonb, created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_action_idx on public.audit_log (action);
alter table public.audit_log enable row level security;  -- geen policies = alleen service-role

create or replace function public.audit_log_no_mutate()
returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end; $$;
drop trigger if exists audit_log_immutable on public.audit_log;
create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function public.audit_log_no_mutate();

-- ============================================================================
-- 7. DJ-AANVRAGEN (was _dj_applications.sql)
-- ============================================================================
create table if not exists public.dj_applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', motivation text,
  reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists dj_applications_user_uidx on public.dj_applications (user_id);
alter table public.dj_applications enable row level security;
drop policy if exists "dj_app_own_read" on public.dj_applications;
drop policy if exists "dj_app_own_insert" on public.dj_applications;
create policy "dj_app_own_read" on public.dj_applications for select using (user_id = auth.uid());
create policy "dj_app_own_insert" on public.dj_applications for insert with check (user_id = auth.uid());

-- ============================================================================
-- 8. STORAGE — media-bucket: type- en groottelimiet (FIX uploads)
-- ============================================================================
update storage.buckets
  set file_size_limit = 26214400,   -- 25 MB
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif',
                                 'video/mp4','video/quicktime','video/webm']
  where id = 'media';

commit;

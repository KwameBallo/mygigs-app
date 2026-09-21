-- =============================================================
-- MyGigs: kant-en-klaar DJ-profiel vanuit de aanmeldbot.
--
-- Een goedgekeurde aanmelding wordt een compleet profiel dat de DJ met één klik
-- opeist. Tot dat moment bestaat er geen account en geen rij in artists: alles
-- staat in dj_leads. Zo kan een profiel dat nog niet is opgeeist nooit per
-- ongeluk op de site verschijnen.
--
-- Nieuw hier:
-- 1. Een foto bij de aanmelding, in een afgeschermde opslagplaats.
-- 2. Het moment waarop de DJ toestemming gaf voor die foto.
-- 3. Wanneer de opeismail is verstuurd.
--
-- Zie docs/dj-aanmeldbot.md.
-- =============================================================

alter table public.dj_leads
  -- Paden in de opslag "lead-photos", per breedte: {"160": "...", "512": "...", "1200": "..."}.
  add column if not exists photo_paths      jsonb,
  -- Piepkleine vervaagde voorvertoning als data-URI, net als bij artists.avatar_blur.
  add column if not exists photo_blur       text,
  -- Toestemming van de DJ voor het gebruik van de foto, gegeven bij het opeisen.
  -- Zonder toestemming gaat het profiel online zonder foto.
  add column if not exists photo_consent_at timestamptz,
  add column if not exists claim_sent_at    timestamptz;

do $$
begin
  alter table public.dj_leads
    add constraint dj_leads_photo_blur_len check (photo_blur is null or char_length(photo_blur) < 4000);
exception when duplicate_object then null;
end $$;

comment on column public.dj_leads.photo_paths is
  'Foto bij de aanmelding, per breedte, in de afgeschermde opslag lead-photos.';
comment on column public.dj_leads.photo_consent_at is
  'Moment waarop de DJ bij het opeisen toestemming gaf om de foto te gebruiken.';

-- Opeislinks worden opgezocht op hun hash.
create index if not exists dj_leads_claim_hash_idx
  on public.dj_leads (claim_token_hash)
  where claim_token_hash is not null;

-- =============================================================
-- Opslag voor foto's van aanmeldingen
--
-- Afgeschermd (public = false) en zonder regels voor anon of authenticated:
-- alleen de server kan erbij. De beheerder uploadt via een eenmalige, tijdelijk
-- geldige uploadlink die de server uitgeeft, en bekijkt via een tijdelijke
-- leeslink. Pas als de DJ toestemming geeft, gaat een kopie naar de openbare
-- opslag "media" waar ook de gewone profielfoto's staan.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-photos', 'lead-photos', false, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

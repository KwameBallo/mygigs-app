-- =============================================================
-- MyGigs — profielfoto's: varianten per breedte + blur-placeholder.
--
-- Waarom: tot nu toe werd het bestand van de telefoon één op één getoond.
-- Een foto van 4 MB werd zo ook in een kaartje van 400 pixels geladen, en de
-- uitsnede was toeval. Vanaf nu snijdt de DJ zelf bij en slaan we drie vaste
-- maten op, zodat elke plek in de app precies de juiste variant laadt.
-- =============================================================

alter table artists
  add column if not exists avatar_variants  jsonb,
  add column if not exists avatar_blur      text,
  add column if not exists avatar_updated_at timestamptz;

comment on column artists.avatar_variants is
  'Publieke URL per breedte, bijvoorbeeld {"160":"…","512":"…","1200":"…"}.';
comment on column artists.avatar_blur is
  'Piepkleine base64-JPEG (circa 20 px) als vervaagde placeholder tijdens het laden.';
comment on column artists.avatar_updated_at is
  'Laatste keer dat de profielfoto is vervangen.';

-- Kolomrechten in lijn met 0029/0031: de DJ mag deze kolommen zelf bijwerken,
-- RLS bepaalt nog steeds dat het alleen zijn eigen rij kan zijn.
do $$
begin
  execute 'grant update (avatar_variants, avatar_blur, avatar_updated_at) on artists to authenticated';
exception when others then
  null; -- tabelbrede grant staat al aan; niets te doen.
end $$;

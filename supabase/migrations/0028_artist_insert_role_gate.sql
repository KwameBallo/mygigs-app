-- SEC #1: alleen een goedgekeurde DJ (rol 'artist'/'both') mag een artiestrij
-- aanmaken. De vorige policy stond ELKE ingelogde gebruiker toe een artiest-
-- profiel voor zichzelf te maken (user_id = auth.uid()), waardoor een
-- organisator de admin-goedkeuring kon omzeilen en direct boekbaar werd in
-- Ontdek. De rol wordt pas op 'artist'/'both' gezet ná goedkeuring van de
-- DJ-aanvraag, dus die rol-eis is de juiste poort.
drop policy if exists artists_insert_own on public.artists;

create policy artists_insert_own on public.artists
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('artist', 'both')
    )
  );

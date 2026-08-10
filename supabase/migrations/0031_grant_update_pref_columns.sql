-- De 'Aanbevolen'-voorkeurskolommen (0030) zijn toegevoegd ná de kolom-niveau
-- UPDATE-grant van 0019. Daardoor mocht `authenticated` ze niet schrijven: het
-- voorkeuren-formulier sloeg niets op (prefs_set bleef false) en /discover
-- stuurde de organisator meteen terug naar /voorkeuren — een schijnbare refresh.
-- Fix: geef `authenticated` expliciet UPDATE op déze kolommen (RLS beperkt het
-- verder tot het eigen profiel via profiles_update_own).
grant update (
  pref_province, pref_budget, pref_genre_id, pref_date, prefs_set
) on public.profiles to authenticated;

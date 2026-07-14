-- =============================================================
-- MyGigs — rollen gelijktrekken met de werkelijkheid.
-- Accounts gemarkeerd als 'artist' zonder gekoppeld DJ-profiel worden weer
-- 'booker' (organisator) — zij willen puur boeken, geen DJ-profiel maken.
-- Veilig herhaalbaar.
-- =============================================================

update profiles p
set role = 'booker'
where p.role = 'artist'
  and not exists (select 1 from artists a where a.user_id = p.id);

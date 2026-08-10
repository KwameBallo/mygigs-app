-- Organisator-voorkeuren voor de 'Aanbevolen'-lijst op Ontdek: regio, budget,
-- muziekstijl en datum. prefs_set geeft aan of het (overslaanbare) onboarding-
-- formulier is ingevuld of overgeslagen, zodat het niet blijft terugkomen.
-- Alleen de eigenaar leest/schrijft z'n eigen profiel (bestaande RLS).
alter table public.profiles
  add column if not exists pref_province text,
  add column if not exists pref_budget integer,
  add column if not exists pref_genre_id integer,
  add column if not exists pref_date date,
  add column if not exists prefs_set boolean not null default false;

-- MyGigs — apparatuur als keuzelijst (microfoon, draaitafel, speakers,
-- verlichting, bass). has_sound/has_light blijven bestaan en worden in de
-- app afgeleid van deze lijst (voor de consument-filters).
alter table artists
  add column if not exists equipment_items text[] not null default '{}';

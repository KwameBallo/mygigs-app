-- =============================================================
-- MyGigs mock seed  —  project qvenjlozeggrxfyycpsn ONLY
-- NEVER run this against dstcrrylnjxjuqvmslaw (Fresh Ones).
--
-- Vult de app met demo-data, gekoppeld aan het account
-- ballokwame@gmail.com, zodat dat account bij inloggen alles
-- gevuld ziet (boeker- EN artiest-kant).
--
-- Vereist: log minstens 1x in met ballokwame@gmail.com zodat
-- het account in auth.users bestaat. Veilig om opnieuw te draaien.
-- Raakt auth.users en genres NIET aan.
-- =============================================================

begin;

truncate table messages, conversations, payments, payouts,
  reviews, favorites, artist_availability, bookings, suppliers,
  event_artists, events, clubs, ads
  restart identity cascade;

-- ---------- Reviews + agenda voor ALLE artiesten ----------
do $$
declare
  a record;
  d int;
  any_booker uuid;
  names text[] := array['Sanne','Daan','Lotte','Bram','Fleur','Tim','Noor','Joris'];
  comments text[] := array[
    'Top avond, de dansvloer ging helemaal los!',
    'Super professioneel en netjes op tijd. Aanrader.',
    'Echt een vibe, iedereen was enthousiast.',
    'Goede communicatie vooraf en een strakke set.',
    'Perfecte muziekkeuze voor ons feest.'];
begin
  select id into any_booker from profiles order by created_at limit 1;

  for a in select id, base_gage from artists loop
    for d in 1..3 loop
      insert into reviews(artist_id, rating, comment, reviewer_name, created_at)
      values (
        a.id,
        4 + (random())::int,
        comments[1 + floor(random() * array_length(comments, 1))::int],
        names[1 + floor(random() * array_length(names, 1))::int],
        now() - (d || ' weeks')::interval
      );
    end loop;

    for d in 0..5 loop
      insert into artist_availability(artist_id, date, status)
      values (
        a.id,
        (current_date + ((d * 5) + 3))::date,
        (case when d % 3 = 0 then 'booked' else 'available' end)::availability_status
      );
    end loop;

    -- Twee openbare aankomende optredens per artiest (zichtbaar voor fans)
    for d in 1..2 loop
      insert into bookings(
        artist_id, booker_id, event_date, gage, service_fee, total,
        status, city, venue_name, start_time, is_public, created_at)
      values (
        a.id, any_booker,
        (current_date + (d * 12) + 4)::date,
        coalesce(a.base_gage, 500),
        0,
        coalesce(a.base_gage, 500),
        'accepted',
        (array['Amsterdam','Rotterdam','Utrecht','Den Haag','Eindhoven'])[1 + (d % 5)],
        (array['Paradiso','Club NL','TivoliVredenburg','Loods 6','Warehouse 22'])[1 + (d % 5)],
        (array['21:00','22:30']::time[])[d],
        true,
        now()
      );
    end loop;
  end loop;
end $$;

-- ---------- Social-volgers voor ALLE artiesten (mock) ----------
update artists set
  instagram_handle = lower(regexp_replace(stage_name, '[^a-zA-Z0-9]', '', 'g')),
  instagram_url = 'https://instagram.com/'
    || lower(regexp_replace(stage_name, '[^a-zA-Z0-9]', '', 'g')),
  tiktok_handle = lower(regexp_replace(stage_name, '[^a-zA-Z0-9]', '', 'g')),
  tiktok_url = 'https://tiktok.com/@'
    || lower(regexp_replace(stage_name, '[^a-zA-Z0-9]', '', 'g')),
  instagram_followers = (2000 + floor(random() * 15000))::int,
  tiktok_followers = (1500 + floor(random() * 25000))::int,
  spotify_followers = (1000 + floor(random() * 40000))::int;

-- Top 3 artiesten (op rating) worden "befaamd" met ruim 20.000 volgers
update artists a set
  instagram_followers = v.f,
  tiktok_followers = v.t,
  spotify_followers = v.s
from (
  select id,
    (22000 + floor(random() * 28000))::int as f,
    (40000 + floor(random() * 160000))::int as t,
    (60000 + floor(random() * 140000))::int as s,
    row_number() over (order by (stage_name = 'Kwamé K') desc, rating desc) as rn
  from artists
) v
where a.id = v.id and v.rn <= 3;

-- ---------- Alle data gekoppeld aan ballokwame@gmail.com ----------
do $$
declare
  uid uuid;
  my_art uuid;
  cp uuid;            -- tegenpartij-boeker voor de artiest-kant
  a record;
  idx int;
  b_id uuid;
  c_id uuid;
  g numeric; fee numeric; tot numeric;
  st booking_status;
  evd date;
  statuses booking_status[] :=
    array['pending','accepted','completed','paid','declined']::booking_status[];
  cities text[] := array['Amsterdam','Rotterdam','Utrecht','Den Haag','Eindhoven'];
  venues text[] := array['Club NL','Loods 6','De Marktkantine','Paradiso','Warehouse 22'];
begin
  select id into uid from auth.users where lower(email) = 'ballokwame@gmail.com';
  if uid is null then
    raise exception 'Account ballokwame@gmail.com niet gevonden in auth.users. Log eerst 1x in/registreer met dat e-mailadres en draai daarna deze seed opnieuw.';
  end if;

  -- Profiel borgen (rol both = boeker + artiest)
  insert into profiles (id, email, full_name, role)
  values (uid, 'ballokwame@gmail.com', 'Kwame', 'both')
  on conflict (id) do update set role = 'both', full_name = coalesce(profiles.full_name, 'Kwame');

  -- Actief artiestenabonnement zodat de artiest-kant volledig werkt.
  update profiles set
    subscription_status = 'active',
    subscription_plan = 'yearly',
    subscription_trial_end = now() - interval '1 day',
    subscription_current_period_end = now() + interval '11 months'
  where id = uid;

  -- Artiest koppelen aan dit account (voorkeur: Kwamé K), alleen als nog geen artiest
  if not exists (select 1 from artists where user_id = uid) then
    update artists set user_id = uid
    where id = (
      select id from artists
      where user_id is null
      order by (stage_name = 'Kwamé K') desc, id
      limit 1
    );
  end if;
  select id into my_art from artists where user_id = uid order by created_at limit 1;

  -- Tegenpartij-boeker: een ander profiel dan Kwame, anders Kwame zelf
  select id into cp from profiles where id <> uid order by created_at limit 1;
  if cp is null then cp := uid; end if;

  -- ===== BOEKER-KANT (Kwame boekt andere artiesten) =====
  insert into favorites(booker_id, artist_id, created_at)
  select uid, a2.id, now() - (row_number() over () || ' days')::interval
  from artists a2
  where a2.user_id is distinct from uid
  order by a2.id
  limit 4;

  idx := 0;
  for a in
    select id, base_gage, user_id from artists
    where user_id is distinct from uid
    order by id limit 5
  loop
    idx := idx + 1;
    st := statuses[idx];
    g := coalesce(a.base_gage, 500);
    fee := 0;
    tot := g;
    if st in ('completed','paid','declined') then
      evd := current_date - (idx * 7);
    else
      evd := current_date + (idx * 9);
    end if;

    insert into bookings(
      artist_id, booker_id, event_date, gage, service_fee, total,
      status, city, venue_name, message, created_at)
    values (
      a.id, uid, evd, g, fee, tot, st,
      cities[idx], venues[idx],
      'We willen je graag boeken voor ons event. Laat weten of je kan!',
      now() - (idx || ' days')::interval)
    returning id into b_id;

    if st in ('paid','completed') then
      insert into payments(booking_id, amount, currency, status, provider, provider_ref, created_at)
      values (
        b_id, tot, 'eur',
        (case when st = 'paid' then 'released' else 'held' end)::payment_status,
        'stripe', 'pi_mock_' || substr(b_id::text, 1, 8), now());
    end if;

    -- Gesprek + berichten voor de eerste 3 boekingen
    if idx <= 3 then
      insert into conversations(artist_id, booker_id, booking_id, created_at)
      values (a.id, uid, b_id, now() - (idx || ' days')::interval)
      returning id into c_id;

      insert into messages(conversation_id, sender_id, body, read_at, created_at)
      values (
        c_id, uid,
        'Hoi! Ben je beschikbaar op ' || to_char(evd, 'DD-MM') || '?',
        now(), now() - interval '2 hours');

      if a.user_id is not null and a.user_id <> uid then
        -- Antwoord van de artiest: ongelezen -> badge in de sidebar
        insert into messages(conversation_id, sender_id, body, read_at, created_at)
        values (c_id, a.user_id,
          'Zeker! Die datum is nog vrij. Wat is de locatie precies?',
          null, now() - interval '1 hour');
      else
        insert into messages(conversation_id, sender_id, body, read_at, created_at)
        values (c_id, uid, 'Top, ik hoor graag van je!', now(), now() - interval '50 minutes');
      end if;
    end if;
  end loop;

  -- ===== ARTIEST-KANT (Kwame's eigen artiest) =====
  if my_art is not null then
    g := coalesce((select base_gage from artists where id = my_art), 500);
    fee := 0;
    tot := g;

    -- Open aanvraag + ongelezen bericht aan Kwame (de artiest)
    insert into bookings(
      artist_id, booker_id, event_date, gage, service_fee, total,
      status, city, venue_name, message, created_at)
    values (
      my_art, cp, current_date + 21, g, fee, tot, 'pending',
      'Amsterdam', 'Privéfeest',
      'Hey! We vieren een verjaardag en willen je graag boeken.',
      now() - interval '3 hours')
    returning id into b_id;

    insert into conversations(artist_id, booker_id, booking_id, created_at)
    values (my_art, cp, b_id, now() - interval '3 hours')
    returning id into c_id;

    insert into messages(conversation_id, sender_id, body, read_at, created_at)
    values (c_id, cp,
      'Hoi! Heb je over 3 weken tijd voor een set van 2 uur?',
      (case when cp = uid then now() else null end), now() - interval '3 hours');

    -- Geaccepteerde komende boeking
    insert into bookings(
      artist_id, booker_id, event_date, gage, service_fee, total,
      status, city, venue_name, created_at)
    values (my_art, cp, current_date + 30, g, fee, tot, 'accepted',
      'Utrecht', 'TivoliVredenburg', now() - interval '2 days');

    -- Afgeronde betaalde boeking -> uitbetaling
    insert into bookings(
      artist_id, booker_id, event_date, gage, service_fee, total,
      status, city, venue_name, created_at)
    values (my_art, cp, current_date - 14, g, fee, tot, 'paid',
      'Rotterdam', 'Club NL', now() - interval '20 days')
    returning id into b_id;

    insert into payments(booking_id, amount, currency, status, provider, provider_ref, created_at)
    values (b_id, tot, 'eur', 'released', 'stripe',
      'pi_mock_' || substr(b_id::text, 1, 8), now() - interval '14 days');

    insert into payouts(artist_id, booking_id, amount, status, created_at)
    values (my_art, b_id, g, 'paid', now() - interval '10 days');

    insert into payouts(artist_id, booking_id, amount, status, created_at)
    values (my_art, null, round(g * 0.5), 'scheduled', now() - interval '1 day');
  end if;
end $$;

-- ---------- Leveranciers van apparatuur (mock directory) ----------
insert into suppliers
  (name, category, city, lat, lng, description, day_rate, contact_email, contact_phone, website_url, rating, reviews_count)
values
  ('Amsterdam Sound Rental', 'sound', 'Amsterdam', 52.3676, 4.9041,
   'Complete PA-systemen voor clubs en festivals. Levering en opbouw mogelijk.',
   450, 'info@amsterdamsound.nl', '+31 20 123 4567', 'https://amsterdamsound.nl', 4.8, 24),
  ('LightLab Rotterdam', 'light', 'Rotterdam', 51.9244, 4.4777,
   'Moving heads, LED-pars en complete lichtshows met operator.',
   600, 'boekingen@lightlab.nl', '+31 10 765 4321', 'https://lightlab.nl', 4.6, 17),
  ('Podium & Truss Utrecht', 'stage', 'Utrecht', 52.0907, 5.1214,
   'Modulaire podia, trussconstructies en overkappingen voor elk formaat.',
   800, 'verhuur@podiumtruss.nl', '+31 30 222 1188', 'https://podiumtruss.nl', 4.7, 12),
  ('DJ Gear Direct', 'dj_gear', 'Amsterdam', 52.3600, 4.8852,
   'Pioneer CDJ-3000, DJM-mengpanelen en booth-monitoren. Zelfde dag op te halen.',
   175, 'hello@djgeardirect.nl', '+31 20 998 7766', 'https://djgeardirect.nl', 4.9, 31),
  ('Backline Brothers', 'backline', 'Eindhoven', 51.4416, 5.4697,
   'Versterkers, drumstellen en toetsen voor live bands. Vakkundig advies.',
   300, 'info@backlinebros.nl', '+31 40 556 3322', null, 4.5, 9),
  ('Den Haag Stage & Sound', 'sound', 'Den Haag', 52.0705, 4.3007,
   'Geluid en monitoring voor theaters en zalen tot 800 personen.',
   520, 'contact@dhstagesound.nl', '+31 70 345 6789', 'https://dhstagesound.nl', 4.4, 8),
  ('Festival Lights NL', 'light', 'Utrecht', 52.1009, 5.0919,
   'Grote lichtproducties voor festivals, inclusief rigging en bediening.',
   1200, 'sales@festivallights.nl', null, 'https://festivallights.nl', 4.8, 15),
  ('Mobiele DJ-booth Verhuur', 'dj_gear', 'Rotterdam', 51.9100, 4.4900,
   'Kant-en-klare DJ-booths inclusief geluid voor bruiloften en privéfeesten.',
   250, 'verhuur@djbooth.nl', '+31 6 1234 5678', null, 4.7, 21);

-- ---------- Clubs + evenementen (party-agenda, à la DJ Guide) ----------
do $$
declare
  owner uuid;
  club_paradiso uuid;
  club_now uuid;
  club_thuishaven uuid;
  g_house int;
  g_techno int;
  g_any int;
  ev uuid;
  art record;
  n int;
begin
  -- Kwame als eigenaar van de clubs (anders de eerste profiel-rij).
  select id into owner from auth.users where lower(email) = 'ballokwame@gmail.com';
  if owner is null then
    select id into owner from profiles order by created_at limit 1;
  end if;
  if owner is null then return; end if;

  -- Genres voor de events (val terug op een willekeurig genre).
  select id into g_house from genres where slug ilike '%house%' limit 1;
  select id into g_techno from genres where slug ilike '%techno%' limit 1;
  select id into g_any from genres order by id limit 1;
  g_house := coalesce(g_house, g_any);
  g_techno := coalesce(g_techno, g_any);

  insert into clubs(user_id, name, city, address, lat, lng, description, image_url, capacity, website_url, contact_email)
  values
    (owner, 'Paradiso', 'Amsterdam', 'Weteringschans 6-8', 52.3622, 4.8836,
     'Iconische poptempel in een voormalige kerk. House, techno en live.',
     'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200', 1500,
     'https://paradiso.nl', 'info@paradiso.nl')
  returning id into club_paradiso;

  insert into clubs(user_id, name, city, address, lat, lng, description, image_url, capacity, website_url, contact_email)
  values
    (owner, 'NOW&WOW', 'Rotterdam', 'Maashaven Zuidzijde 1-2', 51.8978, 4.4900,
     'Rauwe clubnachten in een oude loods aan de Maas.',
     'https://images.unsplash.com/photo-1545128485-c400e7702796?w=1200', 2000,
     'https://nowwow.nl', 'booking@nowwow.nl')
  returning id into club_now;

  insert into clubs(user_id, name, city, address, lat, lng, description, image_url, capacity)
  values
    (owner, 'Thuishaven', 'Amsterdam', 'Contactweg 68', 52.4012, 4.8190,
     'Openlucht- en indoorclub met houten decor en lange techno-nachten.',
     'https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=1200', 3000)
  returning id into club_thuishaven;

  -- Events: 6 stuks verdeeld over de clubs, in de komende weken.
  insert into events(club_id, organizer_id, title, description, event_date, start_time, end_time, genre_id, city, flyer_url, ticket_url, ticket_price, min_age)
  values
    (club_paradiso, owner, 'Paradiso Pres: House All Night',
     'Een nacht vol deep en melodic house met een internationale headliner.',
     current_date + 7, '23:00', '05:00', g_house, 'Amsterdam',
     'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200',
     'https://paradiso.nl/tickets', 22, 18),
    (club_now, owner, 'NOW&WOW: Industrial Techno',
     'Harde kelder, strakke kicks en visuals tot zonsopgang.',
     current_date + 10, '23:00', '07:00', g_techno, 'Rotterdam',
     'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200',
     'https://nowwow.nl/tickets', 25, 21),
    (club_thuishaven, owner, 'Thuishaven Outdoor Opening',
     'Seizoensopening op het buitenterrein met meerdere area''s.',
     current_date + 14, '14:00', '02:00', g_techno, 'Amsterdam',
     'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
     'https://thuishaven.nl/tickets', 30, 18),
    (club_paradiso, owner, 'Sunday Sessions',
     'Vroege deep house-middag voor de liefhebber.',
     current_date + 18, '15:00', '23:00', g_house, 'Amsterdam',
     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
     'https://paradiso.nl/tickets', 15, 18),
    (club_now, owner, 'Caribbean & Afro Night',
     'Afrohouse, amapiano en dancehall met live percussie.',
     current_date + 21, '22:00', '04:00', g_house, 'Rotterdam',
     'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200',
     'https://nowwow.nl/tickets', 20, 18),
    (club_thuishaven, owner, 'Late Night Techno Marathon',
     'Twaalf uur techno non-stop met een diepe line-up.',
     current_date + 28, '22:00', '10:00', g_techno, 'Amsterdam',
     'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200',
     'https://thuishaven.nl/tickets', 35, 21);

  -- Line-up: koppel per event 1-3 willekeurige artiesten.
  for ev in select id from events where organizer_id = owner loop
    n := 0;
    for art in
      select id from artists order by random() limit 3
    loop
      insert into event_artists(event_id, artist_id, sort_order)
      values (ev, art.id, n)
      on conflict do nothing;
      n := n + 1;
    end loop;
  end loop;
end $$;

-- ---------- Advertenties (drankmerken, sponsored banners) ----------
do $$
declare
  advertiser uuid;
begin
  select id into advertiser from auth.users where lower(email) = 'ballokwame@gmail.com';
  if advertiser is null then
    select id into advertiser from profiles order by created_at limit 1;
  end if;
  if advertiser is null then return; end if;

  insert into ads(created_by, brand_name, title, image_url, target_url, placement, active, weight)
  values
    (advertiser, 'Heineken', 'Proost op het beste feest van je week',
     'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=400',
     'https://heineken.com', 'events_top', true, 3),
    (advertiser, 'Red Bull', 'Red Bull geeft je vleugels op de dansvloer',
     'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400',
     'https://redbull.com', 'events_top', true, 2),
    (advertiser, 'Bacardi', 'Do What Moves You',
     'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
     'https://bacardi.com', 'event_detail', true, 1),
    (advertiser, 'Jägermeister', 'Best Nights are Jäger Nights',
     'https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=400',
     'https://jagermeister.com', 'event_detail', true, 1);
end $$;

commit;

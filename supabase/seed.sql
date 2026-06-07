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
  reviews, favorites, artist_availability, bookings
  restart identity cascade;

-- ---------- Reviews + agenda voor ALLE artiesten ----------
do $$
declare
  a record;
  d int;
  names text[] := array['Sanne','Daan','Lotte','Bram','Fleur','Tim','Noor','Joris'];
  comments text[] := array[
    'Top avond, de dansvloer ging helemaal los!',
    'Super professioneel en netjes op tijd. Aanrader.',
    'Echt een vibe, iedereen was enthousiast.',
    'Goede communicatie vooraf en een strakke set.',
    'Perfecte muziekkeuze voor ons feest.'];
begin
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
  end loop;
end $$;

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
    fee := round(g * 0.07);
    tot := g + fee;
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
    fee := round(g * 0.07);
    tot := g + fee;

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

commit;

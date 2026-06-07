-- =============================================================
-- MyGigs mock seed  —  project qvenjlozeggrxfyycpsn ONLY
-- NEVER run this against dstcrrylnjxjuqvmslaw (Fresh Ones).
--
-- Vult de app met demo-data zodat alle schermen gevuld zijn:
-- boekingen, favorieten, berichten, agenda, verdiensten, reviews.
--
-- Veilig om opnieuw te draaien: wist eerst de demo-rijen.
-- Raakt auth.users, profiles, artists en genres NIET aan.
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

-- ---------- Boeker-data voor ELK profiel ----------
do $$
declare
  p record;
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
  for p in select id from profiles loop
    -- Favorieten: 3 artiesten die deze gebruiker niet zelf bezit
    insert into favorites(booker_id, artist_id, created_at)
    select p.id, a2.id, now() - (row_number() over () || ' days')::interval
    from artists a2
    where a2.user_id is distinct from p.id
    order by a2.id
    limit 3;

    -- Boekingen naar maximaal 5 artiesten, verschillende statussen
    idx := 0;
    for a in
      select id, base_gage from artists
      where user_id is distinct from p.id
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
        a.id, p.id, evd, g, fee, tot, st,
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
        values (a.id, p.id, b_id, now() - (idx || ' days')::interval)
        returning id into c_id;

        insert into messages(conversation_id, sender_id, body, read_at, created_at)
        values (
          c_id, p.id,
          'Hoi! Ben je beschikbaar op ' || to_char(evd, 'DD-MM') || '?',
          now(), now() - interval '2 hours');

        if exists (
          select 1 from artists ax
          where ax.id = a.id and ax.user_id is not null and ax.user_id <> p.id
        ) then
          insert into messages(conversation_id, sender_id, body, read_at, created_at)
          select c_id, ax.user_id,
            'Zeker! Die datum is nog vrij. Wat is de locatie precies?',
            null, now() - interval '1 hour'
          from artists ax where ax.id = a.id;
        else
          insert into messages(conversation_id, sender_id, body, read_at, created_at)
          values (c_id, p.id, 'Top, ik hoor graag van je!', now(), now() - interval '50 minutes');
        end if;
      end if;
    end loop;
  end loop;
end $$;

-- ---------- Artiest-kant: inkomende aanvragen + uitbetalingen ----------
do $$
declare
  a record;
  bkr uuid;
  b_id uuid;
  c_id uuid;
  g numeric; fee numeric; tot numeric;
begin
  for a in select id, user_id, base_gage from artists where user_id is not null loop
    select id into bkr from profiles where id <> a.user_id order by id limit 1;
    if bkr is null then bkr := a.user_id; end if;

    g := coalesce(a.base_gage, 500);
    fee := round(g * 0.07);
    tot := g + fee;

    -- Open aanvraag met ongelezen bericht voor de artiest
    insert into bookings(
      artist_id, booker_id, event_date, gage, service_fee, total,
      status, city, venue_name, message, created_at)
    values (
      a.id, bkr, current_date + 21, g, fee, tot, 'pending',
      'Amsterdam', 'Privéfeest',
      'Hey! We vieren een verjaardag en willen je graag boeken.',
      now() - interval '3 hours')
    returning id into b_id;

    insert into conversations(artist_id, booker_id, booking_id, created_at)
    values (a.id, bkr, b_id, now() - interval '3 hours')
    returning id into c_id;

    insert into messages(conversation_id, sender_id, body, read_at, created_at)
    values (c_id, bkr,
      'Hoi! Heb je over 3 weken tijd voor een set van 2 uur?',
      null, now() - interval '3 hours');

    -- Afgeronde betaalde boeking -> uitbetaling
    insert into bookings(
      artist_id, booker_id, event_date, gage, service_fee, total,
      status, city, venue_name, created_at)
    values (
      a.id, bkr, current_date - 14, g, fee, tot, 'paid',
      'Rotterdam', 'Club NL', now() - interval '20 days')
    returning id into b_id;

    insert into payments(booking_id, amount, currency, status, provider, provider_ref, created_at)
    values (b_id, tot, 'eur', 'released', 'stripe',
      'pi_mock_' || substr(b_id::text, 1, 8), now() - interval '14 days');

    insert into payouts(artist_id, booking_id, amount, status, created_at)
    values (a.id, b_id, g, 'paid', now() - interval '10 days');

    insert into payouts(artist_id, booking_id, amount, status, created_at)
    values (a.id, null, round(g * 0.5), 'scheduled', now() - interval '1 day');
  end loop;
end $$;

commit;

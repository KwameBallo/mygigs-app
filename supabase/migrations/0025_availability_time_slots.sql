-- =============================================================
-- MyGigs — 0025: beschikbaarheid is tijd-gebaseerd, niet per hele dag
--
-- Voorheen blokkeerde een geaccepteerde boeking de HELE dag (een 'booked'-rij
-- in artist_availability). Nu blokkeert een boeking alleen zijn eigen tijdvak
-- (via de start/eind-tijden in bookings, mét reistijd-buffer). Een DJ die de
-- hele dag beschikbaar is, blijft dus op andere tijden boekbaar.
--
-- Daarom zetten we bestaande 'booked'-dagen terug naar 'available': de DJ
-- bood die dag aan, en het concrete tijdvak staat in de boeking zelf.
-- =============================================================

update artist_availability
set status = 'available'
where status = 'booked';

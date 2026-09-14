-- =============================================================
-- MyGigs — een uitbetaling kan vervallen.
--
-- Meldt een DJ zich af, dan mag de ingeplande uitbetaling nergens meer op
-- staan dan "vervallen". 'failed' zou suggereren dat er iets misging bij het
-- overmaken, en dat is hier niet zo.
--
-- Staat apart van 0034: een nieuwe waarde in een enum mag in Postgres niet in
-- dezelfde transactie gebruikt worden als waarin hij is toegevoegd.
-- =============================================================

alter type payout_status add value if not exists 'cancelled';

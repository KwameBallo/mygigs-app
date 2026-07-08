# MyGigs — backend-audit & optimalisatie

Datum: juni 2026. Doel: MyGigs onafhankelijk (zonder Shaday) op een vers Supabase-project kunnen draaien.

## 🔴 Kritiek — basis-schema ontbreekt in version control
De migraties (`0001`–`0012`) beginnen met `ALTER` op tabellen die nergens worden `CREATE`d.

**Niet in de migraties (alleen in remote DB + `types/database.ts`):**
- **Tabellen (11/17):** `profiles`, `genres`, `artists`, `artist_availability`, `bookings`, `conversations`, `messages`, `payments`, `payouts`, `reviews`, `favorites`
- **Enums (5/10):** `user_role`, `availability_status`, `booking_status`, `payment_status`, `payout_status`
- **Functie:** `is_artist_owner(uuid)` (wordt gebruikt in RLS-policies)
- **RLS/policies** voor alle 11 bovenstaande tabellen

**Wel in de migraties (6 tabellen):** `suppliers` (0006), `clubs`/`events`/`event_artists` (0007), `ads` (0008), `chat_flags` (0009).

**Conclusie:** DB is NIET herbouwbaar uit migraties alleen → we schrijven `0000_base_schema.sql` (reconstructie uit `types/database.ts`). Meest accurate bron zou een `pg_dump --schema-only` van de live DB zijn — alleen mogelijk als je (eenmalig) bij Shaday's project kunt.

## 🟠 Beveiliging
1. **RLS voor kern-tabellen onbekend/ongeversioned** — grootste risico: zonder RLS op de nieuwe DB zijn `profiles` (PII), `messages` (privé), `payments` (bedragen/Stripe-ID's) wereldwijd leesbaar. → In `0000` RLS + policies voor alles.
2. **`bookings` publieke-lees lekt kolommen** — policy `using (is_public = true)` (0001) staat anon `select *` toe, incl. `gage`, `invoice_email`, `vat_number`, `company_name`. App beperkt kolommen, RLS niet. → Vervang door `security definer`-view/functie met alleen veilige kolommen.
3. **Geen profiel-bootstrap-trigger** — bij e-mailbevestiging AAN wordt er geen `profiles`-rij aangemaakt (upsert in `signUp` draait alleen als er meteen een sessie is). → `handle_new_user()` + trigger op `auth.users`.
4. Service-role (`lib/supabase/admin.ts`) correct server-only, één nauwe usage (chat-flags). OK.

## 🟡 Performance
- Ontbrekende indexen op hete kolommen: `messages(conversation_id)` (N+1 in conversatielijst), `bookings(artist_id/booker_id/status)`, `artists(user_id/genre_id)`, `favorites(booker_id)`, `reviews(artist_id)`, e.a. → toevoegen in `0000`.
- `lib/data/messages.ts` doet 2 queries per conversatie → later omzetten naar één RPC.

## 🟢 Code ↔ schema
- Geen dangling kolommen; alle `lib/data/*`-referenties bestaan in het schema.
- Redundante `profiles.company` (vervangen door `company_name` in 0011) — opruimen kan.

## Wat er gedaan wordt
1. `supabase/migrations/0000_base_schema.sql` — reconstructie: 11 tabellen, 5 enums, `is_artist_owner()`, `handle_new_user()`+trigger, RLS+policies, indexen, FK's.
2. Verifiëren zodra jouw Supabase-project gekoppeld is (migraties draaien + Security Advisor).
3. Daarna: `bookings` publieke-lees hardenen, N+1 opruimen.

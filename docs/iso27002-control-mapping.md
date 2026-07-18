# MyGigs — ISO/IEC 27002:2022 control-mapping (applicatielaag)

**Doel:** input voor de Verklaring van Toepasselijkheid (SoA) en het gap-plan
richting ISO/IEC 27001-certificering. Dit document dekt alleen de
**technische maatregelen in de applicatie en de database**. De
organisatorische ISMS-onderdelen (beleid, risicobeoordeling, directie,
interne audit, incidentproces) staan onderaan als aparte lijst — die vallen
buiten de code en zijn een vereiste voor certificering.

_Laatst bijgewerkt: 19 juli 2026. Gebaseerd op een code-audit van de repo._

Legenda: ✅ Geïmplementeerd · 🟡 Deels · 🔴 Gat · 🏢 Organisatorisch (buiten code)

---

## Samenvatting

Sterke basis: RLS staat aan op álle tabellen, de service-role-client is
`server-only` en overal afgeschermd, elke server-action controleert
`auth.getUser()` + eigenaarschap, security headers/HSTS staan, en er is een
anti-omzeil-/PII-guard in de chat. De hardening-ronde van 18-07-2026 heeft de
kritieke gaten (rechten-escalatie, betaal-integriteit) gedicht. Het
belangrijkste resterende gat is **kolom-niveau leesrechten op `profiles`/
`bookings`** (publiek leesbare PII) — zie A.8.3/A.5.34.

---

## A.5.15 / A.8.3 — Toegangsbeveiliging & autorisatie

| Maatregel | Status | Bewijs / opmerking |
|---|---|---|
| RLS aan op alle tabellen | ✅ | `supabase/migrations/0000_base_schema.sql` |
| Server-actions checken auth + eigenaarschap | ✅ | o.a. `app/(artist)/dashboard/actions.ts`, `app/(booker)/bookings/actions.ts` |
| Service-role alleen server-side + afgeschermd | ✅ | `lib/supabase/admin.ts` (`server-only`); 6 call-sites allemaal guarded |
| Admin-route rol-gated | ✅ | `app/admin/page.tsx` (redirect als rol ≠ admin) |
| Rechten-escalatie naar `role='admin'` geblokkeerd | ✅ (fix 18-07) | Kolom-`UPDATE` op profiles ingeperkt + trigger-rol geklemd (`_security_hardening.sql`) + client-rol geklemd in `signUp` |
| Betaal-integriteit: prijskolommen niet client-wijzigbaar | ✅ (fix 18-07) | `REVOKE UPDATE` op `bookings.gage/service_fee/total` (`_security_hardening.sql`) |
| Review-integriteit (alleen na afgeronde boeking) | ✅ (fix 18-07) | Aangescherpte insert-policy (`_security_hardening.sql`) |
| Publiek leesrecht PII op `profiles` | ✅ (fix 19-07) | `profiles_read_own_or_participant` (`_security_hardening.sql`): alleen eigen profiel + klant-van-een-deelnemende-DJ; anoniem geen toegang. Kolom-niveau ("alleen naam") = latere verscherping via view |
| Publiek leesrecht PII op publieke `bookings` | 🟡 | App leest alleen veilige kolommen (`getPublicShows`: datum/stad/venue), maar de `is_public`-policy exposeert bij een directe query nog alle kolommen → **vervolgstap**: minimale view (datum/stad/venue/artist) |
| `suppliers` mist DELETE-policy | 🟡 | Functioneel gat, geen securityrisico |

## A.8.5 — Veilige authenticatie

| Maatregel | Status | Opmerking |
|---|---|---|
| E-mailbevestiging afgedwongen (boeken/betalen) | 🟡 | Code checkt `email_confirmed_at`; Supabase-toggle "Confirm email" staat aan (dashboard-instelling — als bewijs vastleggen) |
| Wachtwoordbeleid | 🟡 | Client `minLength=6`; verhoog de Supabase-minimumlengte naar ≥8–12 (server-side) |
| MFA | 🔴 | Nog geen MFA; bied TOTP aan en dwing AAL2 af voor `role='admin'` |
| Sessiebeheer | ✅ | `lib/supabase/middleware.ts` ververst sessie via `getUser()` |

## A.8.24 / A.5.17 — Cryptografie & secrets

| Maatregel | Status | Opmerking |
|---|---|---|
| Service-role-key alleen server-side | ✅ | Nooit `NEXT_PUBLIC_`, niet in client-bundle |
| `.env*` gitignored, geen secrets in git | ✅ | `.gitignore` |
| TLS/HSTS | ✅ | HSTS 2 jaar, preload (`next.config.ts`) |
| Rotatie van eerder gelekte service-role-key | 🏢/🔴 | De `sb_secret_...`-key is eerder in chat gedeeld → **roteren** in Supabase en als key-management-procedure vastleggen |

## A.8.15 / A.8.16 — Logging & monitoring

| Maatregel | Status | Opmerking |
|---|---|---|
| Incident-log contact-guard | 🟡 | `chat_flags` logt overtredingen (`0009_chat_guard.sql`) |
| Audit-log app-gebeurtenissen | ✅ (fix 19-07) | Append-only `audit_log` (`_audit_log.sql`) + `lib/audit.ts`; logt rolwijziging, boekingstatus, betaling/uitbetaling, account-verwijdering; zichtbaar in `/admin` |
| Audit-log auth-events (login/uitlog) | 🟡 | App-events staan; login-events nog via Supabase log-drain koppelen |
| Alerting/anomaliedetectie | 🔴 | `flag_count`-drempel → auto-actie/notificatie |

## A.8.9 — Veilige configuratie

| Maatregel | Status | Opmerking |
|---|---|---|
| Security headers (HSTS, nosniff, frame, referrer, permissions) | ✅ | `next.config.ts` |
| `poweredByHeader` uit | ✅ | `next.config.ts` |
| CSP | 🟡 | `script-src` bevat `'unsafe-inline'` → naar nonce-based CSP; `connect-src` beperken tot Supabase/Stripe |
| Cookie-flags (HttpOnly/Secure/SameSite) | ✅ | via `@supabase/ssr` |

## A.8.28 — Veilige ontwikkeling / input-validatie

| Maatregel | Status | Opmerking |
|---|---|---|
| Geen raw SQL / geen `dangerouslySetInnerHTML` | ✅ | Alles via Supabase query-builder (parameterized) |
| Enums/nummers server-side gevalideerd | ✅ | o.a. `booking_type`, `act_type`, `payment_method` |
| Schema-validatie (formaten: e-mail/URL/datum) | 🔴 | Introduceer `zod`-schema's per server-action; URL-protocol-allowlist (`https:`) |
| Generieke foutmeldingen (geen info-disclosure) | ✅ (fix 18-07) | Ruwe `error.message` niet meer in URL's; server-side gelogd |
| Error-boundary | ✅ (fix 18-07) | `app/error.tsx` + `app/global-error.tsx` |

## A.5.34 — Privacy & PII

| Maatregel | Status | Opmerking |
|---|---|---|
| Dataminimalisatie / doelbinding | 🟡 | Factuurvelden alleen bij zakelijke boeking; DJ ziet alleen naam na acceptatie |
| Contact-guard (voorkomt PII-uitwisseling) | ✅ | `lib/utils/contact-guard.ts` |
| AVG-grondslag (akkoord + versie) | ✅ | `terms_accepted_at`/`terms_version` bij signup; `/privacy` + `/voorwaarden` |
| Recht op verwijdering (self-service) | ✅ (fix 19-07) | `deleteAccount` (`app/(booker)/settings/actions.ts`) + knop in Instellingen → Privacy |
| PII niet publiek leesbaar | 🟡 | `profiles` gedicht; publieke `bookings`-view nog te doen (zie A.8.3) |

## A.8.8 — Kwetsbaarheden-/dependency-beheer

| Maatregel | Status | Opmerking |
|---|---|---|
| Lockfile aanwezig | ✅ | `package-lock.json` |
| Dependabot | ✅ (fix 18-07) | `.github/dependabot.yml` (npm + actions, wekelijks) |
| CI security-scan (`npm audit`/CodeQL) | 🔴 | Toevoegen aan CI |
| Bekende kwetsbaarheid | 🟡 | 2× moderate (PostCSS via Next, build-time); geen praktische fix → **risico-geaccepteerd**, opnieuw beoordelen bij Next-update |

---

## Wat de hardening-rondes van 18/19-07-2026 hebben gedaan (code)
- Rol geklemd in `signUp` én `profile/actions.ts` (geen `admin` via client; `role='artist'` via service-role).
- Generieke foutmeldingen i.p.v. ruwe DB-fouten (5 acties).
- `startSubscription` naar service-role (past bij de kolom-lockdown).
- `app/error.tsx` + `app/global-error.tsx`.
- `.github/dependabot.yml`.
- Account-verwijdering (AVG): `deleteAccount` + knop in Instellingen.
- Audit-log: `supabase/_audit_log.sql` + `lib/audit.ts`, gewired in betaling, boekingstatus, rolwijziging en account-verwijdering; getoond in `/admin`.
- `supabase/_security_hardening.sql` (handmatig te draaien) — profiles/bookings kolomrechten, trigger-rolklem, review-integriteit, én profiles-leesrecht ingeperkt tot eigen + deelnemer.

## Direct te doen (buiten deze ronde)
1. **`supabase/_security_hardening.sql` én `supabase/_audit_log.sql` draaien** in de Supabase SQL-editor (test daarna chat- en dashboard-klantnamen; rollback = `create policy ... using(true)`).
2. **Service-role-key roteren** (was eerder gedeeld) en key-management vastleggen.
3. **Supabase "Confirm email" aan** (bevestigen) + minimum wachtwoordlengte ≥8–12.
4. Publieke `bookings`-view (kolom-minimalisatie) + profiles-view "alleen naam".
5. MFA voor admin + nonce-CSP + `zod`-validatie + CI security-scan + alerting op `flag_count`.

---

## 🏢 ISMS-onderdelen (organisatorisch — vereist voor certificering, niet in code)
Deze kan software niet leveren; ze horen bij het managementsysteem (ISO 27001):
- **Scope & context** van het ISMS, **directieverklaring/commitment**.
- **Risicobeoordeling en -behandeling** + **Verklaring van Toepasselijkheid (SoA)** over alle Annex A-maatregelen.
- **Beleid**: informatiebeveiligingsbeleid, toegangsbeleid, cryptografiebeleid, acceptabel gebruik, leveranciersbeleid (Supabase/Vercel/Stripe als verwerkers — verwerkersovereenkomsten).
- **Incidentmanagement**-proces + **responsible disclosure** (zie `SECURITY.md`).
- **Back-up-/continuïteit** (Supabase PITR/back-ups aanzetten en testen).
- **Toegangsbeheer-proces** (onboarding/offboarding, periodieke toegangsreview).
- **Bewustwording/training**, **leveranciersbeoordeling**, **interne audit** + **management review**.
- **Verwerkingsregister & DPIA** (AVG) — sluit aan op A.5.34.

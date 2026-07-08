# MyGigs — eigen backend opzetten (afvinklijst)

Doel: MyGigs volledig onafhankelijk draaien onder je eigen accounts, los van Shaday.
Alles wat je nodig hebt staat in [env-template.txt](env-template.txt).

## 1. Supabase (database + auth)
- [ ] Eigen Supabase-account (NIET ShadayFresh's Org) — houd MyGigs 100% gescheiden van Fresh Creatives
- [ ] Nieuw project `mygigs`, regio EU, sterk DB-wachtwoord (bewaren)
- [ ] Project "healthy"
- [x] **Basis-schema `0000_base_schema.sql` gereconstrueerd** (Claude — gedaan; te verifiëren bij aansluiten, zie [backend-audit.md](backend-audit.md))
- [ ] Toegang geven aan Claude: connector herkoppelen aan jouw account (aanpak A) **of** project-ref + DB-token delen (aanpak B)
- [ ] 13 migraties gedraaid: `0000` (basis) + `0001`–`0012` (Claude doet dit)
- [ ] `seed.sql` geladen — demo-DJ's/events (Claude doet dit)
- [ ] `types/database.ts` opnieuw gegenereerd (Claude doet dit)
- [ ] Security advisor gedraaid, 0 kritieke bevindingen (Claude doet dit)

## 2. Sleutels in `.env.local`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (geheim, server-only)
- [ ] `ANTHROPIC_API_KEY` (console.anthropic.com → API Keys)

## 3. Lokaal draaien
- [ ] `.env.local` ingevuld
- [ ] `npm run dev` → http://localhost:3000 werkt (login, discover, profiel)

## 4. Anthropic (AI-assistent + zoekbalk)
- [ ] Account op console.anthropic.com
- [ ] Prepaid credits toegevoegd
- [ ] API-key aangemaakt en in `.env.local` gezet

## 5. Vercel (hosting) — eigen account
- [ ] Eigen Vercel-account
- [ ] Nieuw project gekoppeld aan `KwameBallo/mygigs-app`
- [ ] Env-vars overgenomen uit `.env.local`
- [ ] Deploy geslaagd

## 6. Later — Stripe (echte betalingen/escrow)
- [ ] Eigen Stripe-account (start in testmodus)
- [ ] Stripe Connect ingericht voor uitbetaling aan DJ's
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Webhook-route uitgebouwd (nu nog een stub)

---
Status en optimalisaties worden bijgehouden in [backend-audit.md](backend-audit.md).

# MyGigs

Two-sided marketplace (web + later mobile) that connects artists/DJs directly
with bookers. Next.js (App Router) + TypeScript + Tailwind v4 + Supabase +
Stripe Connect. Tagline: "Be the star you want to be." Theme: black + orange
(`#FF6A00`), dark, sleek.

## ABSOLUTE RULE: MyGigs is fully separate from Fresh Creatives / "Fresh Ones"

These are two unrelated projects. They must never share code, databases,
secrets, deployments, repos, env files, or domains.

| Use this | Project | Supabase ref |
|---|---|---|
| ALWAYS | MyGigs | `qvenjlozeggrxfyycpsn` |
| NEVER | Fresh Creatives ("Fresh Ones") | `dstcrrylnjxjuqvmslaw` |

Before any database or deploy action, confirm the ref is `qvenjlozeggrxfyycpsn`.
If you ever see `dstcrrylnjxjuqvmslaw` in a MyGigs context: STOP, it is wrong.

## Conventions

- All DB changes via versioned migrations in `supabase/migrations/`. No ad-hoc
  changes to production.
- RLS on every new table with explicit policies; run the security advisor after.
- `SUPABASE_SERVICE_ROLE_KEY` and all secrets are server-side only. Never in the
  client bundle, never committed.
- Payment and booking logic runs server-side (route handlers / server actions /
  Edge Functions), never in the client.
- Generate and use DB types from the database (`types/database.ts`).
- Keep the black/orange dark theme consistent.

## Structure

- `app/(marketing)` landing, `app/(booker)` booker app, `app/(artist)` artist
  app, `app/auth` auth, `app/api` route handlers/webhooks
- `lib/supabase` client/server/admin clients, `lib/utils` geo + pricing
- `types/database.ts` generated DB types, `supabase/` migrations + docs

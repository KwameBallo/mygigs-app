# Supabase — MyGigs

Linked project: **`qvenjlozeggrxfyycpsn`** (name: MyGigs).
API URL: `https://qvenjlozeggrxfyycpsn.supabase.co`

NEVER use `dstcrrylnjxjuqvmslaw` (ShadayFresh's Project / Fresh Creatives).

The full schema (tables, RLS, triggers, demo data) already lives in the remote
project. Manage future changes as versioned SQL files in `migrations/`:

```
npx supabase login
npx supabase link --project-ref qvenjlozeggrxfyycpsn
npx supabase migration new <name>
npx supabase db push
```

Regenerate types after a schema change:

```
npx supabase gen types typescript --project-id qvenjlozeggrxfyycpsn > types/database.ts
```

Always enable RLS on new tables and run the security advisor afterwards.

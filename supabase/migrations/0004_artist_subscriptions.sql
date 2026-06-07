-- =============================================================
-- MyGigs  —  abonnementen voor artiesten (verdienmodel)
-- Project qvenjlozeggrxfyycpsn ONLY.
--
-- Het verdienmodel verschuift van een 7% boekingsfee naar een
-- abonnement: om artiest te worden op de tool sluit je een
-- abonnement af (maand of jaar), met 14 dagen gratis proefperiode.
-- =============================================================

do $$ begin
  create type subscription_status as enum (
    'inactive', 'trialing', 'active', 'past_due', 'canceled'
  );
exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists subscription_status subscription_status
    not null default 'inactive',
  add column if not exists subscription_plan text,
  add column if not exists subscription_trial_end timestamptz,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

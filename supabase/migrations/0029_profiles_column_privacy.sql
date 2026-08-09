-- SEC #2: gevoelige profielkolommen niet meer leesbaar voor de tegenpartij.
--
-- De RLS-policy is row-level: een DJ mag de profielrij van een deelnemende klant
-- lezen (nodig voor de naam-weergave), maar daarmee lekten ook telefoon, e-mail
-- en facturatiegegevens — precies wat de contact-guard juist tegenhoudt.
--
-- Kolom-niveau grants lossen dit op: we ontnemen 'authenticated'/'anon' de
-- tabelbrede SELECT en geven alleen de VEILIGE kolommen terug (naam/rol/avatar/
-- abonnement). De gevoelige kolommen blijven weg. De eigenaar leest z'n eigen
-- volledige profiel via de service-role (lib/auth.ts getProfile/getViewer), die
-- niet onder deze grants valt.
--
-- Verifieer na het draaien: (1) inloggen + Instellingen tonen je eigen gegevens,
-- (2) een DJ ziet nog steeds de klantnaam op dashboard/berichten, (3) een DJ kan
-- 'select phone,email from profiles' NIET meer uitvoeren op een klantrij.

revoke select on public.profiles from authenticated, anon;

grant select (
  id,
  full_name,
  avatar_url,
  role,
  gender,
  city,
  created_at,
  updated_at,
  email_opt_out,
  flagged,
  flag_count,
  subscription_status,
  subscription_plan,
  subscription_current_period_end,
  subscription_trial_end
) on public.profiles to authenticated, anon;

-- Bewust NIET teruggegeven (gevoelig): phone, email, company, company_name,
-- invoice_address, invoice_email, vat_number, stripe_customer_id,
-- stripe_subscription_id. Alleen de service-role (server) leest die.

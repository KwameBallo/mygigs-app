-- 0018_email_opt_out.sql
-- E-mailvoorkeur: gebruikers (boeker én DJ) kunnen zelf e-mailmeldingen uitzetten.
-- In-app meldingen blijven; alleen de e-mails worden overgeslagen bij opt-out.
alter table public.profiles
  add column if not exists email_opt_out boolean not null default false;

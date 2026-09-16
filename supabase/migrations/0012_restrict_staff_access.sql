-- ===========================================================================
-- 0012 — Restrict "staff" row policies to actual staff
-- ===========================================================================
--
-- 0001 wrote every staff policy as `to authenticated using (true)`, on the
-- assumption that the only accounts in the project would be staff accounts.
-- That assumption does not hold: the project's signup endpoint is open
-- (Authentication -> Sign In / Providers -> "Allow new users to sign up"),
-- and PUBLIC_SUPABASE_ANON_KEY is compiled into the public site's JavaScript,
-- as it is designed to be.
--
-- Together those mean anyone could register an address they control, confirm
-- it, and then read the whole enquiries table straight from the REST API --
-- names, phone numbers, email addresses and project details of every lead --
-- without ever touching the admin console. The same policies also let such an
-- account overwrite the site's imagery and publish project entries.
--
-- The application-layer guard (site/src/lib/auth.ts) closes the console. This
-- closes the database, which is the boundary that actually matters.
--
-- Staff are identified by email domain. That is deliberate: it needs no extra
-- table to keep in sync, it cannot lock out the accounts that already exist,
-- and a stranger cannot confirm an address at the company's own domain.
-- Change STAFF_DOMAIN in site/src/lib/auth.ts if this ever changes here.
--
-- Nothing the server does is affected: the Worker uses the service-role key,
-- which bypasses RLS entirely.
-- ===========================================================================

create or replace function public.is_alicore_staff()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@alicore.in';
$$;

comment on function public.is_alicore_staff() is
  'True when the calling JWT belongs to an address at the company domain. Used by every staff row policy.';

-- --- ENQUIRIES: customer personal data. The tightest of the four. -----------
drop policy if exists enquiries_staff_read on public.enquiries;
create policy enquiries_staff_read on public.enquiries
  for select to authenticated using (public.is_alicore_staff());

drop policy if exists enquiries_staff_update on public.enquiries;
create policy enquiries_staff_update on public.enquiries
  for update to authenticated
  using (public.is_alicore_staff())
  with check (public.is_alicore_staff());

-- --- MEDIA: public read is unchanged; only the write side narrows. ---------
drop policy if exists media_assets_staff_write on public.media_assets;
create policy media_assets_staff_write on public.media_assets
  for all to authenticated
  using (public.is_alicore_staff())
  with check (public.is_alicore_staff());

-- --- PROJECTS: anon still sees published rows (policy untouched). ----------
drop policy if exists projects_staff_all on public.projects;
create policy projects_staff_all on public.projects
  for all to authenticated
  using (public.is_alicore_staff())
  with check (public.is_alicore_staff());

-- --- STORAGE: the media bucket stays world-readable; writes narrow. --------
drop policy if exists media_staff_write on storage.objects;
create policy media_staff_write on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and public.is_alicore_staff())
  with check (bucket_id = 'media' and public.is_alicore_staff());

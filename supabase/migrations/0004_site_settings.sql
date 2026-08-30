-- ===========================================================================
-- Admin-editable contact details and social links.
--
-- These currently live in environment variables, which means a developer and a
-- redeploy for every change -- including filling the brief's [ADD EMAIL] and
-- [ADD ADDRESS] placeholders. Moving them here lets staff maintain them.
--
-- Single-row table: the boolean primary key with a check constraint makes a
-- second row impossible, so readers never have to pick between rows.
-- ===========================================================================

create table if not exists public.site_settings (
  id            boolean primary key default true check (id),

  -- Public contact details. Baked into every page at build time.
  phone_display text not null default '9995 495 395',
  phone_e164    text not null default '+919995495395',
  whatsapp_e164 text not null default '919995495395',
  email         text not null default '',
  address       text not null default '',

  -- Social profiles. Empty means "not published yet" and renders as plain
  -- text rather than a dead link.
  instagram     text not null default '',
  facebook      text not null default '',
  linkedin      text not null default '',
  youtube       text not null default '',

  -- Where new enquiry alerts are sent. Read at request time by /api/enquiry,
  -- so a change here takes effect immediately with no rebuild.
  notify_emails text not null default '',

  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;

-- Public read: every value here is published on the website anyway. The one
-- exception is notify_emails, which is a staff inbox rather than public
-- information -- see the column-level revoke below.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists site_settings_staff_write on public.site_settings;
create policy site_settings_staff_write on public.site_settings
  for update to authenticated using (true) with check (true);

-- Keep the staff notification inbox out of anonymous reads. The build and the
-- enquiry endpoint both use the service-role key, which is unaffected.
revoke select (notify_emails) on public.site_settings from anon;

-- ===========================================================================
-- Alicore -- initial schema
-- See docs/IMPLEMENTATION_PLAN.md section 4.
--
-- Security posture: RLS is ON everywhere and no policy grants anon access to
-- enquiries. The public site writes enquiries through a server-side endpoint
-- using the service-role key; the browser never holds a key that can read them.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENQUIRIES
-- ---------------------------------------------------------------------------
create table if not exists public.enquiries (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,
  created_at      timestamptz not null default now(),
  name            text not null,
  company         text,
  phone           text not null,
  email           text not null,
  location        text,
  product         text,
  quantity        text,
  message         text,
  attachment_path text,
  status          text not null default 'new'
                  check (status in ('new','contacted','quoted','closed','archived')),
  internal_note   text,
  source          text not null default 'web-form',
  ip_hash         text,
  user_agent      text
);

create index if not exists enquiries_created_at_idx
  on public.enquiries (created_at desc);
create index if not exists enquiries_open_idx
  on public.enquiries (status) where status <> 'archived';

-- ---------------------------------------------------------------------------
-- IMAGE LIBRARY
-- Slot ids are contractual: built pages reference them by id, so they must not
-- change once the site is live.
-- ---------------------------------------------------------------------------
create table if not exists public.media_slots (
  id          text primary key,
  group_title text not null,
  title       text not null,
  placeholder text not null,
  sort_order  int  not null
);

create table if not exists public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  slot_id     text not null references public.media_slots(id) on delete cascade,
  variants    jsonb not null,
  width       int,
  height      int,
  alt_text    text not null default '',
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  is_active   boolean not null default true
);

-- One live asset per slot. Superseded uploads stay as history.
create unique index if not exists media_assets_one_active_per_slot
  on public.media_assets (slot_id) where is_active;

-- ---------------------------------------------------------------------------
-- PROJECTS
-- Defaults enforce the brief's rule: never invent project names or locations.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Project Name — Coming Soon',
  location     text not null default 'Location — Coming Soon',
  category     text not null
               check (category in ('Commercial','Residential','Hospitality',
                                   'Facades','Interiors','Custom Architectural Elements')),
  material     text,
  product      text,
  application  text,
  image_path   text,
  alt_text     text not null default '',
  is_published boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists projects_published_idx
  on public.projects (is_published, sort_order);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.enquiries   enable row level security;
alter table public.media_slots enable row level security;
alter table public.media_assets enable row level security;
alter table public.projects    enable row level security;

-- ENQUIRIES: no anon policy at all. Reads and writes go through the server
-- with the service-role key, which bypasses RLS. Authenticated staff may read
-- and update (but not hard-delete -- the admin UI archives instead).
drop policy if exists enquiries_staff_read on public.enquiries;
create policy enquiries_staff_read on public.enquiries
  for select to authenticated using (true);

drop policy if exists enquiries_staff_update on public.enquiries;
create policy enquiries_staff_update on public.enquiries
  for update to authenticated using (true) with check (true);

-- MEDIA: world-readable (it is the public site's imagery); staff write.
drop policy if exists media_slots_public_read on public.media_slots;
create policy media_slots_public_read on public.media_slots
  for select to anon, authenticated using (true);

drop policy if exists media_assets_public_read on public.media_assets;
create policy media_assets_public_read on public.media_assets
  for select to anon, authenticated using (is_active);

drop policy if exists media_assets_staff_write on public.media_assets;
create policy media_assets_staff_write on public.media_assets
  for all to authenticated using (true) with check (true);

-- PROJECTS: anon sees published rows only; staff see and manage everything.
drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select to anon using (is_published);

drop policy if exists projects_staff_all on public.projects;
create policy projects_staff_all on public.projects
  for all to authenticated using (true) with check (true);

-- ===========================================================================
-- STORAGE BUCKETS
-- ===========================================================================
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

-- Customer drawings/CAD. Private: admin reads via short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('enquiry-attachments', 'enquiry-attachments', false, 26214400)
  on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

drop policy if exists media_staff_write on storage.objects;
create policy media_staff_write on storage.objects
  for all to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');

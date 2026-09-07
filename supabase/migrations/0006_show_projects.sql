-- ===========================================================================
-- Alicore -- toggle for the Projects section
--
-- Lets staff hide the Projects section (and its nav/footer link) sitewide
-- without deleting the underlying project rows -- e.g. before any real
-- projects have been approved for publication.
-- ===========================================================================

alter table public.site_settings
  add column if not exists show_projects boolean not null default true;

-- ===========================================================================
-- Alicore -- photographic backgrounds for three more sections
--
-- Same treatment as alicore-why (0008): a full-bleed photograph behind the
-- section with the copy sitting on near-transparent glass over it. Each is a
-- single-image slot managed from /admin/media, and each section falls back to
-- its original flat ground if the slot is emptied.
-- ===========================================================================

insert into public.media_slots (id, group_title, title, placeholder, sort_order) values
  ('alicore-custom',   'Section Backgrounds', 'Custom Solutions — background', 'Wide photograph behind "Your Design. Our Manufacturing."',        300),
  ('alicore-journey',  'Section Backgrounds', 'Manufacturing journey — background', 'Wide photograph behind the Design / Mould Development steps', 310),
  ('alicore-planning', 'Section Backgrounds', 'Planning a project? — background', 'Wide photograph behind the manufacturing page closing band',    320)
on conflict (id) do update
  set group_title = excluded.group_title,
      title       = excluded.title,
      placeholder = excluded.placeholder,
      sort_order  = excluded.sort_order;

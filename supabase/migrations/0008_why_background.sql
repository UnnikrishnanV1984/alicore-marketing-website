-- ===========================================================================
-- Alicore -- "Why Choose Alicore?" background photograph
--
-- The section becomes a full-bleed photographic band (like GFRC/FRP) rather
-- than plain cards on the page ground. Staff manage the photograph from
-- /admin/media the same way as any other slot; if the slot is emptied the
-- section falls back to its original light treatment rather than showing a
-- full-width placeholder block.
-- ===========================================================================

insert into public.media_slots (id, group_title, title, placeholder, sort_order) values
  ('alicore-why', 'Home — Key Visuals', 'Why Choose Alicore', 'Wide architectural photograph used behind the Why Choose Alicore section', 55)
on conflict (id) do update
  set group_title = excluded.group_title,
      title       = excluded.title,
      placeholder = excluded.placeholder,
      sort_order  = excluded.sort_order;

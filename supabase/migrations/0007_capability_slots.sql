-- ===========================================================================
-- Alicore -- capability tile image slots
--
-- The four capability tiles in the "Who We Are" section (home page About
-- section) now carry a photograph above the text, sized like a product card.
-- Each is a single-image slot (position 1 only), same as alicore-gfrc/frp.
-- ===========================================================================

insert into public.media_slots (id, group_title, title, placeholder, sort_order) values
  ('alicore-cap-1', 'About — Capabilities', 'Custom Manufacturing', 'Panel being cast or moulded to a project drawing',      60),
  ('alicore-cap-2', 'About — Capabilities', 'Material Expertise',   'GFRC and FRP material or texture close-up',            70),
  ('alicore-cap-3', 'About — Capabilities', 'Project Support',      'Drawing review or site coordination',                  80),
  ('alicore-cap-4', 'About — Capabilities', 'Scalable Production',  'Multiple panels in production on the factory floor',   90)
on conflict (id) do update
  set group_title = excluded.group_title,
      title       = excluded.title,
      placeholder = excluded.placeholder,
      sort_order  = excluded.sort_order;

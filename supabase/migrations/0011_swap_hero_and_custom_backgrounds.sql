-- Swap the home hero's backdrop with the one behind "Your Design. Our
-- Manufacturing.", at the client's request.
--
-- Before: the hero was a wall of three portrait photographs shipped in
-- public/hero/, and Custom Solutions sat on one wide landscape uploaded to
-- `alicore-custom`. After: the hero is that one landscape, full width, and
-- Custom Solutions is the wall of three.
--
-- Three things follow.
--
-- 1. The uploaded landscape moves from `alicore-custom` to `alicore-hero`.
--    Its stored files stay where they are -- the `variants` column holds the
--    path each width was written to, and that is what the site reads, so
--    moving the row is enough. A later re-upload to either slot writes a
--    fresh versioned path and nothing collides.
--
-- 2. The three positions move with the wall: `alicore-custom` offers 1-3
--    (left / middle / right column) in the admin, `alicore-hero` goes back to
--    a single photograph. That part lives in pages/admin/media.astro.
--
-- 3. The titles have to follow, or the library describes the old layout.

-- 1. Move the photograph. `where position = 1` is belt and braces: the slot
--    has only ever held one.
update media_assets
set slot_id = 'alicore-hero'
where slot_id = 'alicore-custom'
  and position = 1;

-- 3. Retitle both slots for what they now render.
update media_slots
set
  title = 'Hero — background photograph',
  placeholder = 'Wide photograph filling the home hero'
where id = 'alicore-hero';

update media_slots
set
  title = 'Behind "Your Design. Our Manufacturing." — three columns',
  placeholder = 'Portrait photograph for one of the three columns'
where id = 'alicore-custom';

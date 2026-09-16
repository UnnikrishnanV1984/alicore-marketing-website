-- The About stage paired two photographs side by side when 0010 was written,
-- and the slot's title still says so. It has read a single photograph at
-- position 1 since (see components/sections/AboutSection.astro and
-- pages/about.astro, which are kept in lockstep), and the Image Library offers
-- one upload box for it. Only the label was left behind.
update media_slots
set
  title = 'Who We Are — stage photograph',
  placeholder = 'Wide photograph behind the About introduction'
where id = 'alicore-about';

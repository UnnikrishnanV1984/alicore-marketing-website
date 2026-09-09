-- Image Library audit: make the library match the site, and group it by the
-- section of the site each placement lands in.
--
-- Three things were out of step.
--
-- 1. The hero slot was dead. The hero stopped using a media slot when it
--    became a three-column wall of nine portrait photographs served from
--    public/hero/, but `alicore-hero` stayed in the library -- so a
--    photograph uploaded there went nowhere. It now backs those nine frames,
--    with the files shipped in the repo as the fallback for any frame left
--    empty.
--
-- 2. `alicore-about` offered three placements and the section only ever read
--    two of them; the middle one was labelled "Unused" in the admin and still
--    accepted uploads. The section now reads positions 1 and 2, and the
--    photograph at position 3 moves down to 2 (done by the accompanying
--    script, which has to move the stored files at the same time).
--
-- 3. The groups were a mix of page names and descriptions ("Home — Key
--    Visuals", "About — Capabilities"). They are the tab labels now, so they
--    become plain section names, and every slot moves to the tab for the
--    section it actually renders in -- the GFRC and FRP stages to Products,
--    the journey and closing band to Manufacturing.

update media_slots
set
  title = 'Hero — background wall',
  placeholder = 'Portrait photograph for one frame of the hero wall'
where id = 'alicore-hero';

update media_slots
set placeholder = 'Two photographs shown side by side above the About copy'
where id = 'alicore-about';

-- The middle About placement is gone; clear anything recorded against it. The
-- position-3 row is moved down to 2 by the accompanying script.
delete from media_assets where slot_id = 'alicore-about' and position = 2;

-- --- tabs -----------------------------------------------------------------
-- group_title is the tab label; sort_order sets both the tab order and the
-- order of slots inside a tab.

update media_slots set group_title = 'Home',            sort_order =  10 where id = 'alicore-hero';
update media_slots set group_title = 'Home',            sort_order =  20 where id = 'alicore-why';

update media_slots set group_title = 'About',           sort_order = 110 where id = 'alicore-about';
update media_slots set group_title = 'About',           sort_order = 120 where id = 'alicore-cap-1';
update media_slots set group_title = 'About',           sort_order = 130 where id = 'alicore-cap-2';
update media_slots set group_title = 'About',           sort_order = 140 where id = 'alicore-cap-3';
update media_slots set group_title = 'About',           sort_order = 150 where id = 'alicore-cap-4';

update media_slots set group_title = 'Products',        sort_order = 210 where id = 'alicore-gfrc';
update media_slots set group_title = 'Products',        sort_order = 220 where id = 'alicore-frp';
update media_slots set group_title = 'Products',        sort_order = 230 where id = 'alicore-prod-1';
update media_slots set group_title = 'Products',        sort_order = 240 where id = 'alicore-prod-2';
update media_slots set group_title = 'Products',        sort_order = 250 where id = 'alicore-prod-3';
update media_slots set group_title = 'Products',        sort_order = 260 where id = 'alicore-prod-4';
update media_slots set group_title = 'Products',        sort_order = 270 where id = 'alicore-prod-5';
update media_slots set group_title = 'Products',        sort_order = 280 where id = 'alicore-prod-6';
update media_slots set group_title = 'Products',        sort_order = 290 where id = 'alicore-prod-7';

update media_slots set group_title = 'Manufacturing',   sort_order = 310 where id = 'alicore-factory';
update media_slots set group_title = 'Manufacturing',   sort_order = 320 where id = 'alicore-journey';
update media_slots set group_title = 'Manufacturing',   sort_order = 330 where id = 'alicore-planning';

update media_slots set group_title = 'Custom Solutions', sort_order = 410 where id = 'alicore-custom';

update media_slots set group_title = 'Projects',        sort_order = 510 where id = 'alicore-proj-1';
update media_slots set group_title = 'Projects',        sort_order = 520 where id = 'alicore-proj-2';
update media_slots set group_title = 'Projects',        sort_order = 530 where id = 'alicore-proj-3';
update media_slots set group_title = 'Projects',        sort_order = 540 where id = 'alicore-proj-4';
update media_slots set group_title = 'Projects',        sort_order = 550 where id = 'alicore-proj-5';
update media_slots set group_title = 'Projects',        sort_order = 560 where id = 'alicore-proj-6';

-- Titles say where the placement lands, now that the tab already says which
-- section it belongs to.
update media_slots set title = 'GFRC section — stage photograph' where id = 'alicore-gfrc';
update media_slots set title = 'FRP section — stage photograph'  where id = 'alicore-frp';
update media_slots set title = 'Production floor — two photographs' where id = 'alicore-factory';
update media_slots set title = 'Behind the six stages'          where id = 'alicore-journey';
update media_slots set title = 'Behind "Planning a project?"'    where id = 'alicore-planning';
update media_slots set title = 'Behind "Your Design. Our Manufacturing."' where id = 'alicore-custom';
update media_slots set title = 'Behind "Why Choose Alicore?"'    where id = 'alicore-why';
update media_slots set title = 'Who We Are — stage photographs'  where id = 'alicore-about';

-- ===========================================================================
-- Alicore -- seed data
--
-- media_slots is transcribed from the `groups` array in
-- design-mockup/Alicore Admin.dc.html. The 18 ids are referenced directly by
-- the built pages -- treat them as a contract, not as data.
-- ===========================================================================

insert into public.media_slots (id, group_title, title, placeholder, sort_order) values
  -- Home — Key Visuals (hero, about, materials, manufacturing)
  ('alicore-hero',    'Home — Key Visuals', 'Hero',        'Hero photograph — facade with GFRC panels / jali screens', 10),
  ('alicore-about',   'Home — Key Visuals', 'Who We Are',  'Close-up: GFRC surface texture / finished panel',          20),
  ('alicore-gfrc',    'Home — Key Visuals', 'GFRC Section','GFRC facade / jali screen close-up',                       30),
  ('alicore-frp',     'Home — Key Visuals', 'FRP Section', 'FRP element / moulded component photo',                    40),
  ('alicore-factory', 'Home — Key Visuals', 'Manufacturing','Production floor: GFRC spray / mould work',               50),

  -- Products (one photograph per product card)
  ('alicore-prod-1', 'Products', 'GFRC Architectural Panels',    'Large-format GFRC panel facade', 110),
  ('alicore-prod-2', 'Products', 'GFRC Cornices',                'Cornice profile detail',         120),
  ('alicore-prod-3', 'Products', 'GFRC Columns & Pillars',       'Column cladding at entrance',    130),
  ('alicore-prod-4', 'Products', 'GFRC Jalis',                   'Perforated jali screen',         140),
  ('alicore-prod-5', 'Products', 'GFRC Decorative Elements',     'Moulding and trim detail',       150),
  ('alicore-prod-6', 'Products', 'FRP Architectural Products',   'FRP moulded element',            160),
  ('alicore-prod-7', 'Products', 'Custom Architectural Elements','Custom element from drawing',    170),

  -- Projects (gallery tiles — replace as projects are approved)
  ('alicore-proj-1', 'Projects', 'Commercial',      'Commercial facade — GFRC panel system', 210),
  ('alicore-proj-2', 'Projects', 'Facades',         'Jali screen facade detail',             220),
  ('alicore-proj-3', 'Projects', 'Residential',     'Villa elevation with cornices',         230),
  ('alicore-proj-4', 'Projects', 'Interiors — FRP', 'Lobby feature element',                 240),
  ('alicore-proj-5', 'Projects', 'Interiors',       'Interior GFRC panelling',               250),
  ('alicore-proj-6', 'Projects', 'Custom Elements', 'Custom moulded element close-up',       260)
on conflict (id) do update
  set group_title = excluded.group_title,
      title       = excluded.title,
      placeholder = excluded.placeholder,
      sort_order  = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Projects: the mockup's six tiles. Category / material / product / application
-- are real design intent and are preserved. Names and locations stay at the
-- "Coming Soon" defaults until the client supplies verified project data --
-- see the brief, "Do not invent project names, clients or locations."
--
-- Published so the grid is never empty; swap in real data via /admin/projects.
-- ---------------------------------------------------------------------------
insert into public.projects
  (category, material, product, application, image_path, is_published, sort_order)
values
  ('Commercial',                    'GFRC',        'Facade panels',          'Building envelope',   'alicore-proj-1', true, 10),
  ('Facades',                       'GFRC',        'Jali screens',           'Shading screen',      'alicore-proj-2', true, 20),
  ('Residential',                   'GFRC',        'Cornices & mouldings',   'Elevation detailing', 'alicore-proj-3', true, 30),
  ('Interiors',                     'FRP',         'Decorative elements',    'Feature wall',        'alicore-proj-4', true, 40),
  ('Interiors',                     'GFRC',        'Wall panels',            'Interior cladding',   'alicore-proj-5', true, 50),
  ('Custom Architectural Elements', 'GFRC / FRP',  'Custom profiles',        'Bespoke element',     'alicore-proj-6', true, 60)
on conflict do nothing;

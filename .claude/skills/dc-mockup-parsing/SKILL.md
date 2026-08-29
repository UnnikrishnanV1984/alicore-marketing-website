---
name: dc-mockup-parsing
description: How to read and correctly interpret the "*.dc.html" design-tool export files in design-mockup/ (Alicore Home.dc.html, Alicore Admin.dc.html). Use this any time you open, quote, or extract information from a .dc.html file — the syntax looks like normal HTML/template code but several parts are NOT meant to be copied literally into the real site. Also covers which images in design-mockup/ are final brand assets versus reference material only.
---

# Reading .dc.html mockup exports

These files are exports from a visual design/prototyping tool, not hand-written
templates and not the final codebase. Do not copy them file-for-file into the real
site — parse them for design intent and content, then rebuild cleanly in whatever
stack the site-planner agent chooses.

## Structural conventions to recognize

- The whole document body is wrapped in `<x-dc><![CDATA[ ... ]]></x-dc>` — this is
  the design tool's container, not part of the real page. Ignore the wrapper itself;
  everything meaningful is inside it.
- `<script src="./support.js">` and `<script src="./image-slot.js">` are the design
  tool's runtime (drag-to-edit, image slot picking, etc.). Never carry these into
  production — they have no purpose outside the design tool.
- `<helmet>...</helmet>` near the top holds the real `<title>`, meta description, and
  font imports intended for the live page. Extract these values directly — they are
  final copy, not placeholders.

## Template-loop syntax is a data-model spec, not literal code

You'll see Mustache-style tokens like `{{ p.name }}`, `{{ products }}`,
`{{ pr.location }}`, `{{ w.desc }}`. These represent **repeated data-driven content**
— e.g. `{{ products }}` marks a loop over a list of product objects, and
`{{ p.name }}` / `{{ p.desc }}` / `{{ p.cat }}` are the fields on each item. Treat
these as a specification of the content/data model (what fields each repeating card,
product, project, or step needs) — not as executable template syntax to reproduce.
When you build the real site, decide independently whether that list should be
hard-coded, or backed by an admin-editable data source (see site-planner's job for
which sections should be admin-manageable, consistent with prior client sites'
"admin-managed product catalog" pattern).

Common repeating collections to expect in the Home mockup: `navItems`, `products`,
`categories`, `gfrcPoints`, `frpPoints`, `pillars` (the "Why Choose Alicore" cards),
`steps`/`journey` (custom-solutions process and manufacturing journey), `industries`,
`visibleProjects`. In the Admin mockup: an image-library list (`g.title` per item)
and an enquiries queue (currently empty in the mockup — "Nothing in the queue").

## `data-props` blocks are the design-token palette, not arbitrary metadata

Elements carry a `data-props="{...}"` JSON attribute describing which visual
properties are configurable in the design tool (e.g. an `accent` color with an
`options` array of hex values). Treat any `options` list you find here as the
sanctioned palette for that token — e.g. the accent/gold color options
(`#C0973F`, `#B08D3C`, `#8C8A82`, `#A8763A`) are the approved variants, not
suggestions to pick just one and ignore the rest if a component needs contrast
variants.

## Extracting the base design system

Pull colors, fonts, and spacing from the inline `<style>` block in the `<helmet>`,
not from individual element styles (which repeat the same tokens many times).
Expect: a warm off-white background, a near-black ink color, a metallic-gold accent,
and a font stack combining a display sans-serif, a body sans-serif, and a monospace
face for small labels/eyebrow text. Confirm exact hex/font values by reading the
`<style>` block yourself rather than assuming — the mockup is the source of truth for
exact values, the requirements brief is the source of truth for the palette's
*intent* (charcoal/near-black, warm white, concrete grey, subtle metallic/gold).

## Which images are final vs. reference-only

- `design-mockup/assets/*.jpg` — final brand assets (logo lockup, monogram, badge, hero
  facade photograph). Safe to use directly in the built site.
- `design-mockup/uploads/*.jpeg`, `design-mockup/uploads/pasted-*.png` — supporting material the
  client or designer attached alongside the brief (e.g. WhatsApp-shared reference
  photos, a pasted screenshot). Treat these as inspiration/reference for art
  direction, not confirmed final assets — flag to the user if the plan would place
  one of these directly on the live site, rather than assuming it's cleared for use.
- `design-mockup/uploads/alicore.html` — an earlier/alternate draft or reference file; check
  it for content ideas but the two top-level `.dc.html` files are the current mockup.

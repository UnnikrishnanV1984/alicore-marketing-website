# Alicore Website — Build Project

This repo turns the Alicore design mockup into a real, deployable website.

## What's here

- `design-mockup/` — the source-of-truth mockup, untouched:
  - `Alicore Home.dc.html` — full home page design (hero through footer, with anchor
    sections for About, Products, GFRC, FRP, Custom Solutions, Projects, Manufacturing,
    Quality, Industries, Contact)
  - `Alicore Admin.dc.html` — admin dashboard design (staff login, image library, enquiries)
  - `assets/` — final brand assets (logo lockup, monogram, badge, hero facade photo)
  - `uploads/Alicore_Requirements.txt` — the client's written brief (brand, structure,
    copy, do's/don'ts, SEO, mobile requirements) — this is the authority when it
    conflicts with anything inferred from the mockup
  - `uploads/*.jpeg`, `uploads/pasted-*.png`, `uploads/alicore.html` — reference/inspiration
    material supplied alongside the brief, not necessarily final production assets
- `.claude/agents/` — subagents for each phase of the build
- `.claude/skills/` — reference knowledge (mockup format, brand rules, CTA/form conventions)
  that any agent or the main thread should consult

Build output should NOT go inside `design-mockup/` — treat that folder as read-only reference.
Put the real site in a top-level `site/` (or `src/`) folder once the stack is decided.

## Pipeline

Run in this order (the `build-coordinator` agent will do this for you if you invoke it
directly, e.g. "use the build-coordinator agent to take this from mockup to done"):

1. **mockup-analyst** — reads everything in `design-mockup/` and produces
   `docs/DESIGN_SYSTEM.md` + `docs/CONTENT_INVENTORY.md`.
2. **site-planner** — reads those two docs plus the requirements brief and produces
   `docs/IMPLEMENTATION_PLAN.md` (site map, page/section structure, tech stack choice,
   data model for the admin-managed content, file layout). This agent must pause and
   ask you to confirm one open decision: the brief lists 9 separate pages, but the
   mockup implements most of them as anchored sections on a single long-scroll home
   page. Decide before building.
3. **frontend-builder** — implements the public site against the confirmed plan,
   matching the mockup's visual design closely.
4. **admin-builder** — implements the admin dashboard (image library management +
   enquiry/quote-request queue) from `Alicore Admin.dc.html`.
5. **qa-reviewer** — checks the finished build against the mockup, the brief's
   do's/don'ts, SEO requirements, and mobile requirements, and produces a punch list.

Each agent writes its output to `docs/` so later agents (and you) don't have to
re-derive earlier decisions.

## Ground rules for every agent

- The requirements brief overrides the mockup wherever they conflict (e.g. the brief's
  "do not invent project names/clients" and "do not claim ISO certification unless
  verified" apply even though the mockup shows sample project cards).
- Don't invent contact details, certifications, or client/project names. Use the
  placeholders already present in the mockup (`[ADD PHONE]`, `[ADD EMAIL]`,
  `[ADD ADDRESS]`, "Project Name — Coming Soon") until the real values are supplied.
- Keep the mockup's restrained, premium aesthetic: lots of white space, minimal
  animation, no stock-photo or cartoon look.

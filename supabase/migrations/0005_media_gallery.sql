-- ===========================================================================
-- Alicore -- product image galleries
--
-- Product card slots ('Products' group, alicore-prod-1..7) can now hold up to
-- 5 photographs each, which the public site cycles through with a crossfade.
-- Every other slot keeps behaving exactly as before: it only ever has one
-- image at position 1, so nothing about the hero/about/GFRC/FRP/manufacturing
-- sections or the project tiles changes.
-- ===========================================================================

alter table public.media_assets
  add column if not exists position smallint not null default 1
  check (position between 1 and 5);

-- Replace the old "one active row per slot" index with one scoped to
-- (slot_id, position), so a product slot can carry up to 5 concurrently
-- active rows -- one per position -- while every other slot is still
-- constrained to a single active row at position 1.
drop index if exists public.media_assets_one_active_per_slot;

create unique index if not exists media_assets_one_active_per_slot_position
  on public.media_assets (slot_id, position) where is_active;

-- Starter shop data: two size charts, prices, a few discounts, sizes and badges.
-- Run AFTER migrations 0004_shop.sql and 0005_size_charts.sql (Supabase → SQL Editor → paste → Run).
-- Safe to run more than once. Prices you've already set in the admin are kept;
-- everything here can be changed later in /admin.
--
-- The measurements are placeholders for a typical 240 GSM oversized blank and a
-- fleece zip jacket — replace them with your manufacturer's chart in Admin → Size charts.

-- ───────── size charts ─────────
insert into public.size_charts (name, unit, columns, rows, note, position) values
  ('Oversized Tee — 240 GSM', 'in', '{Chest,Length,Shoulder,Sleeve}',
   '[["XS","40","26.5","20","8.5"],["S","42","27.5","21","9"],["M","44","28.5","22","9.5"],["L","46","29.5","23","10"],["XL","48","30.5","24","10.5"],["XXL","50","31.5","25","11"]]',
   'Garment measured flat, chest is armpit to armpit × 2. Oversized fit — size down for a regular look.', 0),
  ('Fleece Zip Jacket', 'in', '{Chest,Length,Sleeve}',
   '[["S","42","26","24"],["M","44","27","24.5"],["L","46","28","25"],["XL","48","29","25.5"],["XXL","50","30","26"]]',
   'Garment measured flat. Relaxed fit with room for a tee underneath.', 1)
on conflict (name) do update
  set unit = excluded.unit, columns = excluded.columns, rows = excluded.rows, note = excluded.note, updated_at = now();

-- ───────── per design ─────────
-- slug, price, mrp (null = no discount), sizes in stock, availability, badges, size chart
with v (slug, price, mrp, sizes, stock, tags, chart) as (values
  ('rising',         1499, 1999, '{S,M,L,XL}',      'few_left', '{bestseller,limited}', 'Fleece Zip Jacket'),
  ('never-retreat',   799, null, '{S,M,L,XL,XXL}',  'in_stock', '{bestseller}',         'Oversized Tee — 240 GSM'),
  ('70-kms',          749,  999, '{S,M,L,XL,XXL}',  'in_stock', '{new}',                'Oversized Tee — 240 GSM'),
  ('dragon-drift',    799, null, '{M,L,XL}',        'in_stock', '{}',                   'Oversized Tee — 240 GSM'),
  ('saiyan-at-rest',  699,  899, '{S,M,L,XL,XXL}',  'in_stock', '{}',                   'Oversized Tee — 240 GSM'),
  ('wanna-be-yours',  799, null, '{S,M,L}',         'few_left', '{}',                   'Oversized Tee — 240 GSM'),
  ('inner-peace',     749, null, '{S,M,L,XL,XXL}',  'in_stock', '{new}',                'Oversized Tee — 240 GSM'),
  ('quattro',         849, 1099, '{S,M,L,XL}',      'in_stock', '{limited}',            'Oversized Tee — 240 GSM')
)
update public.designs d set
  price      = coalesce(d.price, v.price),                         -- keep prices already set in the admin
  mrp        = case when v.mrp > coalesce(d.price, v.price) then v.mrp else d.mrp end,
  sizes      = v.sizes::text[],
  stock      = v.stock,
  tags       = v.tags::text[],
  size_chart = v.chart,
  updated_at = now()
from v
where d.slug = v.slug;

-- what changed
select slug, price, mrp, sizes, stock, tags, size_chart from public.designs order by position;

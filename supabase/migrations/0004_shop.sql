-- Shop fields: original price (shown struck through), badges, sizes in stock, availability.
alter table public.designs add column if not exists mrp   numeric(10, 2) check (mrp is null or mrp >= 0);
alter table public.designs add column if not exists tags  text[] not null default '{}';   -- bestseller, new, limited
alter table public.designs add column if not exists sizes text[] not null default '{}';   -- sizes in stock: XS S M L XL XXL
alter table public.designs add column if not exists stock text   not null default 'in_stock'
  check (stock in ('in_stock', 'few_left', 'sold_out', 'coming_soon'));

-- Price per design, in rupees (null = not shown on the site).
alter table public.designs add column if not exists price numeric(10, 2) check (price is null or price >= 0);

-- Customer accounts (Google sign-in), wishlist, synced bag, saved addresses and orders.
-- Customers are ordinary Supabase auth users; only people in public.admins can edit
-- the site, so turning sign-ups on for Google is safe.
--
-- Orders are only ever created and marked paid by the Netlify functions (with the
-- service-role key, which bypasses RLS) — the browser can read its own orders, never write them.

-- ───────── wishlist ─────────
create table if not exists public.wishlist (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug       text not null references public.designs (slug) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);

-- ───────── bag (signed-in customers; guests keep theirs in the browser) ─────────
create table if not exists public.cart_items (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug       text not null references public.designs (slug) on update cascade on delete cascade,
  size       text not null default '',
  qty        int  not null check (qty between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, slug, size)
);

-- ───────── saved addresses ─────────
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  phone      text not null,
  line1      text not null,
  line2      text,
  city       text not null,
  state      text not null,
  pincode    text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

-- ───────── orders ─────────
create sequence if not exists public.order_number_seq start 1001;
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique default ('EDGE-' || nextval('public.order_number_seq')),
  user_id             uuid references auth.users (id) on delete set null,   -- null for guest checkout
  email               text not null,
  phone               text not null,
  name                text not null,
  address             jsonb not null,                                      -- {name, phone, line1, line2, city, state, pincode}
  items               jsonb not null,                                      -- [{slug, name, size, qty, price, image}]
  subtotal            numeric(10, 2) not null,
  shipping            numeric(10, 2) not null,
  total               numeric(10, 2) not null,
  currency            text not null default 'INR',
  status              text not null default 'pending'
                      check (status in ('pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled')),
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  note                text,                                                -- admin's own notes, e.g. tracking number
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  updated_at          timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

-- ───────── row level security ─────────
alter table public.wishlist   enable row level security;
alter table public.cart_items enable row level security;
alter table public.addresses  enable row level security;
alter table public.orders     enable row level security;

drop policy if exists "own wishlist" on public.wishlist;
create policy "own wishlist" on public.wishlist for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own bag" on public.cart_items;
create policy "own bag" on public.cart_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own addresses" on public.addresses;
create policy "own addresses" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

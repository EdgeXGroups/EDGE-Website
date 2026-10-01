-- EDGE — site content: designs, showroom, contact details, team.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
--
-- Who can do what:
--   everyone (the public site)  → read published designs, settings, team
--   admins (rows in public.admins) → write everything, upload images
-- Ordering tables come in a later migration.

-- ───────── admins ─────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ───────── settings (one row: contact details, showroom) ─────────
create table if not exists public.settings (
  id         int primary key default 1 check (id = 1),
  brand      jsonb  not null default '{}'::jsonb,   -- instagram, email, phone, whatsapp, location, tagline, drop…
  showroom   text[] not null default '{}',          -- three design slugs, first one starts in the light
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ───────── designs ─────────
create table if not exists public.designs (
  slug       text primary key check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  position   int  not null default 0,               -- order on the site (0 = first)
  name       text not null,
  type       text,
  category   text,
  tagline    text,
  accent     text not null default '#ff4a1c',
  garment    text,                                  -- fabric colour on the 3D tee
  model      text not null default 'tee' check (model in ('tee', 'card')),
  story      text[] not null default '{}',
  details    jsonb  not null default '[]'::jsonb,   -- [["Fit","Oversized"], …]
  images     text[] not null default '{}',          -- [front, back]
  prints     jsonb,                                 -- {"front": url, "back": url} for the 3D tee
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists designs_position_idx on public.designs (position);

-- ───────── team ─────────
create table if not exists public.team (
  id        uuid primary key default gen_random_uuid(),
  position  int  not null default 0,
  name      text not null,
  role      text,
  line      text,
  photo     text,
  instagram text
);

-- ───────── row level security ─────────
alter table public.admins   enable row level security;
alter table public.settings enable row level security;
alter table public.designs  enable row level security;
alter table public.team     enable row level security;

drop policy if exists "admins see themselves" on public.admins;
create policy "admins see themselves" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "settings are public" on public.settings;
create policy "settings are public" on public.settings for select to anon, authenticated using (true);
drop policy if exists "admins edit settings" on public.settings;
create policy "admins edit settings" on public.settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "published designs are public" on public.designs;
create policy "published designs are public" on public.designs for select to anon, authenticated
  using (published or (select public.is_admin()));
drop policy if exists "admins edit designs" on public.designs;
create policy "admins edit designs" on public.designs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "team is public" on public.team;
create policy "team is public" on public.team for select to anon, authenticated using (true);
drop policy if exists "admins edit team" on public.team;
create policy "admins edit team" on public.team for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ───────── everything the public site needs, in one request ─────────
create or replace function public.site_content()
returns json
language sql stable security invoker
set search_path = ''
as $$
  select json_build_object(
    'brand',    (select brand    from public.settings where id = 1),
    'showroom', (select showroom from public.settings where id = 1),
    'designs',  coalesce((select json_agg(d order by d.position) from public.designs d where d.published), '[]'::json),
    'team',     coalesce((select json_agg(t order by t.position) from public.team t), '[]'::json)
  );
$$;
grant execute on function public.site_content() to anon, authenticated;

-- ───────── image storage ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 6291456, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
drop policy if exists "admins update media" on storage.objects;
create policy "admins update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

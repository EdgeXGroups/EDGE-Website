-- Size charts, saved once by name (they depend on the blank's manufacturer) and
-- referenced from each design by that name. Renaming a chart follows through to
-- its designs; deleting one just clears it from them.

create table if not exists public.size_charts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  unit       text not null default 'in' check (unit in ('in', 'cm')),
  columns    text[] not null default '{Chest,Length,Shoulder}',  -- measurements, after the Size column
  rows       jsonb  not null default '[]'::jsonb,                -- [["S","42","27.5","21"], …]
  note       text,                                               -- e.g. "Measured flat. Oversized — size down for a regular fit."
  position   int  not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.designs add column if not exists size_chart text;
alter table public.designs drop constraint if exists designs_size_chart_fkey;
alter table public.designs add constraint designs_size_chart_fkey
  foreign key (size_chart) references public.size_charts (name) on update cascade on delete set null;

alter table public.size_charts enable row level security;
drop policy if exists "size charts are public" on public.size_charts;
create policy "size charts are public" on public.size_charts for select to anon, authenticated using (true);
drop policy if exists "admins edit size charts" on public.size_charts;
create policy "admins edit size charts" on public.size_charts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- the public site's one request now carries the size charts too
create or replace function public.site_content()
returns json
language sql stable security invoker
set search_path = ''
as $$
  select json_build_object(
    'brand',       (select brand    from public.settings where id = 1),
    'showroom',    (select showroom from public.settings where id = 1),
    'designs',     coalesce((select json_agg(d order by d.position) from public.designs d where d.published), '[]'::json),
    'team',        coalesce((select json_agg(t order by t.position) from public.team t), '[]'::json),
    'size_charts', coalesce((select json_agg(c order by c.position) from public.size_charts c), '[]'::json)
  );
$$;
grant execute on function public.site_content() to anon, authenticated;

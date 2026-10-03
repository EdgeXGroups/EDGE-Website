-- Shop numbers for the admin's Insights tab, worked out in the database.
-- Admins only (the function checks); it can read every customer's wishlist and bag
-- because it runs as its owner, but it only ever returns totals — never who.

create or replace function public.admin_insights(days int default 30)
returns json
language plpgsql stable security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(days, 1));
begin
  if not public.is_admin() then
    raise exception 'Only admins can see insights' using errcode = '42501';
  end if;

  return json_build_object(
    'period', json_build_object(
      'orders',  (select count(*) from public.orders o where o.status in ('paid', 'shipped', 'delivered') and o.paid_at >= since),
      'revenue', (select coalesce(sum(o.total), 0) from public.orders o where o.status in ('paid', 'shipped', 'delivered') and o.paid_at >= since),
      'items',   (select coalesce(sum((i ->> 'qty')::int), 0) from public.orders o, jsonb_array_elements(o.items) i
                  where o.status in ('paid', 'shipped', 'delivered') and o.paid_at >= since),
      'abandoned', (select count(*) from public.orders o where o.status in ('pending', 'failed') and o.created_at >= since),
      'customers', (select count(*) from auth.users u where u.created_at >= since)
    ),
    'all_time', json_build_object(
      'orders',  (select count(*) from public.orders o where o.status in ('paid', 'shipped', 'delivered')),
      'revenue', (select coalesce(sum(o.total), 0) from public.orders o where o.status in ('paid', 'shipped', 'delivered')),
      'customers', (select count(*) from auth.users)
    ),
    'most_ordered', coalesce((
      select json_agg(x) from (
        select i ->> 'slug' as slug, sum((i ->> 'qty')::int) as qty,
               sum((i ->> 'qty')::int * (i ->> 'price')::numeric) as revenue, count(distinct o.id) as orders
        from public.orders o, jsonb_array_elements(o.items) i
        where o.status in ('paid', 'shipped', 'delivered') and o.paid_at >= since
        group by 1 order by 2 desc, 3 desc limit 20
      ) x), '[]'::json),
    'sizes', coalesce((
      select json_agg(x) from (
        select coalesce(nullif(i ->> 'size', ''), 'One size') as size, sum((i ->> 'qty')::int) as qty
        from public.orders o, jsonb_array_elements(o.items) i
        where o.status in ('paid', 'shipped', 'delivered') and o.paid_at >= since
        group by 1 order by 2 desc
      ) x), '[]'::json),
    -- right now (wishlists and bags aren't history, they're what people have saved today)
    'most_wishlisted', coalesce((
      select json_agg(x) from (
        select w.slug, count(*) as people from public.wishlist w group by 1 order by 2 desc limit 20
      ) x), '[]'::json),
    'most_in_bags', coalesce((
      select json_agg(x) from (
        select c.slug, sum(c.qty) as qty, count(distinct c.user_id) as people from public.cart_items c group by 1 order by 2 desc limit 20
      ) x), '[]'::json)
  );
end;
$$;

revoke all on function public.admin_insights(int) from public, anon;
grant execute on function public.admin_insights(int) to authenticated;

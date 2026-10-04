-- Two-step sign-in for admins. An admin counts as an admin only when this session
-- also passed the authenticator-app code (Supabase "aal2"). A stolen password alone
-- can no longer edit designs, prices, orders, the team or uploads — every policy
-- that uses is_admin() (and the admin_insights() function) now needs both steps.
--
-- Run this AFTER you've set up the authenticator app in /admin (the admin page walks
-- you through it on your next sign-in). Lost your phone? Supabase → Authentication →
-- Users → your user → remove the MFA factor, then sign in and set it up again.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

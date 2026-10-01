-- Make an existing Supabase user an admin of /admin.
-- 1. Supabase → Authentication → Users → Add user → "Create new user"
--    (enter the email + a password, tick "Auto Confirm User").
-- 2. Put that email below, then run this in the SQL Editor.
insert into public.admins (user_id)
select id from auth.users where email = 'edgexgroups@gmail.com'
on conflict (user_id) do nothing;

-- Check: should list the admin(s)
select u.email, a.created_at from public.admins a join auth.users u on u.id = a.user_id;

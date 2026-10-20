-- Bind $1 to the authenticated username using the caller's PostgreSQL driver.
-- This query is role lookup, not password verification or door authorization.
SELECT user_id::text AS user_id, username, role_id, role_code, api_role
FROM public.radius_user_roles
WHERE username = $1;

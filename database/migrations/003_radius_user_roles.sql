-- Apply to cedatabase in a transaction, e.g. psql -1 -v ON_ERROR_STOP=1 -f this-file.sql.
-- Add role lookup without modifying radcheck, passwords, users or existing logins.
CREATE OR REPLACE VIEW public.radius_user_roles
WITH (security_barrier = true) AS
SELECT
    u.user_id,
    u.username,
    r.role_id,
    r.role_code,
    CASE r.role_code
        WHEN 'STUDENT' THEN 'student'
        WHEN 'PROFESSOR' THEN 'teacher'
        WHEN 'ADMIN' THEN 'admin'
        WHEN 'STAFF' THEN 'staff'
        ELSE lower(r.role_code)
    END AS api_role,
    u.is_active
FROM public.users AS u
JOIN public.roles AS r ON r.role_id = u.role_id
WHERE u.is_active = true;

REVOKE ALL ON public.radius_user_roles FROM PUBLIC;

-- Do not create/reset service credentials or change the currently working RADIUS login.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'radius_reader') THEN
        GRANT SELECT ON public.radius_user_roles TO radius_reader;
    END IF;
END;
$$;

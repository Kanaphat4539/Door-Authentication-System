-- Run as postgres with psql, database cedatabase. Passwords are prompted, never committed.
-- Creates dedicated accounts without changing the legacy ceadmin account used by group 1.
\set ON_ERROR_STOP on
\prompt 'New portal_app password: ' portal_password
\prompt 'New radius_reader password: ' radius_password
\prompt 'New auth_reader password: ' auth_password
BEGIN;
SELECT 'CREATE ROLE portal_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_app') \gexec
SELECT 'CREATE ROLE radius_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'radius_reader') \gexec
SELECT 'CREATE ROLE auth_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_reader') \gexec
SELECT format('ALTER ROLE portal_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'portal_password') \gexec
SELECT format('ALTER ROLE radius_reader NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'radius_password') \gexec
SELECT format('ALTER ROLE auth_reader NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'auth_password') \gexec
GRANT CONNECT ON DATABASE cedatabase TO portal_app, radius_reader, auth_reader;
GRANT USAGE ON SCHEMA public TO portal_app, radius_reader, auth_reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM portal_app, radius_reader, auth_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users, public.students, public.professors TO portal_app;
GRANT SELECT ON public.departments, public.majors, public.roles, public.radcheck TO portal_app;
GRANT SELECT ON public.radcheck TO radius_reader;
GRANT SELECT ON public.users, public.roles, public.view_students, public.view_professors TO auth_reader;
COMMIT;
-- Update portal env / group 1 configuration separately and test each account.
-- Only after all clients migrate: revoke the legacy account's elevated privileges.

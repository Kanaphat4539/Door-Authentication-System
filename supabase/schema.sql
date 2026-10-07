-- ==============================================================================
-- PROJECT: CE Student User Database (Group 2)
-- DATABASE: PostgreSQL on Supabase
-- INTEGRATION: FreeRADIUS (Group 1) 802.1X Authentication & Web CRUD Admin
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE NOT NULL,             -- Username for RADIUS / Student ID
    full_name VARCHAR(150) NOT NULL,                    -- Display name
    email VARCHAR(150),                                 -- Student / Staff Email
    password_text VARCHAR(255) NOT NULL,                -- Plaintext / Cleartext password required for RADIUS PEAP-MSCHAPv2
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'guest')),
    is_active BOOLEAN DEFAULT TRUE,                     -- Status toggle: TRUE = can authenticate, FALSE = blocked
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high-performance lookup by student_id
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 3. FreeRADIUS Compatibility View (Group 1 Integration)
-- FreeRADIUS queries the standard 'radcheck' table:
-- SELECT id, username, attribute, value, op FROM radcheck WHERE username = '%{SQL-User-Name}' ORDER BY id;
-- ==============================================================================
CREATE OR REPLACE VIEW public.radcheck AS
SELECT 
    id::text AS id,
    student_id AS username,
    'Cleartext-Password' AS attribute,
    ':=' AS op,
    password_text AS value
FROM public.users
WHERE is_active = TRUE;

-- Additional View for NT-Password (NTLM hash) if Group 1 uses NT-Hash instead:
-- FreeRADIUS: SELECT id, username, attribute, value, op FROM radcheck_nt WHERE username = ...
-- Note: NT-Hash can be calculated in application code or PostgreSQL if required.

-- ==============================================================================
-- 4. Row Level Security (RLS) Settings
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for Public Anon / Authenticated (Development & API access)
DROP POLICY IF EXISTS "Allow anon all operations" ON public.users;
CREATE POLICY "Allow anon all operations" ON public.users
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. Seed Initial Demo Students
-- ==============================================================================
INSERT INTO public.users (student_id, full_name, email, password_text, role, is_active)
VALUES
    ('65010001', 'สมชาย เรียนดี', 'somchai.r@ce.kmitl.ac.th', 'pass1234', 'student', TRUE),
    ('65010002', 'สมหญิง รักสงบ', 'somying.r@ce.kmitl.ac.th', 'pass5678', 'student', TRUE),
    ('65010003', 'ประสิทธิ์ มีปัญญา', 'prasit.m@ce.kmitl.ac.th', 'ce2026pass', 'student', TRUE),
    ('64010555', 'ดร.วิชาญ พัฒนา', 'wichan.p@ce.kmitl.ac.th', 'admin_secret99', 'teacher', TRUE),
    ('admin01', 'ผู้ดูแลระบบ เครือข่าย', 'admin@ce.kmitl.ac.th', 'Admin@2026!', 'admin', TRUE),
    ('guest001', 'ผู้มาติดต่อชั่วคราว', 'visitor@ce.kmitl.ac.th', 'guest#123', 'guest', FALSE)
ON CONFLICT (student_id) DO NOTHING;

-- ==============================================================================
-- 6. Dedicated Read-Only Database Role for RADIUS Server (Optional Security)
-- Run this if you want Group 1 (RADIUS) to connect using a restricted account
-- ==============================================================================
-- CREATE ROLE radius_reader WITH LOGIN PASSWORD 'radius_secure_password_here';
-- GRANT CONNECT ON DATABASE postgres TO radius_reader;
-- GRANT USAGE ON SCHEMA public TO radius_reader;
-- GRANT SELECT ON public.radcheck TO radius_reader;
-- GRANT SELECT ON public.users TO radius_reader;

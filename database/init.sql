-- ==============================================================================
-- PROJECT: CE Database Server (Group 2)
-- SYSTEM: Central User Database for Wi-Fi 802.1X (RADIUS) & IoT Door Access
-- SPECIFICATION: ตามเอกสาร "ข้อมูลที่จะเก็บลง Database ในกลุ่ม 2"
-- COMPATIBILITY: Standard PostgreSQL (Debian VM 192.168.100.102)
-- ==============================================================================

-- 1. Enable Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Master Tables: departments, majors, roles
-- ==============================================================================

-- 4. departments (ภาควิชา)
CREATE TABLE IF NOT EXISTS public.departments (
    department_code VARCHAR(20) PRIMARY KEY,
    department_name_th VARCHAR(150) NOT NULL,
    department_name_en VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. majors (สาขาวิชา)
CREATE TABLE IF NOT EXISTS public.majors (
    major_code VARCHAR(20) PRIMARY KEY,
    department_code VARCHAR(20) NOT NULL REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    major_name_th VARCHAR(150) NOT NULL,
    major_name_en VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. roles (บทบาท)
CREATE TABLE IF NOT EXISTS public.roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,      -- e.g. 'STUDENT', 'PROFESSOR', 'ADMIN', 'STAFF'
    role_name_th VARCHAR(100) NOT NULL         -- e.g. 'นักศึกษา', 'อาจารย์', 'ผู้ดูแลระบบ', 'เจ้าหน้าที่'
);

-- ==============================================================================
-- 3. Core Users Table: users (เก็บข้อมูลบุคคลกลาง)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,       -- ใช้เป็น Login Username / RADIUS Identifier
    password VARCHAR(255) NOT NULL,            -- สำหรับ RADIUS PEAP-MSCHAPv2 (Cleartext-Password)
    prefix_th VARCHAR(20),                     -- นาย, นางสาว, อ., ดร., ผศ.ดร.
    first_name_th VARCHAR(100) NOT NULL,       -- ชื่อจริง (ไทย)
    last_name_th VARCHAR(100) NOT NULL,        -- นามสกุล (ไทย)
    prefix_en VARCHAR(20),                     -- Mr., Ms., Dr., Asst. Prof.
    first_name_en VARCHAR(100),                -- First name (EN)
    last_name_en VARCHAR(100),                 -- Last name (EN)
    email VARCHAR(150),                        -- อีเมล
    phone VARCHAR(20),                         -- เบอร์โทรศัพท์
    role_id INT NOT NULL REFERENCES public.roles(role_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,            -- ควบคุมสิทธิ์เข้าใช้ระบบ (TRUE = ใช้งานได้, FALSE = ระงับ)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
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
EXECUTE FUNCTION update_timestamp_column();

-- ==============================================================================
-- 4. Specific Entity Tables: students & professors
-- ==============================================================================

-- 2. students (เก็บเฉพาะข้อมูลที่เป็นนักศึกษา)
CREATE TABLE IF NOT EXISTS public.students (
    student_id VARCHAR(50) PRIMARY KEY,         -- รหัสนักศึกษา (เช่น 65010001)
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    department_code VARCHAR(20) NOT NULL REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    major_code VARCHAR(20) NOT NULL REFERENCES public.majors(major_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    year_level INT NOT NULL CHECK (year_level >= 1 AND year_level <= 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_students_updated_at ON public.students;
CREATE TRIGGER trigger_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- 3. professors (เก็บเฉพาะข้อมูลอาจารย์)
CREATE TABLE IF NOT EXISTS public.professors (
    professor_id VARCHAR(50) PRIMARY KEY,       -- รหัสประจำตัวอาจารย์ (เช่น PROF001)
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    department_code VARCHAR(20) NOT NULL REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_professors_updated_at ON public.professors;
CREATE TRIGGER trigger_professors_updated_at
BEFORE UPDATE ON public.professors
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- ==============================================================================
-- 5. Indexes for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_professors_user_id ON public.professors(user_id);

-- ==============================================================================
-- 6. RADIUS Compatibility View (Group 1 Integration)
-- FreeRADIUS queries standard 'radcheck' table:
-- SELECT id, username, attribute, value, op FROM radcheck WHERE username = '%{SQL-User-Name}';
-- ==============================================================================
CREATE OR REPLACE VIEW public.radcheck AS
SELECT 
    u.user_id::text AS id,
    u.username AS username,
    'Cleartext-Password' AS attribute,
    ':=' AS op,
    u.password AS value
FROM public.users u
WHERE u.is_active = TRUE;

-- ==============================================================================
-- 7. Convenient Views for Admin Web Portal & APIs
-- ==============================================================================

-- View ข้อมูลนักศึกษาแบบเต็ม (รวม users, departments, majors, roles)
CREATE OR REPLACE VIEW public.view_students AS
SELECT 
    s.student_id,
    u.user_id,
    u.username,
    u.prefix_th,
    u.first_name_th,
    u.last_name_th,
    TRIM(CONCAT(COALESCE(u.prefix_th, ''), ' ', u.first_name_th, ' ', u.last_name_th)) AS full_name_th,
    u.prefix_en,
    u.first_name_en,
    u.last_name_en,
    TRIM(CONCAT(COALESCE(u.prefix_en, ''), ' ', u.first_name_en, ' ', u.last_name_en)) AS full_name_en,
    u.email,
    u.phone,
    u.is_active,
    s.year_level,
    d.department_code,
    d.department_name_th,
    d.department_name_en,
    m.major_code,
    m.major_name_th,
    m.major_name_en,
    r.role_code,
    r.role_name_th,
    s.created_at,
    s.updated_at
FROM public.students s
JOIN public.users u ON s.user_id = u.user_id
JOIN public.roles r ON u.role_id = r.role_id
JOIN public.departments d ON s.department_code = d.department_code
JOIN public.majors m ON s.major_code = m.major_code;

-- View ข้อมูลอาจารย์แบบเต็ม (รวม users, departments, roles)
CREATE OR REPLACE VIEW public.view_professors AS
SELECT 
    p.professor_id,
    u.user_id,
    u.username,
    u.prefix_th,
    u.first_name_th,
    u.last_name_th,
    TRIM(CONCAT(COALESCE(u.prefix_th, ''), ' ', u.first_name_th, ' ', u.last_name_th)) AS full_name_th,
    u.prefix_en,
    u.first_name_en,
    u.last_name_en,
    TRIM(CONCAT(COALESCE(u.prefix_en, ''), ' ', u.first_name_en, ' ', u.last_name_en)) AS full_name_en,
    u.email,
    u.phone,
    u.is_active,
    d.department_code,
    d.department_name_th,
    d.department_name_en,
    r.role_code,
    r.role_name_th,
    p.created_at,
    p.updated_at
FROM public.professors p
JOIN public.users u ON p.user_id = u.user_id
JOIN public.roles r ON u.role_id = r.role_id
JOIN public.departments d ON p.department_code = d.department_code;

-- ==============================================================================
-- 8. Seed Initial Master & Demo Data
-- ==============================================================================

-- Insert roles
INSERT INTO public.roles (role_id, role_code, role_name_th) VALUES
    (1, 'STUDENT', 'นักศึกษา'),
    (2, 'PROFESSOR', 'อาจารย์'),
    (3, 'ADMIN', 'ผู้ดูแลระบบ'),
    (4, 'STAFF', 'เจ้าหน้าที่')
ON CONFLICT (role_id) DO NOTHING;

-- Insert departments
INSERT INTO public.departments (department_code, department_name_th, department_name_en) VALUES
    ('CPE', 'ภาควิชาวิศวกรรมคอมพิวเตอร์', 'Department of Computer Engineering'),
    ('EE', 'ภาควิชาวิศวกรรมไฟฟ้า', 'Department of Electrical Engineering'),
    ('ME', 'ภาควิชาวิศวกรรมเครื่องกล', 'Department of Mechanical Engineering')
ON CONFLICT (department_code) DO NOTHING;

-- Insert majors
INSERT INTO public.majors (major_code, department_code, major_name_th, major_name_en) VALUES
    ('CPE-BENG', 'CPE', 'วิศวกรรมคอมพิวเตอร์ (วศ.บ.)', 'Computer Engineering (B.Eng.)'),
    ('IOT-BENG', 'CPE', 'วิศวกรรมไอโอทีและระบบสารสนเทศ', 'IoT and Information Systems (B.Eng.)'),
    ('EE-BENG', 'EE', 'วิศวกรรมไฟฟ้า (วศ.บ.)', 'Electrical Engineering (B.Eng.)')
ON CONFLICT (major_code) DO NOTHING;

-- Insert Demo Users
INSERT INTO public.users (user_id, username, password, prefix_th, first_name_th, last_name_th, prefix_en, first_name_en, last_name_en, email, phone, role_id, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', '65010001', 'pass1234', 'นาย', 'สมชาย', 'เรียนดี', 'Mr.', 'Somchai', 'Reandee', 'somchai.r@ce.kmitl.ac.th', '0812345678', 1, TRUE),
    ('22222222-2222-2222-2222-222222222222', '65010002', 'pass5678', 'นางสาว', 'สมหญิง', 'รักสงบ', 'Ms.', 'Somying', 'Raksangob', 'somying.r@ce.kmitl.ac.th', '0898765432', 1, TRUE),
    ('33333333-3333-3333-3333-333333333333', '65010003', 'ce2026pass', 'นาย', 'ประสิทธิ์', 'มีปัญญา', 'Mr.', 'Prasit', 'Meepanya', 'prasit.m@ce.kmitl.ac.th', '0851122334', 1, TRUE),
    ('44444444-4444-4444-4444-444444444444', 'prof_wichan', 'prof_secret99', 'ดร.', 'วิชาญ', 'พัฒนา', 'Dr.', 'Wichan', 'Pattana', 'wichan.p@ce.kmitl.ac.th', '0819998877', 2, TRUE),
    ('55555555-5555-5555-5555-555555555555', 'admin01', 'Admin@2026!', 'นาย', 'สุรชัย', 'ผู้ดูแลเครือข่าย', 'Mr.', 'Surachai', 'NetworkAdmin', 'admin@ce.kmitl.ac.th', '0800000000', 3, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Insert Demo Students
INSERT INTO public.students (student_id, user_id, department_code, major_code, year_level) VALUES
    ('65010001', '11111111-1111-1111-1111-111111111111', 'CPE', 'CPE-BENG', 3),
    ('65010002', '22222222-2222-2222-2222-222222222222', 'CPE', 'IOT-BENG', 3),
    ('65010003', '33333333-3333-3333-3333-333333333333', 'CPE', 'CPE-BENG', 2)
ON CONFLICT (student_id) DO NOTHING;

-- Insert Demo Professors
INSERT INTO public.professors (professor_id, user_id, department_code) VALUES
    ('PROF001', '44444444-4444-4444-4444-444444444444', 'CPE')
ON CONFLICT (professor_id) DO NOTHING;

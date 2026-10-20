import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { InputError, parseUserInput, UUID } from '@/lib/user-input';

// Never select password into browser responses.
const userSelect = `SELECT u.user_id::text AS id, u.username AS student_id,
  CONCAT(COALESCE(u.prefix_th, ''), u.first_name_th, ' ', u.last_name_th) AS full_name,
  u.first_name_th, u.last_name_th, u.prefix_th, u.email, u.phone,
  CASE r.role_code WHEN 'STUDENT' THEN 'student' WHEN 'PROFESSOR' THEN 'teacher'
    WHEN 'ADMIN' THEN 'admin' ELSE 'staff' END AS role,
  u.is_active, COALESCE(s.department_code, p.department_code) AS department_code,
  s.major_code, s.year_level, u.created_at, u.updated_at
  FROM public.users u JOIN public.roles r ON r.role_id = u.role_id
  LEFT JOIN public.students s ON s.user_id = u.user_id
  LEFT JOIN public.professors p ON p.user_id = u.user_id`;

function fail(error: unknown) {
  if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error instanceof InputError ? error.message : 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
  const code = (error as { code?: string })?.code;
  if (code === '23505') return NextResponse.json({ error: 'Username หรือรหัสประจำตัวซ้ำกับผู้ใช้ที่มีอยู่' }, { status: 409 });
  if (['23503', '23514', '23502'].includes(code || '')) return NextResponse.json({ error: 'ข้อมูลอ้างอิงหรือข้อมูลที่จำเป็นไม่ถูกต้อง' }, { status: 400 });
  // Do not log SQL statements/parameters, which may contain credentials or personal data.
  console.error('User database operation failed', { code: code || 'unknown' });
  return NextResponse.json({ error: 'บันทึกหรืออ่านฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ', connected: false }, { status: 503 });
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const result = await pool.query(`${userSelect} ORDER BY u.username ASC, u.user_id`);
    return NextResponse.json({ connected: true, users: result.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error); }
}

async function syncProfile(client: PoolClient, id: string, username: string, roleCode: string, values: Record<string, string | number | boolean | null>) {
  if (roleCode === 'STUDENT') {
    const existing = (await client.query('SELECT * FROM public.students WHERE user_id = $1', [id])).rows[0];
    const department = values.department_code ?? existing?.department_code;
    const major = values.major_code ?? existing?.major_code;
    const year = values.year_level ?? existing?.year_level;
    if (!department || !major || !year) throw new InputError('นักศึกษาต้องระบุภาควิชา สาขา และชั้นปี');
    const match = await client.query('SELECT 1 FROM public.majors WHERE major_code = $1 AND department_code = $2', [major, department]);
    if (!match.rowCount) throw new InputError('สาขาไม่อยู่ในภาควิชาที่เลือก');
    await client.query(`INSERT INTO public.students (student_id, user_id, department_code, major_code, year_level)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET student_id = EXCLUDED.student_id,
      department_code = EXCLUDED.department_code, major_code = EXCLUDED.major_code, year_level = EXCLUDED.year_level`, [username, id, department, major, year]);
    await client.query('DELETE FROM public.professors WHERE user_id = $1', [id]);
  } else if (roleCode === 'PROFESSOR') {
    const existing = (await client.query('SELECT * FROM public.professors WHERE user_id = $1', [id])).rows[0];
    const department = values.department_code ?? existing?.department_code;
    if (!department) throw new InputError('อาจารย์ต้องระบุภาควิชา');
    await client.query(`INSERT INTO public.professors (professor_id, user_id, department_code) VALUES ($1,$2,$3)
      ON CONFLICT (user_id) DO UPDATE SET department_code = EXCLUDED.department_code`, [username, id, department]);
    await client.query('DELETE FROM public.students WHERE user_id = $1', [id]);
  } else {
    await client.query('DELETE FROM public.students WHERE user_id = $1', [id]);
    await client.query('DELETE FROM public.professors WHERE user_id = $1', [id]);
  }
}

async function save(req: NextRequest, creating: boolean) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let client: PoolClient | undefined;
  try {
    const { id, values } = parseUserInput(await req.json(), creating);
    client = await pool.connect();
    await client.query('BEGIN');
    let userId = id;
    let oldRole: string | undefined;
    let oldUsername: string | undefined;
    if (!creating) {
      const current = await client.query(`SELECT u.username, r.role_code FROM public.users u
        JOIN public.roles r ON r.role_id = u.role_id WHERE u.user_id = $1 FOR UPDATE OF u`, [id]);
      if (!current.rowCount) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 }); }
      oldRole = current.rows[0].role_code;
      oldUsername = current.rows[0].username;
    }
    const columns: Record<string, unknown> = {};
    if ('student_id' in values) columns.username = values.student_id;
    if ('password_text' in values) columns.password = values.password_text;
    if ('email' in values) columns.email = values.email;
    if ('is_active' in values) columns.is_active = values.is_active;
    if (typeof values.full_name === 'string') {
      const parts = values.full_name.split(/\s+/);
      columns.prefix_th = null; // The editable full name includes any prefix already.
      columns.first_name_th = parts[0];
      columns.last_name_th = parts.slice(1).join(' ') || '-';
    }
    if (values.role_code) {
      const role = await client.query('SELECT role_id FROM public.roles WHERE role_code = $1', [values.role_code]);
      if (!role.rowCount) throw new InputError('ยังไม่ได้ตั้งค่าบทบาทนี้ในฐานข้อมูล');
      columns.role_id = role.rows[0].role_id;
    }
    if (creating && !('is_active' in columns)) columns.is_active = true;
    const entries = Object.entries(columns);
    if (creating) {
      const inserted = await client.query(`INSERT INTO public.users (${entries.map(([key]) => key).join(',')})
        VALUES (${entries.map((_, i) => `$${i + 1}`).join(',')}) RETURNING user_id`, entries.map(([, value]) => value));
      userId = inserted.rows[0].user_id;
    } else if (entries.length) {
      await client.query(`UPDATE public.users SET ${entries.map(([key], i) => `${key} = $${i + 1}`).join(',')}, updated_at = NOW()
        WHERE user_id = $${entries.length + 1}`, [...entries.map(([, value]) => value), id]);
    }
    // A status-only request deliberately leaves role and profile unchanged.
    const profileChanged = creating || ['role_code', 'student_id', 'department_code', 'major_code', 'year_level'].some(key => key in values);
    if (profileChanged) await syncProfile(client, userId!, String(values.student_id ?? oldUsername), String(values.role_code ?? oldRole), values);
    const saved = await client.query(`${userSelect} WHERE u.user_id = $1`, [userId]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true, user: saved.rows[0] }, { status: creating ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return fail(error);
  } finally { client?.release(); }
}

export async function POST(req: NextRequest) { return save(req, true); }
export async function PUT(req: NextRequest) { return save(req, false); }

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'กรุณาระบุ ID ผู้ใช้ที่ถูกต้อง' }, { status: 400 });
  try {
    const result = await pool.query('DELETE FROM public.users WHERE user_id = $1 RETURNING user_id', [id]);
    if (!result.rowCount) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return fail(error); }
}

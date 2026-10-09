import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        u.user_id::text AS id,
        u.username AS student_id,
        CONCAT(COALESCE(u.prefix_th, ''), u.first_name_th, ' ', u.last_name_th) AS full_name,
        u.first_name_th,
        u.last_name_th,
        u.prefix_th,
        u.email,
        u.phone,
        u.password AS password_text,
        CASE 
          WHEN LOWER(r.role_code) LIKE '%admin%' THEN 'admin'
          WHEN LOWER(r.role_code) LIKE '%prof%' OR LOWER(r.role_code) LIKE '%teacher%' THEN 'teacher'
          WHEN LOWER(r.role_code) LIKE '%student%' THEN 'student'
          ELSE 'guest'
        END AS role,
        u.is_active,
        s.department_code,
        s.major_code,
        s.year_level,
        u.created_at,
        u.updated_at
      FROM public.users u
      LEFT JOIN public.roles r ON u.role_id = r.role_id
      LEFT JOIN public.students s ON u.user_id = s.user_id
      ORDER BY u.created_at DESC;
    `;

    const result = await pool.query(query);
    return NextResponse.json({
      connected: true,
      users: result.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json(
      {
        connected: false,
        error: message,
        users: [],
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { student_id, full_name, email, password_text, role, is_active } = body;

    if (!student_id || !full_name || !password_text) {
      return NextResponse.json(
        { error: 'กรุณากรอก Username/Student ID, ชื่อ-นามสกุล และรหัสผ่าน' },
        { status: 400 }
      );
    }

    // Determine role_id (1: STUDENT, 2: PROFESSOR, 3: ADMIN)
    let roleId = 1;
    if (role === 'admin') roleId = 3;
    else if (role === 'teacher') roleId = 2;

    const nameParts = full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || student_id;
    const lastName = nameParts.slice(1).join(' ') || '-';

    // Insert user
    const userInsertQuery = `
      INSERT INTO public.users (
        username, password, first_name_th, last_name_th, email, role_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, username, created_at, updated_at;
    `;

    const userRes = await pool.query(userInsertQuery, [
      student_id.trim(),
      password_text.trim(),
      firstName,
      lastName,
      email?.trim() || null,
      roleId,
      is_active ?? true,
    ]);

    const createdUser = userRes.rows[0];

    // If student, also link into public.students
    if (roleId === 1) {
      await pool.query(
        `INSERT INTO public.students (student_id, user_id, department_code, major_code, year_level)
         VALUES ($1, $2, 'CPE', 'CPE-BENG', 1)
         ON CONFLICT (student_id) DO NOTHING;`,
        [student_id.trim(), createdUser.user_id]
      );
    }

    return NextResponse.json({
      success: true,
      user: createdUser,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database insertion error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, student_id, full_name, email, password_text, role, is_active } = body;

    let roleId = 1;
    if (role === 'admin') roleId = 3;
    else if (role === 'teacher') roleId = 2;

    const nameParts = full_name ? full_name.trim().split(/\s+/) : [];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const updateQuery = `
      UPDATE public.users
      SET 
        password = COALESCE($1, password),
        first_name_th = COALESCE($2, first_name_th),
        last_name_th = COALESCE($3, last_name_th),
        email = COALESCE($4, email),
        role_id = COALESCE($5, role_id),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE user_id::text = $7 OR username = $8
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      password_text ? password_text.trim() : null,
      firstName || null,
      lastName || null,
      email ? email.trim() : null,
      roleId,
      typeof is_active === 'boolean' ? is_active : null,
      id || '',
      student_id || '',
    ]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database update error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const student_id = searchParams.get('student_id');

    if (!id && !student_id) {
      return NextResponse.json({ error: 'กรุณาระบุ ID หรือ Student ID' }, { status: 400 });
    }

    const deleteQuery = `
      DELETE FROM public.users
      WHERE user_id::text = $1 OR username = $2
      RETURNING user_id, username;
    `;

    const result = await pool.query(deleteQuery, [id || '', student_id || '']);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database deletion error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { UUID } from '@/lib/user-input';

const headers = { 'Cache-Control': 'no-store', 'Vary': 'Cookie' };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'ID ผู้ใช้ไม่ถูกต้อง' }, { status: 400, headers });
  try {
    // Return only the requested account's password after checking the admin session.
    const result = await pool.query('SELECT password FROM public.users WHERE user_id=$1', [id]);
    if (!result.rowCount) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404, headers });
    return NextResponse.json({ password_text: result.rows[0].password }, { headers });
  } catch {
    return NextResponse.json({ error: 'อ่านรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล' }, { status: 503, headers });
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const definitions = [
  ['users', 'ข้อมูลบุคคลกลาง'], ['radcheck', 'View สำหรับ FreeRADIUS (กลุ่ม 1)'],
  ['students', 'ข้อมูลนักศึกษา'], ['professors', 'ข้อมูลอาจารย์'],
  ['departments', 'ภาควิชา'], ['majors', 'สาขาวิชา'], ['roles', 'บทบาทผู้ใช้'],
];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const start = Date.now();
  const info = {
    host: process.env.DB_HOST || '192.168.100.102', port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'cedatabase', user: process.env.DB_USER || 'ceadmin',
  };
  try {
    const ping = await pool.query('SELECT version() AS version');
    const latency = Date.now() - start;
    const tables = await Promise.all(definitions.map(async ([name, description]) => {
      try {
        // Identifiers come exclusively from the fixed list above.
        const result = await pool.query(`SELECT COUNT(*)::int AS count FROM public.${name}`);
        return { name, description, count: result.rows[0].count, status: 'ok' };
      } catch {
        return { name, description, status: 'error', message: 'อ่านตารางหรือ View ไม่สำเร็จ กรุณาตรวจสอบโครงสร้างและสิทธิ์' };
      }
    }));
    const healthy = tables.every(table => table.status === 'ok');
    return NextResponse.json({ ...info, connected: true, healthy, latency,
      version: ping.rows[0].version.split(' ')[1], tables,
      ...(healthy ? {} : { error: 'เชื่อมต่อได้ แต่บางตารางหรือ View ไม่พร้อมใช้งาน' }),
    }, { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ...info, connected: false, healthy: false, latency: null,
      error: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบเครือข่ายและค่าการเชื่อมต่อ',
      tables: definitions.map(([name, description]) => ({ name, description, status: 'error' })),
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

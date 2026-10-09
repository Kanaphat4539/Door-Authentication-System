import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  try {
    // 1. Test ping / latency
    const pingRes = await pool.query('SELECT NOW() as current_time, version() as pg_version;');
    const latency = Date.now() - startTime;

    // 2. Query table counts
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM public.users').catch(() => ({ rows: [{ count: 0 }] })),
      pool.query('SELECT COUNT(*)::int as count FROM public.radcheck').catch(() => ({ rows: [{ count: 0 }] })),
      pool.query('SELECT COUNT(*)::int as count FROM public.students').catch(() => ({ rows: [{ count: 0 }] })),
      pool.query('SELECT COUNT(*)::int as count FROM public.departments').catch(() => ({ rows: [{ count: 0 }] })),
      pool.query('SELECT COUNT(*)::int as count FROM public.majors').catch(() => ({ rows: [{ count: 0 }] })),
      pool.query('SELECT COUNT(*)::int as count FROM public.roles').catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const usersCount = counts[0].rows[0]?.count ?? 0;
    const radcheckCount = counts[1].rows[0]?.count ?? 0;
    const studentsCount = counts[2].rows[0]?.count ?? 0;
    const departmentsCount = counts[3].rows[0]?.count ?? 0;
    const majorsCount = counts[4].rows[0]?.count ?? 0;
    const rolesCount = counts[5].rows[0]?.count ?? 0;

    return NextResponse.json({
      connected: true,
      latency,
      host: process.env.DB_HOST || '192.168.100.102',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'cedatabase',
      user: process.env.DB_USER || 'ceadmin',
      version: pingRes.rows[0]?.pg_version?.split(' ')[1] || 'PostgreSQL',
      tables: [
        { name: 'users', description: 'ข้อมูลบุคคลกลาง', count: usersCount, status: 'ok' },
        { name: 'radcheck', description: 'View สำหรับ FreeRADIUS (กลุ่ม 1)', count: radcheckCount, status: 'ok' },
        { name: 'students', description: 'ข้อมูลเฉพาะนักศึกษา', count: studentsCount, status: 'ok' },
        { name: 'departments', description: 'ข้อมูลภาควิชา', count: departmentsCount, status: 'ok' },
        { name: 'majors', description: 'ข้อมูลสาขาวิชา', count: majorsCount, status: 'ok' },
        { name: 'roles', description: 'ข้อมูลบทบาทผู้ใช้', count: rolesCount, status: 'ok' },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cannot connect to database';
    return NextResponse.json(
      {
        connected: false,
        latency: null,
        host: process.env.DB_HOST || '192.168.100.102',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'cedatabase',
        user: process.env.DB_USER || 'ceadmin',
        error: message,
        tables: [
          { name: 'users', description: 'ข้อมูลบุคคลกลาง', status: 'error', message },
          { name: 'radcheck', description: 'View สำหรับ FreeRADIUS (กลุ่ม 1)', status: 'error', message },
          { name: 'students', description: 'ข้อมูลเฉพาะนักศึกษา', status: 'error', message },
          { name: 'departments', description: 'ข้อมูลภาควิชา', status: 'error', message },
        ],
      },
      { status: 503 }
    );
  }
}

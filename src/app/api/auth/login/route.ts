import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, checkCredentials, checkOrigin, createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

// Single-process LAN portal: cap attempts globally rather than trusting spoofable IP headers.
let attempts = 0;
let windowEnd = 0;

export async function POST(req: NextRequest) {
  const originError = checkOrigin(req);
  if (originError) return originError;
  if (!authConfigured()) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่าบัญชีผู้ดูแลบนเซิร์ฟเวอร์' }, { status: 503 });
  if (Date.now() >= windowEnd) { attempts = 0; windowEnd = Date.now() + 15 * 60 * 1000; }
  if (attempts >= 20) return NextResponse.json({ error: 'ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((windowEnd - Date.now()) / 1000)) } });
  attempts++;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 }); }
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' ||
      body.username.length > 100 || body.password.length > 1024 || !checkCredentials(body.username, body.password)) {
    return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, createSession(), sessionCookieOptions());
  return response;
}

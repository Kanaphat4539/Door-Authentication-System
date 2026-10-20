import { NextRequest, NextResponse } from 'next/server';
import { checkOrigin, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const denied = checkOrigin(req);
  if (denied) return denied;
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'ce_admin_session';
export const SESSION_SECONDS = 60 * 60 * 8;

function credentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!username || !password || password.length < 12 || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

function equal(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export function authConfigured() { return credentials() !== null; }

export function checkCredentials(username: string, password: string) {
  const config = credentials();
  if (!config) return false;
  const userMatches = equal(username, config.username);
  const passwordMatches = equal(password, config.password);
  return userMatches && passwordMatches;
}

// Include credentials in the key so changing the admin password invalidates old sessions.
function sign(payload: string) {
  const config = credentials();
  if (!config) return '';
  return createHmac('sha256', config.secret)
    .update(JSON.stringify([config.username, config.password, payload])).digest('base64url');
}

export function createSession(now = Date.now()) {
  if (!credentials()) throw new Error('Admin authentication is not configured');
  const expires = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${expires}.${sign(expires)}`;
}

export function validSession(token?: string, now = Date.now()) {
  if (!credentials() || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  const expires = Number(parts[0]);
  const current = Math.floor(now / 1000);
  return expires > current && expires <= current + SESSION_SECONDS && equal(parts[1], sign(parts[0]));
}

export async function isAdmin() {
  return validSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export function checkOrigin(req: NextRequest) {
  // Browser mutations must originate from this portal, including on the university LAN.
  const expected = process.env.APP_ORIGIN || req.nextUrl.origin;
  if (req.headers.get('origin') !== expected || req.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น' }, { status: 403 });
  }
  return null;
}

export async function requireAdmin(req?: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบผู้ดูแล' }, { status: 401 });
  return req ? checkOrigin(req) : null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  };
}

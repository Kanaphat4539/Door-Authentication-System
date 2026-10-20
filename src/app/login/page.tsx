'use client';

import { useRouter } from 'next/navigation';

import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-100 p-6 text-zinc-900">
      <form className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setLoading(true); setError('');
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
          router.replace('/'); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
        finally { setLoading(false); }
      }}>
        <h1 className="text-xl font-semibold">CE Database Admin</h1>
        <p className="text-sm text-zinc-600">เข้าสู่ระบบผู้ดูแลฐานข้อมูล กลุ่ม 2</p>
        <label className="block text-sm">ชื่อผู้ดูแล
          <input name="username" autoComplete="username" required className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block text-sm">รหัสผ่าน
          <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded border p-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded bg-blue-700 p-2 text-white disabled:opacity-50">{loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
      </form>
    </main>
  );
}

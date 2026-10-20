'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function UserPassword({ userId, username, disabled }: { userId: string; username: string; disabled: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (password !== null) { setPassword(null); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/password`, { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/login'); router.refresh();
        throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลใหม่');
      }
      const data = await response.json();
      if (!response.ok || typeof data.password_text !== 'string') throw new Error(data.error || 'อ่านรหัสผ่านไม่สำเร็จ');
      setPassword(data.password_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อ่านรหัสผ่านไม่สำเร็จ');
    } finally { setLoading(false); }
  };

  return (
    <div className="text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono whitespace-pre-wrap break-all text-zinc-700 dark:text-zinc-200">{password ?? '••••••••'}</span>
        <button
          type="button"
          disabled={disabled || loading}
          aria-label={`${password !== null ? 'ซ่อน' : 'แสดง'}รหัสผ่านของ ${username}`}
          aria-pressed={password !== null}
          onClick={() => { void toggle(); }}
          className="rounded p-1 text-zinc-500 hover:text-blue-600 disabled:opacity-50"
        >
          {password !== null ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {loading && <span role="status">กำลังอ่าน…</span>}
      </div>
      {error && <p role="alert" className="mt-1 text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

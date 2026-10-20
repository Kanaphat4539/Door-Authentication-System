import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isAdmin } from '@/lib/auth';
import Dashboard from '@/components/Dashboard';

async function AdminDashboard() {
  await connection();
  if (!(await isAdmin())) redirect('/login');
  return <Dashboard />;
}

export default function Page() {
  return <Suspense fallback={<p className="p-6">กำลังตรวจสอบสิทธิ์…</p>}><AdminDashboard /></Suspense>;
}

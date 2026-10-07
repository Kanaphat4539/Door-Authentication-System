'use client';

import React, { useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink, Terminal, GitBranch, Layers, ShieldCheck } from 'lucide-react';

export default function SetupGuideTab() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const envSample = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`;

  const gitFlowSample = `# 1. ดู branch ทั้งหมด
git branch -a

# 2. ทำงานบน branch DEV หรือแตก feature ใหม่
git checkout DEV
git checkout -b feature/my-new-feature

# 3. เมื่องานเสร็จ ทำการ commit และ merge กลับเข้า DEV
git add .
git commit -m "feat: implement my new feature"
git checkout DEV
git merge --no-ff feature/my-new-feature

# 4. เมื่อพร้อมปล่อยขึ้น Production จึง merge เข้า main
git checkout main
git merge --no-ff DEV
git push origin main`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          คู่มือการติดตั้งและ Deploy บน Vercel + Supabase
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          ทำตาม 3 ขั้นตอนนี้เพื่อเชื่อมต่อฐานข้อมูลจริง และเปิดใช้งานบน Vercel Production
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm">
            1
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            สร้างฐานข้อมูลบน Supabase
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            1. เข้าที่ <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com</a> และสร้าง New Project
            <br />
            2. ไปที่เมนู <b>SQL Editor</b>
            <br />
            3. เปิดไฟล์ <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-blue-600 font-mono">supabase/schema.sql</code> ในโปรเจกต์นี้ แล้วกดรัน (Run) เพื่อสร้างตาราง <code>users</code> และวิว <code>radcheck</code>
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
            2
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            ตั้งค่า Environment Variables
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            ไปที่ Supabase ➔ <b>Project Settings</b> ➔ <b>API</b> นำค่า URL และ anon key มาใส่ในไฟล์ <code>.env.local</code> หรือใน Vercel:
          </p>
          <div className="relative">
            <pre className="p-2.5 bg-zinc-950 text-emerald-400 text-[11px] rounded-lg font-mono overflow-x-auto">
              {envSample}
            </pre>
            <button
              onClick={() => copyToClipboard(envSample, 'env')}
              className="absolute top-2 right-2 text-zinc-400 hover:text-white p-1"
            >
              {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
            3
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Deploy ขึ้น Vercel
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            1. เข้า <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">vercel.com</a> และ Import Git Repository <code>databaseadmin</code>
            <br />
            2. ใส่ Environment Variables สองตัวข้างต้น
            <br />
            3. กด <b>Deploy</b> ได้ทันที เว็บไซต์จะออนไลน์พร้อมใช้งาน!
          </p>
        </div>
      </div>

      {/* Git Branching Model Guide */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              กลยุทธ์การแตก Branch (Git Branching Model: main ➔ DEV ➔ feature/*)
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(gitFlowSample, 'gitflow')}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {copiedKey === 'gitflow' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'gitflow' ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง Git'}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          โครงสร้าง Git ของโปรเจกต์นี้ถูกออกแบบตามที่อาจารย์และทีมต้องการ: <code>main</code> สำหรับ Production, <code>DEV</code> สำหรับรวมงาน, และ <code>feature/*</code> สำหรับแต่ละฟีเจอร์
        </p>
        <pre className="p-4 bg-zinc-950 text-zinc-300 text-xs rounded-lg overflow-x-auto font-mono leading-relaxed">
          {gitFlowSample}
        </pre>
      </div>
    </div>
  );
}

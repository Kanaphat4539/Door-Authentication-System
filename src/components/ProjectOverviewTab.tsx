'use client';

import React, { useState } from 'react';
import { Server, Terminal, Copy, Check, Network, ShieldCheck, Database, Layers } from 'lucide-react';
import Image from 'next/image';

export default function ProjectOverviewTab() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tunnelCommand = `python3 scripts/start_tunnel.py`;
  const sshDirect = `ssh -L 5432:localhost:5432 root@172.16.10.200 -p 2202`;
  const group3Query = `SELECT user_id, username, password, is_active, role_id 
FROM users 
WHERE username = $1 AND is_active = TRUE;`;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          ผังระบบและข้อมูลการเชื่อมต่อเซิร์ฟเวอร์เสมือน (VM & Architecture)
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          สถาปัตยกรรมระบบรวม 7 กลุ่ม และการทำงานของเซิร์ฟเวอร์เสมือนกลุ่ม 2 (Database-Server)
        </p>
      </div>

      {/* Project Flow Architecture Image */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>แผนผัง Project Flow การติดต่อระหว่างระบบ (7 กลุ่ม)</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
            กลุ่มที่ 2 (Database-Server & CRUD Portal)
          </span>
        </div>

        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-center p-2">
          <Image
            src="/images/project-flow.jpg"
            alt="Project Flow 7 Groups"
            width={1200}
            height={480}
            className="rounded-lg max-h-[380px] object-contain w-auto shadow-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
            <span className="font-bold text-blue-900 dark:text-blue-300">กลุ่ม 2 (เรา - Database)</span>
            <p className="text-zinc-600 dark:text-zinc-400">
              เป็นศูนย์กลางเก็บข้อมูลผู้ใช้ (Central User Database) และมีเว็บแอปพลิเคชันสำหรับ CE Student ทำ CRUD
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-1">
            <span className="font-bold text-indigo-900 dark:text-indigo-300">กลุ่ม 1 (RADIUS Server)</span>
            <p className="text-zinc-600 dark:text-zinc-400">
              เชื่อมต่อผ่าน SQL มาที่ View <code className="bg-white dark:bg-zinc-800 px-1 py-0.5 rounded">radcheck</code> เพื่อยืนยันตัวตน Wi-Fi 802.1X
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
            <span className="font-bold text-emerald-900 dark:text-emerald-300">กลุ่ม 3 (Auth API Server)</span>
            <p className="text-zinc-600 dark:text-zinc-400">
              เชื่อมต่อเข้ามาตรวจสอบข้อมูลผู้ใช้ เพื่อให้บริการ API สำหรับ Web App (กลุ่ม 4) และ IoT Server (กลุ่ม 6)
            </p>
          </div>
        </div>
      </div>

      {/* VM Handover Details & Local Tunnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: VM Spec */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-base">
            <Server className="w-5 h-5 text-indigo-600" />
            <span>ข้อมูลเครื่องเซิร์ฟเวอร์เสมือน (VM Specs)</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">ชื่อเครื่อง (Host)</span>
              <span className="font-mono font-semibold">Database-Server</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">ระบบปฏิบัติการ</span>
              <span>Debian GNU/Linux 13 (Trixie)</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Private IP (ระหว่าง VM)</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">192.168.100.102</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">DBMS Engine</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">PostgreSQL 17</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Database Name</span>
              <span className="font-mono">cedatabase</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">User / Superuser</span>
              <span className="font-mono">ceadmin</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">External SSH Access</span>
              <span className="font-mono">172.16.10.200:2202 (root)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Local Development Tunnel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-base">
            <Terminal className="w-5 h-5 text-emerald-600" />
            <span>การต่อ Database ขณะพัฒนาในเครื่อง Local</span>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            เมื่อรัน <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">npm run dev</code> บนเครื่องส่วนตัว (ต่อ Wi-Fi สถาบัน) ให้เปิด SSH Tunnel เพื่อเชื่อมต่อพอร์ต 5432 ไปยัง VM โดยอัตโนมัติ:
          </p>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                วิธีที่ 1: รันผ่านสคริปต์อัตโนมัติ (แนะนำ)
              </span>
              <div className="relative">
                <pre className="p-2.5 bg-zinc-950 text-emerald-400 text-xs rounded-xl font-mono overflow-x-auto">
                  {tunnelCommand}
                </pre>
                <button
                  onClick={() => copyToClipboard(tunnelCommand, 'tunnel')}
                  className="absolute top-2 right-2 text-zinc-400 hover:text-white p-1"
                >
                  {copiedKey === 'tunnel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                วิธีที่ 2: รันคำสั่ง SSH Port Forwarding ด้วยตนเอง
              </span>
              <div className="relative">
                <pre className="p-2.5 bg-zinc-950 text-blue-300 text-xs rounded-xl font-mono overflow-x-auto">
                  {sshDirect}
                </pre>
                <button
                  onClick={() => copyToClipboard(sshDirect, 'ssh')}
                  className="absolute top-2 right-2 text-zinc-400 hover:text-white p-1"
                >
                  {copiedKey === 'ssh' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Handover for other groups */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-base">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <span>ข้อมูลส่งมอบให้กลุ่มอื่น (Handover Reference)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Network className="w-4 h-4 text-blue-500" />
              สำหรับกลุ่ม 1 (RADIUS Server)
            </h4>
            <p className="text-zinc-500 dark:text-zinc-400">
              FreeRADIUS คิวรี่รหัสผ่านตรงผ่าน View <code className="font-mono text-blue-600">radcheck</code>
            </p>
            <pre className="p-2 bg-zinc-950 text-emerald-400 rounded-lg font-mono text-[11px]">
{`SELECT id, username, attribute, value, op 
FROM radcheck 
WHERE username = '%{SQL-User-Name}';`}
            </pre>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              สำหรับกลุ่ม 3 (Auth API Server)
            </h4>
            <p className="text-zinc-500 dark:text-zinc-400">
              API ตรวจสอบข้อมูลผู้ใช้จากตาราง <code className="font-mono text-emerald-600">users</code>
            </p>
            <div className="relative">
              <pre className="p-2 bg-zinc-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
                {group3Query}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

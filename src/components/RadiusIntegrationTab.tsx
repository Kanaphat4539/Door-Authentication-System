'use client';

import React, { useState } from 'react';
import { Wifi, Copy, Check, Server, Shield, Code2 } from 'lucide-react';
import { User } from '@/types/database';

interface RadiusIntegrationTabProps {
  users: User[];
}

export default function RadiusIntegrationTab({ users }: RadiusIntegrationTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeUsers = users.filter((u) => u.is_active);

  const freeRadiusSqlConfig = `sql {
    driver = "rlm_sql_postgresql"
    dialect = "postgresql"

    # PostgreSQL Database Connection Settings (เครือข่าย VM ภายใน)
    server = "192.168.100.102"
    port = 5432
    login = "ceadmin"
    password = "ceadmin2026"
    radius_db = "cedatabase"

    # Connection pool options
    pool {
        start = 5
        min = 4
        max = 10
        spare = 3
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
    }
    
    # Read queries from default queries.conf
    $INCLUDE \${modconfdir}/\${.:name}/main/\${dialect}/queries.conf
}`;

  const sqlViewCode = `CREATE OR REPLACE VIEW public.radcheck AS
SELECT 
    user_id::text AS id,
    username,
    'Cleartext-Password'::varchar(32) AS attribute,
    ':='::varchar(2) AS op,
    password AS value
FROM public.users
WHERE is_active = TRUE;`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold backdrop-blur-xs">
              <Wifi className="w-3.5 h-3.5" />
              <span>การเชื่อมต่อระหว่าง กลุ่ม 2 (Database) ➔ กลุ่ม 1 (RADIUS Server)</span>
            </div>
            <h2 className="text-2xl font-bold">FreeRADIUS PostgreSQL Integration</h2>
            <p className="text-blue-200 text-sm max-w-2xl leading-relaxed">
              กลุ่ม 1 (RADIUS Server) จะทำการ query ตรวจสอบผู้ใช้ผ่าน SQL มายังเซิร์ฟเวอร์ฐานข้อมูล PostgreSQL (<code className="text-white font-mono bg-blue-950/60 px-1 py-0.5 rounded">192.168.100.102:5432</code>)
              โดยตารางผู้ใช้ในระบบถูกแมปผ่าน View ชื่อ <b>radcheck</b> ให้ตรงกับมาตรฐานของ FreeRADIUS
              โดยอัตโนมัติ
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/10 shrink-0">
            <div className="text-3xl font-bold">{activeUsers.length}</div>
            <div className="text-xs text-blue-200">บัญชีที่ RADIUS ยอมรับ (Active)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time radcheck View Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                ตัวอย่างผลลัพธ์ View: public.radcheck
              </h3>
            </div>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded">
              WHERE is_active = TRUE
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            นี่คือตารางที่ FreeRADIUS (กลุ่ม 1) จะมองเห็นเมื่อสั่ง <code>SELECT * FROM radcheck</code>
          </p>

          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">username</th>
                  <th className="py-2.5 px-3">attribute</th>
                  <th className="py-2.5 px-3">op</th>
                  <th className="py-2.5 px-3">value (Password)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                {activeUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2 px-3 font-semibold text-blue-600 dark:text-blue-400">
                      {user.student_id}
                    </td>
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300">
                      Cleartext-Password
                    </td>
                    <td className="py-2 px-3 text-zinc-500">:=</td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">
                      {user.password_text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SQL View Definition */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  SQL View Code (สำหรับ PostgreSQL บน VM)
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(sqlViewCode, 'view')}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copiedKey === 'view' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'view' ? 'คัดลอกแล้ว!' : 'คัดลอก SQL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-zinc-950 text-zinc-200 text-xs rounded-lg overflow-x-auto font-mono leading-relaxed">
              {sqlViewCode}
            </pre>
          </div>

          <div className="mt-4 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">💡 ทำไมต้องเป็น Cleartext-Password?</p>
            <p>
              เนื่องจาก 802.1X PEAP-MSCHAPv2 (Wi-Fi Authentication) เป็น Challenge-Response
              โปรโตคอล เซิร์ฟเวอร์ RADIUS จะต้องใช้ Plaintext หรือ NT-Hash (MD4) ในการคำนวณ Challenge เท่านั้น ไม่สามารถใช้ bcrypt ได้
            </p>
          </div>
        </div>
      </div>

      {/* FreeRADIUS Config Snippet */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              ตัวอย่างการตั้งค่า FreeRADIUS สำหรับกลุ่ม 1 (/etc/freeradius/3.0/mods-available/sql)
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(freeRadiusSqlConfig, 'radius_conf')}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {copiedKey === 'radius_conf' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'radius_conf' ? 'คัดลอกแล้ว!' : 'คัดลอก Config'}</span>
          </button>
        </div>
        <pre className="p-4 bg-zinc-950 text-emerald-400 text-xs rounded-lg overflow-x-auto font-mono leading-relaxed">
          {freeRadiusSqlConfig}
        </pre>
      </div>
    </div>
  );
}

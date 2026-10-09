'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Wifi,
  Server,
  Terminal,
} from 'lucide-react';

interface DbHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TableStatus {
  name: string;
  description: string;
  status: 'ok' | 'error' | 'pending';
  count?: number;
  message?: string;
}

export default function DbHealthModal({ isOpen, onClose }: DbHealthModalProps) {
  const [testing, setTesting] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [dbInfo, setDbInfo] = useState<{
    host: string;
    port: string;
    database: string;
    user: string;
    version?: string;
  }>({
    host: '192.168.100.102',
    port: '5432',
    database: 'cedatabase',
    user: 'ceadmin',
  });
  const [overallStatus, setOverallStatus] = useState<
    'success' | 'error' | 'pending'
  >('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tables, setTables] = useState<TableStatus[]>([
    { name: 'users', description: 'ข้อมูลบุคคลกลาง (Login/Password)', status: 'pending' },
    { name: 'radcheck', description: 'View สำหรับ FreeRADIUS (กลุ่ม 1)', status: 'pending' },
    { name: 'students', description: 'ข้อมูลเฉพาะนักศึกษา', status: 'pending' },
    { name: 'departments', description: 'ข้อมูลภาควิชา', status: 'pending' },
    { name: 'majors', description: 'ข้อมูลสาขาวิชา', status: 'pending' },
    { name: 'roles', description: 'ข้อมูลบทบาทผู้ใช้', status: 'pending' },
  ]);

  const runDiagnostics = useCallback(async () => {
    setTesting(true);
    setOverallStatus('pending');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/health');
      const data = await res.json();

      if (res.ok && data.connected) {
        setLatency(data.latency);
        setOverallStatus('success');
        setDbInfo({
          host: data.host,
          port: data.port,
          database: data.database,
          user: data.user,
          version: data.version,
        });
        setTables(data.tables || []);
      } else {
        setOverallStatus('error');
        setLatency(null);
        setErrorMessage(data.error || 'ไม่สามารถติดต่อฐานข้อมูล PostgreSQL บน VM ได้');
        setTables(data.tables || []);
      }
    } catch (err: unknown) {
      setOverallStatus('error');
      setLatency(null);
      setErrorMessage(err instanceof Error ? err.message : 'Network error');
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void runDiagnostics();
    }
  }, [isOpen, runDiagnostics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                ตรวจสอบการเชื่อมต่อฐานข้อมูล (Database Diagnostics)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                PostgreSQL 17 on Debian VM (`Database-Server`)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Overall Health Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              overallStatus === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                : overallStatus === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="mt-0.5">
              {overallStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {overallStatus === 'error' && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {overallStatus === 'pending' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">
                {overallStatus === 'success' && 'เชื่อมต่อ PostgreSQL บน VM สำเร็จสมบูรณ์!'}
                {overallStatus === 'error' && 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'}
                {overallStatus === 'pending' && 'กำลังทดสอบการเชื่อมต่อ...'}
              </h4>
              <p className="text-xs opacity-90 leading-relaxed">
                {overallStatus === 'success' &&
                  `ระบบเชื่อมต่อกับ PostgreSQL 17 สำเร็จ ตารางและ View พร้อมสำหรับ RADIUS (กลุ่ม 1) และ API (กลุ่ม 3)`}
                {overallStatus === 'error' && (
                  <span>
                    {errorMessage || 'กรุณาตรวจสอบว่า VM เปิดอยู่ หรือรันคำสั่ง SSH Tunnel บนเครื่อง Local'}
                  </span>
                )}
                {overallStatus === 'pending' && 'กำลังส่ง Query ทดสอบ Latency และโครงสร้างตาราง...'}
              </p>
            </div>
          </div>

          {/* Connection Target Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Host / IP</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                {dbInfo.host}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">พอร์ต (Port)</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {dbInfo.port}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Database / User</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                {dbInfo.database} ({dbInfo.user})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Latency (RTT)</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {latency !== null ? `${latency} ms` : '-'}
              </span>
            </div>
          </div>

          {/* Tables & Views Verification List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">สถานะตารางและ View สำคัญ</span>
              <span>{tables.filter((t) => t.status === 'ok').length} / {tables.length} ผ่านการตรวจสอบ</span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="px-4 py-2.5 flex items-center justify-between text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {table.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : table.status === 'error' ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
                    )}
                    <div>
                      <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        {table.name}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                        {table.description}
                      </span>
                    </div>
                  </div>

                  <div>
                    {table.status === 'ok' && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {table.count !== undefined ? `${table.count} แถว` : 'พร้อมใช้งาน'}
                      </span>
                    )}
                    {table.status === 'error' && (
                      <span className="text-rose-500 text-[11px]">ไม่พบข้อมูล</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SSH Tunnel Hint when error */}
          {overallStatus === 'error' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                <Terminal className="w-4 h-4 text-amber-600" />
                <span>คำแนะนำ: รัน SSH Tunnel ในเครื่อง Local</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                หากรันบนเครื่อง Local ให้รันคำสั่งนี้ในเทอร์มินัลเพื่อ Forward พอร์ต 5432:
              </p>
              <pre className="p-2 bg-zinc-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
                python3 scripts/start_tunnel.py
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <button
            onClick={() => void runDiagnostics()}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>ทดสอบอีกครั้ง</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

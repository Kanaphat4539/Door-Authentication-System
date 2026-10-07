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
} from 'lucide-react';
import { supabase, isConfigured } from '@/lib/supabase';

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
  const [overallStatus, setOverallStatus] = useState<
    'success' | 'warning' | 'error' | 'unconfigured' | 'pending'
  >('pending');
  const [tables, setTables] = useState<TableStatus[]>([
    { name: 'users', description: 'ข้อมูลบุคคลกลาง', status: 'pending' },
    { name: 'radcheck', description: 'View สำหรับ FreeRADIUS (กลุ่ม 1)', status: 'pending' },
    { name: 'students', description: 'ข้อมูลเฉพาะนักศึกษา', status: 'pending' },
    { name: 'departments', description: 'ข้อมูลภาควิชา', status: 'pending' },
  ]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const runDiagnostics = useCallback(async () => {
    if (!isConfigured) {
      setOverallStatus('unconfigured');
      setLatency(null);
      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          status: 'error',
          message: 'ยังไม่ได้ตั้งค่า Environment Variables',
        }))
      );
      return;
    }

    setTesting(true);
    setOverallStatus('pending');

    const updatedTables: TableStatus[] = [
      { name: 'users', description: 'ข้อมูลบุคคลกลาง', status: 'pending' },
      { name: 'radcheck', description: 'View สำหรับ FreeRADIUS (กลุ่ม 1)', status: 'pending' },
      { name: 'students', description: 'ข้อมูลเฉพาะนักศึกษา', status: 'pending' },
      { name: 'departments', description: 'ข้อมูลภาควิชา', status: 'pending' },
    ];

    try {
      const startTime = performance.now();

      // 1. Test users table
      const { count: usersCount, error: usersErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const measuredLatency = Math.round(performance.now() - startTime);
      setLatency(measuredLatency);

      if (usersErr) {
        updatedTables[0].status = 'error';
        updatedTables[0].message = usersErr.message;
      } else {
        updatedTables[0].status = 'ok';
        updatedTables[0].count = usersCount ?? 0;
      }

      // 2. Test radcheck view (Crucial for Group 1 RADIUS)
      const { count: radCount, error: radErr } = await supabase
        .from('radcheck')
        .select('*', { count: 'exact', head: true });

      if (radErr) {
        updatedTables[1].status = 'error';
        updatedTables[1].message = radErr.message;
      } else {
        updatedTables[1].status = 'ok';
        updatedTables[1].count = radCount ?? 0;
      }

      // 3. Test students table
      const { count: stdCount, error: stdErr } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      if (stdErr) {
        updatedTables[2].status = 'error';
        updatedTables[2].message = stdErr.message;
      } else {
        updatedTables[2].status = 'ok';
        updatedTables[2].count = stdCount ?? 0;
      }

      // 4. Test departments table
      const { count: deptCount, error: deptErr } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      if (deptErr) {
        updatedTables[3].status = 'error';
        updatedTables[3].message = deptErr.message;
      } else {
        updatedTables[3].status = 'ok';
        updatedTables[3].count = deptCount ?? 0;
      }

      setTables(updatedTables);

      // Determine overall status
      const okCount = updatedTables.filter((t) => t.status === 'ok').length;
      if (okCount === updatedTables.length) {
        setOverallStatus('success');
      } else if (okCount > 0) {
        setOverallStatus('warning');
      } else {
        setOverallStatus('error');
      }
    } catch (err: unknown) {
      setOverallStatus('error');
      setTables((prev) =>
        prev.map((t) => ({
          ...t,
          status: 'error',
          message: err instanceof Error ? err.message : 'Connection failed',
        }))
      );
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, runDiagnostics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                ตรวจสอบสถานะการเชื่อมต่อฐานข้อมูล
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Supabase PostgreSQL & FreeRADIUS Compatibility Check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              overallStatus === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                : overallStatus === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                : overallStatus === 'unconfigured'
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {overallStatus === 'success' && (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {overallStatus === 'warning' && (
                <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              {overallStatus === 'unconfigured' && (
                <AlertTriangle className="w-7 h-7 text-zinc-500 shrink-0" />
              )}
              {overallStatus === 'error' && (
                <XCircle className="w-7 h-7 text-rose-600 dark:text-rose-400 shrink-0" />
              )}

              <div>
                <p className="font-bold text-sm">
                  {overallStatus === 'success' && 'เชื่อมต่อ Supabase สำเร็จสมบูรณ์!'}
                  {overallStatus === 'warning' && 'เชื่อมต่อได้ แต่ตาราง/วิวบางตัวยังไม่พร้อม'}
                  {overallStatus === 'unconfigured' && 'ยังไม่ได้เชื่อมต่อ (โหมดจำลอง Demo Mode)'}
                  {overallStatus === 'error' && 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'}
                  {overallStatus === 'pending' && 'กำลังตรวจสอบการเชื่อมต่อ...'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {overallStatus === 'success' && 'เว็บไซต์และ RADIUS สามารถอ่านเขียนข้อมูลได้ตามปกติ'}
                  {overallStatus === 'warning' && 'กรุณารันไฟล์ supabase/schema.sql ใน Supabase SQL Editor'}
                  {overallStatus === 'unconfigured' && 'กรุณาใส่ NEXT_PUBLIC_SUPABASE_URL และ KEY บน Vercel'}
                  {overallStatus === 'error' && 'กรุณาตรวจสอบ URL และ Anon Key ใน Vercel อีกครั้ง'}
                </p>
              </div>
            </div>

            {latency !== null && (
              <div className="text-right shrink-0 pl-3">
                <span className="text-xs font-mono font-bold bg-white/60 dark:bg-black/30 px-2 py-1 rounded">
                  {latency} ms
                </span>
                <p className="text-[10px] opacity-75 mt-0.5">Latency</p>
              </div>
            )}
          </div>

          {/* Database Target Info */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Target Project:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100 truncate max-w-[280px]">
                {supabaseUrl || 'ไม่ได้กำหนด (Unset)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">RADIUS Compatibility (Group 1):</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-blue-500" />
                <span>radcheck VIEW</span>
              </span>
            </div>
          </div>

          {/* Table / View Check Items */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              ผลการตรวจสอบตารางและวิวในฐานข้อมูล:
            </h4>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="p-3 flex items-center justify-between bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                >
                  <div className="flex items-center gap-2.5">
                    {table.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : table.status === 'pending' ? (
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-mono font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {table.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                        ({table.description})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {table.status === 'ok' ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        พร้อมใช้งาน ({table.count} แถว)
                      </span>
                    ) : table.status === 'pending' ? (
                      <span className="text-xs text-zinc-400">กำลังตรวจ...</span>
                    ) : (
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                        ไม่พบตาราง
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={runDiagnostics}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'กำลังทดสอบ...' : 'ทดสอบอีกครั้ง (Re-test)'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

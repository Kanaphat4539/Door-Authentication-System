'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { User } from '@/types/database';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: User | null;
  loading: boolean;
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  loading,
}: DeleteModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
              ยืนยันการลบข้อมูลผู้ใช้
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              การกระทำนี้จะลบผู้ใช้ถาวรออกจากฐานข้อมูล
            </p>
          </div>
        </div>

        <div className="my-4 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400 text-xs">ผู้ใช้ที่จะถูกลบ:</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {user.full_name} ({user.student_id})
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            หลังจากลบแล้ว FreeRADIUS และระบบ IoT จะไม่สามารถตรวจสอบสิทธิ์ผู้ใช้นี้ได้อีกต่อไป
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? 'กำลังลบ...' : 'ยืนยันลบ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

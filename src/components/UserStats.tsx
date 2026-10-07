'use client';

import React from 'react';
import { Users, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { User } from '@/types/database';

interface UserStatsProps {
  users: User[];
}

export default function UserStats({ users }: UserStatsProps) {
  const total = users.length;
  const active = users.filter((u) => u.is_active).length;
  const inactive = total - active;
  const rolesCount = {
    student: users.filter((u) => u.role === 'student').length,
    teacher: users.filter((u) => u.role === 'teacher').length,
    admin: users.filter((u) => u.role === 'admin').length,
    guest: users.filter((u) => u.role === 'guest').length,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Users */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Users</p>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{total}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Registered accounts</p>
      </div>

      {/* RADIUS Active */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">RADIUS Active</p>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{active}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Can authenticate 802.1X</p>
      </div>

      {/* Blocked / Inactive */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Suspended / Inactive</p>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-lg text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{inactive}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Access disabled</p>
      </div>

      {/* Role Breakdown */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Role Breakdown</p>
          <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{rolesCount.student}</span> นักศึกษา
          <span>•</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{rolesCount.teacher}</span> อาจารย์
          <span>•</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{rolesCount.admin}</span> แอดมิน
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {rolesCount.guest} บุคคลภายนอก
        </p>
      </div>
    </div>
  );
}

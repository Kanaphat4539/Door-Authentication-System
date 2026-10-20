'use client';

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { User, UserRole } from '@/types/database';
import UserPassword from '@/components/UserPassword';

interface UserTableProps {
  users: User[];
  loading: boolean;
  disabled?: boolean;
  onRefresh: () => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

export default function UserTable({
  users,
  loading,
  disabled = false,
  onRefresh,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onToggleStatus,
}: UserTableProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const years = [1, 2, 3, 4];
  const studentCounts = years.map(year => ({
    year,
    count: users.filter(user => user.role === 'student' && user.year_level === year).length,
  }));
  const totalStudents = users.filter(user => user.role === 'student').length;
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.student_id.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);

    const matchesYear = yearFilter === 'all' || (u.role === 'student' && u.year_level === Number(yearFilter));
    return matchesSearch && matchesRole && matchesStatus && matchesYear;
  }).sort((a, b) => a.student_id.localeCompare(b.student_id, 'en', { numeric: true }));

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Admin
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            Teacher
          </span>
        );
      case 'staff':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Staff
          </span>
        );
      case 'student':
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            Student
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <section aria-label="จำนวนนักศึกษาแยกตามชั้นปี" className="border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">นักศึกษาแยกตามชั้นปี</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">นักศึกษาทั้งหมด {totalStudents} คน · ยอดชั้นปีไม่รวมอาจารย์และบุคลากร</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            aria-pressed={yearFilter === 'all' && roleFilter === 'all'}
            onClick={() => { setYearFilter('all'); setRoleFilter('all'); }}
            className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${yearFilter === 'all' && roleFilter === 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <span className="block text-xs">ผู้ใช้ทุกบทบาท</span>
            <span className="mt-1 block text-xl font-semibold">{users.length} <span className="text-xs font-normal">คน</span></span>
          </button>
          {studentCounts.map(({ year, count }) => (
            <button
              key={year}
              type="button"
              aria-label={`ชั้นปีที่ ${year} จำนวน ${count} คน`}
              aria-pressed={yearFilter === String(year)}
              onClick={() => { setYearFilter(String(year)); setRoleFilter('student'); }}
              className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${yearFilter === String(year) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              <span className="block text-xs">ชั้นปีที่ {year}</span>
              <span className="mt-1 block text-xl font-semibold">{count} <span className="text-xs font-normal">คน</span></span>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">กดชั้นปีเพื่อดูรายชื่อ · จำนวนด้านบนเป็นยอดรวมก่อนใช้ตัวกรองค้นหาและสถานะ</p>
      </section>
      {/* Controls Bar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="ค้นหาผู้ใช้"
              placeholder="ค้นหารหัสนักศึกษา, ชื่อ, หรืออีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="กรองบทบาท"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); if (e.target.value !== 'student') setYearFilter('all'); }}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกบทบาท (All Roles)</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>

            {/* Status Filter */}
            <select
              aria-label="กรองสถานะ"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกสถานะ (All Status)</option>
              <option value="active">Active (เข้าใช้ได้)</option>
              <option value="inactive">Inactive (ระงับสิทธิ์)</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading || disabled}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            disabled={disabled}
            onClick={onAddUser}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-4">Student ID / Username</th>
              <th className="py-3 px-4">ชื่อ - นามสกุล</th>
              <th className="py-3 px-4">RADIUS Password</th>
              <th className="py-3 px-4">บทบาท</th>
              <th className="py-3 px-4">ชั้นปี</th>
              <th className="py-3 px-4 text-center">RADIUS Access</th>
              <th className="py-3 px-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <span>กำลังโหลดข้อมูลจากฐานข้อมูล...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  <p className="text-base font-medium">ไม่พบข้อมูลผู้ใช้</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {search || roleFilter !== 'all' || statusFilter !== 'all' || yearFilter !== 'all'
                      ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหา'
                      : 'กดปุ่ม "เพิ่มผู้ใช้ใหม่" เพื่อเริ่มต้นสร้างข้อมูล'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Student ID */}
                    <td className="py-3 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {user.student_id}
                    </td>

                    {/* Name & Email */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {user.full_name}
                      </div>
                      {user.email && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {user.email}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <UserPassword key={`${user.id}:${user.updated_at || ''}`} userId={user.id} username={user.student_id} disabled={disabled} />
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>

                    <td className="py-3 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                      {user.role === 'student' ? (user.year_level ? `ปี ${user.year_level}` : 'ไม่ระบุ') : '—'}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        disabled={disabled}
                        onClick={() => onToggleStatus(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          user.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-300'
                        }`}
                        title={
                          user.is_active
                            ? 'คลิกเพื่อระงับสิทธิ์ (FreeRADIUS จะไม่อนุญาต)'
                            : 'คลิกเพื่อเปิดสิทธิ์ (FreeRADIUS จะอนุญาต)'
                        }
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.is_active ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                        />
                        {user.is_active ? 'อนุญาต (Active)' : 'ระงับ (Inactive)'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          disabled={disabled}
                          onClick={() => onEditUser(user)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={disabled}
                          onClick={() => onDeleteUser(user)}
                          className="p-1.5 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          {yearFilter !== 'all' ? `ชั้นปีที่ ${yearFilter}: ` : ''}แสดง <b>{filteredUsers.length}</b> จาก <b>{yearFilter === 'all' ? users.length : studentCounts.find(item => item.year === Number(yearFilter))?.count || 0}</b> รายการ
        </div>
        <div className="hidden sm:block">
          กดรีเฟรชเพื่ออ่านข้อมูลล่าสุดจากฐานข้อมูล
        </div>
      </div>
    </div>
  );
}

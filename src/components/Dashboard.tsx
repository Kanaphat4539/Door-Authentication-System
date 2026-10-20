'use client';

import { useRouter } from 'next/navigation';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import UserStats from '@/components/UserStats';
import UserTable from '@/components/UserTable';
import UserModal from '@/components/UserModal';
import DeleteModal from '@/components/DeleteModal';
import RadiusIntegrationTab from '@/components/RadiusIntegrationTab';
import ProjectOverviewTab from '@/components/ProjectOverviewTab';
import DbHealthModal from '@/components/DbHealthModal';
import { User } from '@/types/database';
import { AlertCircle, CheckCircle, ArrowRight, Activity, Terminal } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'radius' | 'overview'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // DB Health Diagnostics Modal State
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [operationError, setOperationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (res.status === 401) { router.replace('/login'); router.refresh(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อ่านข้อมูลไม่สำเร็จ');
      setIsDbConnected(true);
      setUsers(data.users as User[]);
      setOperationError(null);
    } catch (error) {
      setIsDbConnected(false);
      setOperationError(error instanceof Error ? error.message : 'เชื่อมต่อไม่ได้');
    } finally { setLoading(false); }
  }, [router]);

  const handleRefresh = useCallback(() => { setLoading(true); void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    // Remove old demo caches, which could contain passwords copied from the database.
    try { localStorage.removeItem('ce_demo_users'); } catch { /* Storage may be disabled. */ }
    const timer = setTimeout(() => { void loadUsers(); }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const mutate = async (method: string, body?: Partial<User>, id?: string) => {
    const response = await fetch(`/api/users${id ? `?id=${encodeURIComponent(id)}` : ''}`, {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) { router.replace('/login'); router.refresh(); throw new Error('กรุณาเข้าสู่ระบบใหม่'); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
    return data;
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    setBusy(true);
    try {
      const data = await mutate(editingUser ? 'PUT' : 'POST', { ...userData, ...(editingUser ? { id: editingUser.id } : {}) });
      setUsers(current => editingUser ? current.map(user => user.id === editingUser.id ? data.user : user) : [data.user, ...current]);
      setOperationError(null);
      showToast('บันทึกลงฐานข้อมูลสำเร็จ');
    } finally { setBusy(false); }
  };

  const handleToggleStatus = async (user: User) => {
    if (busy || !isDbConnected) return;
    setBusy(true);
    try {
      const data = await mutate('PUT', { id: user.id, is_active: !user.is_active });
      setUsers(current => current.map(item => item.id === user.id ? data.user : item));
      setOperationError(null);
      showToast(data.user.is_active ? 'เปิดสิทธิ์สำหรับการยืนยันตัวตนครั้งใหม่แล้ว' : 'ระงับสิทธิ์สำหรับการยืนยันตัวตนครั้งใหม่แล้ว');
    } catch (error) { setOperationError(error instanceof Error ? error.message : 'เปลี่ยนสถานะไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleOpenEdit = (user: User) => { setEditingUser(user); setIsModalOpen(true); };
  const handleOpenAdd = () => { setEditingUser(null); setIsModalOpen(true); };
  const handleOpenDelete = (user: User) => { setOperationError(null); setDeletingUser(user); setIsDeleteModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true); setBusy(true);
    try {
      await mutate('DELETE', undefined, deletingUser.id);
      setUsers(current => current.filter(user => user.id !== deletingUser.id));
      setOperationError(null);
      showToast('ลบผู้ใช้จากฐานข้อมูลสำเร็จ');
      setIsDeleteModalOpen(false); setDeletingUser(null);
    } catch (error) { setOperationError(error instanceof Error ? error.message : 'ลบไม่สำเร็จ'); }
    finally { setDeleteLoading(false); setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <div className="px-4 pt-3 text-right">
        <button className="text-sm underline" onClick={async () => {
          try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (!response.ok) throw new Error('ออกจากระบบไม่สำเร็จ');
            router.replace('/login'); router.refresh();
          } catch { setOperationError('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่'); }
        }}>ออกจากระบบ</button>
      </div>
      {operationError && <p role="alert" className="m-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">{operationError}</p>}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl shadow-xl text-xs sm:text-sm animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDbConnected={isDbConnected}
        onOpenHealthCheck={() => setIsHealthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Unconnected / Offline Notice Banner */}
        {!isDbConnected && activeTab === 'users' && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  เชื่อมต่อฐานข้อมูลไม่ได้ — ไม่สามารถบันทึกการเปลี่ยนแปลง
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  หากรันบนเครื่อง Local ให้เปิด SSH Tunnel เพื่อต่อฐานข้อมูล VM (<code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">python3 scripts/start_tunnel.py</code>)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHealthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span>ตรวจสอบการเชื่อมต่อ DB</span>
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>วิธีเปิด Tunnel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Connection Diagnostics Button for Active Dashboard */}
        {isDbConnected && activeTab === 'users' && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>เชื่อมต่อฐานข้อมูล PostgreSQL สำเร็จ — ดูปลายทางจริงได้ในหน้าตรวจสอบฐานข้อมูล</span>
            </div>
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-medium transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตรวจเช็คความพร้อม DB & RADIUS</span>
            </button>
          </div>
        )}

        {/* Tab 1: Users Management (CRUD) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <UserStats users={users} />
            <UserTable
              users={users}
              loading={loading}
              disabled={busy || loading || !isDbConnected}
              onRefresh={handleRefresh}
              onAddUser={handleOpenAdd}
              onEditUser={handleOpenEdit}
              onDeleteUser={handleOpenDelete}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        )}

        {/* Tab 2: RADIUS Integration Hub */}
        {activeTab === 'radius' && <RadiusIntegrationTab users={users} />}

        {/* Tab 3: Project Architecture & VM Guide */}
        {activeTab === 'overview' && <ProjectOverviewTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900">
        <p>CE Database Server (Group 2) • Wi-Fi 802.1X & IoT Door Access Control Project</p>
        <p className="mt-1">Central User Database & Admin Portal • Debian VM (192.168.100.102:5432)</p>
      </footer>

      {/* Add / Edit Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        editingUser={editingUser}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        user={deletingUser}
        loading={deleteLoading}
        error={operationError}
      />

      {/* Database Diagnostics & Health Check Modal */}
      <DbHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
      />
    </div>
  );
}

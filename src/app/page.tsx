'use client';

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
import { INITIAL_DEMO_USERS } from '@/lib/demo-data';
import { AlertCircle, CheckCircle, ArrowRight, Activity, Terminal } from 'lucide-react';

export default function HomePage() {
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

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();

      if (res.ok && data.connected) {
        setIsDbConnected(true);
        setUsers(data.users as User[]);
      } else {
        setIsDbConnected(false);
        const saved = typeof window !== 'undefined' ? localStorage.getItem('ce_demo_users') : null;
        setUsers(saved ? JSON.parse(saved) : INITIAL_DEMO_USERS);
      }
    } catch {
      setIsDbConnected(false);
      const saved = typeof window !== 'undefined' ? localStorage.getItem('ce_demo_users') : null;
      setUsers(saved ? JSON.parse(saved) : INITIAL_DEMO_USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let ignore = false;
    const fetchInitialData = async () => {
      if (!ignore) {
        await loadUsers();
      }
    };
    void fetchInitialData();
    return () => {
      ignore = true;
    };
  }, [loadUsers]);

  // Handle Save (Create or Update)
  const handleSaveUser = async (userData: Partial<User>) => {
    if (editingUser) {
      // Update
      let dbUpdated = false;
      try {
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            student_id: userData.student_id,
            full_name: userData.full_name,
            email: userData.email,
            password_text: userData.password_text,
            role: userData.role,
            is_active: userData.is_active,
          }),
        });
        if (res.ok) {
          dbUpdated = true;
        }
      } catch (err) {
        console.warn('Direct DB update failed, using local fallback', err);
      }

      const updatedList = users.map((u) =>
        u.id === editingUser.id
          ? ({
              ...u,
              ...userData,
              updated_at: new Date().toISOString(),
            } as User)
          : u
      );
      setUsers(updatedList);
      if (!dbUpdated) {
        localStorage.setItem('ce_demo_users', JSON.stringify(updatedList));
      }
      showToast(`อัปเดตข้อมูลผู้ใช้ ${userData.student_id} เรียบร้อยแล้ว`);
    } else {
      // Create
      let dbInserted = false;
      let newId = crypto.randomUUID();

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
        const data = await res.json();
        if (res.ok && data.user) {
          dbInserted = true;
          newId = data.user.user_id || newId;
        }
      } catch (err) {
        console.warn('Direct DB insert failed, using local fallback', err);
      }

      const newUser: User = {
        id: newId,
        student_id: userData.student_id!,
        full_name: userData.full_name!,
        email: userData.email || null,
        password_text: userData.password_text!,
        role: userData.role || 'student',
        is_active: userData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedList = [newUser, ...users];
      setUsers(updatedList);
      if (!dbInserted) {
        localStorage.setItem('ce_demo_users', JSON.stringify(updatedList));
      }
      showToast(`เพิ่มผู้ใช้ใหม่ ${newUser.student_id} เรียบร้อยแล้ว`);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (user: User) => {
    const updatedStatus = !user.is_active;

    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          student_id: user.student_id,
          is_active: updatedStatus,
        }),
      });
    } catch (err) {
      console.warn('Toggle DB status error, updating local:', err);
    }

    const updatedList = users.map((u) =>
      u.id === user.id ? { ...u, is_active: updatedStatus } : u
    );
    setUsers(updatedList);
    if (!isDbConnected) {
      localStorage.setItem('ce_demo_users', JSON.stringify(updatedList));
    }

    showToast(
      updatedStatus
        ? `เปิดสิทธิ์ RADIUS สำหรับ ${user.student_id} แล้ว`
        : `ระงับสิทธิ์ RADIUS สำหรับ ${user.student_id} แล้ว`
    );
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (user: User) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/users?id=${deletingUser.id}&student_id=${deletingUser.student_id}`, {
        method: 'DELETE',
      });

      const updatedList = users.filter((u) => u.id !== deletingUser.id);
      setUsers(updatedList);
      if (!isDbConnected) {
        localStorage.setItem('ce_demo_users', JSON.stringify(updatedList));
      }

      showToast(`ลบผู้ใช้ ${deletingUser.student_id} สำเร็จ`);
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
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
                  กำลังทำงานในโหมด Offline / Local Cache
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
              <span>เชื่อมต่อกับเซิร์ฟเวอร์ฐานข้อมูล PostgreSQL 17 บน VM สำเร็จ (192.168.100.102 / cedatabase)</span>
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
      />

      {/* Database Diagnostics & Health Check Modal */}
      <DbHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
      />
    </div>
  );
}

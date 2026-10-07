'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import UserStats from '@/components/UserStats';
import UserTable from '@/components/UserTable';
import UserModal from '@/components/UserModal';
import DeleteModal from '@/components/DeleteModal';
import RadiusIntegrationTab from '@/components/RadiusIntegrationTab';
import SetupGuideTab from '@/components/SetupGuideTab';
import DbHealthModal from '@/components/DbHealthModal';
import { User } from '@/types/database';
import { supabase, isConfigured } from '@/lib/supabase';
import { INITIAL_DEMO_USERS } from '@/lib/demo-data';
import { AlertCircle, CheckCircle, ArrowRight, Activity } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'users' | 'radius' | 'setup'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (isConfigured) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase fetch error:', error);
          const saved = typeof window !== 'undefined' ? localStorage.getItem('ce_demo_users') : null;
          setUsers(saved ? JSON.parse(saved) : INITIAL_DEMO_USERS);
        } else if (data && data.length > 0) {
          setUsers(data as User[]);
        } else {
          setUsers([]);
        }
      } else {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('ce_demo_users') : null;
        setUsers(saved ? JSON.parse(saved) : INITIAL_DEMO_USERS);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
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
      if (isConfigured) {
        const { error } = await supabase
          .from('users')
          .update({
            student_id: userData.student_id,
            full_name: userData.full_name,
            email: userData.email,
            password_text: userData.password_text,
            role: userData.role,
            is_active: userData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id);

        if (error) throw error;
      }

      // Update local state
      const updatedList = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              ...userData,
              updated_at: new Date().toISOString(),
            } as User
          : u
      );
      setUsers(updatedList);
      if (!isConfigured) {
        localStorage.setItem('ce_demo_users', JSON.stringify(updatedList));
      }
      showToast(`อัปเดตข้อมูลผู้ใช้ ${userData.student_id} เรียบร้อยแล้ว`);
    } else {
      // Create
      const newUser: User = {
        id: crypto.randomUUID(),
        student_id: userData.student_id!,
        full_name: userData.full_name!,
        email: userData.email || null,
        password_text: userData.password_text!,
        role: userData.role || 'student',
        is_active: userData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isConfigured) {
        const { error } = await supabase.from('users').insert([newUser]);
        if (error) throw error;
      }

      const updatedList = [newUser, ...users];
      setUsers(updatedList);
      if (!isConfigured) {
        localStorage.setItem('ce_demo_users', JSON.stringify(updatedList));
      }
      showToast(`เพิ่มผู้ใช้ใหม่ ${newUser.student_id} เรียบร้อยแล้ว`);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (user: User) => {
    const updatedStatus = !user.is_active;

    if (isConfigured) {
      const { error } = await supabase
        .from('users')
        .update({ is_active: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        showToast('ไม่สามารถเปลี่ยนสถานะได้: ' + error.message);
        return;
      }
    }

    const updatedList = users.map((u) =>
      u.id === user.id ? { ...u, is_active: updatedStatus } : u
    );
    setUsers(updatedList);
    if (!isConfigured) {
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
      if (isConfigured) {
        const { error } = await supabase.from('users').delete().eq('id', deletingUser.id);
        if (error) throw error;
      }

      const updatedList = users.filter((u) => u.id !== deletingUser.id);
      setUsers(updatedList);
      if (!isConfigured) {
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
        isSupabaseConnected={isConfigured}
        onOpenHealthCheck={() => setIsHealthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Unconfigured Demo Alert */}
        {!isConfigured && activeTab === 'users' && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  กำลังทำงานในโหมดจำลอง (Preview Mode)
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  คุณสามารถเพิ่ม ลบ แก้ไข ข้อมูลทดสอบได้ทันที หรือกดตรวจสอบสถานะการเชื่อมต่อ Supabase
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
                onClick={() => setActiveTab('setup')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 cursor-pointer"
              >
                <span>ดูวิธีเชื่อมต่อ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Connection Diagnostics Button for Active Dashboard */}
        {isConfigured && activeTab === 'users' && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>เชื่อมต่อกับ Supabase PostgreSQL สำเร็จ (พร้อมสำหรับเว็บแอดมินและ FreeRADIUS)</span>
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

        {/* Tab 3: Setup & Deployment Guide */}
        {activeTab === 'setup' && <SetupGuideTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900">
        <p>CE Database Server (Group 2) • Wi-Fi 802.1X & IoT Door Access Control Project</p>
        <p className="mt-1">Powered by Next.js, Supabase PostgreSQL, and Vercel</p>
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

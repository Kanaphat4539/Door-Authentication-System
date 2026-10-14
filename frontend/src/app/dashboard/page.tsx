'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import StatCards from '../../components/StatCard';
import FilterBar from '../../components/FilterBar';
import LogTable from '../../components/LogTable';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchDashboardData, recordAuditLog } from '../../services/api';
import { FilterParams, LogItem, Pagination as PaginationType } from '../../types';
import { RotateCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { lang, t } = useLanguage();

  // Filters State
  const [filters, setFilters] = useState<FilterParams>({
    studentId: '',
    room: 'all',
    date: '',
    timeSlot: 'all',
    status: 'all',
    page: 1,
    limit: 10,
    lang: 'th',
  });

  // Data & Stats State
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [stats, setStats] = useState({ activeRooms: 0, totalAccess: 0, totalRooms: 8 });
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Route Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Synchronize filter language with context
  useEffect(() => {
    setFilters((prev) => ({ ...prev, lang }));
  }, [lang]);

  // Load Data
  const loadData = useCallback(
    async (params: FilterParams = filters) => {
      if (!token) return;
      setIsLoading(true);

      try {
        const response = await fetchDashboardData(params, token);
        setLogs(response.logs || []);
        setStats({
          activeRooms: response.activeRooms ?? 0,
          totalAccess: response.totalAccess ?? 0,
          totalRooms: response.totalRooms ?? 8,
        });
        if (response.pagination) {
          setPagination(response.pagination);
        }
        setIsOfflineMode(false);
      } catch (err: any) {
        if (err.isAuthError) {
          alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          logout();
          return;
        }
        setIsOfflineMode(true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters, token, logout]
  );

  // Initial load
  useEffect(() => {
    if (isAuthenticated && token) {
      loadData(filters);
    }
  }, [isAuthenticated, token, loadData]);

  // Handle filter changes
  const handleFilterChange = (field: keyof FilterParams, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Handle search submission
  const handleSearch = () => {
    const updated = { ...filters, page: 1 };
    setFilters(updated);
    loadData(updated);

    // Record audit log for search behavior (Member 4 requirement)
    if (token) {
      const actions: string[] = [];
      if (filters.studentId) actions.push(`Search>keyword=${filters.studentId}`);
      if (filters.room && filters.room !== 'all') actions.push(`Filter>room=${filters.room}`);
      if (filters.status && filters.status !== 'all') actions.push(`Filter>status=${filters.status}`);
      if (actions.length > 0) {
        recordAuditLog(actions.join('; '), token);
      }
    }
  };

  // Reset filters
  const handleReset = () => {
    const resetFilters: FilterParams = {
      studentId: '',
      room: 'all',
      date: '',
      timeSlot: 'all',
      status: 'all',
      page: 1,
      limit: 10,
      lang,
    };
    setFilters(resetFilters);
    loadData(resetFilters);
  };

  // Refresh data button
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(filters);
  };

  // Pagination page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const updated = { ...filters, page: newPage };
      setFilters(updated);
      loadData(updated);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-2 text-slate-500">
          <RotateCw className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-sm font-medium">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-prompt">
      
      {/* Top Application Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Action Row: Title & Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {t('dashboardTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงข้อมูลและประวัติการสแกนบัตรผ่านประตูห้องเรียนแบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isOfflineMode && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('offlineMode')}</span>
              </span>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              id="refreshBtn"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span data-i18n="refreshBtn">{t('refreshBtn')}</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <StatCards
          activeRooms={stats.activeRooms}
          totalAccess={stats.totalAccess}
          totalRooms={stats.totalRooms}
        />

        {/* Filter & Search Toolbar */}
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onReset={handleReset}
          isLoading={isLoading}
        />

        {/* Access Log Table */}
        <LogTable logs={logs} isLoading={isLoading} />

        {/* Pagination Section */}
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          <p>
            Group 4: Web Application (Access Log & Teacher Dashboard) &copy; 2026. Built with Next.js & FastAPI.
          </p>
        </div>
      </footer>

    </div>
  );
}

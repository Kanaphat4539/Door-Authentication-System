'use client';

import React from 'react';
import { Database, Wifi, Server, AlertCircle, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: 'users' | 'radius' | 'overview';
  setActiveTab: (tab: 'users' | 'radius' | 'overview') => void;
  isDbConnected: boolean;
  onOpenHealthCheck: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  isDbConnected,
  onOpenHealthCheck,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                  CE Database Admin
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Group 2
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Central User Database Server (PostgreSQL 17 on VM)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Clickable Status Badge & Health Checker */}
            <button
              onClick={onOpenHealthCheck}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer shadow-xs ${
                isDbConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
              title="คลิกเพื่อตรวจสอบสถานะการเชื่อมต่อ PostgreSQL บน VM"
            >
              {isDbConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold">PostgreSQL (VM)</span>
                  <Activity className="w-3.5 h-3.5 ml-0.5 text-emerald-600" />
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold">DB Offline</span>
                  <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900 px-1.5 py-0.2 rounded text-amber-900 dark:text-amber-200 ml-0.5">
                    เช็คสถานะ
                  </span>
                </>
              )}
            </button>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Users CRUD</span>
              </button>

              <button
                onClick={() => setActiveTab('radius')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'radius'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">RADIUS View</span>
                <span className="sm:hidden">RADIUS</span>
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Server className="w-4 h-4" />
                <span className="hidden sm:inline">Project Flow & VM</span>
                <span className="sm:hidden">VM Guide</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

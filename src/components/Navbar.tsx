'use client';

import React from 'react';
import { Database, Wifi, BookOpen, AlertCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: 'users' | 'radius' | 'setup';
  setActiveTab: (tab: 'users' | 'radius' | 'setup') => void;
  isSupabaseConnected: boolean;
}

export default function Navbar({ activeTab, setActiveTab, isSupabaseConnected }: NavbarProps) {
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
                User Management & RADIUS Authentication Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Status Badge */}
            <div className="flex items-center">
              {isSupabaseConnected ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden md:inline">Connected to</span> Supabase DB
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800" title="Add NEXT_PUBLIC_SUPABASE_URL and KEY in Vercel to connect live database">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Preview / Demo Mode</span>
                </div>
              )}
            </div>

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
                onClick={() => setActiveTab('setup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'setup'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Setup Guide</span>
                <span className="sm:hidden">Guide</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

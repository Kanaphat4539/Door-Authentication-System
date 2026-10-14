'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = lang === 'en' 
    ? (user?.nameEn || user?.username || 'Teacher') 
    : (user?.name || user?.username || 'อาจารย์ผู้สอน');

  return (
    <header className="bg-gradient-to-r from-[#172554] to-[#1e3a8a] text-white shadow-md border-b border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        
        {/* Left: Logo and Titles */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-white/10 rounded-xl p-1.5 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
            <Image
              src="/logoce.png"
              alt="Logo CE"
              width={38}
              height={38}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              {t('appTitle')}
            </h1>
            <p className="text-xs text-blue-200/80 font-normal">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Right: Language switch & User profile */}
        <div className="flex items-center space-x-4">
          
          {/* Language Toggle */}
          <div className="bg-blue-950/60 p-0.5 rounded-lg border border-blue-800/60 flex items-center text-xs font-semibold">
            <button
              onClick={() => setLang('th')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                lang === 'th'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              TH
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                lang === 'en'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 bg-blue-900/50 hover:bg-blue-900/80 px-3 py-1.5 rounded-xl border border-blue-700/50 transition-colors text-sm"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-slate-100 max-w-[140px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-4 h-4 text-blue-300" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center space-x-3">
                  <div className="relative">
                    <UserCircle className="w-10 h-10 text-blue-600" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-semibold text-sm text-slate-900 truncate">
                      {displayName}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email || `${user?.username || 'teacher'}@university.ac.th`}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {t('lecturerRole')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 px-2">
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logoutBtn')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}

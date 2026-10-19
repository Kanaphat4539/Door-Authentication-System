'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { DoorOpen, Users } from 'lucide-react';

interface StatCardProps {
  activeRooms: number;
  totalAccess: number;
  totalRooms?: number;
  role?: string;
}

export default function StatCards({ activeRooms, totalAccess, totalRooms = 8, role }: StatCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isStudent = (role || user?.role) === 'student';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
      
      {/* Card 1: Active Rooms */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/70 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-125 transition-transform"></div>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t('stat1Title')}
            </span>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {t('stat1Desc')}
            </p>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-jakarta">
                {activeRooms}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {totalRooms} ห้อง
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <DoorOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Card 2: Total Access Events */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/70 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-125 transition-transform"></div>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {isStudent ? t('studentStat2Title') : t('stat2Title')}
            </span>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              {isStudent ? t('studentStat2Desc') : t('stat2Desc')}
            </p>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-jakarta">
                {totalAccess}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                {t('stat2Unit')}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

    </div>
  );
}

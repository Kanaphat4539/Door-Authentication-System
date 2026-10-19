'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { LogItem } from '../types';
import { ArrowDownRight, ArrowUpRight, Inbox, Loader2, History } from 'lucide-react';

interface LogTableProps {
  logs: LogItem[];
  isLoading: boolean;
}

export default function LogTable({ logs, isLoading }: LogTableProps) {
  const { t, lang } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Table Header Info Bar */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-inner">
            <History className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {lang === 'en' ? 'Classroom Access History' : 'ประวัติการเข้า-ออกห้องเรียนล่าสุด'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'en' ? 'Real-time classroom card scan records' : 'บันทึกการแตะบัตรห้องเรียนแบบเรียลไทม์'}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Stream</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-5">{t('tableHeaderId')}</th>
              <th className="py-3.5 px-5">{t('tableHeaderName')}</th>
              <th className="py-3.5 px-5">{t('tableHeaderRoom')}</th>
              <th className="py-3.5 px-5">{t('tableHeaderDate')}</th>
              <th className="py-3.5 px-5">{t('tableHeaderTime')}</th>
              <th className="py-3.5 px-5 text-center">{t('tableHeaderStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                    <span className="text-sm font-medium">{t('loadingText')}</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Inbox className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-500">{t('noDataText')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const isIn = String(log.status).toUpperCase() === 'IN';
                return (
                  <tr
                    key={`${log.id || log.student_id}-${index}`}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Student ID */}
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-900">
                      {log.student_id}
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-5 font-medium text-slate-800">
                      {log.name || log.student_name}
                    </td>

                    {/* Classroom */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs tracking-wide">
                          {log.room}
                        </span>
                        {log.roomSub && (
                          <span className="text-[11px] text-slate-400">
                            {log.roomSub}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-5 text-slate-600 text-xs">
                      {log.date}
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-600">
                      {log.time}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold gap-1 shadow-sm ${
                          isIn
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{isIn ? 'IN (เข้า)' : 'OUT (ออก)'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

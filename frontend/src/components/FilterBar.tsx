'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { FilterParams } from '../types';
import { Search, RotateCcw, Calendar, Clock, DoorClosed, Filter, Lock, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  filters: FilterParams;
  onChange: (field: keyof FilterParams, value: any) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading: boolean;
  role?: string;
  currentUserId?: string;
}

const ROOMS = ['all', 'B217', 'B218', 'B316', 'B317', 'E107', 'E111', 'E112', 'B113', 'LAB-401', 'SMART-205'];

interface TimeSlotOption {
  value: string;
  start: string;
  end: string;
}

const TIME_SLOTS: TimeSlotOption[] = [
  { value: '08:00', start: '08:00', end: '09:00' },
  { value: '09:00', start: '09:00', end: '10:00' },
  { value: '10:00', start: '10:00', end: '11:00' },
  { value: '11:00', start: '11:00', end: '12:00' },
  { value: '12:00', start: '12:00', end: '13:00' },
  { value: '13:00', start: '13:00', end: '14:00' },
  { value: '14:00', start: '14:00', end: '15:00' },
  { value: '15:00', start: '15:00', end: '16:00' },
  { value: '16:00', start: '16:00', end: '17:00' },
  { value: '17:00', start: '17:00', end: '18:00' },
  { value: '18:00', start: '18:00', end: '19:00' },
  { value: '19:00', start: '19:00', end: '20:00' },
  { value: '20:00', start: '20:00', end: '21:00' },
  { value: '21:00', start: '21:00', end: '22:00' },
  { value: '22:00', start: '22:00', end: '23:00' },
  { value: '23:00', start: '23:00', end: '00:00' },
];

export default function FilterBar({
  filters,
  onChange,
  onSearch,
  onReset,
  isLoading,
  role,
  currentUserId,
}: FilterBarProps) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();

  const activeRole = role || user?.role || 'teacher';
  const isStudent = activeRole === 'student';
  const studentLockId = currentUserId || (isStudent ? user?.username : '') || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Student ID / Name Input */}
        <div className="relative">
          <div className="h-5 flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {isStudent ? (lang === 'en' ? 'Student ID' : 'รหัสนักศึกษา') : `${t('tableHeaderId')} / ${t('tableHeaderName')}`}
            </label>
            {isStudent && (
              <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex-shrink-0" title="ล็อกเฉพาะรหัสของตนเอง">
                <Lock className="w-2.5 h-2.5" />
                <span>ล็อกรหัส</span>
              </span>
            )}
          </div>
          {isStudent ? (
            // 🔒 โหมดนักศึกษา: ล็อกรหัสตนเอง ไม่สามารถพิมพ์เปลี่ยนเป็นรหัสคนอื่นได้
            <div className="relative">
              <Lock className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="studentId"
                value={studentLockId || filters.studentId || ''}
                readOnly
                disabled
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100/90 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-not-allowed select-none shadow-inner"
                title="ระบบล็อกให้แสดงเฉพาะข้อมูลของรหัสนักศึกษาตนเองเท่านั้น"
              />
            </div>
          ) : (
            // 🔓 โหมดอาจารย์: ค้นหาได้อิสระ
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="studentId"
                value={filters.studentId || ''}
                onChange={(e) => onChange('studentId', e.target.value)}
                placeholder={t('filterStudentPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
            </div>
          )}
        </div>

        {/* Room Select */}
        <div>
          <div className="h-5 flex items-center mb-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t('tableHeaderRoom')}
            </label>
          </div>
          <div className="relative">
            <DoorClosed className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="roomSelect"
              value={filters.room || 'all'}
              onChange={(e) => onChange('room', e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer"
            >
              <option value="all">{t('filterAllRooms')}</option>
              {ROOMS.filter((r) => r !== 'all').map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <div className="h-5 flex items-center mb-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t('tableHeaderDate')}
            </label>
          </div>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              id="dateSelect"
              value={filters.date || ''}
              onChange={(e) => onChange('date', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Time Slot Select */}
        <div>
          <div className="h-5 flex items-center mb-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t('tableHeaderTime')}
            </label>
          </div>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="timeSelect"
              value={filters.timeSlot || 'all'}
              onChange={(e) => onChange('timeSlot', e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer truncate"
            >
              <option value="all">{t('filterAllTimes')}</option>
              {TIME_SLOTS.map((ts) => (
                <option key={ts.value} value={ts.value}>
                  {lang === 'en' ? `${ts.start} - ${ts.end}` : `${ts.start} - ${ts.end} น.`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Select */}
        <div>
          <div className="h-5 flex items-center mb-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {t('tableHeaderStatus')}
            </label>
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={filters.status || 'all'}
              onChange={(e) => onChange('status', e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer"
            >
              <option value="all">{t('filterAllStatuses')}</option>
              <option value="IN">{t('statusIn')}</option>
              <option value="OUT">{t('statusOut')}</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t('resetBtn')}</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          id="searchBtn"
          className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
          <span>{isLoading ? t('loadingText') : t('searchBtn')}</span>
        </button>
      </div>

    </form>
  );
}

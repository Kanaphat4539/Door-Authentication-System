'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FilterParams } from '../types';
import { Search, RotateCcw, Calendar, Clock, DoorClosed, Filter } from 'lucide-react';

interface FilterBarProps {
  filters: FilterParams;
  onChange: (field: keyof FilterParams, value: any) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading: boolean;
}

const ROOMS = ['all', 'B217', 'B218', 'B316', 'B317', 'E107', 'E111', 'E112', 'B113', 'LAB-401', 'SMART-205'];
const TIME_SLOTS = [
  'all',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export default function FilterBar({
  filters,
  onChange,
  onSearch,
  onReset,
  isLoading,
}: FilterBarProps) {
  const { t } = useLanguage();

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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {t('tableHeaderId')} / {t('tableHeaderName')}
          </label>
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
        </div>

        {/* Room Select */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {t('tableHeaderRoom')}
          </label>
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
          </div>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {t('tableHeaderDate')}
          </label>
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
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {t('tableHeaderTime')}
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="timeSelect"
              value={filters.timeSlot || 'all'}
              onChange={(e) => onChange('timeSlot', e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer"
            >
              <option value="all">{t('filterAllTimes')}</option>
              {TIME_SLOTS.filter((ts) => ts !== 'all').map((ts) => (
                <option key={ts} value={ts}>
                  {ts}:00 น.
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Select */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {t('tableHeaderStatus')}
          </label>
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

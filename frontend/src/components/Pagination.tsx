'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Pagination as PaginationType } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
}

export default function Pagination({
  pagination,
  onPageChange,
  isLoading,
}: PaginationProps) {
  const { t } = useLanguage();
  const { page, limit, total, totalPages } = pagination;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1 text-sm text-slate-500">
      
      {/* Information text */}
      <div id="paginationInfo" className="font-medium text-xs sm:text-sm">
        {t('showingEntries', { start, end, total })}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1.5">
        
        {/* Prev Button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-slate-600"
          title={t('prevPage')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                ...
              </span>
            );
          }
          const isCurrent = p === page;
          return (
            <button
              key={`page-${p}`}
              onClick={() => onPageChange(p as number)}
              disabled={isLoading}
              className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-semibold transition-all ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-slate-600"
          title={t('nextPage')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import UserFlowDiagram from '../../components/UserFlowDiagram';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';

export default function UserFlowPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mini Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400" />
            กลับสู่แดชบอร์ด (Back to Dashboard)
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="/flow-docs/USER_FLOW.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              เปิดแบบเต็มจอ (Full View)
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto py-8 px-4">
        <UserFlowDiagram />
      </main>
    </div>
  );
}

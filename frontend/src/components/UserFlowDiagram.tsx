'use client';

import React, { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  LogIn, 
  ShieldCheck, 
  Search, 
  Calendar, 
  Clock, 
  DoorOpen, 
  CheckCircle2, 
  BarChart3, 
  ArrowDown, 
  ArrowRight,
  Filter,
  Eye,
  KeyRound,
  Lock
} from 'lucide-react';

export default function UserFlowDiagram() {
  const [activeTab, setActiveTab] = useState<'all' | 'teacher' | 'student'>('all');

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Role-Based Access Control (RBAC) User Flow
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          แผนผังเส้นทางการใช้งานระบบ <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">(User Flow)</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          ระบบจัดการการเข้าห้องเรียนอัจฉริยะ กลุ่ม 4 — แบ่งบทบาทตามสิทธิ์ใน Token
        </p>

        {/* Tab Toggle */}
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl mt-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ภาพรวมทั้งระบบ (Both)
          </button>
          <button
            onClick={() => setActiveTab('teacher')}
            className={`px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'teacher'
                ? 'bg-blue-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            บทบาทอาจารย์ (Teacher)
          </button>
          <button
            onClick={() => setActiveTab('student')}
            className={`px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-emerald-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            บทบาทนักศึกษา (Student)
          </button>
        </div>
      </div>

      {/* STEP 1: LOGIN (COMMON ENTRY) */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-center shadow-lg relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-800 border border-slate-600 rounded-full text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <LogIn className="w-3 h-3 text-sky-400" />
            จุดเริ่มต้น (Single Entry Portal)
          </div>
          <h3 className="text-base font-bold text-white mt-1">1. หน้าเข้าสู่ระบบ (Login Page)</h3>
          <p className="text-xs text-slate-400 mt-1">
            กรอก Username & Password → ยืนยันรหัสผ่านผ่านระบบกลาง (กลุ่ม 3)
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-950/80 rounded-md border border-slate-800 text-[11px] text-amber-400">
            <KeyRound className="w-3 h-3" />
            ออก Group 4 JWT Token (ระบุ Role & Expiration 120m)
          </div>
        </div>

        {/* Arrow Down */}
        <div className="my-3 flex flex-col items-center text-slate-500">
          <ArrowDown className="w-5 h-5 text-sky-400 animate-bounce" />
          <span className="text-[11px] font-medium text-slate-400 mt-0.5">ตรวจสอบสิทธิ์ตามบทบาท (Role Divergence)</span>
        </div>
      </div>

      {/* STEP 2: SPLIT FLOWS (TEACHER VS STUDENT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TEACHER FLOW */}
        {(activeTab === 'all' || activeTab === 'teacher') && (
          <div className={`flex flex-col bg-slate-900/90 border-2 rounded-2xl p-5 transition-all ${
            activeTab === 'teacher' ? 'md:col-span-2 border-blue-500 bg-blue-950/10' : 'border-blue-500/40'
          }`}>
            {/* Role Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Role: Teacher
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">หากเป็น อาจารย์</h3>
              </div>
            </div>

            {/* Content Steps */}
            <div className="space-y-4 mt-4">
              {/* Feature 1: Stat Cards */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-1.5">
                  <BarChart3 className="w-4 h-4" />
                  การ์ดสรุปสถิติภาพรวม
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pl-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    ห้องที่มีการใช้ทั้งหมดกี่ห้อง
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    สถิติการเข้าใช้ห้องเรียนรายวัน
                  </li>
                </ul>
                <p className="text-[11px] text-amber-300/80 mt-2 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                  * แสดงข้อมูลทั้งหมดเป็นสถิติภาพรวม ไม่ลดลงตามการค้นหา
                </p>
              </div>

              {/* Feature 2: View All Logs */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-1">
                  <Eye className="w-4 h-4" />
                  การดูประวัติการเข้าใช้ห้อง
                </div>
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-medium text-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>สามารถดูประวัติการเข้าใช้ห้องทั้งหมด</span>
                </div>
              </div>

              {/* Feature 3: Search filters */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-2">
                  <Search className="w-4 h-4" />
                  ค้นหาประวัติการเข้าใช้ห้องได้จาก:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-blue-400 block font-semibold">1</span>
                    รหัสนักศึกษา
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-blue-400 block font-semibold">2</span>
                    ห้อง
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-blue-400 block font-semibold">3</span>
                    วัน
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-blue-400 block font-semibold">4</span>
                    เวลา
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200 col-span-2 sm:col-span-2">
                    <span className="text-[10px] text-blue-400 block font-semibold">5</span>
                    สถานะ (IN / OUT / ACTIVE)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT FLOW */}
        {(activeTab === 'all' || activeTab === 'student') && (
          <div className={`flex flex-col bg-slate-900/90 border-2 rounded-2xl p-5 transition-all ${
            activeTab === 'student' ? 'md:col-span-2 border-emerald-500 bg-emerald-950/10' : 'border-emerald-500/40'
          }`}>
            {/* Role Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Role: Student
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">หากเป็น นักศึกษา</h3>
              </div>
            </div>

            {/* Content Steps */}
            <div className="space-y-4 mt-4">
              {/* Feature 1: Personal Stat Cards */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1.5">
                  <BarChart3 className="w-4 h-4" />
                  การ์ดสรุปสถิติส่วนบุคคล
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pl-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    แสดงเฉพาะข้อมูลสถิติทั้งหมดของตนเอง
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    (จำนวนครั้งที่เข้าเรียน, จำนวนห้องที่เคยเข้าเรียน)
                  </li>
                </ul>
                <p className="text-[11px] text-amber-300/80 mt-2 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                  * แสดงเฉพาะข้อมูลทั้งหมดของตนเอง ไม่ลดลงตามการค้นหา
                </p>
              </div>

              {/* Feature 2: View and Search filters */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    สามารถดูประวัติการเข้าใช้ห้องได้จาก:
                  </div>
                  <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Anti-IDOR
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-emerald-400 block font-semibold">1</span>
                    ห้อง
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-emerald-400 block font-semibold">2</span>
                    วัน
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-emerald-400 block font-semibold">3</span>
                    เวลา
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs text-slate-200">
                    <span className="text-[10px] text-emerald-400 block font-semibold">4</span>
                    สถานะ (IN / OUT / ACTIVE)
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ดูได้เฉพาะข้อมูลตนเองเท่านั้น ไม่มีช่องให้ค้นหารหัสนักศึกษาคนอื่น
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: LOGOUT / FOOTER */}
      <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <span>รองรับระบบสลับภาษา (ไทย 🇹🇭 / English 🇺🇸) และระบบออกจากระบบ (Logout) ลบ Token อัตโนมัติ</span>
        <span className="text-slate-400 font-mono text-[11px]">Classroom Access Security System © กลุ่ม 4</span>
      </div>
    </div>
  );
}

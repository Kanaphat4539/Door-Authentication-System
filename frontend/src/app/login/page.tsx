'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { loginAPI } from '../../services/api';
import { Mail, Key, Eye, EyeOff, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();

  const [username, setUsername] = useState('teacher_ajarn');
  const [password, setPassword] = useState('secure123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Route guard: if already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    if (!username.trim() || !password) {
      setErrorMessage('กรุณากรอก Username และ Password ให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginAPI(username.trim(), password);
      login(result.access_token, result.user);
      router.replace('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    login('mock-jwt-bearer-token-teacher-dev', {
      username: 'teacher_ajarn',
      name: 'อาจารย์ สมชาย ใจดี',
      nameEn: 'Dr. Somchai Jaidee',
      role: 'teacher',
      email: 'teacher.ajarn@university.ac.th',
    });
    router.replace('/dashboard');
  };

  const handleStudentDemoLogin = () => {
    login('mock-jwt-bearer-token-student-dev', {
      username: '67200324',
      name: 'นายสมชาย ใจกล้า',
      nameEn: 'Leo Ev',
      role: 'student',
      email: 'leo.ev@university.ac.th',
    });
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 text-slate-800 flex flex-col justify-center items-center p-4 selection:bg-orange-500 selection:text-white">
      
      {/* Top Badge */}
      <div className="mb-6 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-medium text-slate-600">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Classroom Access Management System</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo and Titles */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
            <Image
              src="/logoce.png"
              alt="System Logo"
              width={76}
              height={76}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-jakarta">Sign In</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Enter your account credentials to access the classroom tracking system
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-[11px] font-bold text-slate-600 tracking-wider uppercase mb-1.5 font-jakarta">
              USERNAME
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="รหัสนักศึกษา หรือ Username อาจารย์"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 tracking-wider uppercase mb-1.5 font-jakarta">
              PASSWORD
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot link */}
          <div className="flex justify-end pt-0.5">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('กรุณาติดต่อผู้ดูแลระบบเครือข่าย VM4 (คนที่ 7) เพื่อรีเซ็ตรหัสผ่าน');
              }}
              className="text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors"
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btnSubmit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          {/* Demo Login Buttons */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <button
              type="button"
              id="btnDemoLogin"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>เข้าสู่ระบบด้วยบัญชีทดสอบ (Demo Teacher)</span>
            </button>
            <button
              type="button"
              id="btnStudentDemoLogin"
              onClick={handleStudentDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>เข้าสู่ระบบด้วยบัญชีทดสอบ (Demo Student)</span>
            </button>
          </div>

        </form>

      </div>

      {/* Footer copyright */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        &copy; 2026 Group 4 — Classroom Access Management System (Mini Project)
      </footer>

    </div>
  );
}

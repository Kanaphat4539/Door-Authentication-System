'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface Translations {
  [key: string]: {
    th: string;
    en: string;
  };
}

export const translations: Translations = {
  appTitle: {
    th: 'ระบบบริหารจัดการการเข้าใช้ห้องเรียน',
    en: 'Classroom Access Management System',
  },
  appSubtitle: {
    th: 'ระบบบันทึกและติดตามการเข้าใช้งานห้องเรียนอัตโนมัติ',
    en: 'Automated Classroom Access Tracking System',
  },
  dashboardTitle: {
    th: 'ระบบติดตามการเข้าใช้ห้อง',
    en: 'Classroom Access Monitoring',
  },
  refreshBtn: {
    th: 'รีเฟรชข้อมูล',
    en: 'Refresh Data',
  },
  stat1Title: {
    th: 'ห้องเรียนที่เปิดใช้งานอยู่ขณะนี้',
    en: 'Currently Active Rooms',
  },
  stat1Desc: {
    th: 'สถานะห้องเรียนที่เปิดใช้งาน',
    en: 'Classroom occupancy status',
  },
  stat1Unit: {
    th: '/ 8 ห้อง',
    en: '/ 8 rooms',
  },
  stat2Title: {
    th: 'ยอดรวมการเข้าใช้งานวันนี้',
    en: 'Total Access Events Today',
  },
  studentStat2Title: {
    th: 'ยอดเข้าห้องเรียนของฉัน',
    en: 'My Total Access Events',
  },
  stat2Desc: {
    th: 'สถิติการเข้าใช้ห้องเรียนรายวัน',
    en: 'Daily access transaction count',
  },
  studentStat2Desc: {
    th: 'จำนวนครั้งที่คุณสแกนเข้า-ออกห้องเรียน',
    en: 'Your classroom scan transaction count',
  },
  stat2Unit: {
    th: 'ครั้ง',
    en: 'times',
  },
  filterStudentPlaceholder: {
    th: 'ค้นหารหัสนักศึกษา หรือชื่อ-นามสกุล...',
    en: 'Search student ID or name...',
  },
  filterAllRooms: {
    th: 'ห้องทั้งหมด (ทุกห้อง)',
    en: 'All Classrooms',
  },
  filterAllTimes: {
    th: 'ทุกช่วงเวลา',
    en: 'All Time Slots',
  },
  filterAllStatuses: {
    th: 'ทุกสถานะ (IN / OUT)',
    en: 'All Statuses (IN / OUT)',
  },
  statusIn: {
    th: 'เข้าห้อง (IN)',
    en: 'Check In (IN)',
  },
  statusOut: {
    th: 'ออกห้อง (OUT)',
    en: 'Check Out (OUT)',
  },
  searchBtn: {
    th: 'ค้นหา',
    en: 'Search',
  },
  resetBtn: {
    th: 'ล้างค่า',
    en: 'Reset',
  },
  tableHeaderId: {
    th: 'รหัสนักศึกษา',
    en: 'Student ID',
  },
  tableHeaderName: {
    th: 'ชื่อ - นามสกุล',
    en: 'Student Name',
  },
  tableHeaderRoom: {
    th: 'ห้องเรียน',
    en: 'Classroom',
  },
  tableHeaderDate: {
    th: 'วันที่บันทึก',
    en: 'Date',
  },
  tableHeaderTime: {
    th: 'เวลา',
    en: 'Time',
  },
  tableHeaderStatus: {
    th: 'สถานะ',
    en: 'Status',
  },
  loadingText: {
    th: 'กำลังโหลดข้อมูล...',
    en: 'Loading data...',
  },
  noDataText: {
    th: 'ไม่พบข้อมูลประวัติการเข้าใช้งานตามเงื่อนไขที่เลือก',
    en: 'No access log records found for the selected criteria.',
  },
  showingEntries: {
    th: 'แสดง {start} ถึง {end} จากทั้งหมด {total} รายการ',
    en: 'Showing {start} to {end} of {total} entries',
  },
  prevPage: {
    th: 'ก่อนหน้า',
    en: 'Previous',
  },
  nextPage: {
    th: 'ถัดไป',
    en: 'Next',
  },
  lecturerRole: {
    th: 'อาจารย์ผู้สอน',
    en: 'Lecturer',
  },
  studentRole: {
    th: 'นักศึกษา',
    en: 'Student',
  },
  studentLockedLabel: {
    th: 'รหัสนักศึกษาของคุณ (ล็อกเฉพาะตนเอง)',
    en: 'Your Student ID (Locked to yourself)',
  },
  logoutBtn: {
    th: 'ออกจากระบบ',
    en: 'Sign Out',
  },
  offlineMode: {
    th: 'โหมดออฟไลน์ (เชื่อมต่อ Mock Data)',
    en: 'Offline Mode (Connected to Mock Data)',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'th',
  setLang: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('th');

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let text = translations[key]?.[lang] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

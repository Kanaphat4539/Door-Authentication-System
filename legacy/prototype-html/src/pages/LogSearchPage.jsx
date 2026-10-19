import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardData } from '../api/logService';

export default function LogSearchPage() {
  const { token, logout } = useAuth();

  // 1. Application State สำหรับตัวกรอง (อ้างอิงตามคู่มือคนที่ 2 & คนที่ 6)
  const [filters, setFilters] = useState({
    studentId: '',
    room: 'all',
    date: '',
    timeSlot: 'all',
    status: 'all',
    lang: 'th'
  });

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Data States
  const [stats, setStats] = useState({ activeRooms: 0, totalAccess: 0 });
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ฟังก์ชันโหลดข้อมูลจาก Backend
  const loadData = useCallback(async (targetPage = pagination.page) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDashboardData({ ...filters, page: targetPage, limit: pagination.limit }, token);
      if (result.status === 'success') {
        setStats({
          activeRooms: result.activeRooms || 0,
          totalAccess: result.totalAccess || 0
        });
        setLogs(result.logs || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError('ไม่สามารถดึงข้อมูลได้');
      }
    } catch (err) {
      if (err.isAuthError) {
        alert(err.message || 'Session expired');
        logout();
        return;
      }
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ API');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit, pagination.page, token, logout]);

  // โหลดข้อมูลเมื่อฟิลเตอร์เปลี่ยน หรือหน้าเปลี่ยน
  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // จัดการการเปลี่ยนค่า Input / Select
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    setFilters({
      studentId: '',
      room: 'all',
      date: '',
      timeSlot: 'all',
      status: 'all',
      lang: 'th'
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      loadData(newPage);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard & Access Log</h1>
        {/* ส่วนสลับภาษา (อ้างอิง btnTH / btnEN ตามคู่มือ) */}
        <div className="space-x-2">
          <button 
            id="btnTH" 
            onClick={() => handleFilterChange('lang', 'th')}
            className={`px-3 py-1 text-sm rounded ${filters.lang === 'th' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            TH
          </button>
          <button 
            id="btnEN" 
            onClick={() => handleFilterChange('lang', 'en')}
            className={`px-3 py-1 text-sm rounded ${filters.lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            EN
          </button>
        </div>
      </header>

      {/* สถิติภาพรวม (การ์ดตามคู่มือคนที่ 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">ห้องเรียนที่เปิดใช้งาน (Active Rooms)</p>
            <span id="activeRoomsNum" className="text-3xl font-bold text-gray-800">{stats.activeRooms}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">ยอดรวมการเข้าใช้งานวันนี้ (Total Access)</p>
            <span id="totalAccessNum" className="text-3xl font-bold text-blue-600">{stats.totalAccess}</span>
          </div>
        </div>
      </div>

      {/* ส่วนฟอร์มค้นหาและตัวกรอง (Filter Controls ตามคู่มือ) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสนักศึกษา / ชื่อ</label>
          <input 
            id="studentId"
            type="text" 
            placeholder="ค้นหารหัสนักศึกษา..."
            value={filters.studentId}
            onChange={(e) => handleFilterChange('studentId', e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">ห้องเรียน</label>
          <select 
            id="roomSelect"
            value={filters.room}
            onChange={(e) => handleFilterChange('room', e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">ทุกห้อง (All Rooms)</option>
            <option value="B217">B217</option>
            <option value="B218">B218</option>
            <option value="B316">B316</option>
            <option value="B317">B317</option>
            <option value="E107">E107</option>
            <option value="E111">E111</option>
            <option value="E112">E112</option>
            <option value="B113">B113</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่</label>
          <input 
            id="dateSelect"
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">ช่วงเวลา</label>
          <select 
            id="timeSelect"
            value={filters.timeSlot}
            onChange={(e) => handleFilterChange('timeSlot', e.target.value)}
            className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">ทุกช่วงเวลา</option>
            <option value="08:00">08:00 น.</option>
            <option value="10:00">10:00 น.</option>
            <option value="13:00">13:00 น.</option>
            <option value="15:00">15:00 น.</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            id="searchBtn" 
            onClick={() => loadData(1)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
          >
            ค้นหา
          </button>
          <button 
            id="refreshBtn" 
            onClick={handleRefresh}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300 transition"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {/* ส่วนแสดงข้อผิดพลาด */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* ส่วนตารางแสดงข้อมูล (Log Table Body ตามคู่มือ) */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">กำลังโหลดข้อมูล...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">ยังไม่มีข้อมูลในขณะนี้ (Empty State)</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                <th className="p-4">รหัสนักศึกษา</th>
                <th className="p-4">ชื่อ - นามสกุล</th>
                <th className="p-4">ห้องเรียน</th>
                <th className="p-4">วันที่ / เวลา</th>
                <th className="p-4">สถานะ (Status)</th>
              </tr>
            </thead>
            <tbody id="logTableBody" className="divide-y text-sm text-gray-700">
              {logs.map((log, index) => {
                const studentId = log.student_id || log.id;
                const studentName = log.student_name || log.name;
                const isIn = log.status === 'IN';
                
                return (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-mono">{studentId}</td>
                    <td className="p-4 font-medium">{studentName}</td>
                    <td className="p-4">
                      <span className="font-semibold">{log.room}</span>
                      {log.roomSub && <span className="block text-xs text-gray-400">{log.roomSub}</span>}
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {log.date} <br/> {log.time}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {isIn ? 'เข้าใช้ห้องเรียน (IN)' : 'ออกจากห้องเรียน (OUT)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center text-sm text-gray-600">
          <span id="paginationInfo">
            แสดง {logs.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} ถึง {Math.min(pagination.page * pagination.limit, pagination.total)} จากทั้งหมด {pagination.total} รายการ
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 bg-white border rounded disabled:opacity-50"
            >
              ย้อนกลับ
            </button>
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-600 font-semibold rounded">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 bg-white border rounded disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
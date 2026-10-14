/**
 * logService.js - คนที่ 3: Frontend Developer (State Management & API Integration)
 * โมดูลเชื่อมต่อ API ดึงข้อมูล Access Logs และสถิติ Dashboard จาก Backend (คนที่ 6 & 4)
 * รองรับทั้งการโหลดผ่าน Browser Script tag และการ import เป็น Module
 * มีระบบ Mock Fallback อัตโนมัติในกรณีที่เซิร์ฟเวอร์ Backend ยังไม่ได้เปิดใช้งาน
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.LogService = factory();
    // สร้าง alias ใน window เพื่อความสะดวก
    root.fetchDashboardData = root.LogService.fetchDashboardData;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // ข้อมูลจำลองสำหรับทดสอบในกรณี Backend ออฟไลน์ (ตรงตาม Data Contract ของคนที่ 2 และ 6)
  const MOCK_DATA = [
    { id: "65010234", student_id: "65010234", name: "นายธนภัทร สุขเกษม", nameEn: "Thanaphat Sukhasem", room: "B217", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "15:30 น.", timeEn: "03:30 PM", status: "IN" },
    { id: "65010567", student_id: "65010567", name: "นางสาวสมหญิง ตั้งใจ", nameEn: "Somying Tangjai", room: "E107", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "15:15 น.", timeEn: "03:15 PM", status: "OUT" },
    { id: "66010892", student_id: "66010892", name: "นายกิตติศักดิ์ ประเสริฐ", nameEn: "Kittisak Prasert", room: "B218", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "14:50 น.", timeEn: "02:50 PM", status: "IN" },
    { id: "64010111", student_id: "64010111", name: "นายปิติ มั่นคง", nameEn: "Piti Mankong", room: "B316", roomSub: "Building B / Floor 3", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "14:40 น.", timeEn: "02:40 PM", status: "IN" },
    { id: "65010999", student_id: "65010999", name: "นางสาวมณีรัตน์ แสงแก้ว", nameEn: "Maneerat Saengkaew", room: "E111", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "14:25 น.", timeEn: "02:25 PM", status: "OUT" },
    { id: "65010345", student_id: "65010345", name: "นายชินวัตร บุญสม", nameEn: "Shinawatra Boonsom", room: "B217", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "14:10 น.", timeEn: "02:10 PM", status: "IN" },
    { id: "66010777", student_id: "66010777", name: "นายวรพจน์ ศรีสุวรรณ", nameEn: "Worapoj Srisuwan", room: "B317", roomSub: "Building B / Floor 3", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "13:50 น.", timeEn: "01:50 PM", status: "OUT" },
    { id: "65010888", student_id: "65010888", name: "นางสาวพิมพ์ชนก รุ่งเรือง", nameEn: "Pimchanok Rungruang", room: "E112", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "13:30 น.", timeEn: "01:30 PM", status: "IN" },
    { id: "64010555", student_id: "64010555", name: "นายอนุชา วงศ์สวัสดิ์", nameEn: "Anucha Wongsawat", room: "B113", roomSub: "Building B / Floor 1", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "13:15 น.", timeEn: "01:15 PM", status: "IN" },
    { id: "65010666", student_id: "65010666", name: "นางสาวนภัสสร ใจดี", nameEn: "Napatsorn Jaidee", room: "B218", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "12:55 น.", timeEn: "12:55 PM", status: "OUT" },
    { id: "65010444", student_id: "65010444", name: "นายธีรภัทร ชาญวิทย์", nameEn: "Theeraphat Chanwit", room: "B217", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "12:30 น.", timeEn: "12:30 PM", status: "IN" },
    { id: "66010222", student_id: "66010222", name: "นางสาวศิริพร บุญตา", nameEn: "Siriporn Boonta", room: "E107", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", dateEn: "Oct 14, 2026", time: "12:05 น.", timeEn: "12:05 PM", status: "OUT" }
  ];

  /**
   * ค้นหา Base URL ของ API จากการตั้งค่าของคนที่ 1 (CONFIG) หรือค่า Default
   */
  function getBaseUrl() {
    if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
      return CONFIG.API_BASE_URL.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_BASE_URL) {
      return window.CONFIG.API_BASE_URL.replace(/\/+$/, '');
    }
    return 'http://192.168.50.86:8000/api/v1';
  }

  /**
   * กรองและแบ่งหน้าข้อมูลจำลองในเครื่อง (Mock Fallback)
   */
  function filterMockData(params = {}) {
    const keyword = (params.student_id || params.studentId || '').toLowerCase();
    const room = params.room || 'all';
    const status = params.status || 'all';
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);

    const filtered = MOCK_DATA.filter(item => {
      if (keyword) {
        const idMatch = item.student_id.toLowerCase().includes(keyword);
        const nameMatch = item.name.toLowerCase().includes(keyword) || (item.nameEn && item.nameEn.toLowerCase().includes(keyword));
        if (!idMatch && !nameMatch) return false;
      }
      if (room !== 'all' && item.room !== room) return false;
      if (status !== 'all' && item.status !== status) return false;
      return true;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const pagedLogs = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      status: 'success',
      activeRooms: 7,
      totalAccess: MOCK_DATA.length,
      logs: pagedLogs,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages
      }
    };
  }

  /**
   * ดึงข้อมูลประวัติการเข้า-ออกห้องเรียนและสถิติจาก Backend (คนที่ 6)
   * @param {Object} params - ตัวกรอง { student_id, room, date, time_slot, status, page, limit, lang }
   * @param {string} token - JWT Bearer Token จากคนที่ 1
   * @returns {Promise<Object>} ข้อมูล Dashboard ตาม JSON Contract
   */
  async function fetchDashboardData(params = {}, token = '') {
    // ดึง Token จาก Parameter หรือจาก LocalStorage (คนที่ 1)
    const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '');

    // ตรวจสอบ Token จำลองกรณีทดสอบ Dev Mode
    if (authToken === 'mock-jwt-bearer-token-teacher-dev' || authToken === 'mock-jwt-bearer-token') {
      // โหมดทดสอบจำลอง: ใช้ Mock Data ทันทีเพื่อให้ทดสอบฟีเจอร์ UI ได้รวดเร็ว
      return filterMockData(params);
    }

    // เตรียม Query Parameters ตามสเปกของคนที่ 6
    const queryObj = {
      lang: params.lang || 'th',
      page: params.page || 1,
      limit: params.limit || 10
    };

    if (params.student_id || params.studentId) {
      queryObj.student_id = (params.student_id || params.studentId).trim();
    }
    if (params.room && params.room !== 'all') {
      queryObj.room = params.room;
    }
    if (params.date) {
      queryObj.date = params.date;
    }
    if (params.time_slot && params.time_slot !== 'all') {
      queryObj.time_slot = params.time_slot;
    }
    if (params.timeSlot && params.timeSlot !== 'all') {
      queryObj.time_slot = params.timeSlot;
    }
    if (params.status && params.status !== 'all') {
      queryObj.status = params.status;
    }

    const queryString = new URLSearchParams(queryObj).toString();
    const baseUrl = getBaseUrl();
    const primaryUrl = `${baseUrl}/logs${queryString ? '?' + queryString : ''}`;
    const fallbackUrl = `${baseUrl}/get_dashboard_data.php${queryString ? '?' + queryString : ''}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    let response;
    let urlUsed = primaryUrl;

    try {
      response = await fetch(primaryUrl, { method: 'GET', headers });
      // หาก Endpoint /logs ให้ 404 ให้ลอง Fallback ไปยัง PHP endpoint เดิมตามคู่มือ
      if (response.status === 404) {
        urlUsed = fallbackUrl;
        response = await fetch(fallbackUrl, { method: 'GET', headers });
      }
    } catch (networkError) {
      console.warn('Backend server unreachable at', urlUsed, '. Using fallback mock data for testing.');
      // เมื่อเซิร์ฟเวอร์ Backend ยังไม่เปิด ให้ Fallback เป็นข้อมูลจำลอง เพื่อให้ทดสอบ UI และ Pagination ได้ครบวงจร
      return filterMockData(params);
    }

    // กรณี Token หมดอายุหรือไม่ถูกต้อง (คนที่ 4 ปฏิเสธสิทธิ์)
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: 'error',
        statusCode: response.status,
        isAuthError: true,
        message: response.status === 403 
          ? 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้ (ต้องใช้บัญชีอาจารย์ผู้สอน)' 
          : 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        detail: errorData.detail || errorData.message
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: 'error',
        statusCode: response.status,
        message: errorData.detail || errorData.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากเซิร์ฟเวอร์'
      };
    }

    const data = await response.json();

    // ปรับโครงสร้างให้อยู่ในมาตรฐานเดียวกัน (Normalize)
    const logs = Array.isArray(data.logs) ? data.logs : [];
    const totalCount = data.pagination?.total ?? logs.length;
    const pageNum = data.pagination?.page ?? Number(queryObj.page) ?? 1;
    const limitNum = data.pagination?.limit ?? Number(queryObj.limit) ?? 10;
    const totalPages = data.pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / limitNum));

    return {
      status: 'success',
      activeRooms: data.activeRooms ?? 0,
      totalAccess: data.totalAccess ?? 0,
      logs: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: totalPages
      }
    };
  }

  return {
    getBaseUrl,
    fetchDashboardData
  };
}));
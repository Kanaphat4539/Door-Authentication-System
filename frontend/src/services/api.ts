import { AuthResponse, DashboardResponse, FilterParams, LogItem, User } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8000/api/v1');

// ข้อมูลประวัติการแตะบัตรจริงที่ซิงก์มาจาก Group 6 IoT Server (http://172.16.10.200:3000/api/logs)
const MOCK_DATA: LogItem[] = [
  { id: "22", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "17:46 น.", status: "OUT" },
  { id: "21", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "17:46 น.", status: "IN" },
  { id: "20", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "17:21 น.", status: "OUT" },
  { id: "19", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "17:20 น.", status: "IN" },
  { id: "18", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "17:20 น.", status: "OUT" },
  { id: "17", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:43 น.", status: "IN" },
  { id: "16", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:37 น.", status: "OUT" },
  { id: "15", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:35 น.", status: "IN" },
  { id: "14", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:35 น.", status: "OUT" },
  { id: "13", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:32 น.", status: "IN" },
  { id: "12", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:12 น.", status: "OUT" },
  { id: "11", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:11 น.", status: "IN" },
  { id: "10", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:05 น.", status: "OUT" },
  { id: "9", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "16:05 น.", status: "IN" },
  { id: "8", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "15:50 น.", status: "OUT" },
  { id: "7", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "15:50 น.", status: "IN" },
  { id: "6", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "15:25 น.", status: "OUT" },
  { id: "5", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "15:25 น.", status: "IN" },
  { id: "4", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "15:06 น.", status: "OUT" },
  { id: "3", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B316", roomSub: "Building B / Floor 3", date: "13 ต.ค. 2569", time: "15:06 น.", status: "IN" },
  { id: "2", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "9 ต.ค. 2569", time: "15:14 น.", status: "OUT" },
  { id: "1", student_id: "67200324", name: "Leo Ev (67200324)", student_name: "Leo Ev", room: "B317", roomSub: "Building B / Floor 3", date: "9 ต.ค. 2569", time: "15:04 น.", status: "IN" },
];


export async function loginAPI(username: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.status === 401) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (!res.ok) {
      throw new Error(`เข้าสู่ระบบไม่สำเร็จ (${res.status})`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    // กรณีที่ FastAPI backend ยังไม่ได้รัน หรือ Network ขัดข้อง
    if (err.message && err.message.includes('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')) {
      throw err;
    }

    // Mock Fallback เมื่อทดสอบออฟไลน์
    if (username === 'teacher_ajarn' && (password === 'secure123' || password === 'admince04')) {
      return {
        status: 'success',
        access_token: 'mock-jwt-token-teacher-ajarn',
        token_type: 'bearer',
        user: {
          username: 'teacher_ajarn',
          role: 'teacher',
          name: 'อาจารย์ สมชาย ใจดี',
          nameEn: 'Dr. Somchai Jaidee',
          email: 'teacher.ajarn@university.ac.th',
        },
      };
    }

    if (username === 'student_somchai' && (password === '1234' || password === 'secure123' || password === 'admince04')) {
      return {
        status: 'success',
        access_token: 'mock-jwt-token-student-somchai',
        token_type: 'bearer',
        user: {
          username: 'student_somchai',
          role: 'student',
          name: 'นายสมชาย ใจกล้า',
          nameEn: 'Somchai Jaikla',
          email: 'student_somchai@university.ac.th',
        },
      };
    }

    throw new Error(err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้');
  }
}

export async function fetchDashboardData(
  params: FilterParams = {},
  token?: string
): Promise<DashboardResponse> {
  const query = new URLSearchParams();
  if (params.studentId) query.set('student_id', params.studentId);
  if (params.room && params.room !== 'all') query.set('room', params.room);
  if (params.date) query.set('date', params.date);
  if (params.timeSlot && params.timeSlot !== 'all') query.set('time_slot', params.timeSlot);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.lang) query.set('lang', params.lang);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/logs?${query.toString()}`, {
      method: 'GET',
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      const error: any = new Error(errData.detail || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      error.isAuthError = true;
      throw error;
    }

    if (!res.ok) {
      throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
    }

    const data: DashboardResponse = await res.json();
    return data;
  } catch (err: any) {
    if (err.isAuthError) throw err;

    // Mock Fallback สำหรับกรณีเซิร์ฟเวอร์ Backend ออฟไลน์
    console.warn('Backend unavailable, using mock fallback:', err.message);
    const kw = (params.studentId || '').toLowerCase();
    const room = params.room || 'all';
    const status = params.status || 'all';
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;

    const filtered = MOCK_DATA.filter((item) => {
      if (kw) {
        if (!item.student_id.toLowerCase().includes(kw)) return false;
      }
      if (room !== 'all' && item.room.toLowerCase() !== room.toLowerCase()) return false;
      if (status !== 'all' && item.status.toLowerCase() !== status.toLowerCase()) return false;
      if (params.timeSlot && params.timeSlot !== 'all') {
        const slotClean = params.timeSlot.split('-')[0].trim();
        const slotHour = parseInt(slotClean.split(':')[0], 10);
        const itemHour = parseInt(item.time.split(':')[0], 10);
        if (itemHour !== slotHour) return false;
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    const inRooms = new Set(filtered.filter(i => i.status.toUpperCase() === 'IN').map(i => i.room));

    return {
      status: 'success',
      activeRooms: inRooms.size || 2,
      totalAccess: total,
      totalRooms: 8,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      logs: paginated,
    };
  }
}

export async function recordAuditLog(action: string, token: string): Promise<void> {
  if (!token || !action) return;
  try {
    await fetch(`${API_BASE_URL}/audit/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });
  } catch {
    // Non-blocking
  }
}

export async function triggerIoTSync(token?: string, url?: string): Promise<any> {
  const query = url ? `?url=${encodeURIComponent(url)}` : '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/iot/sync${query}`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      throw new Error(`Sync failed with status: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('IoT sync request warning:', err.message);
    return null;
  }
}

export async function getIoTSyncStatus(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/iot/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to get IoT status:', err);
  }
  return null;
}


import { AuthResponse, DashboardResponse, FilterParams, LogItem, User } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ข้อมูลจำลอง Mock Data ตาม Data Contract ของคนที่ 2 และคนที่ 6
const MOCK_DATA: LogItem[] = [
  { id: "65010234", student_id: "65010234", name: "นายธนภัทร สุขเกษม", student_name: "Thanaphat Sukhasem", room: "B217", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", time: "15:30 น.", status: "IN" },
  { id: "65010567", student_id: "65010567", name: "นางสาวสมหญิง ตั้งใจ", student_name: "Somying Tangjai", room: "E107", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", time: "15:15 น.", status: "OUT" },
  { id: "66010892", student_id: "66010892", name: "นายกิตติศักดิ์ ประเสริฐ", student_name: "Kittisak Prasert", room: "B218", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", time: "14:50 น.", status: "IN" },
  { id: "64010111", student_id: "64010111", name: "นายปิติ มั่นคง", student_name: "Piti Mankong", room: "B316", roomSub: "Building B / Floor 3", date: "14 ต.ค. 2569", time: "14:40 น.", status: "IN" },
  { id: "65010999", student_id: "65010999", name: "นางสาวมณีรัตน์ แสงแก้ว", student_name: "Maneerat Saengkaew", room: "E111", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", time: "14:25 น.", status: "OUT" },
  { id: "65010345", student_id: "65010345", name: "นายชินวัตร บุญสม", student_name: "Shinawatra Boonsom", room: "B217", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", time: "14:10 น.", status: "IN" },
  { id: "66010777", student_id: "66010777", name: "นายวรพจน์ ศรีสุวรรณ", student_name: "Worapoj Srisuwan", room: "B317", roomSub: "Building B / Floor 3", date: "14 ต.ค. 2569", time: "13:50 น.", status: "OUT" },
  { id: "65010888", student_id: "65010888", name: "นางสาวพิมพ์ชนก รุ่งเรือง", student_name: "Pimchanok Rungruang", room: "E112", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", time: "13:30 น.", status: "IN" },
  { id: "64010555", student_id: "64010555", name: "นายอนุชา วงศ์สวัสดิ์", student_name: "Anucha Wongsawat", room: "B113", roomSub: "Building B / Floor 1", date: "14 ต.ค. 2569", time: "13:15 น.", status: "IN" },
  { id: "65010666", student_id: "65010666", name: "นางสาวนภัสสร ใจดี", student_name: "Napatsorn Jaidee", room: "B218", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", time: "12:55 น.", status: "OUT" },
  { id: "65010444", student_id: "65010444", name: "นายธีรภัทร ชาญวิทย์", student_name: "Theeraphat Chanwit", room: "B217", roomSub: "Building B / Floor 2", date: "14 ต.ค. 2569", time: "12:30 น.", status: "IN" },
  { id: "66010222", student_id: "66010222", name: "นางสาวศิริพร บุญตา", student_name: "Siriporn Boonta", room: "E107", roomSub: "Building E / Floor 1", date: "14 ต.ค. 2569", time: "12:05 น.", status: "OUT" }
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
    if (username === 'teacher_ajarn' && password === 'secure123') {
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
        const combined = `${item.student_id} ${item.name} ${item.student_name || ''}`.toLowerCase();
        if (!combined.includes(kw)) return false;
      }
      if (room !== 'all' && item.room.toLowerCase() !== room.toLowerCase()) return false;
      if (status !== 'all' && item.status.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      status: 'success',
      activeRooms: 3,
      totalAccess: total || 142,
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


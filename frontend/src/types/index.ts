export type Language = 'th' | 'en';

export interface User {
  username: string;
  role: 'teacher' | 'student' | string;
  name?: string;
  nameEn?: string;
  email?: string;
}

export interface AuthResponse {
  status: string;
  access_token: string;
  token_type: string;
  user: User;
}

export interface LogItem {
  id: string | number;
  student_id: string;
  name: string;
  student_name?: string;
  room: string;
  roomSub?: string;
  date: string;
  time: string;
  status: 'IN' | 'OUT' | string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FilterParams {
  studentId?: string;
  keyword?: string;
  room?: string;
  date?: string;
  timeSlot?: string;
  status?: string;
  page?: number;
  limit?: number;
  lang?: Language;
}

export interface DashboardResponse {
  status: string;
  activeRooms: number;
  totalAccess: number;
  totalRooms: number;
  pagination: Pagination;
  logs: LogItem[];
  requested_by?: string;
  authorized_by?: string;
  role?: string;
}

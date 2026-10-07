export type UserRole = 'student' | 'teacher' | 'admin' | 'guest';

// Master tables
export interface Department {
  department_code: string;
  department_name_th: string;
  department_name_en?: string | null;
  created_at?: string;
}

export interface Major {
  major_code: string;
  department_code: string;
  major_name_th: string;
  major_name_en?: string | null;
  created_at?: string;
}

export interface Role {
  role_id: number;
  role_code: string;
  role_name_th: string;
}

// Core User entity
export interface DbUser {
  user_id: string;
  username: string;
  password: string;
  prefix_th?: string | null;
  first_name_th: string;
  last_name_th: string;
  prefix_en?: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
  email?: string | null;
  phone?: string | null;
  role_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Student entity
export interface StudentRecord {
  student_id: string;
  user_id: string;
  department_code: string;
  major_code: string;
  year_level: number;
  created_at?: string;
  updated_at?: string;
}

// Professor entity
export interface ProfessorRecord {
  professor_id: string;
  user_id: string;
  department_code: string;
  created_at?: string;
  updated_at?: string;
}

// Full view interfaces
export interface StudentView {
  student_id: string;
  user_id: string;
  username: string;
  prefix_th?: string | null;
  first_name_th: string;
  last_name_th: string;
  full_name_th: string;
  prefix_en?: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
  full_name_en?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  year_level: number;
  department_code: string;
  department_name_th: string;
  department_name_en?: string | null;
  major_code: string;
  major_name_th: string;
  major_name_en?: string | null;
  role_code: string;
  role_name_th: string;
  created_at?: string;
  updated_at?: string;
}

// Backward-compatible interface for current UI components
export interface User {
  id: string;
  student_id: string;
  full_name: string;
  email: string | null;
  password_text: string;
  role: UserRole;
  is_active: boolean;
  prefix_th?: string;
  first_name_th?: string;
  last_name_th?: string;
  phone?: string;
  department_code?: string;
  major_code?: string;
  year_level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RadCheckRecord {
  id: string;
  username: string;
  attribute: string;
  op: string;
  value: string;
}

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

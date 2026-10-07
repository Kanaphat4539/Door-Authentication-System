export type UserRole = 'student' | 'teacher' | 'admin' | 'guest';

export interface User {
  id: string;
  student_id: string;
  full_name: string;
  email: string | null;
  password_text: string;
  role: UserRole;
  is_active: boolean;
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

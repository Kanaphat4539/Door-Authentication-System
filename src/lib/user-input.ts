export class InputError extends Error {}
const roles: Record<string, string> = { student: 'STUDENT', teacher: 'PROFESSOR', admin: 'ADMIN', staff: 'STAFF' };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUserInput(value: unknown, creating: boolean) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('ข้อมูลผู้ใช้ไม่ถูกต้อง');
  const body = value as Record<string, unknown>;
  const out: Record<string, string | number | boolean | null> = {};
  const fields: Record<string, number> = { student_id: 50, full_name: 221, email: 150, department_code: 20, major_code: 20 };
  for (const [field, max] of Object.entries(fields)) {
    if (!(field in body)) continue;
    const input = body[field];
    if (field === 'email' && input === null) { out.email = null; continue; }
    if (typeof input !== 'string' || input.trim().length > max) throw new InputError(`ข้อมูล ${field} ไม่ถูกต้อง`);
    const text = input.trim();
    if (!text && field !== 'email') throw new InputError(`กรุณาระบุ ${field}`);
    if (field === 'email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new InputError('อีเมลไม่ถูกต้อง');
    if (field === 'student_id' && !/^[a-zA-Z0-9_.@-]+$/.test(text)) throw new InputError('Username ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข _ . @ -');
    out[field] = field === 'email' ? text || null : text;
  }
  if ('password_text' in body) {
    if (typeof body.password_text !== 'string' || body.password_text.length > 255) throw new InputError('รหัสผ่านไม่ถูกต้อง');
    // Preserve spaces in passwords. Empty on edit means retain the existing password.
    if (body.password_text !== '') out.password_text = body.password_text;
  }
  if ('role' in body) {
    if (typeof body.role !== 'string' || !roles[body.role]) throw new InputError('บทบาทไม่ถูกต้อง');
    out.role_code = roles[body.role];
  }
  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') throw new InputError('สถานะต้องเป็น true หรือ false');
    out.is_active = body.is_active;
  }
  if ('year_level' in body) {
    if (!Number.isInteger(body.year_level) || Number(body.year_level) < 1 || Number(body.year_level) > 8) throw new InputError('ชั้นปีต้องอยู่ระหว่าง 1–8');
    out.year_level = Number(body.year_level);
  }
  if (creating && (!out.student_id || !out.full_name || !out.password_text || !out.role_code)) throw new InputError('กรุณาระบุ Username ชื่อ รหัสผ่าน และบทบาท');
  if (!creating && (typeof body.id !== 'string' || !UUID.test(body.id))) throw new InputError('กรุณาระบุ ID ผู้ใช้ที่ถูกต้อง');
  if (!creating && !Object.keys(out).length) throw new InputError('ไม่มีข้อมูลที่ต้องการแก้ไข');
  if (typeof out.full_name === 'string') {
    const pieces = out.full_name.split(/\s+/);
    if (pieces[0].length > 100 || pieces.slice(1).join(' ').length > 100) throw new InputError('ชื่อหรือนามสกุลยาวเกิน 100 ตัวอักษร');
  }
  return { id: body.id as string | undefined, values: out };
}

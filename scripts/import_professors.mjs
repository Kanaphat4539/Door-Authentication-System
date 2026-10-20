#!/usr/bin/env node
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const apply = process.argv.includes('--apply');
const roster = JSON.parse(fs.readFileSync('data/private/ce-professors.json', 'utf8'));
if (!Array.isArray(roster) || roster.length !== 5) throw new Error('Expected exactly five professor records');
for (const [index, row] of roster.entries()) {
  row.username = `professor${String(index + 1).padStart(2, '0')}`;
  row.professor_id = row.username; // Assigned portal identifier, not an official university personnel number.
  if (!row.first_name_th || !row.last_name_th || row.department_code !== 'CPE') throw new Error('Invalid professor record');
}
console.log(JSON.stringify({ apply, count: roster.length, usernames: roster.map(row => row.username) }));
if (!apply) { console.log('Dry-run only; no accounts or passwords generated.'); process.exit(0); }
if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD is required');
const credentialsPath = 'data/private/professor-credentials.json';
let credentials;
if (fs.existsSync(credentialsPath)) {
  credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  if (credentials.length !== 5 || credentials.some((row, index) => row.username !== roster[index].username || typeof row.password !== 'string' || row.password.length < 20)) throw new Error('Saved credentials do not match the professor roster');
} else {
  credentials = roster.map(row => ({ username: row.username, password: randomBytes(18).toString('base64url') }));
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
}
const pool = new pg.Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const existing = await client.query('SELECT username FROM public.users WHERE username=ANY($1::text[])', [roster.map(row => row.username)]);
  if (existing.rowCount) throw new Error('A professor username already exists; nothing will be overwritten');
  const before = {};
  for (const name of ['users', 'professors']) before[name] = (await client.query(`SELECT * FROM public.${name}`)).rows;
  fs.writeFileSync('data/private/before-professor-import.json', JSON.stringify({ saved_at: new Date().toISOString(), ...before }, null, 2) + '\n', { mode: 0o600 });
  await client.query(fs.readFileSync('database/migrations/002_professor_position.sql', 'utf8'));
  const role = await client.query("SELECT role_id FROM public.roles WHERE role_code='PROFESSOR'");
  if (role.rowCount !== 1) throw new Error('Missing PROFESSOR role');
  for (const [index, row] of roster.entries()) {
    const duplicate = await client.query('SELECT 1 FROM public.users WHERE first_name_th=$1 AND last_name_th=$2', [row.first_name_th, row.last_name_th]);
    if (duplicate.rowCount) throw new Error(`Professor ${index + 1} already has a record; review before importing`);
    const user = await client.query(`INSERT INTO public.users (username,password,prefix_th,first_name_th,last_name_th,email,role_id,is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING user_id`, [row.username, credentials[index].password, row.prefix_th, row.first_name_th, row.last_name_th, null, role.rows[0].role_id]);
    await client.query(`INSERT INTO public.professors (professor_id,user_id,department_code,position_th)
      VALUES ($1,$2,$3,$4)`, [row.professor_id, user.rows[0].user_id, row.department_code, row.position_th]);
    row.account_status = 'Created on VM';
  }
  await client.query('COMMIT');
  fs.writeFileSync('data/private/ce-professors.json', JSON.stringify(roster, null, 2) + '\n', { mode: 0o600 });
  const handover = [
    '# บัญชีอาจารย์ — ข้อมูลส่วนตัว ห้ามนำขึ้น Git',
    '',
    'บัญชีเหล่านี้เป็นบทบาทอาจารย์สำหรับการยืนยันตัวตน ไม่ใช่บัญชีผู้ดูแลเว็บ Admin',
    'อีเมลยังเว้นว่าง รหัสประจำตัวในระบบเป็นค่าที่ตั้งให้ตามลำดับ ไม่ใช่รหัสบุคลากรทางการ',
    '',
    '| Username | ชื่อ–นามสกุล | รหัสผ่านเริ่มต้น |',
    '|---|---|---|',
    ...roster.map((row, index) => `| ${row.username} | ${row.prefix_th}${row.first_name_th} ${row.last_name_th} | ${credentials[index].password} |`),
    '',
  ].join('\n');
  fs.writeFileSync('data/private/professor-accounts.PRIVATE.md', handover, { mode: 0o600 });
  console.log('Created five professor accounts. Passwords saved only to private local handover files.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }

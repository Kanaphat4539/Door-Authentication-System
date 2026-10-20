#!/usr/bin/env node
// Dry-run by default. Real roster files stay under gitignored data/private/.
import fs from 'node:fs';
import pg from 'pg';
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const skipPending = args.includes('--skip-pending');
const filename = args.find(arg => !arg.startsWith('--')) || 'data/private/ce04-roster.json';
const expectedCount = Number(args.find(arg => arg.startsWith('--expected-count='))?.split('=')[1] || 44);
if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new Error('Invalid expected count');
const records = JSON.parse(fs.readFileSync(filename, 'utf8'));
if (!Array.isArray(records) || records.length !== expectedCount) throw new Error(`Expected exactly ${expectedCount} roster records`);
const ids = new Set();
const ready = [];
const pending = [];
for (const row of records) {
  if (!/^\d{8}$/.test(row.student_id) || ids.has(row.student_id)) throw new Error('Invalid or duplicate student ID');
  ids.add(row.student_id);
  if (!row.reviewed || !row.first_name_th || !row.last_name_th || !Number.isInteger(row.year_level) || row.year_level < 1 || row.year_level > 8) {
    pending.push({ student_id: row.student_id, reason: !row.reviewed ? 'Confirm name against original image' : 'Confirm year level' });
  } else ready.push(row);
}
console.log(JSON.stringify({ apply, skipPending, ready: ready.length, pending }, null, 2));
if (!apply) { console.log('Dry-run only. No database connection or changes. Review the private file, then use --apply.'); process.exit(0); }
if (pending.length && !skipPending) throw new Error('Resolve all pending names/year levels before importing. No data was changed.');
if (!ready.length) throw new Error('No reviewed records ready to import');
if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD is required');
const pool = new pg.Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectionTimeoutMillis: 3000 });
const client = await pool.connect();
const insertedIds = [];
const existingIds = [];
try {
  await client.query('BEGIN');
  for (const row of ready) {
    // Never reset an existing user's password or active status when rerunning an import.
    const inserted = await client.query(`INSERT INTO public.users
      (username,password,prefix_th,first_name_th,last_name_th,email,role_id,is_active)
      VALUES ($1,$1,$2,$3,$4,$5,(SELECT role_id FROM public.roles WHERE role_code='STUDENT'),true)
      ON CONFLICT (username) DO NOTHING RETURNING user_id`, [row.student_id,row.prefix_th,row.first_name_th,row.last_name_th,`${row.student_id}@kmitl.ac.th`]);
    if (!inserted.rowCount) { existingIds.push(row.student_id); continue; }
    await client.query(`INSERT INTO public.students (student_id,user_id,department_code,major_code,year_level)
      VALUES ($1,$2,'CPE','CPE-BENG',$3)`, [row.student_id,inserted.rows[0].user_id,row.year_level]);
    insertedIds.push(row.student_id);
  }
  await client.query('COMMIT');
  const result = { imported: insertedIds.length, inserted_ids: insertedIds, existing_unchanged: existingIds, pending };
  fs.mkdirSync('data/private', { recursive: true });
  fs.writeFileSync('data/private/ce04-import-result.json', JSON.stringify({ ...result, recorded_at: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }

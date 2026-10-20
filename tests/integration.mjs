import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFile } from 'node:fs/promises';

// These checks mutate data. Require an explicitly isolated local test environment.
const origin = process.env.TEST_ORIGIN;
const url = process.env.TEST_DATABASE_URL;
if (!origin || !url || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || !url.includes('127.0.0.1:55432/cedatabase')) {
  throw new Error('Start an isolated test database on localhost:55432 and set TEST_ORIGIN / TEST_DATABASE_URL. Never run against the VM.');
}
const pool = new pg.Pool({ connectionString: url });
let cookie = '';
const created = new Set();
const stamp = Date.now();
async function request(path, method = 'GET', body, options = {}) {
  const headers = { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...options.headers };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${origin}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), redirect: 'manual' });
  const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  return { response, data };
}
async function create(overrides = {}) {
  const result = await request('/api/users', 'POST', { student_id: `check_${stamp}_${created.size}`, full_name: 'ทดสอบ ระบบ', password_text: 'initial-test-password', role: 'student', department_code: 'CPE', major_code: 'CPE-BENG', year_level: 2, ...overrides });
  if (result.data?.user?.id) created.add(result.data.user.id);
  return result;
}

test('Admin portal: HTTP → API → PostgreSQL regressions', async t => {
  try {
    await t.test('unauthenticated CRUD and diagnostics are denied', async () => {
      for (const [path, method] of [['/api/users','GET'],['/api/users','POST'],['/api/users','PUT'],['/api/users?id=bad','DELETE'],['/api/health','GET'],['/api/users/11111111-1111-1111-1111-111111111111/password','GET']]) {
        const result = await request(path, method, method === 'POST' || method === 'PUT' ? {} : undefined);
        assert.equal(result.response.status, 401);
      }
    });
    await t.test('login rejects another site and incorrect credentials', async () => {
      assert.equal((await request('/api/auth/login','POST',{}, { headers: { Origin: 'https://another-site.invalid' } })).response.status,403);
      assert.equal((await request('/api/auth/login','POST',{ username:'testadmin', password:'wrong' })).response.status,401);
    });
    await t.test('login issues an HttpOnly SameSite session', async () => {
      const result = await request('/api/auth/login','POST',{ username:'testadmin', password:'test-only-admin-password' });
      assert.equal(result.response.status,200);
      const header = result.response.headers.get('set-cookie');
      assert.match(header,/HttpOnly/i); assert.match(header,/SameSite=strict/i);
      cookie = header.split(';')[0];
    });
    await t.test('tampered sessions and cross-site mutations fail', async () => {
      assert.equal((await request('/api/users','GET',undefined,{headers:{Cookie:cookie+'x'}})).response.status,401);
      assert.equal((await request('/api/users','POST',{}, {headers:{Origin:'https://another-site.invalid'}})).response.status,403);
    });
    await t.test('user list omits passwords until explicitly requested', async () => {
      const result = await request('/api/users');
      assert.equal(result.response.status,200);
      for (const user of result.data.users) { assert.equal('password_text' in user,false); assert.equal('password' in user,false); }
    });
    let student;
    await t.test('creates a student and linked profile atomically', async () => {
      const result = await create(); assert.equal(result.response.status,201);
      student = result.data.user;
      assert.equal(student.year_level,2); assert.equal('password' in student,false);
      const rows = await pool.query('SELECT * FROM public.students WHERE user_id=$1',[student.id]);
      assert.equal(rows.rowCount,1);
    });
    await t.test('admin can reveal a selected password without caching it', async () => {
      const path = `/api/users/${student.id}/password`;
      const result = await request(path);
      assert.equal(result.response.status, 200);
      assert.deepEqual(result.data, { password_text: 'initial-test-password' });
      assert.equal(result.response.headers.get('cache-control'), 'no-store');
      assert.equal((await request(path, 'GET', undefined, { headers: { Cookie: '' } })).response.status, 401);
      assert.equal((await request(path, 'GET', undefined, { headers: { Cookie: cookie + 'x' } })).response.status, 401);
      assert.equal((await request('/api/users/not-a-uuid/password')).response.status, 400);
      assert.equal((await request('/api/users/00000000-0000-0000-0000-000000000000/password')).response.status, 404);
    });
    await t.test('invalid profile rolls back the new user', async () => {
      const name = `rollback_${stamp}`;
      const result = await create({student_id:name,major_code:'EE-BENG'});
      assert.equal(result.response.status,400);
      assert.equal((await pool.query('SELECT 1 FROM public.users WHERE username=$1',[name])).rowCount,0);
    });
    await t.test('duplicate usernames return a conflict', async () => {
      assert.equal((await create({student_id:student.student_id})).response.status,409);
    });
    await t.test('status-only updates preserve admin and teacher roles', async () => {
      for (const role of ['admin','teacher']) {
        const made = await create({role}); assert.equal(made.response.status,201);
        const result = await request('/api/users','PUT',{id:made.data.user.id,is_active:false});
        assert.equal(result.response.status,200); assert.equal(result.data.user.role,role);
        assert.equal(result.data.user.is_active,false);
        assert.equal((await pool.query('SELECT 1 FROM public.radcheck WHERE username=$1',[made.data.user.student_id])).rowCount,0);
      }
    });
    await t.test('username edits update the profile and radcheck; email can be cleared', async () => {
      const result = await request('/api/users','PUT',{id:student.id,student_id:`renamed_${stamp}`,email:null});
      assert.equal(result.response.status,200); assert.equal(result.data.user.email,null);
      assert.equal(result.data.user.student_id,`renamed_${stamp}`);
      assert.equal((await pool.query('SELECT student_id FROM public.students WHERE user_id=$1',[student.id])).rows[0].student_id,`renamed_${stamp}`);
      assert.equal((await pool.query('SELECT 1 FROM public.radcheck WHERE username=$1',[`renamed_${stamp}`])).rowCount,1);
    });
    await t.test('profile-only edits retain names and passwords', async () => {
      const result = await request('/api/users','PUT',{id:student.id,year_level:3});
      assert.equal(result.response.status,200); assert.equal(result.data.user.year_level,3);
      assert.equal((await pool.query('SELECT password FROM public.users WHERE user_id=$1',[student.id])).rows[0].password,'initial-test-password');
    });
    await t.test('changing role replaces the appropriate profile', async () => {
      const result = await request('/api/users','PUT',{id:student.id,role:'teacher',department_code:'CPE'});
      assert.equal(result.response.status,200);
      assert.equal((await pool.query('SELECT 1 FROM public.students WHERE user_id=$1',[student.id])).rowCount,0);
      assert.equal((await pool.query('SELECT 1 FROM public.professors WHERE user_id=$1',[student.id])).rowCount,1);
    });
    await t.test('collision cannot mutate a second account through username', async () => {
      const other = await create();
      const result = await request('/api/users','PUT',{id:student.id,student_id:other.data.user.student_id,is_active:false});
      assert.equal(result.response.status,409);
      assert.equal((await pool.query('SELECT is_active FROM public.users WHERE user_id=$1',[other.data.user.id])).rows[0].is_active,true);
      assert.equal((await pool.query('SELECT is_active FROM public.users WHERE user_id=$1',[student.id])).rows[0].is_active,true);
    });
    await t.test('invalid identifiers, JSON values, and roles are rejected', async () => {
      assert.equal((await request('/api/users','PUT',{id:'bad',is_active:false})).response.status,400);
      assert.equal((await request('/api/users','POST',null)).response.status,400);
      assert.equal((await request('/api/users','PUT',{id:student.id,role:'unknown'})).response.status,400);
      assert.equal((await request('/api/users','DELETE')).response.status,400);
    });
    await t.test('health reflects missing view instead of a false zero', async () => {
      assert.equal((await request('/api/health')).response.status,200);
      await pool.query('ALTER VIEW public.radcheck RENAME TO radcheck_test_missing');
      try {
        const result = await request('/api/health');
        assert.equal(result.response.status,503); assert.equal(result.data.connected,true); assert.equal(result.data.healthy,false);
        assert.equal(result.data.tables.find(row=>row.name==='radcheck').status,'error');
      } finally { await pool.query('ALTER VIEW public.radcheck_test_missing RENAME TO radcheck'); }
    });
    await t.test('seed links an existing randomly identified RADIUS test account', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("DELETE FROM public.users WHERE username='radius_test'");
        const inserted = await client.query(`INSERT INTO public.users (username,password,first_name_th,last_name_th,role_id,is_active)
          VALUES ('radius_test','test-only-original','Test','Radius',1,true) RETURNING user_id`);
        await client.query(await readFile(new URL('../database/init.sql', import.meta.url),'utf8'));
        const linked = await client.query("SELECT user_id FROM public.students WHERE student_id='radius_test'");
        assert.equal(linked.rows[0].user_id,inserted.rows[0].user_id);
        assert.equal((await client.query("SELECT password FROM public.users WHERE username='radius_test'")).rows[0].password,'test-only-original');
      } finally { await client.query('ROLLBACK'); client.release(); }
    });
    await t.test('dedicated DB accounts have limited privileges', async () => {
      const result = await pool.query(`SELECT has_table_privilege('radius_reader','public.radcheck','SELECT') AS radius_read,
        has_table_privilege('radius_reader','public.users','SELECT') AS radius_users,
        has_table_privilege('auth_reader','public.users','UPDATE') AS api_update,
        has_table_privilege('portal_app','public.users','UPDATE') AS portal_update,
        (SELECT rolsuper FROM pg_roles WHERE rolname='portal_app') AS portal_super`);
      assert.deepEqual(result.rows[0],{radius_read:true,radius_users:false,api_update:false,portal_update:true,portal_super:false});
    });
    await t.test('delete cascades and logout clears the session cookie', async () => {
      assert.equal((await request(`/api/users?id=${student.id}`,'DELETE')).response.status,200);
      assert.equal((await pool.query('SELECT 1 FROM public.professors WHERE user_id=$1',[student.id])).rowCount,0);
      assert.equal((await request(`/api/users?id=${student.id}`,'DELETE')).response.status,404);
      const result = await request('/api/auth/logout','POST');
      assert.equal(result.response.status,200); assert.match(result.response.headers.get('set-cookie'),/Max-Age=0/i);
      cookie=''; assert.equal((await request('/api/users')).response.status,401);
    });
  } finally {
    for (const id of created) await pool.query('DELETE FROM public.users WHERE user_id=$1',[id]);
    await pool.end();
  }
});

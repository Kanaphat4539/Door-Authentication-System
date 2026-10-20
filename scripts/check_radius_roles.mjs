#!/usr/bin/env node
// Tests the actual migration against isolated fixtures. All test DDL/data roll back.
// Never alters public users, roles, radcheck, credentials or network settings.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';

if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const pool = new pg.Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
const schema = `g2_role_test_${randomUUID().replaceAll('-', '')}`;
const reader = `${schema}_reader`;
const checks = [];
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout = '10s'");
  await client.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${reader} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`);
  await client.query(`CREATE TABLE ${schema}.roles (role_id integer PRIMARY KEY, role_code varchar(50) NOT NULL);
    CREATE TABLE ${schema}.users (user_id uuid PRIMARY KEY, username varchar(50) UNIQUE NOT NULL,
      password text NOT NULL, role_id integer REFERENCES ${schema}.roles(role_id), is_active boolean);
    INSERT INTO ${schema}.roles VALUES (1,'STUDENT'),(2,'PROFESSOR'),(3,'ADMIN'),(4,'STAFF')`);
  const usernames = ['fixture_student', 'fixture_professor', 'fixture_admin', 'fixture_staff'];
  for (let i = 0; i < usernames.length; i++) {
    await client.query(`INSERT INTO ${schema}.users VALUES ($1,$2,$3,$4,true)`, [randomUUID(), usernames[i], 'fixture-only-password', i + 1]);
  }
  await client.query(`INSERT INTO ${schema}.users VALUES ($1,'fixture_inactive','fixture-only-password',1,false)`, [randomUUID()]);
  const migration = fs.readFileSync(new URL('../database/migrations/003_radius_user_roles.sql', import.meta.url), 'utf8').replaceAll('public.', `${schema}.`);
  await client.query(migration);
  await client.query(migration);
  checks.push('migration is repeatable');
  const result = await client.query(`SELECT username,role_code,api_role FROM ${schema}.radius_user_roles ORDER BY role_id`);
  assert.deepEqual(result.rows.map(r => r.api_role), ['student', 'teacher', 'admin', 'staff']);
  assert.deepEqual(result.rows.map(r => r.role_code), ['STUDENT', 'PROFESSOR', 'ADMIN', 'STAFF']);
  checks.push('all four role mappings');
  assert.equal((await client.query(`SELECT 1 FROM ${schema}.radius_user_roles WHERE username=$1`, ['fixture_inactive'])).rowCount, 0);
  assert.equal((await client.query(`SELECT 1 FROM ${schema}.radius_user_roles WHERE username=$1`, ['missing_username'])).rowCount, 0);
  checks.push('inactive and missing users excluded');
  const columns = (await client.query(`SELECT * FROM ${schema}.radius_user_roles LIMIT 0`)).fields.map(f => f.name);
  assert.deepEqual(columns, ['user_id', 'username', 'role_id', 'role_code', 'api_role', 'is_active']);
  checks.push('role view exposes no passwords or personal profile fields');
  await client.query(`UPDATE ${schema}.users SET role_id=2 WHERE username='fixture_student'`);
  assert.equal((await client.query(`SELECT api_role FROM ${schema}.radius_user_roles WHERE username='fixture_student'`)).rows[0].api_role, 'teacher');
  await client.query(`UPDATE ${schema}.users SET is_active=false WHERE username='fixture_student'`);
  assert.equal((await client.query(`SELECT 1 FROM ${schema}.radius_user_roles WHERE username='fixture_student'`)).rowCount, 0);
  await client.query(`UPDATE ${schema}.users SET is_active=true WHERE username='fixture_student'`);
  assert.equal((await client.query(`SELECT 1 FROM ${schema}.radius_user_roles WHERE username='fixture_student'`)).rowCount, 1);
  checks.push('role and active status changes reflected immediately');
  const query = fs.readFileSync(new URL('../database/queries/radius_user_role.sql', import.meta.url), 'utf8').replaceAll('public.', `${schema}.`);
  assert.equal((await client.query(query, ['fixture_professor'])).rows[0].api_role, 'teacher');
  assert.equal((await client.query(query, ["' OR true --"])).rowCount, 0);
  checks.push('parameterized lookup and special characters');
  await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${reader}; GRANT SELECT ON ${schema}.radius_user_roles TO ${reader}; SET LOCAL ROLE ${reader}`);
  assert.equal((await client.query(query, ['fixture_admin'])).rows[0].api_role, 'admin');
  const rights = (await client.query(`SELECT has_table_privilege(current_user,$1,'SELECT') AS base_users,
    has_table_privilege(current_user,$2,'SELECT') AS base_roles,
    has_table_privilege(current_user,$3,'UPDATE') AS view_update`, [`${schema}.users`, `${schema}.roles`, `${schema}.radius_user_roles`])).rows[0];
  assert.deepEqual(rights, { base_users: false, base_roles: false, view_update: false });
  checks.push('view reader works without base-table or write access');
  await client.query('RESET ROLE');
} finally {
  await client.query('ROLLBACK');
  client.release();
  await pool.end();
}
console.log(JSON.stringify({ passed: checks.length, checks, fixture_changes: 'rolled back' }, null, 2));

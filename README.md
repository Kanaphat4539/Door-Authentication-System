# กลุ่ม 2: Database Server และเว็บจัดการผู้ใช้

ส่วนฐานข้อมูลกลางของ Door Authentication System ใช้ PostgreSQL บน VM และเว็บแอดมินสำหรับเพิ่ม ดู แก้ไข ลบผู้ใช้
โค้ดของกลุ่มนี้อยู่ใน branch `database-server`

![Project Flow](public/images/project-flow.jpg)

## การเชื่อมต่อระหว่างกลุ่ม

- กลุ่ม 2 เก็บบัญชี บทบาท และสถานะผู้ใช้ใน PostgreSQL พร้อมเว็บ CRUD
- กลุ่ม 1 เชื่อม PostgreSQL เพื่อยืนยันตัวตนผ่าน `radcheck` และอ่านบทบาทจาก `radius_user_roles`
- กลุ่ม 3 เรียก RADIUS ของกลุ่ม 1 แล้วออก JWT ให้กลุ่ม 4 โดยไม่เชื่อม DB ของกลุ่ม 2 โดยตรง
- กลุ่ม 4 ประสานการใช้งาน API กับกลุ่ม 3

ภาพต้นฉบับระบุ MySQL แต่ระบบจริงใช้ PostgreSQL ตามที่ตกลงกับกลุ่ม 1
ส่วนตารางประตู สิทธิ์รายห้อง และ Access Logs ไม่อยู่ในขอบเขตที่กลุ่ม 2/3 ตกลงกัน

## เริ่มเว็บบนเครื่องผู้ดูแล

ต้องมี Node.js 20.9 ขึ้นไป, npm, SSH และ Python 3 หากใช้สคริปต์ tunnel
ฐานข้อมูลจริงอยู่บน VM ส่วนเว็บรันบนเครื่องผู้ดูแลภายในเครือข่ายมหาวิทยาลัย

### 1. ติดตั้ง

```bash
git clone --single-branch --branch database-server https://github.com/Kanaphat4539/Door-Authentication-System.git databaseadmin
cd databaseadmin
npm ci
```

หากมีโฟลเดอร์โครงการอยู่แล้ว ให้เข้าโฟลเดอร์เดิม ไม่ต้อง clone ซ้ำ

### 2. ตั้งค่า environment

สำหรับเครื่องใหม่ คัดลอกไฟล์ตัวอย่างแล้วกรอกค่าจริง หากมี `.env.local` อยู่แล้วให้ใช้ไฟล์เดิม:

```bash
cp .env.example .env.local
```

| ตัวแปร | การใช้งาน |
|---|---|
| `DB_HOST` | `127.0.0.1` เมื่อเชื่อมผ่าน tunnel |
| `DB_PORT` | `5432` |
| `DB_NAME` | `cedatabase` |
| `DB_USER`, `DB_PASSWORD` | บัญชี DB ที่สร้างไว้แล้ว รับจากผู้ดูแลเป็นการส่วนตัว |
| `ADMIN_USERNAME` | ชื่อแอดมินเว็บ แยกจากบัญชีผู้ใช้และ SSH |
| `ADMIN_PASSWORD` | รหัสแอดมินเว็บ อย่างน้อย 12 ตัวอักษร |
| `SESSION_SECRET` | ค่าสุ่มอย่างน้อย 32 ตัวอักษร สร้างด้วย `openssl rand -hex 32` |
| `APP_ORIGIN` | URL ที่เปิดจริง เช่น `http://localhost:3000` ไม่มี `/` ปิดท้าย |
| `COOKIE_SECURE` | `false` สำหรับ HTTP ใน LAN, `true` เมื่อเปิด HTTPS |

อย่าใส่ DB credentials หรือ session secret ในตัวแปร `NEXT_PUBLIC_*`

### 3. เปิด SSH tunnel

เชื่อมต่อและ Login เครือข่ายมหาวิทยาลัย จากนั้นเปิด Terminal แรกค้างไว้:

```bash
python3 scripts/start_tunnel.py
```

หรือใช้คำสั่ง SSH โดยตรงแทนสคริปต์ เลือกเพียงวิธีเดียว:

```bash
ssh -N -L 127.0.0.1:5432:127.0.0.1:5432 -p 2202 -o ExitOnForwardFailure=yes root@172.16.10.200
```

กรอกรหัส SSH ที่ได้รับจากผู้ดูแล ช่องรหัสผ่านจะไม่แสดงอักขระระหว่างพิมพ์

### 4. รันเว็บ

อีก Terminal ในโฟลเดอร์โครงการ:

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) และ Login ด้วยบัญชี ADMIN ใน environment
การบันทึกที่สำเร็จลง PostgreSQL บน VM จริง หากเชื่อม DB ไม่ได้ระบบแจ้งข้อผิดพลาด ไม่มีการใช้ข้อมูลจำลองแทน

หากใช้ production build:

```bash
npm run build
npm run start
```

กรณีเปิดจากเครื่องอื่นใน LAN ให้ตั้ง `APP_ORIGIN=http://<IP-เครื่องรันเว็บ>:3000` แล้วเริ่ม dev ด้วย `npm run dev -- --hostname 0.0.0.0`
ทุกเครื่องใช้ URL เดียวกัน เครื่องที่รันเว็บต้องเปิด tunnel ค้างไว้ และเครือข่าย/Firewall ต้องอนุญาตการเชื่อมต่อ

## ฐานข้อมูลและการรวมงาน

| รายการ | ค่า |
|---|---|
| PostgreSQL VM ระหว่างเครื่อง Server | `192.168.100.102` |
| Port | `5432` |
| Database | `cedatabase` |
| Schema | `public` |
| Engine | PostgreSQL 17 |

### ไฟล์ SQL

- [`database/init.sql`](database/init.sql): ตาราง, Views, trigger, index และข้อมูล master ไม่มีรายชื่อจริงหรือบัญชีตัวอย่าง
- [`002_professor_position.sql`](database/migrations/002_professor_position.sql): เพิ่มตำแหน่งอาจารย์ให้ schema รุ่นเดิม
- [`003_radius_user_roles.sql`](database/migrations/003_radius_user_roles.sql): เพิ่ม View อ่านบทบาทสำหรับกลุ่ม 1 ให้ schema รุ่นเดิม
- [`radius_user_role.sql`](database/queries/radius_user_role.sql): query อ่านบทบาทโดย bind username ผ่าน PostgreSQL driver

VM ปัจจุบันมี schema และ migrations 002/003 แล้ว ไม่ต้องรัน `init.sql` หรือนำเข้าข้อมูลซ้ำตอนเปิดเว็บ
สำหรับฐานข้อมูลใหม่ ให้ผู้ดูแลสร้าง `cedatabase` และบัญชี DB ก่อน แล้วใช้เจ้าของฐานข้อมูลรัน:

```bash
psql -d cedatabase -v ON_ERROR_STOP=1 -1 -f database/init.sql
```

ตั้งค่า host/user ด้วยวิธีปกติของ psql ให้ตรงกับฐานข้อมูลใหม่ที่ต้องการติดตั้ง
เว็บต้องมีสิทธิ์ CRUD เฉพาะ `users`, `students`, `professors` และ SELECT master tables/`radcheck`
กลุ่ม 1 ต้องมี CONNECT/USAGE และ SELECT บน `radcheck`, `radius_user_roles` ไม่ต้องมีสิทธิ์เขียนข้อมูล
บัญชี DB เดิมบน VM ใช้งานได้อยู่แล้ว การเปลี่ยนบัญชีหรือสิทธิ์ให้ประสานกลุ่มที่ใช้ร่วมกันก่อน

### โครงสร้างข้อมูล

- `users`: `user_id` เป็น UUID, username ไม่ซ้ำ, password สำหรับ RADIUS, ชื่อ/อีเมล, `role_id`, `is_active`
- `students`: ข้อมูลสาขาและชั้นปี อ้างอิง users ผ่าน user_id
- `professors`: ข้อมูลอาจารย์และตำแหน่ง อ้างอิง users ผ่าน user_id
- `roles`, `departments`, `majors`: ข้อมูล master
- `view_students`, `view_professors`: ข้อมูลโปรไฟล์สำหรับอ่าน

ผู้ใช้หนึ่งคนมีหนึ่งบทบาทผ่าน `users.role_id` สถานะบัญชีใช้ `is_active` แบบ boolean

### View สำหรับกลุ่ม 1

`radcheck` แสดงเฉพาะบัญชี active โดยมี `id` เป็น UUID string, `username`, `attribute=Cleartext-Password`, `op=:=`, `value` เป็นรหัสผ่าน
อ่านเพื่อยืนยันตัวตน ไม่ INSERT ลง View และไม่เปลี่ยนรูปแบบรหัสโดยไม่ตกลงกับกลุ่ม 1

`radius_user_roles` แสดงเฉพาะบัญชี active โดยมี `user_id`, `username`, `role_id`, `role_code`, `api_role`, `is_active` ไม่มีรหัสผ่านใน View นี้

| role_code | api_role |
|---|---|
| STUDENT | student |
| PROFESSOR | teacher |
| ADMIN | admin |
| STAFF | staff |

```sql
SELECT user_id::text AS user_id, username, role_id, role_code, api_role
FROM public.radius_user_roles
WHERE username = $1;
```

`$1` เป็น bind parameter ของ PostgreSQL driver หากใช้ใน FreeRADIUS ให้กลุ่ม 1 ปรับ query ให้ตรงกับ SQL expansion/escaping ที่ใช้งานอยู่
กลุ่ม 1/3 ตกลง RADIUS Attribute และใช้บทบาทเพื่อออก JWT การเพิ่ม View ไม่ได้ตั้งค่า RADIUS ให้ส่ง Attribute เอง

## เว็บแอดมินและ API ภายใน

เว็บรองรับ CRUD, ค้นหา, เรียงรหัสจากน้อยไปมาก, กรองบทบาท/สถานะ/ชั้นปี และแสดงจำนวนแต่ละปี
แอดมินที่ Login แล้วดูรหัส RADIUS ทีละบัญชีได้ ส่วน API รายชื่อไม่คืนรหัสทั้งหมด

| Endpoint | หน้าที่ |
|---|---|
| `POST /api/auth/login` | Login แอดมินเว็บ |
| `POST /api/auth/logout` | Logout |
| `GET/POST/PUT/DELETE /api/users` | จัดการข้อมูลผู้ใช้ |
| `GET /api/users/[id]/password` | อ่านรหัสหนึ่งบัญชีด้วย UUID |
| `GET /api/health` | ตรวจ DB และตาราง/View ที่เว็บใช้งาน |

API เหล่านี้เป็นของเว็บแอดมินกลุ่ม 2 ต้องมี session แอดมินสำหรับข้อมูลผู้ใช้ และคำขอแก้ไขต้องมี Origin ตรงกับ APP_ORIGIN
API Login ผู้ใช้งานที่ออก JWT เป็นของกลุ่ม 3

## การตรวจโค้ด

```bash
npm run lint
npx tsc --noEmit
npm run build
```

รหัสจริง, `.env.local`, รายชื่อ, backups, Excel บัญชีผู้ใช้, ไฟล์ agent และเครื่องมือเฉพาะกิจไม่รวมใน repository

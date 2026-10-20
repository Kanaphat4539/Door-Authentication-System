# กลุ่ม 2: การตั้งค่า การทดสอบ และส่งต่องาน

ทำงานเฉพาะ branch `database-server` ไม่ checkout, สร้าง, merge หรือ push branch อื่น
ระบบนี้อยู่ในเครือข่ายมหาวิทยาลัย ไม่ได้ deploy Vercel หรือเปิดอินเทอร์เน็ตสาธารณะ

## สถานะที่ตรวจจริง

ข้อมูลล่าสุดบน VM มีนักศึกษา 197 คน อาจารย์ 5 คน รวม 202 บัญชี active และอยู่ใน `radcheck` ตามผลตรวจล่าสุด
ปี 1: 51 คน, ปี 2: 45 คน, ปี 3: 43 คน, ปี 4: 58 คน
บัญชีทดสอบเดิมถูกผู้ดูแลลบแล้ว การทดสอบร่วมกับกลุ่ม 1 ต้องตกลงบัญชีทดสอบใหม่
เว็บรันในเครื่องผู้ดูแลตามขอบเขตงาน ไม่ได้ติดตั้งเว็บบน VM; รอผลทดสอบ Authentication จากกลุ่ม 1 และคำตอบจากกลุ่ม 3

## เริ่มเว็บในเครื่องพัฒนา

1. ต่อและ Login KMITL-WiFi หรือ CEDC-WiFi ตามคู่มือ VM
2. เปิด tunnel: `python3 scripts/start_tunnel.py` แล้วกรอกรหัส SSH ตามปกติ
3. คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่าจริง ห้าม commit ไฟล์นี้
   - `DB_HOST=127.0.0.1` และ `DB_PORT=5432` เมื่อใช้ tunnel หรือรันเว็บบน VM เดียวกับ DB
   - `DB_USER` / `DB_PASSWORD`: ใช้บัญชีที่มีสิทธิ์ CRUD ตารางผู้ใช้ ตอนเปลี่ยนเป็น `portal_app` ต้องสร้างบัญชีด้วย migration ก่อน
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD`: บัญชีผู้ดูแลเว็บแยกจากนักศึกษาและ SSH รหัสผ่านอย่างน้อย 12 ตัวอักษร
   - `SESSION_SECRET`: ค่าสุ่มอย่างน้อย 32 ตัวอักษร สร้างด้วย `openssl rand -hex 32`
   - `APP_ORIGIN=http://localhost:3000` ต้องตรง URL ที่เปิดจริงทุกตัวและไม่มี / ปิดท้าย
   - `COOKIE_SECURE=false` สำหรับ HTTP ใน LAN; ใช้ `true` เมื่อมี HTTPS
4. `npm run dev` แล้วเปิด `http://localhost:3000` เข้าด้วยบัญชี ADMIN ที่ตั้งใน env

Session หมดอายุใน 8 ชั่วโมง เปลี่ยน ADMIN_PASSWORD หรือ SESSION_SECRET แล้ว session เดิมใช้ไม่ได้
จำกัดการลอง Login 20 ครั้งต่อ 15 นาทีต่อ process; หากรันหลาย process ต้องใช้ rate limit ร่วมกัน
ข้อมูลรหัสผ่าน RADIUS ยังคงอยู่ใน DB เพื่อรักษาสัญญากับกลุ่ม 1 API รายชื่อไม่ส่งรหัสผ่าน แต่ผู้ดูแลที่ Login แล้วกดปุ่มตาเพื่ออ่านเป็นรายบัญชีได้ผ่าน `/api/users/[id]/password` พร้อม `Cache-Control: no-store`

## สิทธิ์ DB และเครือข่ายบน VM

สำรองข้อมูลก่อน: เข้า VM ด้วย `ssh root@172.16.10.200 -p 2202` แล้วรัน

```bash
runuser -u postgres -- pg_dump -Fc cedatabase > /root/cedatabase-before-service-roles.dump
runuser -u postgres -- psql -d cedatabase -f /path/to/database/migrations/001_service_roles.sql
```

แทน `/path/to` ด้วยตำแหน่ง checkout บน VM สคริปต์จะถามรหัสผ่านใหม่ 3 บัญชี (หน้าจออาจแสดงค่าที่กรอก จึงใช้ terminal ส่วนตัว)
- `portal_app`: CRUD `users`, `students`, `professors`; อ่าน master tables และ `radcheck`
- `radius_reader`: อ่านเฉพาะ `radcheck` ให้กลุ่ม 1
- `auth_reader`: อ่าน `users`, `roles`, `view_students`, `view_professors` ให้กลุ่ม 3

migration ไม่แก้รหัสผ่านหรือสิทธิ์ `ceadmin` เดิม ให้เปลี่ยน env เว็บและประสานกลุ่ม 1 ก่อนเปลี่ยนบัญชีของเขา
เมื่อทุกกลุ่มเปลี่ยนบัญชีและทดสอบผ่านแล้ว จึงพิจารณาถอน SUPERUSER ของ `ceadmin` โดยตรวจเจ้าของ object และสิทธิ์ทั้งหมดก่อน
อย่ารัน `setup_vm_postgres.sh` ทับ VM เดิม สคริปต์นี้สำหรับติดตั้งใหม่เท่านั้น

ตรวจ `SHOW hba_file` และ `SHOW config_file` ใน psql แล้วปรับ `pg_hba.conf` ให้เหลือรายการที่ต้องใช้ เช่น:

```text
# คง local/socket และ localhost สำหรับผู้ดูแลและ portal บน VM
host cedatabase radius_reader 192.168.100.101/32 scram-sha-256
host cedatabase auth_reader   192.168.100.103/32 scram-sha-256
```

ทบทวนและแทนกฎกว้างเดิม `0.0.0.0/0`, `172.16.0.0/16`, `192.168.100.0/24` ที่อนุญาตทุก user/database
อย่าลบ local/localhost rules ที่ใช้ SSH tunnel ปัจจุบัน และอย่าปิด SSH 2202/เส้นทางบริหารเครื่อง
ตรวจ syntax และ reload PostgreSQL หลังแก้ แล้วทดสอบจาก VM กลุ่ม 1/3 ก่อนปิด session ผู้ดูแล
ถ้ารันเว็บที่ VM อื่น ให้เพิ่มเฉพาะ IP ของเครื่องนั้นสำหรับ `portal_app` ตามที่ตกลงกัน

## ทดสอบเว็บด้วยตัวเอง

ใช้บัญชีทดสอบใหม่ เช่น `portal_check` ห้ามลองลบบัญชีจริงของเพื่อน

| ลำดับ | สิ่งที่ทำ | ผลที่ควรได้ |
|---|---|---|
| 1 | เปิดหน้าหลักโดยยังไม่ Login | ไปหน้าเข้าสู่ระบบ; `/api/users` และ `/api/health` ตอบ 401 |
| 2 | Login รหัสผิด แล้วใช้รหัสผู้ดูแลถูกต้อง | ผิดต้องถูกปฏิเสธ ถูกต้องจึงเห็นข้อมูล |
| 3 | เพิ่มนักศึกษาทดสอบ กรอก CPE, CPE-BENG, ปี 2 | สำเร็จแล้วกดรีเฟรชยังเห็นข้อมูล มีทั้ง users และ students |
| 4 | เพิ่ม Username ซ้ำ | แจ้งข้อผิดพลาด ไม่เพิ่มแถวหลอกในหน้าเว็บ |
| 5 | แก้ชื่อ อีเมล Username โดยเว้นรหัสผ่านว่าง | ข้อมูลบันทึกจริง รหัสผ่านเดิมยังใช้ได้ ไม่เติมคำนำหน้าซ้ำ |
| 6 | เปลี่ยนบทบาทเป็นอาจารย์และระบุ CPE | มี professors แทน students |
| 7 | ปิดและเปิดสิทธิ์ของอาจารย์ทดสอบ | บทบาทยังเป็นอาจารย์หลังรีเฟรช |
| 8 | ตรวจสุขภาพ DB | แสดงปลายทางจริงและสถานะตาราง/View; การตรวจนี้ไม่ยืนยันว่า FreeRADIUS Login ผ่าน |
| 9 | หยุด tunnel ในเครื่องทดสอบ แล้วลองบันทึก | ต้องแจ้งว่าบันทึกไม่สำเร็จ ไม่อ้างว่าสำเร็จ |
| 10 | เปิด tunnel กลับ กดรีเฟรช แล้วลบบัญชีทดสอบ | หายจริงหลังรีเฟรช และไม่มี profile ค้าง |
| 11 | Logout แล้วเปิด `/api/users` ใหม่ | ตอบ 401 |

ตรวจแถวใน DB ด้วย psql (ใช้ username ของบัญชีทดสอบจริง):

```sql
SELECT user_id, username, is_active, role_id FROM public.users WHERE username = 'portal_check';
SELECT student_id, year_level FROM public.students WHERE user_id = (SELECT user_id FROM public.users WHERE username = 'portal_check');
SELECT professor_id FROM public.professors WHERE user_id = (SELECT user_id FROM public.users WHERE username = 'portal_check');
SELECT username, attribute, op FROM public.radcheck WHERE username = 'portal_check';
```

## ทดสอบร่วมกับกลุ่ม 1

ตกลงบัญชีทดสอบแยกจากบัญชีจริงกับกลุ่ม 1 แล้วสร้างจากหน้าเว็บก่อนเริ่มทดสอบ เพราะผู้ดูแลลบบัญชีทดสอบเดิมแล้ว
1. ให้กลุ่ม 1 ยืนยันตัวตนผ่าน FreeRADIUS ด้วยรหัสถูก ต้องผ่าน
2. เปลี่ยนเฉพาะรหัสที่ใช้ทดสอบให้ผิด ต้องไม่ผ่าน
3. ปิดสิทธิ์จากเว็บและตรวจว่า SELECT จาก radcheck ไม่พบ username นี้
4. ให้กลุ่ม 1 เริ่มการยืนยันตัวตนใหม่ ต้องไม่ผ่าน
5. เปิดสิทธิ์กลับ ตรวจว่าพบใน radcheck และยืนยันตัวตนใหม่ต้องผ่าน
6. บันทึกเวลาและผลตอบรับจากกลุ่ม 1 ไม่เก็บรหัสผ่านหรือ shared secret ลง Git

การปิดสิทธิ์ใน DB ไม่ได้ตัด session Wi-Fi ที่เชื่อมอยู่ทันที การตัด session เดิม/การ cache เป็นเรื่องที่ต้องตกลงกับกลุ่ม 1
คำสั่ง `radtest` ทดสอบบางวิธี เช่น PAP ไม่ใช่หลักฐานว่า PEAP-MSCHAPv2 ผ่าน ต้องให้กลุ่ม 1 ทดสอบตามวิธี 802.1X ที่เขาใช้งานจริงด้วย

## ข้อความสำหรับคุยกับกลุ่ม 3

ส่งด้วยตนเองได้ว่า:

> กลุ่ม 2 ใช้ PostgreSQL ที่ 192.168.100.102:5432 ฐานข้อมูล cedatabase นะครับ มี users และ roles พร้อม view_students/view_professors อยากตกลงว่า API Login ของกลุ่ม 3 จะใช้ username, password, is_active และ role แบบไหน เดี๋ยวเตรียมบัญชีอ่านข้อมูลให้แยกจากกลุ่ม 1 และส่งรหัสผ่านทางส่วนตัว รบกวนแจ้งภาษาหรือ driver ที่ใช้และข้อมูลโปรไฟล์ที่ต้องการด้วยครับ

ยังไม่ได้ส่งข้อความแทนคุณ ยังไม่ได้ตกลงรูปแบบ Token/API กับกลุ่ม 3 และกลุ่ม 2 ไม่ต้องสร้าง Authentication API ของกลุ่ม 3 แทน
ให้กลุ่ม 3 ใช้ parameterized query, ตรวจ `is_active = true` และอย่าส่ง password กลับใน JSON
อย่าเปลี่ยน password ใน DB เป็น bcrypt โดยไม่ตกลงกับกลุ่ม 1 เพราะต้องรักษาวิธีตรวจสอบ 802.1X ที่ใช้อยู่

## นำเข้าข้อมูล

รายชื่อจริงและ credentials อยู่เฉพาะ `data/private/` ซึ่งไม่ติด Git
นำเข้าผ่านหน้าเว็บ หรือเตรียม JSON ที่ตรวจสอบชื่อและชั้นปีแล้วเพื่อใช้สคริปต์:

```bash
node scripts/import_ce04.mjs data/private/roster.json --expected-count=จำนวนรายการ
```

แต่ละแถวมี `student_id` (เลข 8 หลัก), `prefix_th`, `first_name_th`, `last_name_th`, `year_level`, `reviewed: true`
เลือกชั้นปี 1–4 ตามข้อมูลที่ยืนยัน รหัส 67 เป็นปี 3 และรหัสต่ำกว่า 66 ที่ยังเรียนอยู่รวมปี 4
ค่าเริ่มต้นเป็น dry-run ไม่เชื่อม DB; เพิ่ม `--apply` หลังตรวจข้อมูลแล้วเท่านั้น
สคริปต์ตั้งอีเมล `<student_id>@kmitl.ac.th` และรหัสเริ่มต้นเป็นรหัสนักศึกษาตามข้อตกลงของงานนี้
ไม่เขียนทับบัญชีเดิม บันทึกผลใน `data/private/ce04-import-result.json`

`scripts/import_professors.mjs` เป็นเครื่องมือนำเข้า 5 บัญชีอาจารย์จาก `data/private/ce-professors.json`
ใช้ professor01–professor05 พร้อมรหัสสุ่ม บันทึก credentials และ backup เฉพาะ `data/private/`
ค่าเริ่มต้นเป็น dry-run; ไม่ต้องรัน `--apply` ซ้ำบน VM ปัจจุบันเพราะนำเข้าครบแล้ว

## ตรวจโค้ดและ integration tests

```bash
npm run lint
npx tsc --noEmit
npm run build
```

ชุด `tests/integration.mjs` ต้องใช้ PostgreSQL จำลองแยกที่ `127.0.0.1:55432` ฐานข้อมูล `cedatabase`
ห้ามชี้ไป VM เพราะทดสอบเพิ่ม/แก้ไข/ลบข้อมูล และเปลี่ยนชื่อ View ชั่วคราว

1. สร้างฐานข้อมูลจำลองที่พอร์ต 55432 แล้วรัน `database/init.sql` ด้วยเจ้าของฐานข้อมูล (ไฟล์นี้มีบัญชีตัวอย่าง)
2. ใช้ psql ของ PostgreSQL 17 ขึ้นไปรัน `database/migrations/001_service_roles.sql` ตั้งรหัสทดสอบของ portal_app เป็น `test-only-portal-password` และกำหนดรหัสเฉพาะชุดทดสอบให้ radius_reader/auth_reader
3. เปิดเว็บทดสอบแยกด้วย environment ต่อไปนี้ (เป็นค่าทดสอบเท่านั้น):

```bash
DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=cedatabase \
DB_USER=portal_app DB_PASSWORD=test-only-portal-password \
ADMIN_USERNAME=testadmin ADMIN_PASSWORD=test-only-admin-password \
SESSION_SECRET=test-only-session-secret-at-least-32-characters \
APP_ORIGIN=http://127.0.0.1:3100 COOKIE_SECURE=false \
npm run start -- --hostname 127.0.0.1 --port 3100
```

4. อีก Terminal รันด้วย URL ของเจ้าของฐานข้อมูลจำลอง (ตัวอย่างใช้ชื่อผู้ใช้ `test_owner` ที่ต้องสร้างไว้ก่อน):

```bash
TEST_ORIGIN=http://127.0.0.1:3100 \
TEST_DATABASE_URL=postgresql://test_owner@127.0.0.1:55432/cedatabase \
npm run test:integration
```

ผลตรวจล่าสุดผ่าน 20 รายการ ครอบคลุม Login/session, CRUD, transaction rollback, รหัสผ่านรายบัญชี/no-store, health check และสิทธิ์ DB แยก
ทดสอบบน PostgreSQL 18 ในเครื่อง ส่วน VM จริงเป็น PostgreSQL 17; ผลนี้ไม่แทนการทดสอบ FreeRADIUS ร่วมกับกลุ่ม 1

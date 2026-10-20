# ส่งมอบการอ่านบทบาทให้กลุ่ม 1 — พร้อมทดสอบ

วันที่ 20 ตุลาคม 2569

## ส่วนที่กลุ่ม 2 ทำบน VM แล้ว

- เพิ่ม `public.radius_user_roles` ใน PostgreSQL `192.168.100.102:5432` ฐานข้อมูล `cedatabase`
- View อ่าน `users` ร่วมกับ `roles` และคืนเฉพาะผู้ใช้ `is_active = true`
- คืนบทบาททั้งรูปแบบ DB และค่าที่ API ใช้ โดยไม่มีรหัสผ่าน ชื่อ หรืออีเมลใน View นี้
- ตรวจพบ FreeRADIUS จาก `192.168.100.101` เชื่อม DB ด้วย `ceadmin` อยู่ และบัญชีนี้อ่าน View ใหม่ รวมถึง `users`/`roles` ได้แล้ว
- คงบัญชี DB, รหัสผ่าน, `radcheck` และกฎเครือข่ายที่ใช้งานอยู่ ไม่ต้องเปลี่ยนการตรวจรหัสผ่านเดิม

ไม่ได้สร้าง `auth_reader` หรือเปิดการเชื่อมต่อให้กลุ่ม 3 ตามข้อตกลงล่าสุด กลุ่ม 3 รับผลผ่านกลุ่ม 1 เท่านั้น
บัญชี `ceadmin` เป็นบัญชีเดิมที่มีสิทธิ์กว้าง การเปลี่ยนไปใช้ `radius_reader` ต้องนัดทดสอบกับกลุ่ม 1 ก่อน ไม่ได้เปลี่ยนบัญชีอัตโนมัติรอบนี้

## ฟิลด์ที่อ่านได้

| ฟิลด์ | ความหมาย |
|---|---|
| `user_id` | UUID ของผู้ใช้ |
| `username` | บัญชีเดียวกับที่ใช้ยืนยันตัวตน |
| `role_id` | ตัวเลขอ้างอิงบทบาท |
| `role_code` | บทบาทตามฐานข้อมูล |
| `api_role` | บทบาทที่แปลงไว้สำหรับ API |
| `is_active` | เป็น true สำหรับแถวที่อยู่ใน View |

| role_code | api_role |
|---|---|
| STUDENT | student |
| PROFESSOR | teacher |
| ADMIN | admin |
| STAFF | staff |

กลุ่ม 1/3 ต้องเลือกและตกลงว่าจะส่ง `role_code` หรือ `api_role` รวมถึงชื่อ RADIUS Attribute ร่วมกัน
การสร้าง View ไม่ได้ทำให้ FreeRADIUS ใส่ role ใน Access-Accept อัตโนมัติ
บทบาทในข้อมูลนี้ไม่ได้ระบุสิทธิ์เปิดประตูรายห้อง

## Query สำหรับฝั่งโปรแกรม

ไฟล์พร้อมใช้: [`database/queries/radius_user_role.sql`](../database/queries/radius_user_role.sql)

```sql
SELECT user_id::text AS user_id, username, role_id, role_code, api_role
FROM public.radius_user_roles
WHERE username = $1;
```

`$1` เป็น parameter ของ PostgreSQL driver ให้ bind กับ username ที่กำลังยืนยันตัวตน
นี่คือ query อ่านบทบาท ไม่ใช่คำสั่งตรวจรหัสผ่าน ต้องยืนยันรหัสสำเร็จก่อนออก JWT
หากใช้ใน FreeRADIUS configuration ให้กลุ่ม 1 ปรับเป็นรูปแบบ SQL expansion และการ escape ที่ FreeRADIUS รุ่นที่ใช้งานรองรับ ไม่คัดลอก `$1` ไปใส่ config ตรง ๆ หรือประกอบ SQL จาก input โดยไม่ escape

ถ้าต้องการ join ตารางโดยตรง บัญชีเดิมที่ใช้อยู่มีสิทธิ์อ่านแล้ว:

```sql
SELECT u.user_id::text AS user_id, u.username, r.role_code
FROM public.users AS u
JOIN public.roles AS r ON r.role_id = u.role_id
WHERE u.username = $1 AND u.is_active = true;
```

## ทดสอบด้วย psql จากเครื่องกลุ่ม 1

```bash
psql -h 192.168.100.102 -p 5432 -U ceadmin -d cedatabase -W
```

ใช้รหัส DB เดิมที่ได้รับเป็นการส่วนตัว ไม่ใช้รหัสผู้ใช้/RADIUS แทนรหัส DB
ใน psql:

```sql
SELECT current_database(), current_user;

PREPARE lookup_radius_role(text) AS
SELECT user_id::text AS user_id, username, role_code, api_role
FROM public.radius_user_roles
WHERE username = $1;

EXECUTE lookup_radius_role('67200093');
-- ควรได้ STUDENT / student ตามข้อมูลล่าสุด

EXECUTE lookup_radius_role('professor01');
-- ควรได้ PROFESSOR / teacher ตามข้อมูลล่าสุด

EXECUTE lookup_radius_role('g2_missing_account');
-- ไม่ควรพบแถว หาก username นี้ไม่มีจริง

DEALLOCATE lookup_radius_role;

SELECT role_code, api_role, count(*)
FROM public.radius_user_roles
GROUP BY role_code, api_role
ORDER BY role_code;
```

ผลตรวจตอนส่งมอบ: STUDENT/student 197 คน และ PROFESSOR/teacher 5 คน รวม 202 บัญชี
ยังไม่มีผู้ใช้จริงบทบาท ADMIN/STAFF ในชุดข้อมูลนี้ แต่ทดสอบ mapping ทั้งสี่แบบด้วย fixture แยกแล้ว
เมื่อมีการเพิ่ม/ลบ/ปิดบัญชี ให้ยึดจำนวนปัจจุบันแทนตัวเลขในเอกสาร

## ส่วนที่กลุ่ม 1 และ 3 ทำต่อ

1. กลุ่ม 1 ใช้ผลยืนยันตัวตนเดิม แล้วอ่านบทบาทของ username เดียวกันจาก View นี้
2. กลุ่ม 1 และ 3 ตกลง RADIUS Attribute สำหรับส่ง role และ user_id หาก API ต้องใช้ UUID
3. กลุ่ม 1 ตั้งให้ Access-Accept ส่งค่าที่ตกลง แล้วให้กลุ่ม 3 อ่านค่าที่ได้รับไปสร้าง claims ใน JWT
4. ถ้า query บทบาทไม่พบ/ล้มเหลว อย่าให้บทบาท ADMIN โดยอัตโนมัติ ให้ใช้แนวทางปฏิเสธที่ตกลงร่วมกัน
5. ใช้บัญชีสาธิตแยกทดสอบรหัสผิด ปิดสิทธิ์ และเปลี่ยนบทบาท โดยไม่แก้สถานะของเพื่อนที่กำลังใช้งานโดยไม่แจ้ง

กลุ่ม 1 ส่งผล `radtest -t pap` ที่เป็น Access-Accept มาแล้ว
กลุ่ม 3 ส่งภาพ `/auth/login` ตอบ HTTP 200 และคืน JWT พร้อมยืนยันว่าเรียกผ่าน RADIUS แล้ว
ผลนี้ยืนยันการทดสอบ Login ที่รายงานมา แต่ยังไม่ใช่หลักฐานว่า role ถูกส่งใน RADIUS/JWT แล้ว หรือ Wi-Fi 802.1X และประตูทำงานครบเส้นทาง
รบกวนส่งผล role ที่ได้รับแบบปิดรหัสผ่าน/token จริง พร้อมระบุ RADIUS Attribute ที่ตกลงกันครับ

## วิธีตรวจซ้ำของกลุ่ม 2

Migration: `database/migrations/003_radius_user_roles.sql`
ใช้บน VM แล้ว ไม่ต้องรัน `init.sql` หรือ migration 001 ทับระบบเพื่อเปิดใช้ role lookup
ถ้าตั้งระบบใหม่ ให้ใช้ `init.sql` ที่มี View นี้รวมแล้ว

```bash
node scripts/check_radius_roles.mjs
```

สคริปต์นี้ใช้ `.env.local` เพื่อเชื่อม DB สร้าง schema และ NOLOGIN role ชื่อสุ่มสำหรับ fixture แยก แล้ว rollback ทั้งหมด
ต้องใช้บัญชีผู้ดูแลที่สร้าง schema/role ได้ ไม่ใช้บัญชี RADIUS สำหรับรันชุดทดสอบนี้
ไม่เขียนข้อมูลทดสอบลง `public.users` และไม่เปลี่ยน `public.radcheck`
ผ่าน 7 ชุดตรวจบน PostgreSQL 17 ของ VM: migration รันซ้ำ, mapping 4 บทบาท, บัญชีปิด/ไม่มีจริง, ไม่มีรหัสในผลลัพธ์, เปลี่ยนบทบาท/สถานะ, parameter และสิทธิ์อ่าน View โดยไม่อ่านตารางฐาน
ตรวจค่ารวมและลายนิ้วมือข้อมูลผู้ใช้ก่อน/หลังใช้ migration แล้วตรงกัน รวมถึงนิยาม `radcheck` เดิม

อ้างอิงพฤติกรรม View และสิทธิ์: [PostgreSQL 17 CREATE VIEW](https://www.postgresql.org/docs/17/sql-createview.html), [GRANT](https://www.postgresql.org/docs/17/sql-grant.html)

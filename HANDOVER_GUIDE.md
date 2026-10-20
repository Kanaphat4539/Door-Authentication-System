# ส่งมอบฐานข้อมูล — กลุ่ม 2

ระบบใช้ PostgreSQL ตามที่ตกลงกับกลุ่ม 1 แทน MySQL ในภาพโครงการ
เว็บแอดมินรันบนเครื่องผู้ดูแล ข้อมูลอยู่บน VM ภายในเครือข่ายมหาวิทยาลัย

## การเชื่อมต่อ

| รายการ | ค่า |
|---|---|
| Host ระหว่าง VM | `192.168.100.102` |
| Port | `5432` |
| Database | `cedatabase` |
| บัญชี DB ที่ใช้อยู่เดิม | `ceadmin` |
| SSH จากเครือข่ายมหาวิทยาลัย | `ssh root@172.16.10.200 -p 2202` |

ติดต่อกลุ่ม 2 เพื่อรับรหัส DB/SSH เป็นการส่วนตัว ไม่ใส่รหัสจริงใน Git
IP ระหว่าง VM ไม่ใช่ URL ของเว็บแอดมินและอาจเข้าโดยตรงจาก Wi-Fi ไม่ได้

## กลุ่ม 1 — RADIUS

อ่าน `public.radcheck` ซึ่งมีเฉพาะผู้ใช้ `is_active = true`:

| คอลัมน์ | ความหมาย |
|---|---|
| id | ลำดับแถวใน View |
| username | ชื่อบัญชี |
| attribute | `Cleartext-Password` |
| op | `:=` |
| value | รหัสผ่านสำหรับตรวจสอบโดย RADIUS |

```sql
SELECT username, attribute, op
FROM public.radcheck
WHERE username = '<บัญชีทดสอบที่ตกลงกัน>';
```

View อ่านรหัสจาก `users` โดยตรง การเพิ่ม/แก้ไข/ปิดสิทธิ์ผ่านเว็บจึงสะท้อนใน View
ไม่เปลี่ยนรูปแบบรหัสผ่านใน DB โดยไม่ตกลงกับกลุ่ม 1 เพื่อคงวิธีตรวจ 802.1X ที่ใช้อยู่
รอผลทดสอบ Authentication จริงจากกลุ่ม 1; ดูลำดับการทดสอบใน [คู่มือทดสอบ](docs/TESTING_AND_HANDOVER.md)

## กลุ่ม 3 — Authentication API

มี `public.users`, `public.roles`, `public.view_students`, `public.view_professors`
`users` มี `user_id`, `username`, `password`, `is_active`, `role_id`, ข้อมูลชื่อและอีเมล
ต้องตกลงรูปแบบข้อมูล Login/Token และข้อมูลโปรไฟล์ร่วมกันก่อน ยังไม่มีข้อสรุปการเชื่อมต่อ
ใช้ parameterized query และตรวจ `is_active = true`; ไม่ส่ง password กลับใน JSON ของ API ผู้ใช้งาน
กลุ่ม 2 ไม่ได้ทำเว็บ Login หมายเลข 4 หรือ Authentication API หมายเลข 3 แทนกลุ่มนั้น

## สิทธิ์แยกตามบริการ

[migration 001](database/migrations/001_service_roles.sql) เตรียมบัญชี `portal_app` สำหรับเว็บ, `radius_reader` สำหรับ RADIUS และ `auth_reader` สำหรับกลุ่ม 3
ทดสอบในฐานข้อมูลจำลองแล้ว แต่ยังไม่ได้ใช้บน VM และไม่ได้เปลี่ยนบัญชี `ceadmin` ของระบบเดิม
ให้ประสานกับผู้ใช้งานแต่ละกลุ่ม สำรองข้อมูล แล้วค่อยสร้าง/เปลี่ยนบัญชีตาม [ขั้นตอนทดสอบและสิทธิ์](docs/TESTING_AND_HANDOVER.md)

รายละเอียดการเริ่มเว็บ: [README](README.md) · สถานะล่าสุด: [PROJECT_PROGRESS](PROJECT_PROGRESS.md)

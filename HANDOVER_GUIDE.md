# 📡 เอกสารส่งมอบงานและการเชื่อมต่อระบบ (System Handover & Integration Guide)
**โครงการ:** ระบบควบคุมการเข้า-ออกประตูและยืนยันตัวตนผ่าน Wi-Fi 802.1X (CE04 Door Authentication System)  
**กลุ่มผู้รับผิดชอบ:** กลุ่มที่ 2 (Database Server & Admin Portal)  
**อัปเดตล่าสุด:** 9 ตุลาคม 2026  

---

## 📌 1. ภาพรวมหน้าที่ของกลุ่ม 2 ในระบบ (Role in Project Flow)
ในสถาปัตยกรรมของโครงการทั้ง 7 กลุ่ม กลุ่มที่ 2 ทำหน้าที่เป็น **ศูนย์กลางฐานข้อมูลผู้ใช้ (Central User Database)** และมีเว็บแอปพลิเคชันบริหารจัดการผู้ใช้ (CE Student & Admin CRUD Portal) เพื่อให้บริการข้อมูลแก่กลุ่มอื่นๆ ดังนี้:
* **กลุ่ม 1 (RADIUS Server):** เชื่อมต่อเข้ามาคิวรี่ตาราง/View `radcheck` เพื่อยืนยันตัวตนการล็อกอิน Wi-Fi 802.1X
* **กลุ่ม 3 (Authentication API Server):** เชื่อมต่อเข้ามาตรวจสอบข้อมูลผู้ใช้จากตาราง `users` เพื่อให้บริการ API สำหรับยืนยันตัวตนต่อไปยัง Web Application (กลุ่ม 4) และ IoT Server (กลุ่ม 6)

![Project Flow](public/images/project-flow.jpg)

---

## 🔐 2. นโยบายความปลอดภัยและข้อมูลที่เป็นความลับ (Security Policy & Secret Keywords)
> **⚠️ มาตรการความปลอดภัยของระบบ:**  
> เพื่อความปลอดภัยของเซิร์ฟเวอร์ส่วนกลาง รหัสผ่านจริงทั้งหมด (Database Passwords & SSH Credentials) จะ **ไม่ถูกเปิดเผยลงใน Git สาธารณะ**  
> หากกลุ่มใดต้องการรหัสผ่านเพื่อนำไปตั้งค่าระบบ **โปรดติดต่อสอบถามตัวแทนกลุ่ม 2 โดยตรง** โดยแจ้ง **Keyword** ประจำหัวข้อดังต่อไปนี้:

| หัวข้อความลับที่ต้องการ | Keyword สำหรับติดต่อขอรหัสผ่าน | ผู้ที่ต้องใช้ |
| :--- | :--- | :--- |
| **รหัสผ่านฐานข้อมูล (PostgreSQL DB Password)** | `[G2-DB-PASSWORD]` | กลุ่ม 1 (RADIUS), กลุ่ม 3 (Auth API) |
| **การตั้งค่าเชื่อมต่อแบบเต็มของ FreeRADIUS** | `[RADIUS-DB-AUTH]` | กลุ่ม 1 (RADIUS Server) |
| **Connection String แบบเต็มสำหรับ API Server** | `[AUTH-API-DB-ACCESS]` | กลุ่ม 3 (Auth API Server) |
| **รหัสผ่าน SSH เข้าเครื่องเซิร์ฟเวอร์เสมือน** | `[G2-VM-SSH-ACCESS]` | ผู้ดูแลระบบ / อาจารย์ |

---

## 📡 3. ข้อมูลที่ กลุ่ม 1 (RADIUS Server) ต้องรู้และนำไปทำต่อ

### 3.1 ข้อมูลการเชื่อมต่อฐานข้อมูล (Database Connection)
กลุ่ม 1 จะต้องตั้งค่า FreeRADIUS ให้เชื่อมต่อผ่านโมดูล `rlm_sql_postgresql` มายัง VM ของกลุ่ม 2:

* **DBMS:** `PostgreSQL 17`
* **Host IP (Private LAN วงในระหว่าง VM):** `192.168.100.102`
* **Port:** `5432`
* **Database Name:** `cedatabase`
* **Database User:** `ceadmin`
* **Password:** 🔒 **`[ความลับ - โปรดขอจากกลุ่ม 2 โดยแจ้ง Keyword: [G2-DB-PASSWORD] หรือ [RADIUS-DB-AUTH]]`**

### 3.2 View สำหรับตรวจสอบรหัสผ่าน Wi-Fi (`radcheck`)
กลุ่ม 2 ได้สร้าง View ชื่อ `public.radcheck` ไว้ให้แล้วตามมาตรฐาน FreeRADIUS:
* **โครงสร้างฟิลด์:**
  * `id` (text): User UUID
  * `username` (varchar): รหัสนักศึกษา หรือ Username (เช่น `65010001`)
  * `attribute` (varchar): `'Cleartext-Password'`
  * `op` (varchar): `':='`
  * `value` (varchar): รหัสผ่านผู้ใช้
* **เงื่อนไข:** แสดงเฉพาะผู้ใช้ที่มีสถานะ `is_active = TRUE` เท่านั้น (หากแอดมินปิดสิทธิ์ในหน้าเว็บ ผู้ใช้จะล็อกอิน Wi-Fi ไม่ผ่านทันที)

### 3.3 ตัวอย่าง Query ที่กลุ่ม 1 ต้องตั้งค่าใน `queries.conf`
```sql
SELECT id, username, attribute, value, op 
FROM radcheck 
WHERE username = '%{SQL-User-Name}';
```

### 3.4 ตัวอย่างการตั้งค่า FreeRADIUS (`/etc/freeradius/3.0/mods-available/sql`)
```ini
sql {
    driver = "rlm_sql_postgresql"
    dialect = "postgresql"

    # เซิร์ฟเวอร์ฐานข้อมูลกลุ่ม 2
    server = "192.168.100.102"
    port = 5432
    login = "ceadmin"
    password = "<ติดต่อกลุ่ม 2 ด้วย Keyword: [G2-DB-PASSWORD]>"
    radius_db = "cedatabase"

    pool {
        start = 5
        min = 4
        max = 10
        spare = 3
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
    }
    
    $INCLUDE ${modconfdir}/${.:name}/main/${dialect}/queries.conf
}
```

---

## 🔑 4. ข้อมูลที่ กลุ่ม 3 (Authentication API Server) ต้องรู้และนำไปทำต่อ

### 4.1 ข้อมูลการเชื่อมต่อฐานข้อมูล (Database Connection)
กลุ่ม 3 จะต้องเชื่อมต่อ Database Driver (เช่น `psycopg2`, `asyncpg`, `Prisma`, หรือ `TypeORM`) มาที่:

* **Host IP:** `192.168.100.102`
* **Port:** `5432`
* **Database:** `cedatabase`
* **User:** `ceadmin`
* **Password:** 🔒 **`[ความลับ - โปรดขอจากกลุ่ม 2 โดยแจ้ง Keyword: [G2-DB-PASSWORD] หรือ [AUTH-API-DB-ACCESS]]`**
* **Connection String Format:**
  ```text
  postgresql://ceadmin:<PASSWORD>@192.168.100.102:5432/cedatabase
  ```

### 4.2 ตารางผู้ใช้หลัก (`users`)
สำหรับตรวจสอบ Username, Password และสิทธิ์ของผู้ใช้เพื่อออก JWT Token / Session:
* **ชื่อตาราง:** `public.users`
* **ฟิลด์สำคัญ:**
  * `user_id` (UUID - Primary Key)
  * `username` (varchar - Unique)
  * `password` (varchar)
  * `first_name_th`, `last_name_th` (varchar)
  * `email`, `phone` (varchar)
  * `role_id` (int: 1 = `STUDENT`, 2 = `PROFESSOR`, 3 = `ADMIN`, 4 = `STAFF`)
  * `is_active` (boolean: `TRUE` = ใช้งานได้, `FALSE` = ระงับสิทธิ์)

### 4.3 ตัวอย่าง Query สำหรับ API Login & Verify User
```sql
SELECT user_id, username, password, first_name_th, last_name_th, email, role_id, is_active
FROM public.users
WHERE username = $1 AND is_active = TRUE;
```

### 4.4 ข้อมูลเพิ่มเติมที่เรียกดูได้ (Relational Tables & Views)
หากกลุ่ม 3 ต้องการทำ API สำหรับดึงข้อมูลโปรไฟล์นักศึกษา/อาจารย์ สามารถใช้ View ต่อไปนี้ได้ทันที:
* **`public.view_students`:** ข้อมูลนักศึกษาพร้อมชื่อ ภาควิชา (`CPE`, `EE`, `ME`), สาขาวิชา, และชั้นปี
* **`public.view_professors`:** ข้อมูลอาจารย์พร้อมภาควิชาและอีเมล
* **ตาราง Master:** `departments`, `majors`, `roles`

---

## 🖥️ 5. สเปกเครื่องเซิร์ฟเวอร์เสมือน (VM Server Specifications)
* **ชื่อเครื่อง (Hostname):** `Database-Server`
* **ระบบปฏิบัติการ:** Debian GNU/Linux 13 (Trixie)
* **Private IP (ระหว่างเครื่อง VM):** `192.168.100.102`
* **Database Service:** PostgreSQL 17 (Port: `5432`, Service: `active`)
* **SSH Remote Access (ผ่าน Wi-Fi สถาบัน):**
  * `ssh root@172.16.10.200 -p 2202`
  * **Password:** 🔒 **`[ความลับ - โปรดขอจากกลุ่ม 2 โดยแจ้ง Keyword: [G2-VM-SSH-ACCESS]]`**

---

## 🧪 6. ผลการทดสอบสถานะระบบ (Verification & Diagnostics)
* ✅ บริการ PostgreSQL 17 เปิดรับ Connection ทุก Interface (`listen_addresses = '*'`)
* ✅ นโยบายยืนยันตัวตน `pg_hba.conf` อนุญาตการเชื่อมต่อจาก Subnet VM วงใน (`192.168.100.0/24`) เรียบร้อย
* ✅ มีข้อมูลผู้ใช้ตัวอย่างในระบบ:
  * นักศึกษาตัวอย่าง: `65010001`, `65010002`, `65010003`
  * อาจารย์ตัวอย่าง: `prof_wichan`
  * ผู้ดูแลระบบตัวอย่าง: `admin01`
* ✅ ทดสอบ Query ข้อมูลผ่าน View `radcheck` และตาราง `users` ผ่าน 100%

---

## 📞 7. การติดต่อและประสานงาน
หากกลุ่ม 1 หรือกลุ่ม 3 พบปัญหาในการเชื่อมต่อ หรือต้องการสอบถามรหัสผ่านความปลอดภัย สามารถติดต่อสมาชิกกลุ่ม 2 ได้ทาง:
* ติดต่อในคาบเรียนแล็บ หรือประสานงานผ่านกลุ่ม LINE ของวิชา โดยแจ้ง Keyword ที่ระบุไว้ในข้อ 2 ได้ทันทีครับ

# บันทึกประวัติการทำงานและสถานะระบบ (Project Work Log & Progress)
**โครงการ:** ระบบฐานข้อมูลกลางและเว็บแอปพลิเคชันบริหารจัดการผู้ใช้ (Central User Database & Admin Portal)  
**กลุ่มผู้รับผิดชอบ:** กลุ่มที่ 2 (Database-Server & CRUD Portal)  
**อัปเดตล่าสุด:** 9 ตุลาคม 2026 (18:30 น.)

---

## 📌 1. ภาพรวมบทบาทหน้าที่ของกลุ่ม 2 (System Context)
ในภาพรวมโครงการ (Project Flow 7 กลุ่มตามผังระบบ):
* **กลุ่ม 2 (เรา):** เป็นศูนย์กลางข้อมูลผู้ใช้ (Central User Database) และมีเว็บแอปพลิเคชันให้นักศึกษา/ผู้ดูแลระบบทำ CRUD (เพิ่ม, ลบ, แก้ไข, ดูข้อมูลผู้ใช้)
* **การเชื่อมต่อระหว่างกลุ่ม:**
  * **กลุ่ม 1 (RADIUS Server):** เชื่อมต่อเข้ามาคิวรี่ตาราง/View `radcheck` เพื่อยืนยันตัวตนการล็อกอิน Wi-Fi 802.1X
  * **กลุ่ม 3 (Authentication API Server):** เชื่อมต่อเข้ามาตรวจสอบข้อมูลผู้ใช้จากตาราง `users` เพื่อให้บริการ API สำหรับยืนยันตัวตนต่อไปยัง Web App (กลุ่ม 4) และ IoT Server (กลุ่ม 6)

---

## 🖥️ 2. ข้อมูลเครื่องเซิร์ฟเวอร์เสมือน (VM Server Specification)
* **ชื่อเครื่อง:** `Database-Server`
* **ระบบปฏิบัติการ:** Debian GNU/Linux 13 (Trixie / 6.12 kernel)
* **Private IP (เครือข่ายภายในระหว่าง VM):** `192.168.100.102`
* **พอร์ต Database:** `5432` (PostgreSQL 17)
* **Database Name:** `cedatabase`
* **Database User:** `ceadmin` (Password: `ceadmin2026`)
* **การเชื่อมต่อ SSH จากภายนอก:**
  * **IP เชื่อมต่อ:** `172.16.10.200`
  * **SSH Port:** `2202`
  * **SSH User:** `root`
  * **Default Password:** `admince04`
  * **เงื่อนไขสำคัญ:** ต้องเชื่อมต่อผ่าน **KMITL-WiFi** หรือ **CEDC-WiFi** ของสถาบันเท่านั้น (ห้ามใช้เน็ตบ้านหรือ Hotspot มือถือ)

---

## ✅ 3. สรุปสิ่งที่ดำเนินการเสร็จสิ้นแล้ว (Completed Tasks)

### 3.1 การเตรียมและติดตั้งระบบบน VM
1. **ติดตั้ง Software บน VM:**
   * ติดตั้ง **PostgreSQL 17** และส่วนขยาย `postgresql-contrib`
   * ติดตั้งเครื่องมืออำนวยความสะดวก: `sudo`, `curl`, `net-tools`, `ufw`
   * เปิดและตั้งค่าให้ Service `postgresql` เริ่มทำงานอัตโนมัติ (Enabled on boot)
2. **ตั้งค่าความปลอดภัยและเครือข่าย (Network Configuration):**
   * แก้ไข `postgresql.conf` ตั้งค่า `listen_addresses = '*'` เพื่อเปิดรับการเชื่อมต่อทุก Interface (พอร์ต 5432)
   * แก้ไข `pg_hba.conf` อนุญาตการยืนยันตัวตนด้วยรหัสผ่าน (SCRAM-SHA-256) จากวงใน (`192.168.100.0/24`), วง Wi-Fi (`172.16.0.0/16`), และเครือข่ายทั้งหมด
3. **สร้าง Database และ User:**
   * **Database Name:** `cedatabase`
   * **User / Role:** `ceadmin` (Superuser / Owner, Password: `ceadmin2026`)

### 3.2 โครงสร้างฐานข้อมูล (Database Schema)
* ไฟล์สคริปต์หลักย้ายมาอยู่ที่ [`database/init.sql`](database/init.sql)
* ตารางและวิวสร้างและ Import ลง VM เรียบร้อย:
  1. `departments`, `majors`, `roles`
  2. `users` (ตารางหลัก)
  3. `students`, `professors`
  4. View `radcheck` สำหรับ FreeRADIUS (กลุ่ม 1)
  5. View `view_students`, `view_professors`
  6. Demo Seed Users: `65010001`, `65010002`, `65010003`, `prof_wichan`, `admin01`

### 3.3 การตัดส่วนทดลอง (Supabase / Vercel) และเชื่อมต่อฐานข้อมูลจริง
1. **ลบโค้ดทดลอง Supabase:**
   * ถอนแพ็กเกจ `@supabase/supabase-js` ออกจาก `package.json`
   * ลบไฟล์ `src/lib/supabase.ts` และ `supabase/schema.sql` (Schema ทดลองเดิม)
   * ลบแท็บคู่มือ Vercel เดิม (`SetupGuideTab.tsx`)
2. **ติดตั้งไลบรารีเชื่อมต่อตรง PostgreSQL:**
   * ติดตั้งไลบรารี `pg` (node-postgres) และ `@types/pg`
   * สร้าง Connection Pool จัดการการเชื่อมต่อที่ [`src/lib/db.ts`](src/lib/db.ts)
3. **สร้าง API Routes ใน Next.js:**
   * [`/api/users`](src/app/api/users/route.ts): รองรับ CRUD (GET, POST, PUT, DELETE) กับ PostgreSQL บน VM โดยตรง
   * [`/api/health`](src/app/api/health/route.ts): ตรวจสอบ Latency, สถานะการเชื่อมต่อ และจำนวนแถวของตารางทั้งหมด
4. **ปรับปรุง UI Portal:**
   * หน้าหลักแสดงสถานะ **PostgreSQL (VM)**
   * ปรับปรุงหน้าต่างตรวจสอบสถานะฐานข้อมูล ([`DbHealthModal.tsx`](src/components/DbHealthModal.tsx)) ให้อ่านค่าจาก `/api/health`
   * สร้างแท็บ **Project Flow & VM Guide** ([`ProjectOverviewTab.tsx`](src/components/ProjectOverviewTab.tsx)) พร้อมแผนผัง 7 กลุ่มจากไฟล์ทางการ
5. **สคริปต์ SSH Tunnel สำหรับ Local Development:**
   * สร้างสคริปต์ [`scripts/start_tunnel.py`](scripts/start_tunnel.py) เพื่อ Forward พอร์ต 5432 จาก VM สู่เครื่อง Local อัตโนมัติ

---

## 📡 4. ข้อมูลการส่งมอบสำหรับกลุ่มอื่น (Handover Information)

| Parameter | Value | คำอธิบาย |
| :--- | :--- | :--- |
| **DBMS** | `PostgreSQL 17` | |
| **Host IP** | `192.168.100.102` | IP สำหรับการเชื่อมต่อระหว่าง VM ในวงใน |
| **Port** | `5432` | พอร์ตมาตรฐาน PostgreSQL |
| **Database** | `cedatabase` | |
| **User** | `ceadmin` | |
| **Password** | `ceadmin2026` | |

### ตัวอย่างคำสั่งที่กลุ่มอื่นนำไปใช้:
* **สำหรับกลุ่ม 1 (RADIUS Server):**
  ```sql
  SELECT id, username, attribute, value, op 
  FROM radcheck 
  WHERE username = '%{SQL-User-Name}';
  ```
* **สำหรับกลุ่ม 3 (Authentication API):**
  ```sql
  SELECT user_id, username, password, is_active, role_id 
  FROM users 
  WHERE username = $1 AND is_active = TRUE;
  ```

---

## 🌿 5. กฎและกระบวนการทำงาน Git (Git Workflow & Repository Rules)
* **คลังโค้ดกลางของโครงการ (Central Repo):** [`Kanaphat4539/Door-Authentication-System`](https://github.com/Kanaphat4539/Door-Authentication-System.git)
* **Branch หลักของกลุ่ม 2:** **`database-server`**
* **⚠️ กฎเหล็กสำคัญ:**
  1. **ห้าม Push ขึ้น `main` หรือ `dev` โดยตรงเด็ดขาด**
  2. โค้ดทั้งหมดของกลุ่ม 2 จะรวมอยู่ที่ branch **`database-server`**
  3. **เมื่อต้องการพัฒนาฟีเจอร์ใหม่:** ให้แตก Branch ออกมาจาก `database-server` เสมอ:
     ```bash
     git checkout database-server
     git pull origin database-server
     git checkout -b feature/<feature-name>
     ```
  4. **เมื่อฟีเจอร์เสร็จและทดสอบผ่านแล้ว:** ค่อยรวม (Merge) กลับเข้าสู่ `database-server` และ Push:
     ```bash
     git checkout database-server
     git merge feature/<feature-name>
     git push origin database-server
     ```

---

## 📋 6. แผนงานถัดไป (Next Steps)
1. ประสานงานส่งข้อมูลการเชื่อมต่อให้กลุ่ม 1 (FreeRADIUS) และกลุ่ม 3 (API Server)
2. เมื่อมีการเพิ่มฟีเจอร์ใหม่ ให้ปฏิบัติตามกฎการแตก branch จาก `database-server`

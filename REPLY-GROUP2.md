# ข้อมูลการเชื่อมต่อและข้อกำหนดสำหรับกลุ่ม 2 (Database-Ser)
> **ผู้จัดทำ:** กลุ่มที่ 3 — API-Ser (Authentication Server)  
> **อ้างอิงจาก:** โค้ดและสเปกของ `auth-api` บน Proxmox VM (`192.168.100.103:8000`)  
> **วัตถุประสงค์:** ใช้สำหรับส่งต่อรายละเอียดโครงสร้างฐานข้อมูล (Schemas), การตั้งค่าสิทธิ์เครือข่าย และสิ่งที่ต้องขอจากทีม Database (กลุ่ม 2) พร้อมขั้นตอนการทดสอบ

---

## 📋 1. ข้อความสำหรับคัดลอกไปประสานงานกลุ่ม 2 (Ready to Copy for Group 2)

> คัดลอกข้อความในบล็อกด้านล่างนี้เพื่อส่งในแชตกลุ่ม / Discord / LINE ประสานงานกับกลุ่ม 2 ได้ทันที:

```text
สวัสดีครับกลุ่ม 2 (Database-Ser) จากกลุ่ม 3 (API-Ser) นะครับ
เพื่อความพร้อมในการเชื่อมโยงระบบยืนยันตัวตน เปิด-ปิดประตู และดึงสิทธิ์ (Roles/Permissions) 
ทางระบบมีสิ่งที่ต้องขอข้อมูลและประสานงานกับกลุ่ม 2 ดังนี้ครับ:

════════════════════════════════════════════════════════════
1. ข้อมูลการเชื่อมต่อฐานข้อมูล (Database Connection Details)
════════════════════════════════════════════════════════════
• Database Engine: ใช้ตัวใด (MySQL / MariaDB หรือ PostgreSQL)?
• Database Host (Private IP): 192.168.100.102
• Port: 3306 (MySQL) หรือ 5432 (PostgreSQL)?
• Database Name: ชื่อฐานข้อมูลอะไร (เช่น door_db)?
• Credentials สำหรับเชื่อมต่อ:
  - Username / Password สำหรับ Read/Write ของ API & Web-App
  - Username / Password สำหรับ FreeRADIUS (กรณีกลุ่ม 1 ต่อ SQL rlm_sql)

════════════════════════════════════════════════════════════
2. การเปิดสิทธิ์ Firewall และ Network Whitelist
════════════════════════════════════════════════════════════
รบกวนเปิด bind-address = 0.0.0.0 บน Database Server และอนุญาตให้เครื่องต่อไปนี้เชื่อมต่อได้:
• 192.168.100.101 (กลุ่ม 1: Radius-Ser สำหรับดึงรหัสผ่าน)
• 192.168.100.103 (กลุ่ม 3: API-Ser ของเรา)
• 192.168.100.104 (กลุ่ม 4: Web-App สำหรับดึง Role/Dashboard)
• 192.168.100.106 (กลุ่ม 5: IOT-Ser สำหรับตรวจสิทธิ์หน้าประตูและบันทึก Log)
(หรืออนุญาตทั้งวง subnet: 192.168.100.% / 192.168.100.0/24)

════════════════════════════════════════════════════════════
3. โครงสร้างตาราง (Database Schema / DDL) ที่ต้องขอ
════════════════════════════════════════════════════════════
1) ตารางสำหรับ RADIUS (กรณี FreeRADIUS เชื่อม Database):
   - ตารางมาตรฐาน FreeRADIUS เช่น radcheck (username, value, op, attribute)
2) ตารางข้อมูลผู้ใช้และสิทธิ์ (User & Role Management):
   - ตาราง users (id, username, email, first_name, last_name, status)
   - ตาราง roles (id, role_name: student, teacher, admin, etc.)
   - ตาราง user_roles (user_id, role_id)
3) ตารางสิทธิ์เข้าห้อง/เปิดประตู (Door Permissions สำหรับกลุ่ม 5 IoT):
   - ตาราง doors / rooms (door_id, room_name, status)
   - ตาราง door_permissions (user_id / role_id, door_id, allowed_time)
4) ตารางบันทึกประวัติ (Access / Audit Logs):
   - ตาราง access_logs (timestamp, username, door_id, result: SUCCESS/FAILED)

════════════════════════════════════════════════════════════
4. ข้อมูลตัวอย่างสำหรับทดสอบ (Seed / Mock Data)
════════════════════════════════════════════════════════════
• ขอผู้ใช้ตัวอย่างครบทุก Role (เช่น 1 Student, 1 Teacher, 1 Admin)
  ที่ username และ password ตรงกับที่ให้ไว้กับกลุ่ม 1 (Radius)
• ขอข้อมูลประตูตัวอย่าง 1-2 ห้อง (เช่น LAB_401, LAB_402)
• ขอไฟล์ schema.sql หรือ seed.sql เริ่มต้น เพื่อให้แต่ละกลุ่มใช้เป็นมาตรฐานเดียวกันครับ
```

---

## 🗄️ 2. สิ่งที่ต้องขอจากกลุ่ม 2 (Database-Ser) ทั้งหมด

### 2.1 ตาราง Checklist สิ่งที่ต้องได้จากกลุ่ม 2

| ลำดับ | รายการ | รายละเอียดที่ต้องการ | ผู้ใช้งาน |
|:---:|---|---|:---:|
| 1 | **DBMS Engine & Version** | ระบุว่าเป็น MySQL 8.x, MariaDB 10.x หรือ PostgreSQL 15+ | ทุกกลุ่ม |
| 2 | **Host & Port** | ยืนยัน Host `192.168.100.102` และ Port (3306 หรือ 5432) | ทุกกลุ่ม |
| 3 | **Database Name** | ชื่อ Database กลางของระบบ เช่น `door_db` | ทุกกลุ่ม |
| 4 | **Database Accounts** | บัญชีผู้ใช้ที่แยกสิทธิ์ตามความเหมาะสม (เช่น `door_app`, `radius_user`) | กลุ่ม 1, 3, 4, 5 |
| 5 | **Network Whitelist** | การตั้งค่า `bind-address = 0.0.0.0` และ Grant สิทธิ์ให้วง `192.168.100.0/24` | ทุกกลุ่ม |
| 6 | **FreeRADIUS Tables** | ตาราง `radcheck` สำหรับตรวจสอบรหัสผ่าน PAP | กลุ่ม 1 (Radius) |
| 7 | **User & Role Tables** | ตาราง `users`, `roles`, `user_roles` สำหรับจัดการสิทธิ์ | กลุ่ม 3, 4 |
| 8 | **Door & Permission Tables** | ตาราง `doors`, `door_permissions` สำหรับควบคุมสิทธิ์เปิดประตู | กลุ่ม 4, 5 |
| 9 | **Access Logs Table** | ตาราง `access_logs` สำหรับบันทึกประวัติการผ่านประตู | กลุ่ม 4, 5 |
| 10 | **Seed / Test Data** | บัญชีทดสอบที่มีบทบาทครบถ้วน (Student, Teacher, Admin) และข้อมูลห้องทดสอบ | ทุกกลุ่ม |

---

## 📐 3. โครงสร้างตารางและสคริปต์ตัวอย่าง (Proposed Database Schema DDL)

หากทางกลุ่ม 2 ยังไม่ได้ออกแบบตาราง สามารถใช้สคริปต์ SQL ต่อไปนี้เป็นฐานข้อมูลตั้งต้นได้ทันที:

```sql
-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS door_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE door_db;

-- ==============================================================
-- 1. ตารางสำหรับ FreeRADIUS rlm_sql (กลุ่ม 1)
-- ==============================================================
CREATE TABLE IF NOT EXISTS radcheck (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT 'Cleartext-Password',
    op CHAR(2) NOT NULL DEFAULT ':=',
    value VARCHAR(253) NOT NULL DEFAULT '',
    INDEX idx_radcheck_username (username)
);

-- ==============================================================
-- 2. ตารางผู้ใช้งานและบทบาท (กลุ่ม 3 & 4)
-- ==============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128) UNIQUE,
    first_name VARCHAR(64),
    last_name VARCHAR(64),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(32) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ==============================================================
-- 3. ตารางห้องและสิทธิ์การเข้า-ออกประตู (กลุ่ม 4 & 5)
-- ==============================================================
CREATE TABLE IF NOT EXISTS doors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    door_code VARCHAR(32) UNIQUE NOT NULL, -- เช่น 'LAB_401'
    room_name VARCHAR(128) NOT NULL,
    iot_device_ip VARCHAR(45),
    current_status ENUM('locked', 'unlocked', 'offline') DEFAULT 'locked',
    last_heartbeat TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS door_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    role_id INT NULL,
    door_id INT NOT NULL,
    allowed_start_time TIME DEFAULT '08:00:00',
    allowed_end_time TIME DEFAULT '20:00:00',
    days_of_week VARCHAR(20) DEFAULT 'MON,TUE,WED,THU,FRI',
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE
);

-- ==============================================================
-- 4. ตารางบันทึกประวัติการผ่านประตู (Access Logs)
-- ==============================================================
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(64) NOT NULL,
    door_code VARCHAR(32) NOT NULL,
    auth_method ENUM('web_app', 'rfid_card', 'pin_code', 'manual_override') DEFAULT 'web_app',
    access_result ENUM('GRANTED', 'DENIED_CREDENTIAL', 'DENIED_TIME', 'DENIED_ROLE') NOT NULL,
    client_ip VARCHAR(45),
    INDEX idx_logs_timestamp (timestamp),
    INDEX idx_logs_username (username),
    INDEX idx_logs_door (door_code)
);

-- ==============================================================
-- 5. ข้อมูลจำลองสำหรับทดสอบ (Mock Seed Data)
-- ==============================================================
-- ใส่บทบาท
INSERT INTO roles (role_name, description) VALUES
('student', 'นักศึกษาทั่วไป'),
('teacher', 'อาจารย์ผู้ดูแลห้องปฏิบัติการ'),
('admin', 'ผู้ดูแลระบบ');

-- ใส่ผู้ใช้
INSERT INTO users (username, email, first_name, last_name, status) VALUES
('student', 'student@kmitl.ac.th', 'Somchai', 'Jaidee', 'active'),
('teacher01', 'teacher@kmitl.ac.th', 'Dr. Somsak', 'Wiset', 'active'),
('admin01', 'admin@kmitl.ac.th', 'System', 'Administrator', 'active');

-- ผูกสิทธิ์
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- student -> student
(2, 2), -- teacher01 -> teacher
(3, 3); -- admin01 -> admin

-- ใส่ข้อมูลใน radcheck ให้ RADIUS ยืนยันรหัสผ่านได้
INSERT INTO radcheck (username, attribute, op, value) VALUES
('student', 'Cleartext-Password', ':=', 'local-demo-password'),
('teacher01', 'Cleartext-Password', ':=', 'teacherpass2026'),
('admin01', 'Cleartext-Password', ':=', 'adminsecurepass');

-- ใส่ข้อมูลห้องตัวอย่าง
INSERT INTO doors (door_code, room_name, iot_device_ip, current_status) VALUES
('LAB_401', 'ห้องปฏิบัติการคอมพิวเตอร์ 401', '192.168.100.106', 'locked'),
('LAB_402', 'ห้องปฏิบัติการเครือข่าย 402', '192.168.100.107', 'locked');

-- ใส่สิทธิ์การเข้าห้อง
INSERT INTO door_permissions (role_id, door_id, allowed_start_time, allowed_end_time, days_of_week) VALUES
(1, 1, '08:00:00', '18:00:00', 'MON,TUE,WED,THU,FRI'), -- นักศึกษาเข้าห้อง 401 ได้ในเวลาเรียน
(2, 1, '06:00:00', '22:00:00', 'MON,TUE,WED,THU,FRI,SAT'), -- อาจารย์เข้าได้เกือบตลอดเวลา
(3, 1, '00:00:00', '23:59:59', 'MON,TUE,WED,THU,FRI,SAT,SUN'); -- Admin เข้าได้ 24/7
```

---

## 🧪 4. วิธีการทดสอบฐานข้อมูล (Database Verification Guide)

### 1. ทดสอบการเชื่อมต่อพอร์ตเครือข่าย
```bash
# จากเครื่อง 192.168.100.103 (API-Ser)
nc -z -v 192.168.100.102 3306
```

### 2. ทดสอบเข้าใช้งานผ่าน CLI
```bash
mysql -h 192.168.100.102 -P 3306 -u door_app -p door_db
```

### 3. ทดสอบ Query ดึง Role ตามที่กลุ่ม 4 ต้องใช้
```sql
SELECT u.username, r.role_name 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id 
WHERE u.username = 'student';
```
*ผลลัพธ์ที่ควรได้: `student` | `student`*

### 4. ทดสอบ Query ตรวจสิทธิ์เปิดประตูสำหรับกลุ่ม 5 (IoT)
```sql
SELECT d.door_code, p.allowed_start_time, p.allowed_end_time, p.days_of_week
FROM door_permissions p
JOIN doors d ON p.door_id = d.id
JOIN roles r ON p.role_id = r.id
JOIN user_roles ur ON r.id = ur.role_id
JOIN users u ON ur.user_id = u.id
WHERE u.username = 'student' AND d.door_code = 'LAB_401' AND p.is_active = TRUE;
```

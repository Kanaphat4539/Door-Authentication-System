# ข้อมูลการเชื่อมต่อและข้อความตอบกลับกลุ่ม 1 (Radius-Ser) พร้อมข้อกำหนดกลุ่ม 2 (Database-Ser)
> **ผู้จัดทำ:** กลุ่มที่ 3 — API-Ser (Authentication Server)  
> **อ้างอิงจาก:** โค้ดและสเปกของ `auth-api` บน Proxmox VM (`192.168.100.103:8000`)  
> **วัตถุประสงค์:** ใช้สำหรับส่งต่อข้อมูลการเชื่อมต่อและข้อตกลงทางเทคนิคให้กับทีม RADIUS (กลุ่ม 1), สรุปสิ่งที่ต้องขอจากทีม Database (กลุ่ม 2) และเป็นคู่มือขั้นตอนการทดสอบระบบร่วมกัน (Integration Testing)

---

## 📋 1. ข้อความสำหรับคัดลอกไปตอบกลับกลุ่ม 1 (Ready to Copy for Group 1)

> คัดลอกข้อความในบล็อกด้านล่างนี้เพื่อส่งในแชตกลุ่ม / Discord / LINE ประสานงานกับกลุ่ม 1 ได้ทันที:

```text
สวัสดีครับกลุ่ม 1 (Radius-Ser) สรุปข้อมูลการเชื่อมต่อและข้อกำหนดทางเทคนิคจากกลุ่ม 3 (API-Ser) ให้ตามนี้นะครับ:

════════════════════════════════════════════════════════════
1. ข้อมูลเครือข่ายของกลุ่ม 3 (API-Ser ที่จะยิงเข้าไปหา RADIUS)
════════════════════════════════════════════════════════════
• Private IP (วงใน Proxmox): 192.168.100.103
• Client Hostname: API-Ser
• Service: FastAPI Authentication Backend (auth-api)

════════════════════════════════════════════════════════════
2. โปรโตคอลและรูปแบบคำขอที่กลุ่ม 3 ส่งหา RADIUS (Group 1)
════════════════════════════════════════════════════════════
• Protocol: UDP
• พอร์ตเป้าหมาย: 1812 (UDP Authentication Port)
• Target IP: 192.168.100.101
• Packet Type: Access-Request
• โหมดการตรวจสอบรหัสผ่าน: PAP (Password Authentication Protocol) เท่านั้น
  (ยังไม่รองรับ CHAP, MS-CHAP, EAP หรือ Interactive Challenge/MFA)
• Attributes ที่ส่งไปใน Access-Request:
  1) User-Name: ชื่อบัญชีผู้ใช้
  2) User-Password: รหัสผ่านที่เข้ารหัสตามมาตรฐาน PAP ด้วย Shared Secret
  3) NAS-Identifier: "auth-api"
  4) Message-Authenticator: เพิ่มตามมาตรฐาน RFC 2869 / RFC 3579 เสมอ

════════════════════════════════════════════════════════════
3. สิ่งที่รบกวนกลุ่ม 1 ช่วยตั้งค่าและแจ้งกลับมา
════════════════════════════════════════════════════════════
1) ลงทะเบียนเครื่องกลุ่ม 3 ใน clients.conf ของ FreeRADIUS:
   client 192.168.100.103 {
       secret = <SHARED_SECRET>
       shortname = api-ser
       require_message_authenticator = yes
   }
   (หรือเปิดทั้งวง 192.168.100.0/24 หากต้องการความสะดวกในการเทสต์)

2) ค่า RADIUS Shared Secret:
   รบกวนส่ง Secret ที่ตรงกับใน clients.conf มาให้กลุ่ม 3 ใส่ใน .env ด้วยครับ

3) การตั้งค่า Response Packet (สำคัญมาก ⚠️):
   ตัว Adapter ของกลุ่ม 3 มีระบบป้องกันการปลอมแปลงแพ็กเก็ตตาม RFC 2869/3579 
   ดังนั้นใน Response Packet (ทั้ง Access-Accept และ Access-Reject) รบกวน FreeRADIUS 
   ต้องแนบ attribute "Message-Authenticator" กลับมาด้วยเสมอครับ
   (หากไม่มี Message-Authenticator ส่งกลับมา ทาง API จะตีเป็นแพ็กเก็ตไม่ปลอดภัยและตอบ 503)

4) บัญชีตัวอย่างสำหรับทดสอบ (Test Accounts):
   - บัญชีที่ผ่าน (สำหรับทดสอบ Access-Accept / 200 OK)
     เช่น username: student / password: ...
   - บัญชีที่ตั้งใจให้ตก (สำหรับทดสอบ Access-Reject / 401 Unauthorized)

เมื่อกลุ่ม 1 พร้อมแล้ว แจ้งได้เลยครับ ทางกลุ่ม 3 จะเริ่มยิงทดสอบ radtest และ API ทันที!
```

---

## 📋 2. ข้อความสำหรับคัดลอกไปประสานงานกลุ่ม 2 (Ready to Copy for Group 2)

> คัดลอกข้อความในบล็อกด้านล่างนี้เพื่อส่งประสานงานสิ่งที่ต้องขอจากทีม Database (กลุ่ม 2):

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

## 🏗️ 3. สถาปัตยกรรมระบบและการไหลของข้อมูล (System Architecture & Data Flow)

แผนภาพแสดงความสัมพันธ์ระหว่างเซิร์ฟเวอร์ทั้ง 5 กลุ่ม:

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         Gateway IP: 172.16.10.200                      │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ (Proxmox Private Network: 192.168.100.0/24)
                                     ▼
      ┌─────────────────────────────────────────────────────────────┐
      │                   [กลุ่ม 4: Web-App]                        │
      │                     192.168.100.104                         │
      │           (Next.js / Frontend UI พอร์ต 3000)                │
      └──────────────┬──────────────────────────────▲───────────────┘
                     │                              │
          1. POST /auth/login                       │ 4. Query Role
          (username, password)                      │    & User Profile
                     │                              │    (TCP 3306/5432)
                     ▼                              │
      ┌─────────────────────────────┐               │
      │    [กลุ่ม 3: API-Ser (เรา)]   │               │
      │       192.168.100.103       │               │
      │     (FastAPI พอร์ต 8000)     │               │
      └──────────────┬──────────────┘               │
                     │                              │
          2. Access-Request (UDP 1812)              │
          (PAP + Message-Authenticator)             │
                     │                              │
                     ▼                              │
      ┌─────────────────────────────┐               │
      │   [กลุ่ม 1: Radius-Ser]      │               │
      │       192.168.100.101       │               │
      │     (FreeRADIUS พอร์ต 1812)  │               │
      └──────────────┬──────────────┘               │
                     │                              │
          3. ตรวจสอบรหัสผ่านผ่าน SQL                 │
             (rlm_sql radcheck query)               │
                     │                              │
                     ▼                              ▼
      ┌─────────────────────────────────────────────────────────────┐
      │                 [กลุ่ม 2: Database-Ser]                      │
      │                     192.168.100.102                         │
      │         (MySQL :3306 หรือ PostgreSQL :5432)                 │
      │   - radcheck (FreeRADIUS ตรวจรหัสผ่าน)                       │
      │   - users, roles, user_roles (สิทธิ์ผู้ใช้งาน)               │
      │   - doors, door_permissions (สิทธิ์เปิดประตู)                │
      │   - access_logs (ประวัติการเข้า-ออก)                        │
      └─────────────────────────────▲───────────────────────────────┘
                                    │
                                    │ 5. ตรวจสอบสิทธิ์เปิดประตู & บันทึก Log
                                    │    (TCP 3306/5432)
                                    │
      ┌─────────────────────────────┴───────────────────────────────┐
      │                   [กลุ่ม 5: IOT-Ser]                        │
      │                     192.168.100.106                         │
      │               (ESP32 / กลอนประตูไฟฟ้า / RFID)               │
      └─────────────────────────────────────────────────────────────┘
```

### ลำดับขั้นตอนการทำงานแบบ End-to-End:
1. **User Login:** ผู้ใช้งานกรอก username และ password บนหน้าเว็บ (กลุ่ม 4) แล้วส่ง `POST /auth/login` มาที่ API ของกลุ่ม 3 (`192.168.100.103:8000`)
2. **RADIUS Authentication:** กลุ่ม 3 แปลงคำขอเป็นแพ็กเก็ต UDP `Access-Request` (PAP + Message-Authenticator) ส่งไปยัง FreeRADIUS (กลุ่ม 1: `192.168.100.101:1812`)
3. **Database Verification:** FreeRADIUS (กลุ่ม 1) นำ username ไปค้นหารหัสผ่านจาก Database กลาง (กลุ่ม 2: `192.168.100.102`)
4. **Access-Accept & JWT:** หากถูกต้อง FreeRADIUS ส่ง `Access-Accept` พร้อม `Message-Authenticator` กลับมา -> กลุ่ม 3 ตรวจสอบความถูกต้อง แล้วออก `access_token` (JWT อายุ 15 นาที) ส่งกลับให้กลุ่ม 4
5. **Role & Permission Check:** กลุ่ม 4 นำ username ไปสอบถาม Role จากฐานข้อมูลกลาง (กลุ่ม 2)
6. **Door Control & Logging:** เมื่อสั่งเปิดประตู หรือ IoT (กลุ่ม 5) ตรวจสอบสิทธิ์ จะบันทึกผลลงในตาราง `access_logs` บนฐานข้อมูลกลุ่ม 2

---

## 🔑 4. สิ่งที่ต้องขอจากกลุ่ม 1 (Radius-Ser) อย่างละเอียด

### 4.1 ตาราง Checklist สิ่งที่ต้องได้จากกลุ่ม 1

| ลำดับ | รายการ | รายละเอียดทางเทคนิค | นำไปใช้งานที่ |
|:---:|---|---|---|
| 1 | **RADIUS_HOST** | IP หรือ Hostname ของเซิร์ฟเวอร์ RADIUS (ค่ามาตรฐาน: `192.168.100.101`) | `.env` ของ `auth-api` |
| 2 | **RADIUS_PORT** | พอร์ต UDP สำหรับการทำ Authentication (ค่ามาตรฐาน: `1812`) | `.env` ของ `auth-api` |
| 3 | **RADIUS_SECRET** | Shared Secret (กุญแจลับร่วม) ที่ตั้งไว้ใน `clients.conf` | `.env` ของ `auth-api` |
| 4 | **Client Registration** | ยืนยันว่าได้เพิ่ม IP `192.168.100.103` เข้าไปใน `clients.conf` เรียบร้อยแล้ว | FreeRADIUS Server |
| 5 | **PAP Support** | ยืนยันว่าเปิดใช้งาน authentication module แบบ **PAP** | FreeRADIUS Server |
| 6 | **Message-Authenticator** | ยืนยันว่าตั้งค่าให้ FreeRADIUS ตอบกลับพร้อม attribute `Message-Authenticator` ในทุก Response | FreeRADIUS Server |
| 7 | **บัญชีทดสอบ (Test Accounts)** | ขออย่างน้อย 2 บัญชี:<br>• บัญชีที่ถูกต้อง (คาดหวัง `Access-Accept`)<br>• บัญชีที่ผิด/ไม่ถูกต้อง (คาดหวัง `Access-Reject`) | ใช้ทดสอบระบบ |

---

### 4.2 ตัวอย่างคอนฟิกที่กลุ่ม 1 ต้องตั้งค่าบน FreeRADIUS

#### 1) ไฟล์ `/etc/freeradius/3.0/clients.conf` (เพิ่มเครื่องกลุ่ม 3)
```text
client api-ser {
    ipaddr = 192.168.100.103
    secret = your_super_secure_radius_secret_here
    shortname = api-ser
    require_message_authenticator = yes
}

# (ทางเลือก) เพื่อความสะดวกในการทดสอบข้ามเครื่องใน subnet เดียวกัน
client local-subnet {
    ipaddr = 192.168.100.0/24
    secret = your_super_secure_radius_secret_here
}
```

#### 2) ไฟล์ `/etc/freeradius/3.0/sites-available/default` (ตั้งค่า Message-Authenticator)
ในบล็อก `post-auth` ต้องมั่นใจว่ามีการใส่ `Message-Authenticator` ในแพ็กเก็ตตอบกลับ:
```text
post-auth {
    # บังคับเพิ่ม Message-Authenticator ใน Access-Accept
    update reply {
        &Message-Authenticator = 0x00
    }
    ...
}

Post-Auth-Type REJECT {
    # บังคับเพิ่ม Message-Authenticator ใน Access-Reject
    update reply {
        &Message-Authenticator = 0x00
    }
    ...
}
```

> [!CAUTION]
> **เหตุใดต้องมี Message-Authenticator ใน Response?**  
> ในโค้ด `auth-api/app/services/radius.py` มีการตรวจสอบ:
> ```python
> if not reply.message_authenticator or not reply.verify_message_authenticator(
>     original_authenticator=request.authenticator
> ):
>     raise AuthenticationUnavailable("Invalid RADIUS Message-Authenticator")
> ```
> หาก FreeRADIUS ไม่ได้แนบ `Message-Authenticator` กลับมา API ของกลุ่ม 3 จะปฏิเสธแพ็กเก็ตทันทีและตอบ **HTTP 503** เพื่อความปลอดภัยตามมาตรฐาน RFC 3579

---

## 🗄️ 5. สิ่งที่ต้องขอจากกลุ่ม 2 (Database-Ser) ทั้งหมด

ฐานข้อมูลของกลุ่ม 2 เป็นหัวใจหลักของทั้งโครงการ โดยมีผู้เรียกใช้งาน 2 ส่วนหลัก:

### 5.1 ข้อมูลการเชื่อมต่อ (Database Connection Parameters)
| พารามิเตอร์ | ค่าที่แนะนำ / สิ่งที่ต้องขอ | หมายเหตุ |
|---|---|---|
| **DBMS Engine** | MySQL 8.x / MariaDB 10.x **หรือ** PostgreSQL 15+ | ต้องทราบ Engine เพื่อเลือกไดรเวอร์ (Client Driver) |
| **Host IP** | `192.168.100.102` | Private IP บนวง Proxmox |
| **Port** | `3306` (MySQL) หรือ `5432` (PostgreSQL) | ตรวจสอบว่าพอร์ตเปิดและ Bind ถูกต้อง |
| **Database Name** | `door_auth_db` หรือ `door_db` | ชื่อฐานข้อมูลกลาง |
| **Admin User / Pass** | ขอสิทธิ์สำหรับการสร้าง Table / Run Migration | สำหรับ Setup โครงสร้าง |
| **App User / Pass** | บัญชีสำหรับ Web-App และ API (สิทธิ์ SELECT/INSERT/UPDATE) | แยกบัญชีตาม Least Privilege |
| **RADIUS SQL User / Pass** | บัญชีสำหรับ FreeRADIUS `rlm_sql` (สิทธิ์ SELECT บน `radcheck`) | ให้กลุ่ม 1 ใช้ |

---

### 5.2 การตั้งค่า Network และสิทธิ์การเข้าถึง (Access Control & Whitelisting)
กลุ่ม 2 ต้องอนุญาตให้ Service ภายนอกเชื่อมต่อเข้ามาได้ ดังนี้:

1. **การ Bind IP ในคอนฟิก:**
   - **MySQL/MariaDB (`/etc/mysql/my.cnf` หรือ `mariadb.conf.d/50-server.cnf`):**
     ```ini
     bind-address = 0.0.0.0
     ```
   - **PostgreSQL (`/etc/postgresql/xx/main/postgresql.conf` & `pg_hba.conf`):**
     ```text
     # postgresql.conf
     listen_addresses = '*'

     # pg_hba.conf
     host all all 192.168.100.0/24 md5 (หรือ scram-sha-256)
     ```
2. **การให้สิทธิ์ผู้ใช้ (User Privileges):**
   ```sql
   -- ตัวอย่าง MySQL สำหรับกลุ่มต่างๆ ในวงแลน
   CREATE USER 'door_app'@'192.168.100.%' IDENTIFIED BY 'StrongPassword123!';
   GRANT SELECT, INSERT, UPDATE, DELETE ON door_db.* TO 'door_app'@'192.168.100.%';

   CREATE USER 'radius_user'@'192.168.100.101' IDENTIFIED BY 'RadiusDbPass123!';
   GRANT SELECT ON door_db.radcheck TO 'radius_user'@'192.168.100.101';

   FLUSH PRIVILEGES;
   ```

---

### 5.3 โครงสร้างตาราง (Database Schemas) ที่ระบบทั้งหมดต้องใช้งาน

กลุ่ม 2 จำเป็นต้องมีชุดตารางต่อไปนี้ในฐานข้อมูล:

#### ส่วนที่ 1: ตารางสำหรับ FreeRADIUS (`rlm_sql` - สำหรับกลุ่ม 1)
หากกลุ่ม 1 ใช้ FreeRADIUS ดึงรหัสผ่านจาก MySQL/PostgreSQL ต้องมีตารางมาตรฐานนี้:
```sql
-- ตารางเก็บรหัสผ่านผู้ใช้สำหรับ FreeRADIUS
CREATE TABLE radcheck (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT 'Cleartext-Password',
    op CHAR(2) NOT NULL DEFAULT ':=',
    value VARCHAR(253) NOT NULL DEFAULT '',
    INDEX idx_radcheck_username (username)
);

-- ข้อมูลตัวอย่างสำหรับทดสอบ RADIUS Authentication
INSERT INTO radcheck (username, attribute, op, value) 
VALUES 
('student', 'Cleartext-Password', ':=', 'local-demo-password'),
('teacher01', 'Cleartext-Password', ':=', 'teacherpass2026'),
('admin01', 'Cleartext-Password', ':=', 'adminsecurepass');
```

---

#### ส่วนที่ 2: ตารางจัดการผู้ใช้และบทบาท (Users & Roles - สำหรับกลุ่ม 3 & 4)
ใช้สำหรับจัดเก็บข้อมูลผู้ใช้และสิทธิ์การใช้งานระบบเว็บ:
```sql
-- 1. ตารางผู้ใช้งาน
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128) UNIQUE,
    first_name VARCHAR(64),
    last_name VARCHAR(64),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางบทบาท/สิทธิ์
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(32) UNIQUE NOT NULL, -- 'student', 'teacher', 'admin', 'ta'
    description VARCHAR(255)
);

-- 3. ตารางเชื่อมโยง ผู้ใช้ <-> บทบาท
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ข้อมูลเริ่มต้นสำหรับ Role
INSERT INTO roles (role_name, description) VALUES
('student', 'นักศึกษาทั่วไป สามารถดูสิทธิ์และประวัติของตนเองได้'),
('teacher', 'อาจารย์ผู้ดูแลห้อง สามารถสั่งปลดล็อกและให้สิทธิ์นักศึกษาได้'),
('admin', 'ผู้ดูแลระบบสูงสุด สามารถจัดการสิทธิ์และดูรายงานทั้งหมดได้');
```

---

#### ส่วนที่ 3: ตารางจัดการห้องและสิทธิ์การเปิดประตู (Doors & Permissions - สำหรับกลุ่ม 4 & 5)
```sql
-- 4. ตารางข้อมูลห้องและกลอนประตู (IoT Nodes)
CREATE TABLE doors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    door_code VARCHAR(32) UNIQUE NOT NULL, -- เช่น 'LAB_401', 'SERVER_ROOM'
    room_name VARCHAR(128) NOT NULL,
    iot_device_ip VARCHAR(45),             -- เช่น 192.168.100.106
    current_status ENUM('locked', 'unlocked', 'offline') DEFAULT 'locked',
    last_heartbeat TIMESTAMP NULL
);

-- 5. ตารางสิทธิ์การเปิดประตู (กำหนดรายบุคคล หรือตาม Role)
CREATE TABLE door_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    role_id INT NULL,
    door_id INT NOT NULL,
    allowed_start_time TIME DEFAULT '08:00:00',
    allowed_end_time TIME DEFAULT '20:00:00',
    days_of_week VARCHAR(20) DEFAULT 'MON,TUE,WED,THU,FRI', -- วันที่อนุญาต
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE
);
```

---

#### ส่วนที่ 4: ตารางบันทึกประวัติการผ่านประตู (Access Logs & Auditing)
```sql
-- 6. ตารางบันทึกประวัติการขอเข้าห้อง (Audit Log)
CREATE TABLE access_logs (
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
```

---

## 🧪 6. วิธีการทดสอบระบบอย่างละเอียด (Testing & Verification Guide)

การทดสอบแบ่งออกเป็น 5 ลำดับขั้น (Phase 1 ถึง Phase 5) เพื่อให้ระบุจุดเกิดข้อผิดพลาดได้อย่างแม่นยำ:

```text
[Phase 1: เครือข่าย] ──► [Phase 2: RADIUS] ──► [Phase 3: Database] ──► [Phase 4: API Integration] ──► [Phase 5: End-to-End]
```

---

### Phase 1: ทดสอบการเชื่อมต่อระดับเครือข่ายและพอร์ต (Network Connectivity)

ทดสอบจากเครื่อง `API-Ser` (`192.168.100.103`):

#### 1. ทดสอบ Ping ข้ามเครื่อง
```bash
ping -c 3 192.168.100.101   # เช็กเครื่องกลุ่ม 1 (Radius-Ser)
ping -c 3 192.168.100.102   # เช็กเครื่องกลุ่ม 2 (Database-Ser)
```

#### 2. ทดสอบพอร์ต UDP 1812 (RADIUS)
เนื่องจาก UDP เป็น Connectionless การใช้ `nc` หรือ `nmap` จะช่วยยืนยันว่าพอร์ตไม่ถูกบล็อก:
```bash
# ตรวจสอบว่าพอร์ต UDP 1812 เปิดรับคำขอ
nc -z -v -u 192.168.100.101 1812
```

#### 3. ทดสอบพอร์ต TCP 3306 หรือ 5432 (Database)
```bash
# ทดสอบ MySQL (3306)
nc -z -v 192.168.100.102 3306

# หรือทดสอบ PostgreSQL (5432)
nc -z -v 192.168.100.102 5432
```
*หากได้ผลลัพธ์ `Connection to 192.168.100.102 3306 port [tcp/mysql] succeeded!` แสดงว่าเปิดการเชื่อมต่อถูกต้อง*

---

### Phase 2: ทดสอบเซิร์ฟเวอร์ RADIUS โดยตรง (Direct RADIUS Test with radtest)

ทดสอบส่งแพ็กเก็ต RADIUS เข้าหาเซิร์ฟเวอร์กลุ่ม 1 โดยไม่ต้องผ่าน Web/API:

#### 1. ติดตั้ง `freeradius-utils` บนเครื่องทดสอบ (หากยังไม่มี)
```bash
apt update && apt install -y freeradius-utils
```

#### 2. ทดสอบกรณีผ่าน (Expected: Access-Accept)
```bash
# คำสั่ง: radtest <username> <password> <radius-server-ip> <port> <shared-secret>
radtest student local-demo-password 192.168.100.101 1812 your_radius_secret
```
**ผลลัพธ์ที่ถูกต้อง:**
```text
Sent Access-Request Id 1 from 0.0.0.0:xxxx to 192.168.100.101:1812 length ...
Received Access-Accept Id 1 from 192.168.100.101:1812, code=2, length=...
```

#### 3. ทดสอบกรณีรหัสผ่านผิด (Expected: Access-Reject)
```bash
radtest student wrong-password 192.168.100.101 1812 your_radius_secret
```
**ผลลัพธ์ที่ถูกต้อง:**
```text
Received Access-Reject Id 2 from 192.168.100.101:1812, code=3, length=...
```

#### 4. วิธีเปิดโหมด Debug บนฝั่งกลุ่ม 1 (สำหรับกลุ่ม 1 นั่งดูหน้าจอ)
ให้กลุ่ม 1 หยุด Service ชั่วคราวแล้วรันแบบ Debug ละเอียด:
```bash
systemctl stop freeradius
freeradius -X
```
*จะเห็น Log แบบ Real-time ว่าแพ็กเก็ตจาก `192.168.100.103` วิ่งเข้ามาหรือไม่ Shared secret ตรงกันไหม และ Message-Authenticator ถูกสร้างหรือไม่*

---

### Phase 3: ทดสอบการเชื่อมต่อฐานข้อมูลโดยตรง (Direct Database Test)

ทดสอบยิง Query จากเครื่องกลุ่ม 3 ไปยังกลุ่ม 2:

#### 1. ทดสอบ Login เข้า MySQL CLI ข้ามเครื่อง
```bash
mysql -h 192.168.100.102 -P 3306 -u door_app -p door_db
```
*(ป้อนรหัสผ่านที่กลุ่ม 2 กำหนด)*

#### 2. ทดสอบ Query ข้อมูล
```sql
-- 1. ตรวจสอบว่ามีผู้ใช้ในตาราง radcheck ตรงกับ RADIUS หรือไม่
SELECT username, attribute, value FROM radcheck WHERE username = 'student';

-- 2. ตรวจสอบ Role ของผู้ใช้
SELECT u.username, r.role_name 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id 
WHERE u.username = 'student';

-- 3. ทดสอบ INSERT เข้า access_logs
INSERT INTO access_logs (username, door_code, auth_method, access_result) 
VALUES ('student', 'LAB_401', 'web_app', 'GRANTED');

-- ดูว่าบันทึกสำเร็จหรือไม่
SELECT * FROM access_logs ORDER BY id DESC LIMIT 1;
```

---

### Phase 4: สคริปต์ Python ตรวจสอบ Message-Authenticator แบบเจาะจง

เนื่องจากโค้ด `auth-api` เข้มงวดเรื่อง `Message-Authenticator` มาก หากต้องการทดสอบเดี่ยวๆ เพื่อดูว่า FreeRADIUS ของกลุ่ม 1 ส่ง Message-Authenticator กลับมาจริงหรือไม่ สามารถใช้สคริปต์นี้รันได้ทันที:

```python
# บันทึกเป็น test_radius_ma.py บนเครื่อง API-Ser
import socket
from io import StringIO
from pyrad.dictionary import Dictionary
from pyrad.packet import AccessAccept, AccessReject, AccessRequest, AuthPacket

DICT_CONTENT = """
ATTRIBUTE User-Name 1 string
ATTRIBUTE User-Password 2 octets
ATTRIBUTE NAS-Identifier 32 string
ATTRIBUTE Message-Authenticator 80 octets
"""

RADIUS_HOST = "192.168.100.101"
RADIUS_PORT = 1812
RADIUS_SECRET = b"your_radius_secret_here"
TEST_USER = "student"
TEST_PASS = "local-demo-password"

req = AuthPacket(
    code=AccessRequest,
    secret=RADIUS_SECRET,
    dict=Dictionary(StringIO(DICT_CONTENT))
)
req["User-Name"] = TEST_USER
req["User-Password"] = req.PwCrypt(TEST_PASS)
req["NAS-Identifier"] = "auth-api-diagnostic"
req.add_message_authenticator()

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(5.0)

try:
    print(f"[*] Sending Access-Request to {RADIUS_HOST}:{RADIUS_PORT}...")
    sock.sendto(req.RequestPacket(), (RADIUS_HOST, RADIUS_PORT))
    data, _ = sock.recvfrom(4096)
    
    reply = req.CreateReply(packet=data)
    print(f"[+] Received Response Code: {reply.code} (2=Accept, 3=Reject)")
    
    # ตรวจสอบ Message-Authenticator
    if not reply.message_authenticator:
        print("[!] FAILED: Response does NOT contain Message-Authenticator attribute!")
        print("[!] FreeRADIUS must be configured with Message-Authenticator in post-auth.")
    elif not reply.verify_message_authenticator(original_authenticator=req.authenticator):
        print("[!] FAILED: Message-Authenticator signature is invalid!")
    else:
        print("[✓] SUCCESS: Message-Authenticator is valid and verified!")

except socket.timeout:
    print("[!] TIMEOUT: No response from RADIUS server. Check firewall / secret.")
finally:
    sock.close()
```

รันสคริปต์ด้วย:
```bash
python3 test_radius_ma.py
```

---

### Phase 5: ทดสอบผ่าน Auth API (Full Integration Test)

เมื่อตั้งค่าทุกอย่างพร้อม ให้สลับโหมดใน `auth-api` เป็น `radius`:

#### 1. อัปเดตไฟล์ `.env` ใน `auth-api/`
```dotenv
AUTH_MODE=radius
RADIUS_HOST=192.168.100.101
RADIUS_PORT=1812
RADIUS_SECRET=your_radius_secret_here
RADIUS_TIMEOUT=3
RADIUS_ATTEMPTS=2
RADIUS_NAS_IDENTIFIER=auth-api

JWT_SECRET=your_long_random_jwt_secret_at_least_32_bytes_long
JWT_ISSUER=auth-api
JWT_AUDIENCE=door-system
ACCESS_TOKEN_EXPIRE_MINUTES=15
```

#### 2. สั่งรัน API Server
```bash
cd auth-api
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 3. ทดสอบยิงคำขอจริง

##### Test Case 1: เข้าสู่ระบบสำเร็จ (HTTP 200 OK)
```bash
curl -X POST "http://192.168.100.103:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"local-demo-password"}'
```
**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

##### Test Case 2: รหัสผ่านผิด (HTTP 401 Unauthorized)
```bash
curl -X POST "http://192.168.100.103:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"wrong-password"}'
```
**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "detail": "Invalid username or password"
}
```

##### Test Case 3: นำ Token ไปตรวจสอบตัวตนที่ `/auth/me`
```bash
curl -X GET "http://192.168.100.103:8000/auth/me" \
  -H "Authorization: Bearer <ACCESS_TOKEN_FROM_STEP_1>"
```
**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "username": "student"
}
```

##### Test Case 4: กรณี RADIUS Server ล่มหรือไม่ตอบสนอง (HTTP 503)
หากปิด RADIUS หรือใส่ Secret ผิด:
```json
{
  "detail": "Authentication service is temporarily unavailable"
}
```

---

## ⚠️ 7. จุดที่ต้องระวังและปัญหาที่พบบ่อย (Troubleshooting & FAQs)

### 1. ได้รับ HTTP 503 Service Unavailable ตลอดเวลา
- **สาเหตุที่ 1:** Shared Secret ไม่ตรงกัน (FreeRADIUS จะ Drop ทิ้งทันที ไม่ตอบ Reject)
- **สาเหตุที่ 2:** กลุ่ม 1 ลืมลงทะเบียน IP `192.168.100.103` ใน `clients.conf`
- **สาเหตุที่ 3:** FreeRADIUS ไม่ได้ส่ง `Message-Authenticator` กลับมาใน Response Packet
  - *วิธีแก้:* ตรวจสอบตาม Phase 4 และให้กลุ่ม 1 เพิ่ม `update reply { &Message-Authenticator = 0x00 }` ใน `sites-available/default`
- **สาเหตุที่ 4:** ลืมกำหนดค่า `JWT_SECRET` ใน `.env` หรือยาวไม่ถึง 32 bytes

### 2. ตอบกลับ 401 ทั้งที่กรอกรหัสผ่านถูก
- **สาเหตุที่ 1:** ฝั่ง RADIUS ไม่ได้เปิดใช้งาน PAP หรือมีการแฮชรหัสผ่านใน Database ที่ไม่ตรงกับรูปแบบที่ FreeRADIUS อ่าน
- **สาเหตุที่ 2:** ช่องว่าง (Trailing space) ใน username หรือ password

### 3. Database Connection Refused (`Host is not allowed to connect`)
- **สาเหตุ:** MySQL ของกลุ่ม 2 ยังไม่ได้ Grant สิทธิ์ให้ User เข้าจาก IP `192.168.100.%` หรือยังติด `bind-address = 127.0.0.1`
- **วิธีแก้:** แก้ไข `bind-address = 0.0.0.0` ใน `my.cnf` แล้วรัน `GRANT ALL PRIVILEGES ON door_db.* TO 'user'@'%' IDENTIFIED BY 'pass'; FLUSH PRIVILEGES;`

---

## 📞 8. สรุปช่องทางและรายชื่อ IP ที่ใช้ติดต่อประสานงาน

| กลุ่ม | ชื่อเครื่อง | Private IP | พอร์ตที่เปิดบริการ | ผู้รับผิดชอบ/หน้าที่ |
|:---:|---|:---:|:---:|---|
| **1** | **Radius-Ser** | `192.168.100.101` | `1812/UDP` | ยืนยันตัวตนผู้ใช้ผ่านโพรโทคอล RADIUS |
| **2** | **Database-Ser** | `192.168.100.102` | `3306/TCP` หรือ `5432/TCP` | ศูนย์กลางฐานข้อมูลผู้ใช้, สิทธิ์ และประวัติการเปิดประตู |
| **3** | **API-Ser (เรา)** | `192.168.100.103` | `8000/TCP` | ตัวกลางออก Token (FastAPI) ให้เว็บและอุปกรณ์ต่างๆ |
| **4** | **Web-App** | `192.168.100.104` | `3000/TCP` | Frontend ระบบจัดการและสั่งปลดล็อกประตู |
| **5** | **IOT-Ser** | `192.168.100.106` | - | ควบคุมอุปกรณ์ฮาร์ดแวร์และกลอนประตูไฟฟ้า |

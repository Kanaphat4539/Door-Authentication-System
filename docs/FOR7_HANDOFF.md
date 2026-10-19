# 📦 เอกสารและแพ็กเกจส่งมอบงานให้ คนที่ 7 (DBA, DevOps & QA Tester)
**จาก:** คนที่ 4 — Backend Developer (Authentication & Security API)  
**โครงการ:** Group 4 Web Application (Access Log & Teacher Dashboard)  
**สถานะ:** ✅ พร้อมนำไป Build และ Deploy บนเครื่อง VM4 Proxmox ทันที 100%

---

## 💬 ข้อความสรุปแบบกระชับ (Copy ทั้งก้อนนี้ส่งในแชตให้คนที่ 7 ได้ทันที 🚀)

```text
สวัสดีคนที่ 7 เรามาจากส่วน Backend Auth & Security (คนที่ 4) นะ

ตอนนี้บริการ Auth API ฝั่งเราทำ Containerize และรวมไฟล์ทุกอย่างที่ต้องใช้ขึ้น VM4 Proxmox ใส่ไว้ในโฟลเดอร์ FOR7 เรียบร้อยแล้ว สรุปข้อมูลส่งมอบตามนี้เลยครับ:

📦 สิ่งที่ส่งมอบให้ในโฟลเดอร์ FOR7:
1. Dockerfile และ docker-compose.yml (พร้อมรัน docker compose up -d --build จบในคำสั่งเดียว)
2. โค้ด Backend App และโมดูล Audit Log (บันทึกลง MariaDB web_app_db ตามสเปกของนาย)
3. nginx.conf ตัวอย่าง Reverse Proxy พร้อม Rate Limiting (จำกัด 10 req/min) ป้องกันการสุ่มรหัสผ่าน
4. ชุดทดสอบ E2E Test Suite ใน tests/ (รันผ่าน 24/24 เคส 100%)

⚙️ สิ่งที่รบกวนคนที่ 7 ช่วยจัดการบนเครื่อง VM4 (192.168.100.104):
1. Nginx Reverse Proxy: แมปเส้นทาง /api/v1/auth/ และ /api/v1/audit/ ส่งต่อมาที่พอร์ต 8000 ของเรา (และอย่าลืมส่งต่อ Header Authorization ด้วยนะ)
2. เปิด Firewall ขาออก (Outbound): รบกวนเปิดให้ VM4 ยิง HTTP ข้ามไปหา IP ของกลุ่ม 3 ที่ 192.168.100.103:8000 ด้วยครับ (เพราะเราต้องยิงไปตรวจรหัสผ่านกับกลุ่ม 3)
3. ไฟล์ .env บน VM4: เราทำเทมเพลต .env.production เตรียมไว้ให้แล้ว มีค่ากุญแจลับ JWT และการต่อ MariaDB พอร์ต 3306 ครบถ้วน

❓ คำถามสอบถามเรื่องการ Deploy:
- คนที่ 7 จะเป็นคนดึงโฟลเดอร์ FOR7 ไปรันให้เลย หรือจะเปิดสิทธิ์ SSH ให้พวกเราเข้าไปช่วยรันในเครื่อง VM4 ครับ?

รายละเอียดการรันและคำสั่งเทสต์อยู่ในไฟล์ FOR7/for7.md แล้วครับ ขอบคุณมากครับ! 🙏
```

---

## 📁 รายการไฟล์ทั้งหมดในโฟลเดอร์ `FOR7/` (Package Inventory)

```text
FOR7/
├── 📄 for7.md               # สรุปคู่มือส่งมอบและคำแนะนำการ Deploy (ไฟล์นี้)
├── 🐳 Dockerfile             # Production Docker Image (Python 3.12-slim, Non-root user)
├── 🐳 docker-compose.yml     # Compose File สำหรับรัน Auth Service บนพอร์ต 8000 แบบคลิกเดียว
├── 🌐 nginx.conf             # การตั้งค่า Nginx Reverse Proxy พร้อม Rate Limiting ป้องกัน Brute-force
├── ⚙️ .env.production        # ค่า Configuration ที่เตรียมไว้สำหรับเครื่อง VM4 Production
├── ⚙️ requirements.txt       # รายการ Library dependencies ที่ใช้ใน Container
├── 📦 app/                   # โค้ด Application ทั้งหมด (FastAPI, JWT, Group 3 Client, Audit Log, Database)
│   ├── main.py
│   ├── security.py
│   ├── group3_client.py
│   ├── audit.py
│   ├── database.py
│   └── routers/
│       └── member6_logs.py
└── 🧪 tests/                 # ชุดทดสอบอัตโนมัติ (E2E Test Suite 24 เคส)
    ├── test_auth.py
    ├── test_audit_log.py
    ├── test_e2e_full_flow.py
    └── conftest.py
```

---

## ⚙️ ข้อมูลการตั้งค่าระบบบน VM4 Proxmox (`192.168.100.104`)

### 1. การตั้งค่า Nginx Reverse Proxy
นำการตั้งค่าจาก `FOR7/nginx.conf` ไปปรับใช้ โดยตรวจสอบให้แน่ใจว่า:
* ส่งต่อเส้นทาง `/api/v1/auth/` ➔ ไปยังคอนเทนเนอร์ Auth Service พอร์ต `8000`
* ส่งต่อเส้นทาง `/api/v1/audit/` ➔ ไปยังคอนเทนเนอร์ Auth Service พอร์ต `8000`
* **ต้องมีคำสั่งส่งต่อ Header:** `proxy_set_header Authorization $http_authorization;` เพื่อไม่ให้ Token หลุดหายระหว่างทาง

### 2. กฎ Firewall ขาออก (Outbound Rules) บน Proxmox
* เครื่อง VM4 (`192.168.100.104`) ต้องสามารถยิงคำขอ HTTP ข้ามไปยังเครื่องของ **กลุ่ม 3 (`192.168.100.103:8000`)** ได้ เพื่อให้ระบบสามารถส่ง Username/Password ไปยืนยันตัวตนกับ Central Auth Service

### 3. ตัวแปร Environment Variables (`.env`)
ก๊อปปี้ไฟล์ `.env.production` ไปเป็น `.env` บน VM4:
```env
# JWT Secret
JWT_SECRET=super_secret_kmitl_security_key_group4
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# Central Auth Service (Group 3 on Proxmox)
GROUP3_AUTH_URL=http://192.168.100.103:8000/auth/login
GROUP3_TIMEOUT_SECONDS=5.0
USE_MOCK_FALLBACK=true

# MariaDB (VM4 Local)
DB_HOST=192.168.100.104
DB_PORT=3306
DB_NAME=web_app_db
DB_USER=app_backend
DB_PASSWORD=Password1234!
DATABASE_URL=mysql+pymysql://app_backend:***@192.168.100.104:3306/web_app_db
```

---

## 🚀 คำสั่งสำหรับ Deploy บนเครื่อง VM4 (How to Run)

นำโฟลเดอร์ `FOR7` ไปวางบนเครื่อง VM4 แล้วรันคำสั่งเหล่านี้:

```bash
# 1. เข้าสู่โฟลเดอร์
cd FOR7

# 2. คัดลอกค่าคอนฟิกไปเป็น .env
cp .env.production .env

# 3. สั่ง Build และรัน Container ในโหมด Background
docker compose up -d --build

# 4. ตรวจสอบสถานะการทำงาน (Status ต้องเป็น Up และ Healthy)
docker compose ps
docker logs -f g4_auth_service
```

---

## 🧪 การทดสอบระบบบนเครื่องจริง (E2E Verification)

เมื่อรันเซิร์ฟเวอร์เรียบร้อย สามารถสั่งรันชุดทดสอบเพื่อยืนยันความพร้อมของระบบ:

```bash
pytest tests/ -v
```

* ผลการทดสอบต้องผ่านครบ **24/24 เคส (100% PASS)**
* ครอบคลุม:
  * ✅ การ Login และสร้าง JWT Token
  * ✅ การตรวจสอบสิทธิ์ RBAC (อาจารย์ผ่าน / นักศึกษาถูกบล็อก 403 Forbidden)
  * ✅ การป้องกัน Token ปลอม และ Token หมดอายุ
  * ✅ การยืนยันตัวตนผ่านกลุ่ม 3
  * ✅ การบันทึก Audit Log ลงตาราง `user` ใน MariaDB

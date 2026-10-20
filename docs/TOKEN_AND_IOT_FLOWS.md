# 🔄 โฟลว์การแลกเปลี่ยน Token และการซิงก์ข้อมูล IoT (Token Exchange & IoT Sync Pipeline)
**ระบบการจัดการและแสดงผลข้อมูลการเข้าใช้ห้องเรียน (Classroom Access Management) — กลุ่ม 4**  
**เซิร์ฟเวอร์:** VM4 Proxmox (`172.16.10.200:3001` / ภายในเครือข่าย: `192.168.100.104`)  
**ไฟล์ภาพประกอบ:** [`TOKEN_AND_IOT_FLOWS.png`](TOKEN_AND_IOT_FLOWS.png) | [`TOKEN_AND_IOT_FLOWS.svg`](TOKEN_AND_IOT_FLOWS.svg) | [`TOKEN_AND_IOT_FLOWS.html`](TOKEN_AND_IOT_FLOWS.html)

---

## 📌 ภาพรวมสถาปัตยกรรม (Architecture Overview)

ระบบของกลุ่ม 4 ทำหน้าที่เป็น **Web Application & Security Enforcement Layer** โดยมี 2 กลไกสำคัญในการทำงานร่วมกับกลุ่มอื่นๆ ได้แก่:

1. **Token Exchange & Lifecycle Flow:** การยืนยันตัวตนและการจัดการสิทธิ์การเข้าถึงระหว่าง **Client (Frontend)**, **Central Auth (กลุ่ม 3)**, และ **Backend API (กลุ่ม 4)**
2. **IoT Sync & Ingestion Pipeline:** การนำเข้าและประมวลผลข้อมูลการทาบบัตร RFID จาก **Classroom Readers**, **IoT Server (กลุ่ม 6)**, และจัดเก็บลง **MariaDB (กลุ่ม 4)** เพื่อนำเสนอสถิติบนแดชบอร์ด

```
========================================================================================
PART 1: TOKEN EXCHANGE & ACCESS LIFECYCLE
========================================================================================
[User / Browser] ────(1) Login Credentials────> [G4 Backend] ────(1b) Verify────> [G3 Central Auth]
       │                                              │                                 │
       │ <────(3) Save Token in localStorage <────────┤ <────(2) Auth OK / Role ────────┘
       │                                              │
       ├─────(4) GET /api/v1/logs + Bearer Token ─────┤
       │                                              ├───> (4a) Verify Signature (HS256)
       │                                              ├───> (4b) Enforce RBAC & Anti-IDOR
       │                                              └───> (5) Audit Log to DB
       v                                              │
[Live Dashboard] <────────── JSON Data ───────────────┘

========================================================================================
PART 2: IOT SYNC & INGESTION PIPELINE
========================================================================================
[RFID Reader] ────> [G6 IoT Server] ────> [G4 Ingestion Worker] ────> [Cleansing & Dedup] ────> [MariaDB (web_app)]
(Classroom HW)      (192.168.100.106)      (5s Polling / Retry)        (MD5 Hash Check)         (VM4 Dashboard)
========================================================================================
```

---

## 🔐 ส่วนที่ 1: โฟลว์การแลกเปลี่ยน Token (Token Exchange & Lifecycle Flow)

### ขั้นตอนการทำงานอย่างละเอียด (5 ขั้นตอน)

#### 1. ผู้ใช้ทำการเข้าสู่ระบบ (Login Request)
* ผู้ใช้ (อาจารย์ หรือ นักศึกษา) กรอกชื่อผู้ใช้และรหัสผ่านผ่านหน้าเว็บเบราว์เซอร์
* Frontend (Vue/Vite/Tailwind) ส่งคำขอ `POST /api/v1/auth/login` มายัง FastAPI Backend ของกลุ่ม 4
* Backend กลุ่ม 4 ไม่ได้เก็บฐานข้อมูลรหัสผ่านไว้เอง จึงทำหน้าที่เป็น Secure Proxy ส่งคำขอไปตรวจสอบกับ **Central Authentication Server ของกลุ่ม 3** (`http://192.168.100.103:8000/api/v1/auth/login`)

#### 2. ตรวจสอบและออก Token ของกลุ่ม 4 (Token Issuance)
* เมื่อเซิร์ฟเวอร์กลุ่ม 3 ตรวจสอบรหัสผ่านถูกต้อง และส่งสถานะยืนยันตัวตนพร้อมข้อมูลผู้ใช้กลับมา
* Backend กลุ่ม 4 จะสร้าง **Group 4 JWT Access Token** เฉพาะของระบบตนเอง โดยทำการลงลายมือชื่อดิจิทัล (Digital Signature) ด้วยอัลกอริทึม `HS256` และกุญแจลับเฉพาะ `JWT_SECRET`
* ภายใน Payload (Claims) ประกอบด้วย:
  ```json
  {
    "sub": "67200324",            // รหัสนักศึกษา หรือ Username ของอาจารย์
    "role": "student",           // สิทธิ์การใช้งาน: "teacher" หรือ "student"
    "iat": 1784620000,           // Issued At (เวลาที่ออกโทเค็น)
    "exp": 1784627200            // Expiration Time (อายุใช้งาน 120 นาที)
  }
  ```

#### 3. จัดเก็บและส่งแนบ Token ฝั่ง Client (Storage & Transmission)
* Frontend ได้รับ JWT Token จาก Backend และบันทึกไว้ใน `localStorage`
* ทุกครั้งที่ Frontend ส่ง HTTP Request ไปยัง Protected Endpoints (เช่น ดึงประวัติการเข้าเรียน, สถิติห้องเรียน) จะมี **Axios Request Interceptor** ดึง Token ออกมาแนบใน Header อัตโนมัติ:
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

#### 4. การตรวจสอบสิทธิ์ และป้องกัน IDOR (RBAC & Anti-IDOR Enforcement)
* Backend ถอดรหัสและตรวจสอบลายมือชื่อ (Signature Verification) ด้วยกุญแจลับ และเช็กว่ายังไม่หมดอายุ (`exp`)
* **Role-Based Access Control (RBAC):**
  * สิทธิ์ **`teacher`**: สามารถดูสถิติและประวัติการเข้าเรียนของนักศึกษาทุกคน ทุกห้องเรียน
  * สิทธิ์ **`student`**: ระบบจะบังคับกรองเฉพาะประวัติของตนเอง โดยดึงค่า `sub` จาก Payload ใน Token โดยตรง
* **ป้องกัน IDOR (Insecure Direct Object References):** แม้นักศึกษาจะพยายามดัดแปลง URL หรือ Query string เป็นรหัสของคนอื่น (เช่น `?student_id=67200999`) ระบบจะเพิกเฉยและบังคับใช้ค่าจาก Token ที่ปลอมแปลงไม่ได้เสมอ

#### 5. บันทึกประวัติการใช้งาน (Audit Trail Logging)
* บันทึกข้อมูลการเข้าถึงลงตาราง `user` ในฐานข้อมูล MariaDB แบบ Asynchronous Background Task (ไม่หน่วงเวลาการตอบกลับข้อมูลให้ผู้ใช้)
* บันทึกข้อมูล: `student_id`, `role`, `last_login`, `ip_address` เพื่อใช้ในการสืบสวนและตรวจสอบย้อนหลัง (Non-repudiation)

---

## 📡 ส่วนที่ 2: โฟลว์การซิงก์ข้อมูล IoT (IoT Ingestion & Real-Time Pipeline)

### ขั้นตอนการทำงานอย่างละเอียด (5 ขั้นตอน)

#### A. อุปกรณ์ฮาร์ดแวร์ทาบบัตร (Classroom RFID Readers)
* อุปกรณ์ NodeMCU / ESP32 พร้อมตัวอ่านบัตร RC522 ติดตั้งอยู่หน้าประตูห้องเรียน (เช่น EN4101, EN4102)
* เมื่อนักศึกษาหรืออาจารย์ทาบบัตร อุปกรณ์จะตรวจจับ UID ของบัตร พร้อมบันทึก Timestamp และรหัสห้องเรียน

#### B. เซิร์ฟเวอร์ IoT กลาง (Group 6 IoT Server)
* เครื่องอ่าน RFID ส่งข้อมูลผ่านโปรโตคอล MQTT / HTTP ไปยังเซิร์ฟเวอร์ของกลุ่ม 6 (`http://192.168.100.106:3000`)
* เซิร์ฟเวอร์กลุ่ม 6 ทำหน้าที่รวบรวมข้อมูล Log การทาบบัตรทั้งหมด และเปิด REST API Endpoint:
  ```http
  GET /api/logs/all
  ```

#### C. ตัวดึงข้อมูลเบื้องหลัง (G4 Ingestion Worker)
* Backend กลุ่ม 4 มีเซอร์วิส Background Worker ทำงานแบบ Asynchronous วนรอบดึงข้อมูล (Polling) ทุกๆ **5 วินาที**
* ติดตั้งระบบเชื่อมต่อที่ทนทาน (Fault Tolerance):
  * กำหนด HTTP Timeout 5 วินาที
  * มีระบบลองใหม่แบบถอยระยะเวลา (Exponential Backoff Retry) เมื่อเครือข่ายมีปัญหาชั่วคราว
  * ไม่ทำให้หน้าเว็บหลักค้างหรือหยุดทำงาน

#### D. การชำระล้างข้อมูลและตัดข้อมูลซ้ำ (Data Cleansing & Deduplication)
* **Timezone Normalization:** แปลง Timestamp จากฮาร์ดแวร์ให้อยู่ในโซนเวลาประเทศไทย (Bangkok GMT+7: `Asia/Bangkok`) อย่างถูกต้อง
* **Deduplication:** สร้าง Hash ลายนิ้วมือเฉพาะของแต่ละรายการด้วยอัลกอริทึม `MD5(student_id + room + timestamp)` เพื่อป้องกันการบันทึกข้อมูลซ้ำซ้อนกรณีเครื่องอ่านส่งข้อมูลซ้ำ

#### E. จัดเก็บลงฐานข้อมูลและอัปเดตหน้าจอ (MariaDB & Live Dashboard)
* ข้อมูลที่ผ่านการตรวจสอบแล้วจะถูกบันทึกลงตาราง `web_app` ในฐานข้อมูล `web_app_db` บนเซิร์ฟเวอร์ VM4
* Frontend หน้า Dashboard ของอาจารย์และนักศึกษาจะดึงข้อมูลที่อัปเดตล่าสุดมาแสดงผลเป็นกราฟและตารางสรุปแบบเรียลไทม์

---

## 📊 ข้อมูลสำหรับนำไปใส่ในสไลด์พรีเซนต์ (Slide Presentation Bullets)

สามารถคัดลอกข้อความด้านล่างนี้ไปใส่ในสไลด์ได้ทันที:

### สไลด์หน้า: "โฟลว์การแลกเปลี่ยน Token และการควบคุมสิทธิ์"
* **การยืนยันตัวตนแบบรวมศูนย์ (Centralized Auth):** ส่งคำขอล็อกอินผ่าน API กลุ่ม 3 ป้องกันการเก็บรหัสผ่านซ้ำซ้อนในระบบ
* **การออก Token เฉพาะระบบ (Group 4 JWT):** ใช้มาตรฐาน RFC 7519 เข้ารหัสด้วย `HS256` กำหนดอายุ Token 120 นาที
* **การส่งผ่านอย่างปลอดภัย (Bearer Token in Header):** แนบ Token ผ่าน `Authorization: Bearer <token>` ทุกคำขอ ไม่ใช้ URL Query string
* **การควบคุมสิทธิ์สองระดับ (Dual-Role RBAC):** แยกสิทธิ์ชัดเจนระหว่าง **อาจารย์** (ดูภาพรวมสถิติทั้งห้อง) และ **นักศึกษา** (ดูเฉพาะของตนเอง)
* **การป้องกันช่องโหว่ IDOR:** ดึงรหัสนักศึกษาจาก Claims ภายใน Token โดยตรง ป้องกันนักศึกษาแอบแก้ไขรหัสเพื่อดูข้อมูลของผู้อื่น
* **ระบบตรวจสอบย้อนหลัง (Audit Trail):** บันทึกประวัติการเรียกใช้งานลงตาราง `user` เพื่อรองรับการสอบทานความปลอดภัย

### สไลด์หน้า: "โฟลว์การรับส่งและซิงก์ข้อมูลจากระบบ IoT (กลุ่ม 6)"
* **การเชื่อมต่อระหว่างระบบ (Inter-system Ingestion):** ดึงข้อมูลการทาบบัตรผ่าน REST API ของกลุ่ม 6 (`192.168.100.106:3000`)
* **การทำงานแบบไม่รบกวนระบบหลัก (Background Worker):** ประมวลผลแบบ Asynchronous วนรอบตรวจสอบข้อมูลใหม่ทุก 5 วินาที
* **ระบบตัดข้อมูลซ้ำ (Data Deduplication):** ใช้ MD5 Fingerprint ป้องกันข้อมูลบันทึกซ้ำซ้อนเมื่อเกิด Network Retransmit
* **การปรับมาตรฐานข้อมูล (Data Cleansing):** แปลงเวลาเข้าสู่เขตเวลา Bangkok (GMT+7) และตรวจสอบความถูกต้องของรหัสห้องเรียน
* **การจัดเก็บข้อมูลแบบถาวร (Persistent Storage):** บันทึกสู่ฐานข้อมูล MariaDB ตาราง `web_app` เพื่อพร้อมนำไปคำนวณสถิติ
* **การแสดงผลแบบเรียลไทม์ (Live Dashboard):** อัปเดตข้อมูลบนหน้าจออาจารย์และนักศึกษาอย่างต่อเนื่องและแม่นยำ

---

## 🛡️ สรุปจุดเด่นด้านความปลอดภัย (Security Highlights)

1. **Principle of Least Privilege:** นักศึกษาไม่มีสิทธิ์เข้าถึงข้อมูลของนักศึกษาคนอื่นหรือสถิติรวมของระบบ
2. **Stateless Scalability:** เซิร์ฟเวอร์ไม่ต้องเก็บ Session State ใน RAM แต่ตรวจสอบความถูกต้องผ่านลายมือชื่อดิจิทัลของ JWT
3. **Defense in Depth:** ตรวจสอบความถูกต้องตั้งแต่ระดับ Network/CORS, Token Verification Middleware, ไปจนถึง Business Logic Layer
4. **Resilience & Fault Isolation:** กรณีระบบ IoT ของกลุ่ม 6 ขัดข้อง ระบบเว็บของกลุ่ม 4 จะใช้ข้อมูลแคชล่าสุดใน MariaDB โดยหน้าเว็บจะไม่ล่มหรือหยุดให้บริการ

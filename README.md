# Door-Authentication-System
แหล่งรวมการทำงานกลุ่ม CE04 — **กลุ่มที่ 3: API-Ser (Authentication Server)**

ระบบ Backend API สำหรับยืนยันตัวตน (Authentication Service) ผ่าน RADIUS Server และออก JWT Access Token สำหรับระบบเปิด-ปิดประตูห้องปฏิบัติการ เพื่อให้บริการแก่ Web-App (กลุ่ม 4) และระบบฮาร์ดแวร์ IoT (กลุ่ม 5)

---

## 📚 เอกสารประกอบโครงการ
- 📖 [คู่มือการเข้าใช้งานเซิร์ฟเวอร์เสมือน (HOWTO-VM.md)](HOWTO-VM.md) — ข้อมูล IP, SSH Port, และขั้นตอนการรีโมตเข้าเครื่อง Proxmox VM
- 📋 [ข้อมูลตอบกลับกลุ่ม 1 Radius-Ser (REPLY-GROUP1.md)](REPLY-GROUP1.md) — ข้อกำหนด RADIUS (PAP, Message-Authenticator), สิ่งที่ต้องขอจากกลุ่ม 2 และคู่มือการทดสอบ
- 📋 [ข้อมูลประสานงานกลุ่ม 2 Database-Ser (REPLY-GROUP2.md)](REPLY-GROUP2.md) — ข้อกำหนดฐานข้อมูล, โครงสร้างตาราง (DDL), และการทดสอบ Database
- 📋 [ข้อมูลตอบกลับกลุ่ม 4 Web-App (REPLY-GROUP4.md)](REPLY-GROUP4.md) — สเปก API, Request/Response, และข้อความประสานงานกับทีม Web-App
- 🛠️ [คู่มือเชิงลึกของ Auth API (auth-api/README.md)](auth-api/README.md) — โครงสร้างโค้ดและการทดสอบเชิงลึก

---

## 🚀 วิธีการรันโปรเจกต์ (How to Run)

การรันโปรเจกต์แบ่งออกเป็น **2 รูปแบบ** ตามวัตถุประสงค์การใช้งาน:

---

### รูปแบบที่ 1: รันบนเครื่องตัวเอง (Local Development บน Windows) 💻
*(เหมาะสำหรับพัฒนาโค้ดและทดสอบระบบบนเครื่องส่วนตัว)*

#### 1. เปิด PowerShell แล้วเข้าไปยังโฟลเดอร์ `auth-api`
```powershell
cd auth-api
```

#### 2. สร้างและเปิดใช้งาน Virtual Environment (venv)
```powershell
# สร้าง venv
python -m venv .venv

# เปิดใช้งาน (หากติดสิทธิ์ script ให้รันคลาส Bypass ก่อน)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

#### 3. ติดตั้ง Dependencies
```powershell
pip install -r requirements.txt
```

#### 4. สร้างและตั้งค่าไฟล์ `.env`
1. คัดลอกไฟล์ตัวอย่างคอนฟิก:
   ```powershell
   Copy-Item .env.example .env
   ```
2. สุ่มสร้าง signing key สำหรับ `JWT_SECRET` (ต้องมีความยาวอย่างน้อย 32 ตัวอักษร):
   ```powershell
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
3. เปิดไฟล์ `.env` (เช่น เปิดด้วย Notepad: `notepad .env` หรือใน VS Code) แล้วแก้ไขค่าสำหรับทดสอบในโหมด Mock:
   ```dotenv
   AUTH_MODE=mock
   JWT_SECRET=<นำคีย์ที่สุ่มได้จากข้อ 2 มาวางตรงนี้>
   JWT_ISSUER=auth-api
   JWT_AUDIENCE=door-system
   ACCESS_TOKEN_EXPIRE_MINUTES=15

   # ข้อมูลบัญชีจำลองสำหรับเทสต์
   MOCK_USERNAME=student
   MOCK_PASSWORD=local-demo-password
   ```

#### 5. สั่งรันเซิร์ฟเวอร์
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 6. ตรวจสอบและทดสอบการทำงาน
- **Swagger UI (ทดสอบผ่านหน้าเว็บ):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **ทดสอบยิง Login ด้วย PowerShell:**
  ```powershell
  $body = @{ username = 'student'; password = 'local-demo-password' } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/auth/login' -ContentType 'application/json' -Body $body
  ```

---

### รูปแบบที่ 2: รันบนเซิร์ฟเวอร์เสมือน (Proxmox VM: `API-Ser`) 🚀
*(ใช้เมื่อต้องการรันบน Server จริงเพื่อให้กลุ่ม 4 Web-App ยิงเข้ามาเชื่อมต่อได้)*

> [!CAUTION]
> **ข้อกำหนดสำคัญ:** เครื่องคอมพิวเตอร์ของคุณต้องเชื่อมต่อ Wi-Fi **`KMITL-WiFi` หรือ `CEDC-WiFi`** เท่านั้น จึงจะสามารถ SSH เข้า Gateway `172.16.10.200` ได้

#### 1. SSH เข้าสู่เซิร์ฟเวอร์ `API-Ser`
```bash
ssh root@172.16.10.200 -p 2203
# รหัสผ่านเริ่มต้น: admince04
```

#### 2. ติดตั้งเครื่องมือและดึงโค้ดล่าสุด (ทำครั้งแรก)
```bash
# อัปเดตและติดตั้ง dependencies พื้นฐาน
apt update && apt install -y git python3 python3-venv python3-pip

# Clone repository และเข้าไปที่ auth-api
git clone https://github.com/Kanaphat4539/Door-Authentication-System.git
cd Door-Authentication-System/auth-api

# สร้าง venv และติดตั้งแพ็กเกจ
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### 3. ตั้งค่า `.env` บน VM
```bash
cp .env.example .env
nano .env
```
- **กรณีทดสอบแบบ Mock (ยังไม่ต่อ RADIUS กลุ่ม 1):**
  ตั้งค่า `AUTH_MODE=mock`, กำหนด `JWT_SECRET`, `MOCK_USERNAME=student`, `MOCK_PASSWORD=local-demo-password`
- **กรณีเชื่อมต่อ RADIUS Server จริง (กลุ่ม 1):**
  ```dotenv
  AUTH_MODE=radius
  RADIUS_HOST=192.168.100.101
  RADIUS_PORT=1812
  RADIUS_SECRET=<secret_ที่ขอจากทีม_Radius>
  JWT_SECRET=<สุ่มคีย์ยาวเกิน_32_bytes>
  ```

#### 4. สั่งรัน API บน VM
> [!IMPORTANT]
> บน VM **ต้องผูก Host กับ `0.0.0.0` เสมอ** (ห้ามใช้ `127.0.0.1`) เพื่อให้เครื่องกลุ่ม 4 (`192.168.100.104`) ยิงเข้ามาได้

- **รันแบบปกติเพื่อดู Log:**
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
- **รันเป็นเบื้องหลัง (Background Process) ไม่ปิดเมื่อออกจาก SSH:**
  ```bash
  nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > api.log 2>&1 &
  ```

---

## 🔍 ข้อมูลและ Endpoint สำคัญ
- **Base URL (Local):** `http://127.0.0.1:8000`
- **Base URL (VM วงใน):** `http://192.168.100.103:8000`
- **POST `/auth/login`:** ตรวจสอบ username & password และออก JWT Access Token
- **GET `/auth/me`:** ตรวจสอบความถูกต้องของ Token และคืนค่า username
- **GET `/health`:** ตรวจสอบความพร้อมของ API Server
- **GET `/docs`:** OpenAPI / Swagger Documentation
- **GET `/openapi.json`:** Raw OpenAPI Specification (สำหรับ Import เข้า Postman)

---

## 📮 การทดสอบ API ด้วย Postman (Postman Guide)

สามารถใช้ **Postman** ยิงทดสอบ API ได้ 2 วิธีหลัก:

### 🌟 วิธีที่ 1: นำเข้าไฟล์ Collection ทันที (แนะนำที่สุด ไม่ต้องเปิดเซิร์ฟเวอร์ก่อน)
ในโปรเจกต์นี้มีไฟล์ Postman Collection สำเร็จรูปเตรียมไว้ให้แล้ว:
1. เปิดโปรแกรม Postman แล้วกดปุ่ม **Import** (มุมซ้ายบน)
2. เลือกแท็บ **Files** หรือลากไฟล์ [`Door-Auth-API.postman_collection.json`](Door-Auth-API.postman_collection.json) ไปวางใน Postman
3. จะได้ Collection **Door Authentication API** ที่มีครบทุก Request:
   - `1. Health Check`
   - `2. Login` (มีสคริปต์ดูด `access_token` ไปเก็บในตัวแปร `{{token}}` ให้อัตโนมัติ!)
   - `3. Get Current User` (ตั้งค่า Bearer Token เรียบร้อย พร้อมยิงได้ทันที)

---

### 💡 วิธีที่ 2: นำเข้าผ่าน URL (ต้องรัน API Server อยู่ก่อน)
> [!NOTE]
> หากขึ้นข้อผิดพลาด *`Error while fetching data from link`* แสดงว่า**ยังไม่ได้สั่งรัน Uvicorn บนเครื่อง** หรือใช้ Postman บน Web Browser ให้สั่งรัน API ก่อน หรือใช้วิธีที่ 1 นำเข้าไฟล์แทน

1. ตรวจสอบว่าได้รัน API อยู่ (`uvicorn app.main:app --reload`)
2. ใน Postman กดปุ่ม **Import**
3. วางลิงก์:
   ```text
   http://127.0.0.1:8000/openapi.json
   ```
   *(หรือเลือกไฟล์ [`openapi.json`](openapi.json) จากโฟลเดอร์โปรเจกต์ได้เช่นกัน)*


---

### 🛠️ วิธีที่ 2: ตั้งค่ายิงทดสอบทีละ Endpoint (Manual)

#### 1. ตรวจสอบความพร้อมของเซิร์ฟเวอร์ (`GET /health`)
- **Method:** `GET`
- **URL:** `http://127.0.0.1:8000/health`
- **ผลลัพธ์ที่ควรได้ (HTTP 200 OK):**
  ```json
  {
    "status": "ok"
  }
  ```

#### 2. เข้าสู่ระบบเพื่อรับ Token (`POST /auth/login`)
- **Method:** `POST`
- **URL:** `http://127.0.0.1:8000/auth/login`
- **Body:**
  1. เลือกแท็บ **Body** -> ติ๊กเลือก **raw**
  2. เปลี่ยนชนิดข้อมูลจาก `Text` เป็น **JSON**
  3. วาง Request Body สำหรับทดสอบ:
     ```json
     {
       "username": "student",
       "password": "local-demo-password"
     }
     ```
- กดปุ่ม **Send**
- **ผลลัพธ์ที่ได้ (HTTP 200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 900
  }
  ```
  > [!TIP]
  > คัดลอกค่า `access_token` ทั้งหมด เพื่อนำไปใส่ในขั้นตอนถัดไป

#### 3. ดึงข้อมูลผู้ใช้ด้วย Token (`GET /auth/me`)
- **Method:** `GET`
- **URL:** `http://127.0.0.1:8000/auth/me`
- **Authorization:**
  1. ไปที่แท็บ **Authorization**
  2. ในช่อง **Type** เลือกเป็น **Bearer Token**
  3. นำค่า `access_token` จากข้อ 2 มาวางลงในช่อง **Token**
- กดปุ่ม **Send**
- **ผลลัพธ์ที่ได้ (HTTP 200 OK):**
  ```json
  {
    "username": "student"
  }
  ```


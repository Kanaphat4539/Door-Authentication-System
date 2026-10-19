# ข้อมูลการเชื่อมต่อและข้อความตอบกลับกลุ่ม 4 (Web-App)
> **ผู้จัดทำ:** กลุ่มที่ 3 — API-Ser (Authentication Server)  
> **อ้างอิงจาก:** โค้ดและสเปกของ `auth-api` บน Proxmox VM (`192.168.100.103:8000`)  
> **วัตถุประสงค์:** ใช้สำหรับส่งต่อข้อมูลการเชื่อมต่อ API ให้กับทีม Web-App (กลุ่ม 4) และใช้เป็นเอกสารอ้างอิงการ Integrate ระบบ

---

## 📋 ข้อความสำหรับคัดลอกไปตอบกลับกลุ่ม 4 (Ready to Copy)

> คัดลอกข้อความในบล็อกด้านล่างนี้เพื่อส่งในแชตกลุ่ม / Discord / LINE ได้ทันที:

```text
สวัสดีครับกลุ่ม 4 สรุปข้อมูลการเชื่อมต่อจากกลุ่ม 3 (API-Ser) ให้ตามนี้นะครับ:

════════════════════════════════════════════════════════════
1. IP Address และ Port บน Proxmox
════════════════════════════════════════════════════════════
• Private IP (วงใน Proxmox สำหรับคุยข้าม VM): 192.168.100.103
• API Port: 8000 (FastAPI / Uvicorn)
• Base URL: http://192.168.100.103:8000
(หมายเหตุ: Web-App บน IP 192.168.100.104 สามารถยิงเข้าหา 192.168.100.103:8000 ได้โดยตรงผ่านเครือข่ายภายใน)

════════════════════════════════════════════════════════════
2. Endpoint URL สำหรับตรวจสอบรหัสผ่าน
════════════════════════════════════════════════════════════
• Path: POST /auth/login
• Full URL: http://192.168.100.103:8000/auth/login
• Header: Content-Type: application/json

════════════════════════════════════════════════════════════
3. รูปแบบ Request JSON
════════════════════════════════════════════════════════════
ถูกต้องแล้วครับ! ฝั่งเรารับ JSON รูปแบบนี้เลย:

{
  "username": "6501234567",
  "password": "your-password"
}

• ข้อจำกัด (Validation):
  - username: รหัสนักศึกษา / ผู้ใช้งาน ความยาว 1 – 253 ตัวอักษร (ห้ามเว้นว่าง, ไม่เกิน 253 UTF-8 bytes)
  - password: ความยาว 1 – 128 ตัวอักษร (ห้ามเว้นว่าง, ไม่มี NUL byte)

════════════════════════════════════════════════════════════
4. การตอบกลับ Token และโครงสร้าง JWT Payload (role & username)
════════════════════════════════════════════════════════════
✅ เมื่อเข้าสู่ระบบสำเร็จ (HTTP 200 OK):
จะได้รับ JWT Token กลับไป:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}

🔑 โครงสร้าง Decoded JWT Payload (กลุ่ม 4 สามารถแกะอ่านได้ทันที):
{
  "sub": "6501234567",
  "username": "6501234567",
  "role": "student",
  "iat": 1729330000,
  "exp": 1729333600,
  "iss": "auth-service",
  "aud": "door-system"
}

• รายละเอียดฟิลด์ใน JWT Payload:
  - username: รหัสนักศึกษาของผู้ใช้งาน (เช่น "6501234567")
  - role: สิทธิ์ของผู้ใช้งาน (เช่น "student", "teacher", "admin")
  - sub: รหัสนักศึกษา (Subject ตามมาตรฐาน JWT)
  - exp / iat: เวลาหมดอายุและเวลาออก Token (Unix timestamp)
  - iss / aud: Issuer ("auth-service") และ Audience ("door-system")

🔍 การตรวจ Token และดึงข้อมูลผู้ใช้ (GET /auth/me):
หากกลุ่ม 4 ต้องการตรวจสอบความถูกต้องของ Token หรือดึงข้อมูลผู้ใช้ สามารถยิงไปที่:
• Path: GET /auth/me
• Header: Authorization: Bearer <access_token>
• Response (HTTP 200 OK):
  {
    "username": "6501234567",
    "role": "student"
  }

════════════════════════════════════════════════════════════
5. สถานะ Error Codes ที่ควรรองรับ
════════════════════════════════════════════════════════════
• 200 OK: ยืนยันตัวตนสำเร็จ
• 401 Unauthorized: Username หรือ Password ไม่ถูกต้อง ({"detail": "Invalid username or password"})
• 422 Unprocessable Entity: ส่ง JSON ผิดฟิลด์ หรือค่าว่าง/เกินขนาดที่กำหนด
• 503 Service Unavailable: ติดต่อ RADIUS Server (กลุ่ม 1) ไม่ได้ หรือเซิร์ฟเวอร์ยังไม่พร้อม

════════════════════════════════════════════════════════════
6. เอกสารและหน้าทดสอบ (Swagger UI)
════════════════════════════════════════════════════════════
• Swagger UI Docs (Interactive API): http://192.168.100.103:8000/docs
• OpenAPI Specification JSON: http://192.168.100.103:8000/openapi.json
• Health check endpoint: GET http://192.168.100.103:8000/health
• Mock account สำหรับทดสอบช่วงนี้:
  - username: student
  - password: local-demo-password
```

---

## 📖 สเปกและคู่มือการเชื่อมต่อฉบับละเอียด (Full API Documentation)

### 1. ข้อมูลเครือข่ายระหว่าง VM (Network Topology)

| เซิร์ฟเวอร์ | บทบาท | Private IP (วงใน Proxmox) | พอร์ตที่เปิดบริการ |
|---|---|:---:|:---:|
| **กลุ่ม 1 (Radius-Ser)** | ตรวจสอบรหัสผ่านผ่านโพรโทคอล RADIUS | `192.168.100.101` | `1812/UDP` |
| **กลุ่ม 2 (Database-Ser)** | ฐานข้อมูลกลาง (สิทธิ์, roles, logs) | `192.168.100.102` | `5432/TCP` (หรือ `3306/TCP`) |
| **กลุ่ม 3 (API-Ser - เรา)** | ยืนยันตัวตน & ออก JWT Access Token | **`192.168.100.103`** | **`8000/TCP`** |
| **กลุ่ม 4 (Web-App)** | Frontend & Web Application | `192.168.100.104` | `3000` / `80` |
| **กลุ่ม 5 (IOT-Ser)** | ควบคุมระบบประตูและอุปกรณ์ฮาร์ดแวร์ | `192.168.100.106` | - |

```text
[กลุ่ม 4: Web-App] ──(HTTP POST /auth/login:8000)──► [กลุ่ม 3: API-Ser] ──(UDP 1812)──► [กลุ่ม 1: Radius-Ser]
 (192.168.100.104)                                    (192.168.100.103)                   (192.168.100.101)
         │                                                    │
         └─────────────(Query Role/User Profile:5432)─────────┼──► [กลุ่ม 2: Database-Ser]
                                                                   (192.168.100.102)
```

---

### 2. รายละเอียด API Endpoints

#### 2.1 เข้าสู่ระบบ (POST `/auth/login`)
ตรวจสอบ username และ password กับเซิร์ฟเวอร์ RADIUS และออก JWT Token เมื่อผ่าน

- **URL:** `http://192.168.100.103:8000/auth/login`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

##### Request Body
```json
{
  "username": "6501234567",
  "password": "your-password"
}
```

##### Validation Rules:
- `username`: String ความยาว 1 ถึง 253 ตัวอักษร (รหัสนักศึกษา / ผู้ใช้งาน) ห้ามเป็นค่าว่าง
- `password`: String ความยาว 1 ถึง 128 ตัวอักษร ห้ามมีอักขระ `\x00` (NUL)

##### Success Response (HTTP 200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```
*อายุ Token:* 3600 วินาที (1 ชั่วโมง)

##### Error Responses
- **401 Unauthorized:** บัญชีผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
  ```json
  {
    "detail": "Invalid username or password"
  }
  ```
- **422 Unprocessable Entity:** ข้อมูล JSON ไม่ถูกต้องหรือไม่ตรงตาม Schema
  ```json
  {
    "detail": [
      {
        "loc": ["body", "username"],
        "type": "string_too_short",
        "msg": "String should have at least 1 characters"
      }
    ]
  }
  ```
- **503 Service Unavailable:** ไม่สามารถติดต่อ RADIUS Server หรือ Database ได้
  ```json
  {
    "detail": "Authentication service is temporarily unavailable"
  }
  ```

---

#### 2.2 โครงสร้างข้อมูลภายใน JWT Access Token (JWT Payload Specification)
เมื่อทางกลุ่ม 4 ได้รับ `access_token` สามารถนำไป decode (เช่น ผ่าน library `jwt-decode`, `jose` หรือ `jsonwebtoken`) เพื่ออ่านข้อมูลผู้ใช้และ role ได้ทันทีโดยไม่ต้องส่ง request ซ้ำ:

##### JWT Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

##### Decoded JWT Payload
```json
{
  "sub": "6501234567",
  "username": "6501234567",
  "role": "student",
  "iat": 1729330000,
  "exp": 1729333600,
  "iss": "auth-service",
  "aud": "door-system"
}
```

##### คำอธิบายฟิลด์ใน JWT Payload:
| ฟิลด์ | ชนิดข้อมูล | คำอธิบาย | ตัวอย่าง |
|---|---|---|---|
| `sub` | string | Subject รหัสนักศึกษา/ผู้ใช้งานตามมาตรฐาน JWT | `"6501234567"` |
| `username` | string | รหัสนักศึกษาของผู้ใช้งาน | `"6501234567"` |
| `role` | string | สิทธิ์การใช้งานของผู้ใช้ (`student`, `teacher`, `admin`) | `"student"` |
| `iat` | integer | เวลาที่สร้าง Token (Unix Timestamp วินาที) | `1729330000` |
| `exp` | integer | เวลาที่ Token หมดอายุ (Unix Timestamp วินาที) | `1729333600` |
| `iss` | string | ผู้สร้าง Token (Issuer) | `"auth-service"` |
| `aud` | string | ผู้รับ Token (Audience) | `"door-system"` |

---

#### 2.3 ตรวจสอบตัวตนด้วย Token (GET `/auth/me`)
ใช้สำหรับตรวจสอบว่า JWT Token ยังถูกต้องและไม่หมดอายุ พร้อมดึง Username และ Role ของผู้ถือ Token

- **URL:** `http://192.168.100.103:8000/auth/me`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <access_token>`

##### Success Response (HTTP 200 OK)
```json
{
  "username": "6501234567",
  "role": "student"
}
```

##### Error Responses
- **401 Unauthorized:** Token ไม่ถูกต้อง หรือหมดอายุแล้ว
  ```json
  {
    "detail": "Invalid or expired access token"
  }
  ```

---

#### 2.4 ตรวจสอบสถานะการทำงานของเซิร์ฟเวอร์ (GET `/health`)
ใช้ตรวจสอบว่า Service ของกลุ่ม 3 เปิดใช้งานและรับ Request ได้ตามปกติ

- **URL:** `http://192.168.100.103:8000/health`
- **Method:** `GET`

##### Success Response (HTTP 200 OK)
```json
{
  "status": "ok"
}
```

---

### 3. ตัวอย่างโค้ดเรียกใช้งาน (Code Examples)

#### cURL
```bash
# 1. Login เพื่อรับ Token
curl -X POST "http://192.168.100.103:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"6501234567","password":"your-password"}'

# 2. นำ Token ไปเรียกดู Username และ Role
curl -X GET "http://192.168.100.103:8000/auth/me" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

#### JavaScript / TypeScript (Fetch API)
```typescript
// ฟังก์ชัน Login
async function login(username: string, password: string) {
  const response = await fetch("http://192.168.100.103:8000/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "เข้าสู่ระบบไม่สำเร็จ");
  }

  const data = await response.json();
  // data: { access_token: string, token_type: "bearer", expires_in: number }
  return data;
}

// ฟังก์ชันดึง Username และ Role จาก Token ผ่าน API
async function getCurrentUser(token: string) {
  const response = await fetch("http://192.168.100.103:8000/auth/me", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  return await response.json(); // { username: "6501234567", role: "student" }
}
```

---

## ⚙️ ข้อควรระวังสำหรับฝั่งเรา (กลุ่ม 3: API-Ser) ก่อนเริ่มทดสอบ

1. **Host Binding:**  
   บน VM `API-Ser` คำสั่งรัน Uvicorn **ต้องระบุ `--host 0.0.0.0` เสมอ** (ห้ามใช้ `127.0.0.1` มิฉะนั้นเครื่องอื่นในวงแลนจะไม่สามารถเรียกได้):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **CORS (Cross-Origin Resource Sharing):**  
   - หากกลุ่ม 4 ยิง API แบบ **Server-to-Server** (เช่น ผ่าน Next.js API Routes, Server Actions, Express): **จะไม่ติดปัญหา CORS**
   - หากกลุ่ม 4 ยิงตรงจาก **Browser ของ Client**: จำเป็นต้องเพิ่ม `CORSMiddleware` ใน `auth-api/app/main.py` เพื่ออนุญาต Origin ของ Web-App (`http://192.168.100.104:3000`)

3. **โหมดทดสอบชั่วคราว (Mock Mode):**  
   ในกรณีที่ RADIUS Server (กลุ่ม 1) ยังไม่เปิดให้บริการ สามารถเปิดใช้งานโหมด Mock ใน `.env` ได้ดังนี้:
   ```dotenv
   AUTH_MODE=mock
   MOCK_USERNAME=student
   MOCK_PASSWORD=local-demo-password
   ```

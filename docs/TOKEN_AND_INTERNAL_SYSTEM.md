# 🔐 คู่มือการส่ง Token และกลไกการทำงานภายในระบบเว็บแอปพลิเคชัน กลุ่ม 4
**โครงการ:** Classroom Access Management & Teacher Dashboard Security System  
**เซิร์ฟเวอร์:** VM4 Proxmox (`172.16.10.200:3001` / Internal: `192.168.100.104`)  
**ปรับปรุงล่าสุด:** 20 ตุลาคม 2026  

---

## 📑 สารบัญ (Table of Contents)
1. [ภาพรวมการรักษาความมั่นคงปลอดภัยด้วย Token (Token Security Overview)](#1-ภาพรวมการรักษาความมั่นคงปลอดภัยด้วย-token-token-security-overview)
2. [โครงสร้างของ JWT Token ในระบบ (JWT Structure & Claims)](#2-โครงสร้างของ-jwt-token-ในระบบ-jwt-structure--claims)
3. [โฟลว์การส่ง Token แบบสมบูรณ์ (Token Transmission Flow)](#3-โฟลว์การส่ง-token-แบบสมบูรณ์-token-transmission-flow)
   - [3.1 ขั้นตอนที่ 1: การล็อกอินและขอรับ Token (Token Issuance)](#31-ขั้นตอนที่-1-การล็อกอินและขอรับ-token-token-issuance)
   - [3.2 ขั้นตอนที่ 2: การจัดเก็บ Token ในฝั่ง Client (Client Storage)](#32-ขั้นตอนที่-2-การจัดเก็บ-token-ในฝั่ง-client-client-storage)
   - [3.3 ขั้นตอนที่ 3: การแนบ Token ทุกคำขอ API (HTTP Authorization Header)](#33-ขั้นตอนที่-3-การแนบ-token-ทุกคำขอ-api-http-authorization-header)
   - [3.4 ขั้นตอนที่ 4: การตรวจพิสูจน์ Token ฝั่งเซิร์ฟเวอร์ (Token Verification)](#34-ขั้นตอนที่-4-การตรวจพิสูจน์-token-ฝั่งเซิร์ฟเวอร์-token-verification)
   - [3.5 ขั้นตอนที่ 5: การควบคุมสิทธิ์ (RBAC) และการป้องกัน IDOR](#35-ขั้นตอนที่-5-การควบคุมสิทธิ์-rbac-และการป้องกัน-idor)
   - [3.6 ขั้นตอนที่ 6: การหมดอายุและการออกจากระบบ (Expiration & Logout)](#36-ขั้นตอนที่-6-การหมดอายุและการออกจากระบบ-expiration--logout)
4. [กลไกการทำงานภายในระบบ (Internal System Mechanism & Architecture)](#4-กลไกการทำงานภายในระบบ-internal-system-mechanism--architecture)
   - [4.1 สถาปัตยกรรมภายในทั้ง 6 ส่วน (6 Internal Subsystems)](#41-สถาปัตยกรรมภายในทั้ง-6-ส่วน-6-internal-subsystems)
   - [4.2 การทำงานประสานกันภายในระบบ (Internal Data Flow & Pipelines)](#42-การทำงานประสานกันภายในระบบ-internal-data-flow--pipelines)
   - [4.3 กลไกความปลอดภัยและ Audit Logging ในตาราง user](#43-กลไกความปลอดภัยและ-audit-logging-ในตาราง-user)
5. [ตารางตรวจสอบสิทธิ์ระดับ API (API Access Control Matrix)](#5-ตารางตรวจสอบสิทธิ์ระดับ-api-api-access-control-matrix)

---

## 1. ภาพรวมการรักษาความมั่นคงปลอดภัยด้วย Token (Token Security Overview)

ระบบกลุ่ม 4 ใช้มาตรฐาน **JSON Web Token (JWT)** ตามข้อกำหนด RFC 7519 ในการยืนยันตัวตน (Authentication) และการอนุญาตเข้าถึงทรัพยากร (Authorization) แบบ **Stateless** เพื่อความปลอดภัยและรองรับการขยายตัว (Scalability):

* **Centralized Verification:** บัญชีผู้ใช้งานทั้งหมดต้องผ่านการตรวจสอบรหัสผ่านจากเซิร์ฟเวอร์กลางของ **กลุ่ม 3** (`192.168.100.103:8000`) เท่านั้น
* **Custom Signed Token:** เมื่อกลุ่ม 3 ยืนยันตัวตนสำเร็จ Backend กลุ่ม 4 จะออก **Group 4 JWT Token** ที่ลงลายมือชื่อดิจิทัล (Digital Signature) ด้วยกุญแจลับเฉพาะของกลุ่ม 4 (`JWT_SECRET`)
* **Role-Based Access Control (RBAC):** กำหนดระดับสิทธิ์ชัดเจนระหว่าง **อาจารย์ (`teacher`)** และ **นักศึกษา (`student`)**
* **IDOR Prevention:** ล็อกสิทธิ์ของนักศึกษาให้สืบค้นได้เฉพาะข้อมูลของตนเองจาก Claims ที่อยู่ใน Token โดยไม่สามารถแก้ไขพารามิเตอร์ `student_id` เพื่อดูของคนอื่นได้

---

## 2. โครงสร้างของ JWT Token ในระบบ (JWT Structure & Claims)

JWT Token ที่กลุ่ม 4 ออกให้ผู้ใช้งาน ประกอบด้วย 3 ส่วนที่เชื่อมด้วยจุด (`.`): `Header.Payload.Signature`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzIwMDMyNCIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzg0NjIwMDAwLCJleHAiOjE3ODQ2MjcyMDB9.signature...
```

### 2.1 รายละเอียดของแต่ละส่วน

1. **Header (ส่วนหัว):**
   ระบุอัลกอริทึมการเข้ารหัสลายเซ็น
   ```json
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   ```

2. **Payload (ข้อมูลสิทธิ์ หรือ Claims):**
   ข้อมูลที่บรรจุอยู่ภายใน Token เพื่อใช้ระบุตัวตนและตรวจสอบสิทธิ์ในระบบ
   ```json
   {
     "sub": "67200324",
     "role": "student",
     "iat": 1784620000,
     "exp": 1784627200
   }
   ```
   * `sub` (*Subject*): รหัสประจำตัวผู้ใช้งาน เช่น รหัสนักศึกษา (`67200324`) หรือ Username ของอาจารย์ (`teacher_somchai`)
   * `role` (*Role*): ระดับสิทธิ์ของผู้ใช้ มีค่าเป็น `"teacher"` หรือ `"student"`
   * `iat` (*Issued At*): เวลาที่ Token ถูกสร้าง (Unix Timestamp)
   * `exp` (*Expiration Time*): เวลาหมดอายุของ Token (กำหนดไว้ 120 นาที หรือ 2 ชั่วโมง)

3. **Signature (ลายมือชื่อดิจิทัล):**
   สร้างขึ้นจากการนำ `Header` + `Payload` มาเข้ารหัสด้วยกุญแจลับ `JWT_SECRET` ผ่านอัลกอริทึม `HMAC-SHA256`:
   ```
   HMACSHA256(
     base64UrlEncode(header) + "." + base64UrlEncode(payload),
     JWT_SECRET
   )
   ```
   > ⚠️ **ความปลอดภัย:** หากผู้ไม่หวังดีแอบแก้ไข Payload (เช่น แก้ `role` จาก `student` เป็น `teacher`) ลายมือชื่อ Signature จะไม่ตรงกัน เซิร์ฟเวอร์จะปฏิเสธการเชื่อมต่อทันที (401 Unauthorized)

---

## 3. โฟลว์การส่ง Token แบบสมบูรณ์ (Token Transmission Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 ผู้ใช้ (อาจารย์ / นักศึกษา)
    participant FE as 💻 Frontend (Next.js / Browser)
    participant LocalStorage as 🗄️ LocalStorage
    participant BE as ⚙️ Backend API (FastAPI)
    participant G3 as 🔐 เซิร์ฟเวอร์กลุ่ม 3 (Central Auth)
    participant DB as 💾 MariaDB (web_app_db)

    Note over User, DB: 1. ขั้นตอนการล็อกอินและรับ Token
    User->>FE: 1. ป้อน Username และ Password ที่หน้า Login
    FE->>BE: 2. POST /api/v1/auth/login { username, password }
    BE->>G3: 3. ตรวจสอบรหัสผ่านกับกลุ่ม 3 (POST /auth/login)
    G3-->>BE: 4. ยืนยันตัวตนสำเร็จ + ส่ง Group 3 Claims (Role, Name)
    BE->>BE: 5. สร้าง Group 4 JWT Token (sub, role, exp=120m)
    BE-->>FE: 6. ส่ง HTTP 200 OK { access_token, token_type: "bearer", user }
    FE->>LocalStorage: 7. จัดเก็บ token & user info ลงใน LocalStorage
    FE->>User: 8. แสดงผลหน้า Dashboard ตามบทบาท (Teacher/Student)

    Note over User, DB: 2. ขั้นตอนการส่ง Token เพื่อเรียกข้อมูล API
    User->>FE: 9. กดดูประวัติการแตะบัตร / กรองข้อมูล
    FE->>LocalStorage: 10. อ่านค่า access_token จาก LocalStorage
    FE->>BE: 11. GET /api/v1/logs?room=B316<br/>Header: Authorization: Bearer <token>
    BE->>BE: 12. Middleware verify_token ถอดรหัส & ตรวจสอบ Signature + Expire
    BE->>BE: 13. ตรวจสอบสิทธิ์ (RBAC & IDOR): หากเป็น student บังคับค้นหาเฉพาะรหัสตัวเอง
    BE-)DB: 14. [Background] บันทึก Audit Log ลงตาราง user
    BE->>DB: 15. ดึงข้อมูลประวัติการแตะบัตรจากตาราง web_app
    DB-->>BE: 16. ส่งผลลัพธ์รายการแตะบัตร
    BE-->>FE: 17. ส่งข้อมูล JSON Dashboard Response กลับไปแสดงผล
    FE-->>User: 18. แสดงตารางและข้อมูลสถิติบนหน้าเว็บ
```

---

### 3.1 ขั้นตอนที่ 1: การล็อกอินและขอรับ Token (Token Issuance)

1. ผู้ใช้กรอกข้อมูลเข้าสู่ระบบที่หน้า `/login`
2. Frontend ส่งคำขอ `POST /api/v1/auth/login`:
   ```http
   POST /api/v1/auth/login HTTP/1.1
   Host: 172.16.10.200:3001
   Content-Type: application/json

   {
     "username": "67200324",
     "password": "Password123!"
   }
   ```
3. Backend ส่งต่อไปตรวจสอบกับ **กลุ่ม 3 (`http://192.168.100.103:8000/auth/login`)**
4. เมื่อผ่านการตรวจสอบ Backend เรียกฟังก์ชัน `create_access_token(username, role)`:
   ```python
   def create_access_token(username: str, role: str) -> str:
       now = datetime.now(timezone.utc)
       expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
       payload = {
           "sub": username,
           "role": role,
           "iat": int(now.timestamp()),
           "exp": int(expire.timestamp()),
       }
       return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
   ```
5. Backend ส่งผลลัพธ์กลับไปยัง Client:
   ```json
   {
     "status": "success",
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "bearer",
     "user": {
       "username": "67200324",
       "role": "student",
       "name": "Leo Ev",
       "email": "67200324@university.ac.th"
     }
   }
   ```

---

### 3.2 ขั้นตอนที่ 2: การจัดเก็บ Token ในฝั่ง Client (Client Storage)

ฝั่ง Frontend นำ Token ที่ได้ไปบันทึกผ่าน `AuthContext.tsx`:
```typescript
const login = (newToken: string, newUser: User) => {
  localStorage.setItem('token', newToken);
  localStorage.setItem('user', JSON.stringify(newUser));
  setToken(newToken);
  setUser(newUser);
};
```
* ข้อมูลจะถูกเก็บไว้ใน `localStorage` ของเบราว์เซอร์ เพื่อให้คงอยู่แม้ผู้ใช้จะรีเฟรชหน้าเว็บ
* React Context ทำหน้าที่กระจายสถานะ (`isAuthenticated`, `token`, `user`) ไปยังคอมโพเนนต์ต่างๆ เช่น Header, FilterBar, LogTable

---

### 3.3 ขั้นตอนที่ 3: การแนบ Token ทุกคำขอ API (HTTP Authorization Header)

ทุกครั้งที่ Frontend เรียกใช้งาน API ที่ต้องใช้สิทธิ์ จะดึง Token จากหน่วยความจำมาแนบใน Header `Authorization` ด้วยรูปแบบ **Bearer Authentication**:

```typescript
// frontend/src/services/api.ts
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const res = await fetch(`${API_BASE_URL}/logs?${query.toString()}`, {
  method: 'GET',
  headers,
});
```

ตัวอย่าง HTTP Request จริงที่วิ่งผ่านเครือข่าย:
```http
GET /api/v1/logs?room=B316&status=IN HTTP/1.1
Host: 172.16.10.200:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

---

### 3.4 ขั้นตอนที่ 4: การตรวจพิสูจน์ Token ฝั่งเซิร์ฟเวอร์ (Token Verification)

เมื่อ Backend ได้รับ Request จะส่งผ่าน Middleware `verify_token` ใน `backend/app/core/security.py`:

```python
def verify_token(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> Dict[str, Any]:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

* **ตรวจสอบ Signature:** ป้องกันการปลอมแปลง Token
* **ตรวจสอบวันหมดอายุ:** หากเกิน 120 นาที ระบบจะตัดเซสชันและตอบกลับด้วย `401 Unauthorized` ทันที

---

### 3.5 ขั้นตอนที่ 5: การควบคุมสิทธิ์ (RBAC) และการป้องกัน IDOR

เมื่อ Token ถูกต้อง ระบบจะนำ Claims ใน Payload ไปบังคับใช้สิทธิ์ (Access Control):

1. **การป้องกัน IDOR (Insecure Direct Object Reference) ใน `/api/v1/logs`:**
   ```python
   user_role = current_user.get("role", "teacher")
   user_id = current_user.get("sub", "unknown")

   if user_role == "student":
       # บังคับล็อกให้ดูได้เฉพาะ Log ของตนเองเท่านั้น ไม่สนใจ student_id ที่ส่งมาใน query
       owner_student_id = user_id
   else:
       # อาจารย์สามารถค้นหารหัสนักศึกษาคนใดก็ได้
       search_student_id = student_id or keyword or None
   ```
2. **การจำกัดสิทธิ์เฉพาะอาจารย์ (Teacher-Only RBAC):**
   สำหรับ Endpoint สำหรับผู้ดูแลระบบ เช่น `/api/v1/admin/logs` จะถูกครอบด้วย `require_teacher_role`:
   ```python
   def require_teacher_role(payload: Dict[str, Any] = Security(verify_token)) -> Dict[str, Any]:
       role = payload.get("role")
       if role != "teacher":
           raise HTTPException(
               status_code=status.HTTP_403_FORBIDDEN,
               detail="Access forbidden: This resource requires teacher privileges.",
           )
       return payload
   ```

---

### 3.6 ขั้นตอนที่ 6: การหมดอายุและการออกจากระบบ (Expiration & Logout)

* **เมื่อ Token หมดอายุ (Token Expired):** Frontend ตรวจพบรหัส `401 Unauthorized` จะสั่งเคลียร์ Token และเด้งกลับไปหน้าล็อกอินอัตโนมัติ
* **เมื่อผู้ใช้กดปุ่มออกจากระบบ (Logout):**
  Frontend ลบ Token และข้อมูลผู้ใช้ออกจาก LocalStorage:
  ```typescript
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
  ```
  เนื่องจากเป็น Stateless JWT เซิร์ฟเวอร์ไม่ต้องเก็บเซสชันใน RAM ทำให้ระบบประหยัดทรัพยากรและปลอดภัยสูง

---

## 4. กลไกการทำงานภายในระบบ (Internal System Mechanism & Architecture)

### 4.1 สถาปัตยกรรมภายในทั้ง 6 ส่วน (6 Internal Subsystems)

```mermaid
flowchart TB
    subgraph ClientLayer["1️⃣ Client & Presentation Layer"]
        Browser["🌐 Web Browser (Desktop / Mobile)"]
        UI_Components["🎨 React Components (Next.js 14)
        - FilterBar / LogTable / Header / Pagination"]
        Contexts["📦 State Management
        - AuthContext (Token) / LanguageContext"]
    end

    subgraph GatewayLayer["2️⃣ Reverse Proxy & Network Layer (VM4)"]
        Nginx["🛡️ Nginx Web Server (Port 80)
        - SSL/TLS Termination
        - Static Asset Caching
        - Reverse Proxy /api/v1/"]
    end

    subgraph ServiceLayer["3️⃣ Application & Security Layer (FastAPI)"]
        FastAPI["⚙️ FastAPI Core Engine (Port 8000)"]
        AuthMiddleware["🔐 Security & JWT Middleware
        - verify_token / RBAC Guard / IDOR Isolator"]
        LogService["📊 Log Search & Query Engine (คนที่ 6)"]
        AuditWorker["📝 Async Audit Logger Thread (คนที่ 4)"]
        IoTEngine["📡 IoT Sync Ingestion Worker (คนที่ 5)"]
    end

    subgraph DatabaseLayer["4️⃣ Persistence Layer (MariaDB)"]
        DB_User[("👤 ตาราง user
        - timestamp (เวลาจริง)
        - username
        - role
        - action (ประวัติการใช้งาน)")]
        DB_WebApp[("🚪 ตาราง web_app
        - id (รันจาก 1)
        - timestamp (เวลาแตะบัตร)
        - student_id, student_name
        - room, status (IN/OUT)")]
    end

    subgraph ExternalLayer["5️⃣ External Integration Layer"]
        G3_Server["🔐 กลุ่ม 3 Central Auth API (192.168.100.103:8000)"]
        G6_Server["📡 กลุ่ม 6 IoT Server (192.168.100.106:3000)"]
    end

    Browser <--> UI_Components
    UI_Components <--> Contexts
    UI_Components <-->|HTTP / HTTPS| Nginx

    Nginx -->|Static Web /| UI_Components
    Nginx -->|API Reverse Proxy /api/v1/| FastAPI

    FastAPI --> AuthMiddleware
    AuthMiddleware <--> G3_Server

    AuthMiddleware --> LogService
    LogService --> DB_WebApp

    FastAPI --> AuditWorker
    AuditWorker -.->|Asynchronous Non-blocking| DB_User

    IoTEngine <-->|Polling ทุก 5 วินาที| G6_Server
    IoTEngine -->|Deduplicate & Cleanse| DB_WebApp
```

---

### 4.2 การทำงานประสานกันภายในระบบ (Internal Data Flow & Pipelines)

ระบบของกลุ่ม 4 มีการแบ่งแยกส่วนการทำงานภายใน (Separation of Concerns) เป็น 4 Pipeline หลัก:

#### 1. Authentication & Security Pipeline (คนที่ 1 & 4)
* ตรวจรับคำขอจาก Client ผ่าน Nginx เข้าสู่ FastAPI
* สื่อสารข้าม VM ไปยังกลุ่ม 3 ด้วย REST API เพื่อตรวจสอบ Credential
* สร้างและถอดรหัส JWT Token แบบปลอดภัยด้วย Secret Key

#### 2. Log Ingestion & Real-Time Sync Pipeline (คนที่ 5 & 7)
* มี Daemon Worker คอยส่งคำขอไปดึงข้อมูลแตะบัตรจากกลุ่ม 6 ทุก 5 วินาที
* นำข้อมูลดิบมาตรวจสอบความถูกต้อง (Data Sanitization) เช่น แปลงรูปแบบเวลาเป็นเวลาจริงประเทศไทย (+07:00)
* ทำ **Deduplication** เพื่อป้องกันข้อมูลแตะบัตรซ้ำ แล้วบันทึกลงตาราง `web_app`

#### 3. Log Search & Business Logic Pipeline (คนที่ 6 & 7)
* รับพารามิเตอร์การค้นหา: `room`, `date`, `status` (`IN`, `OUT`, `ACTIVE`), `student_id`
* คำนวณสถานะ **"กำลังใช้งาน" (`ACTIVE`)** โดยดึงประวัติล่าสุดของแต่ละคน หากเป็น `IN` และยังไม่มี `OUT` จะนับว่าเป็นคนที่อยู่ในห้อง
* ตัดหน้า Pagination และคืนผลลัพธ์พร้อมข้อมูลสรุป (Stats)

#### 4. Audit Trail Pipeline (คนที่ 4 & 7)
* ทุกการสืบค้นข้อมูลหรือการคลิกใช้งาน จะถูกดักจับและส่งเข้า Asynchronous Worker (`threading.Thread`)
* บันทึกคำสั่งและเวลาจริงลงในตาราง `user` โดยทำงานเบื้องหลัง (Background Worker) ทำให้ไม่หน่วงความเร็วในการตอบสนองของหน้าเว็บ

---

### 4.3 กลไกความปลอดภัยและ Audit Logging ในตาราง user

ตาราง `user` ทำหน้าที่เป็น **Security Audit Trail** เพื่อบันทึกพฤติกรรมการใช้งานระบบสำหรับตรวจสอบย้อนหลังตามข้อกำหนด พ.ร.บ. คอมพิวเตอร์:

| คอลัมน์ | ประเภทข้อมูล | ความสำคัญและการทำงาน |
| :--- | :--- | :--- |
| `id` | `INT AUTO_INCREMENT` | ลำดับเหตุการณ์ เรียงลำดับจาก 1 |
| `timestamp` | `DATETIME` | เวลาจริงที่เข้าใช้งานระบบ (เวลาประเทศไทย Bangkok +07:00) |
| `username` | `VARCHAR(100)` | บัญชีผู้ใช้ที่ส่งคำขอ (ดึงมาจาก Claim `sub` ใน Token) |
| `role` | `VARCHAR(50)` | สิทธิ์ของผู้ใช้ ณ ขณะนั้น (`teacher` หรือ `student`) |
| `action` | `VARCHAR(255)` | พฤติกรรมที่ทำ เช่น `Search>keyword=67200324; Filter>room=B316` |

> ✅ **Non-blocking Execution:** การบันทึก Audit Log แยกทำงานบน Thread อิสระ หากเกิดข้อผิดพลาดในการบันทึก จะไม่ทำให้คำขอหลักของผู้ใช้งานล้มเหลว

---

## 5. ตารางตรวจสอบสิทธิ์ระดับ API (API Access Control Matrix)

| Endpoint | Method | Token Required? | Middleware / Guard | สิทธิ์ที่เข้าถึงได้ | หน้าที่การทำงาน |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | ❌ ไม่ต้องมี | Public | ทุกคน | ยืนยันตัวตนกับกลุ่ม 3 และรับ Token |
| `/api/v1/auth/me` | `GET` | ✅ จำเป็น | `get_current_user` | Teacher, Student | ขอข้อมูลโปรไฟล์ตนเอง |
| `/api/v1/auth/logout` | `POST` | ❌ ไม่บังคับ | Public | ทุกคน | สั่งออกจากระบบฝั่งเซิร์ฟเวอร์ |
| `/api/v1/logs` | `GET` | ✅ จำเป็น | `get_current_user` | **Teacher:** ดูได้ทุกคน<br/>**Student:** ดูได้เฉพาะตนเอง (IDOR Guard) | ค้นหาและดูประวัติการแตะบัตรห้องเรียน |
| `/api/v1/admin/logs` | `GET` | ✅ จำเป็น | `require_teacher_role` | **Teacher เท่านั้น** (Student ได้ 403 Forbidden) | ค้นหาประวัติสำหรับผู้ดูแลระบบ |
| `/api/v1/audit/log` | `POST` | ✅ จำเป็น | `verify_token` | Teacher, Student | บันทึกประวัติการกระทำลงตาราง `user` |
| `/api/v1/iot/sync` | `POST` | ⚙️ ทางเลือก | Internal / Admin | System Worker / Admin | สั่งซิงก์ข้อมูลแตะบัตรจากกลุ่ม 6 ทันที |
| `/api/v1/iot/status` | `GET` | ❌ ไม่ต้องมี | Public | ทุกคน | ตรวจสอบสถานะการทำงานของตัวซิงก์ IoT |

---
**จัดทำโดย:** ทีมพัฒนาระบบเว็บแอปพลิเคชัน กลุ่ม 4 (Group 4 Web Application Security)
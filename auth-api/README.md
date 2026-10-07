# Door Authentication API

FastAPI API สำหรับยืนยันตัวตนผ่าน RADIUS และออก JWT ให้เว็บหรือระบบอื่นใช้ต่อ
ยังไม่รวม MySQL, role, สิทธิ์เปิดประตู, refresh token หรือการเพิกถอน token
`/auth/me` คืน username จาก token ไม่ได้ตรวจสถานะบัญชีล่าสุดกับ RADIUS

## เริ่มใช้งานบน Windows (PowerShell)

ทดสอบด้วย Python 3.14.6 ถ้ายังไม่มี virtual environment ให้สร้างด้วยคำสั่งนี้:

```powershell
cd auth-api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

คัดลอก `.env.example` ครั้งแรกเท่านั้น อย่าทับ `.env` ที่ตั้งค่าไว้แล้ว
สร้าง signing key บนเครื่อง แล้วนำผลลัพธ์ไปใส่ `JWT_SECRET` ใน `.env`:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

`JWT_SECRET` ต้องมีอย่างน้อย 32 bytes และเป็นคนละค่ากับ `RADIUS_SECRET`
แอปอ่าน `.env` ในโฟลเดอร์ `auth-api` และ environment variables มีลำดับความสำคัญสูงกว่า
ค่าจริงเก็บใน `.env` ซึ่งถูก Git ignore แล้ว ต้อง restart หลังแก้ค่า

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger UI: http://127.0.0.1:8000/docs
- OpenAPI: http://127.0.0.1:8000/openapi.json
- Health: http://127.0.0.1:8000/health (บอกว่า API ทำงาน ไม่ได้บอกว่า RADIUS พร้อม)

## ทดสอบก่อนทีม RADIUS พร้อม

ตั้งค่าใน `.env` สำหรับเครื่องพัฒนาเท่านั้น:

```dotenv
AUTH_MODE=mock
MOCK_USERNAME=student
MOCK_PASSWORD=local-demo-password
```

ต้องกำหนด `JWT_SECRET` ด้วย โหมด mock ไม่มีบัญชีหรือรหัสผ่านที่เปิดใช้โดยอัตโนมัติ
ตัวอย่างนี้เป็นข้อมูลสมมติ ห้ามใช้บัญชีจริงเป็นข้อมูลทดสอบที่แชร์ใน repository

```powershell
$loginBody = @{ username = 'student'; password = 'local-demo-password' } | ConvertTo-Json
$loginResult = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/auth/login' -ContentType 'application/json' -Body $loginBody
$authHeaders = @{ Authorization = "Bearer $($loginResult.access_token)" }
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/auth/me' -Headers $authHeaders
```

JSON request สำหรับทีมเว็บ:

```json
{"username": "student", "password": "local-demo-password"}
```

ผลลัพธ์ Login มี `access_token`, `token_type: "bearer"` และ `expires_in: 900`
ส่ง token ใน header `Authorization: Bearer <access_token>` เพื่อเรียก `/auth/me`
Swagger: เรียก Login ก่อน จากนั้นกด **Authorize** แล้ววางเฉพาะ token

| Endpoint | หน้าที่ |
|---|---|
| `POST /auth/login` | รับ JSON username/password ตรวจตัวตนแล้วออก JWT |
| `GET /auth/me` | ตรวจ JWT และคืน `{"username": "student"}` |
| `GET /health` | ตรวจว่า API ทำงาน |

| Status | ความหมาย |
|---|---|
| `200` | สำเร็จ |
| `401` | รหัสผ่านผิด หรือ Bearer token ไม่ถูกต้อง/หมดอายุ |
| `422` | รูปแบบข้อมูลไม่ถูกต้อง โดยไม่สะท้อนค่ารหัสผ่านกลับ |
| `503` | ขาดค่าตั้งค่า, RADIUS ติดต่อไม่ได้/ตอบไม่ถูกต้อง หรือส่ง challenge ที่ยังไม่รองรับ |

## ค่าที่ต้องขอจากทีม RADIUS

| ค่า/ข้อตกลง | ใช้ทำอะไร |
|---|---|
| `RADIUS_HOST` | IP หรือ hostname ของ server |
| `RADIUS_PORT` | UDP authentication port ค่าเริ่มต้น 1812 |
| `RADIUS_SECRET` | Shared secret สำหรับเครื่อง API ที่ลงทะเบียนไว้ |
| Client IP ของ API | ให้ทีมลงทะเบียนเครื่อง API เป็น RADIUS client; อาจเป็น IP หลัง NAT |
| PAP และ Message-Authenticator | Adapter นี้ใช้ PAP และต้องมี Message-Authenticator ใน response |
| บัญชีทดสอบ | ใช้ทดสอบ Access-Accept และ Access-Reject ร่วมกัน |
| NAS-Identifier | ค่าเริ่มต้น `auth-api`; ปรับ `RADIUS_NAS_IDENTIFIER` ถ้ามีนโยบายกำหนดไว้ |

เมื่อได้ค่า ให้ตั้ง `AUTH_MODE=radius`, กรอก host/port/secret แล้ว restart API
หากทีมใช้ CHAP, EAP, RadSec หรือ MFA/challenge ต้องปรับ adapter ก่อนเชื่อมจริง
โหมด radius จะไม่สลับไป mock เองเมื่อ server ล่ม
ค่าเริ่มต้นส่งได้ 2 ครั้ง รอครั้งละ 3 วินาที; DNS resolution ขึ้นกับระบบปฏิบัติการ
ใช้ pyrad สร้าง/ตรวจแพ็กเก็ต และ socket ของ Python ส่ง UDP เพื่อรองรับ Windows

## ทดสอบ

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Tests ใช้ mock mode จริงของแอป และจำลองเฉพาะ network transport ของ RADIUS
ทดสอบ response authenticator, Message-Authenticator, timeout, rejection และ challenge
ยังไม่ได้ทดสอบกับ RADIUS server ของทีมจริง

ก่อนนำขึ้นใช้งานจริง ให้เปลี่ยนเป็น radius และใช้ HTTPS สำหรับรับ username/password
ยังไม่มี rate limiting หรือ token revocation; token ที่ออกแล้วใช้ได้จนหมดอายุ
ยังไม่เปิด CORS หากเว็บอยู่คนละ origin ให้กำหนด origin ของเว็บเมื่อทราบ URL
IoT สามารถส่ง token มาตรวจที่ `/auth/me` แล้วตรวจสิทธิ์ประตูของตนเองต่อ
อย่าแจก `JWT_SECRET` ให้ browser เพราะค่านี้สามารถใช้สร้าง token ได้

อ้างอิง: [FastAPI JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/),
[PyJWT](https://pyjwt.readthedocs.io/en/stable/usage.html),
[pyrad](https://pyrad.readthedocs.io/en/latest/)

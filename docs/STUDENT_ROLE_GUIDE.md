# คู่มือการพัฒนารองรับ 2 บทบาท: อาจารย์ และ นักศึกษา (Dual-Role Access Implementation Guide)
> **โปรเจกต์:** G4 Classroom Access Management System (Mini Project)  
> **อ้างอิงบทบาทตาม:** [`README.md`](../README.md)  
> **อ้างอิงสเปก API กลุ่ม 3 จาก:** [`docs/REPLY-GROUP4.md`](REPLY-GROUP4.md)  
> **สถานะฐานข้อมูล:** ตาราง `user` ได้รับการเพิ่มคอลัมน์ `role ENUM('teacher', 'student')` เรียบร้อยแล้ว

---

## 🎯 1. สรุปความต้องการระบบ (Requirements & Role Specifications)

ระบบต้องรองรับการยืนยันตัวตนร่วมกับเซิร์ฟเวอร์กลาง **กลุ่ม 3 (API-Ser)** และแบ่งสิทธิ์การทำงานของหน้าเว็บออกเป็น **2 บทบาท (Roles)** ชัดเจน:

### 1.1 👨‍🏫 บทบาทอาจารย์ (`role: "teacher"`)
* **สิทธิ์การเข้าถึง:** สามารถดูประวัติการเข้า-ออกห้องเรียนของ**ทุกคน (นักศึกษาทุกคน)** ได้
* **ฟังก์ชันการค้นหาและกรอง:** สามารถค้นหาได้อย่างอิสระจาก **4 มิติหลัก**:
  1. **รหัสนักศึกษา หรือ ชื่อ-นามสกุล** (ป้อนคำค้นหาเองได้อิสระ)
  2. **ห้องเรียน** (เช่น B217, B218, E107 หรือเลือกทุกห้อง)
  3. **วันที่** (เลือกดูตามวันแบบ Datepicker)
  4. **ช่วงเวลา** (เช่น 08:00, 13:00, 14:00 หรือทุกช่วงเวลา)
  *(รวมถึงกรองสถานะ IN/OUT ได้)*
* **Audit Log:** ทุกครั้งที่ค้นหา/กรอง จะถูกบันทึกประวัติลงตาราง `user` ในฐานข้อมูล พร้อมระบุ `role = 'teacher'`

### 1.2 👨‍🎓 บทบาทนักศึกษา (`role: "student"`)
* **สิทธิ์การเข้าถึง:** สามารถดูประวัติการเข้า-ออกห้องเรียนได้**เฉพาะของตนเองเท่านั้น** (ห้ามเห็นข้อมูลของเพื่อน)
* **ฟังก์ชันการค้นหาและกรอง:**
  * **ช่องรหัสนักศึกษา:** **ถูกล็อก (Lock / ReadOnly / Disabled)** แสดงเฉพาะรหัสนักศึกษาของตนเองที่ล็อกอินเข้ามา ไม่สามารถพิมพ์เปลี่ยนเป็นรหัสคนอื่นได้
  * **ตัวกรองที่นักศึกษาใช้งานได้:** สามารถค้นหาประวัติตนเองได้จาก **3 มิติหลัก**:
    1. **ห้องเรียน** (เลือกว่าตนเองเคยเข้าห้องใดบ้าง)
    2. **วันที่** (เลือกดูประวัติตนเองในแต่ละวัน)
    3. **ช่วงเวลา** (เลือกดูประวัติตนเองตามชั่วโมงเรียน)
    *(รวมถึงกรองสถานะ IN/OUT ของตนเองได้)*
* **ความปลอดภัยระดับ Backend (IDOR Protection):** Backend จะดึงรหัสนักศึกษาจาก JWT Token Payload (`sub`) เท่านั้น และบังคับกรองเฉพาะรหัสนั้น แม้ผู้ใช้จะพยายามดัดแปลง Request Query Parameter ก็ไม่สามารถดูข้อมูลของผู้อื่นได้
* **Audit Log:** บันทึกประวัติการสืบค้นลงตาราง `user` พร้อมระบุ `role = 'student'`

---

## 🌐 2. การเชื่อมต่อกับกลุ่ม 3 (API-Ser Authentication Specs)

ตามเอกสาร [`docs/REPLY-GROUP4.md`](REPLY-GROUP4.md):
* **Target Endpoint:** `POST http://192.168.100.103:8000/auth/login`
* **Request Body ที่กลุ่ม 4 ส่งไป:**
  ```json
  {
    "username": "6501234567",
    "password": "user-password"
  }
  ```
* **Response ที่กลุ่ม 3 ส่งกลับมา:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
  ```
* **Decoded JWT Payload จากกลุ่ม 3:**
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
  *(สำหรับนักศึกษา `sub` และ `username` คือ **รหัสนักศึกษา** เสมอ)*

---

## 👥 3. ตารางแบ่งความรับผิดชอบตามสมาชิก (Member Responsibilities)

| ลำดับ | สมาชิก | ส่วนงาน | บทบาทความรับผิดชอบ | ไฟล์ที่ต้องแก้ไข |
| :---: | :--- | :---: | :--- | :--- |
| **คนที่ 4** | ธัญญารัตน์ สงสมใจ | Backend | เชื่อมต่อ API กลุ่ม 3 & ออก/ตรวจสอบ JWT Token | `backend/app/services/group3_client.py`<br/>`backend/app/api/v1/endpoints/auth.py` |
| **คนที่ 6** | สมาชิกคนที่ 6 (`67200050`) | Backend | ปรับ API `GET /api/v1/logs` ให้รองรับทั้ง Teacher และ Student โดยบังคับ Scope ข้อมูล | `backend/app/api/v1/endpoints/logs.py` |
| **คนที่ 2** | ณัทธิดา (`ntd`) | Frontend | ปรับแต่ง UI Header และทำช่องค้นหารหัสนักศึกษาแบบ **ล็อก (Locked/Disabled)** ใน FilterBar | `frontend/src/components/Header.tsx`<br/>`frontend/src/components/FilterBar.tsx` |
| **คนที่ 3** | พีรพัฒน์ (`PP.afk`) | Frontend | ผูก State การค้นหาและส่งค่ารหัสนักศึกษาของตนเองอย่างถูกต้อง | `frontend/src/app/dashboard/page.tsx` |
| **คนที่ 1** | ณัชชา (`67200350`) | Frontend | ปรับปรุงหน้า Login ให้รองรับการกรอกทั้งรหัสนักศึกษาและอาจารย์ | `frontend/src/app/login/page.tsx` |
| **คนที่ 7** | สมาชิกคนที่ 7 (`yeonn3`) | Infra/QA | ปรับปรุง Test Suite ตรวจสอบความถูกต้องและสิทธิ์ของทั้ง 2 Role | `backend/tests/test_auth.py` |
| **คนที่ 5** | ปิณปิณัฐ เข็มทอง | Backend | IoT Data Ingestion | *(ไม่ต้องแก้ไข - ดึงข้อมูลปกติ)* |

---

## 💻 4. รายละเอียดและโค้ดตัวอย่างที่แต่ละคนต้องนำไปแก้ไข

---

### 👨‍💻 สมาชิกคนที่ 4: Backend Authentication & Group 3 Client
* **ไฟล์:** `backend/app/services/group3_client.py`
* **สิ่งที่ต้องทำ:** อ่านผลลัพธ์จากกลุ่ม 3 โดยถอด JWT Payload ของกลุ่ม 3 เพื่อดึง `username` (รหัสนักศึกษา) และ `role`:

```python
# backend/app/services/group3_client.py
import requests
import jwt
from typing import Tuple, Optional

def verify(self, username: str, password: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    ส่งคำขอยืนยันตัวตนไปยังกลุ่ม 3 (POST /auth/login)
    Returns: (is_valid: bool, role: Optional[str], verified_username: Optional[str])
    """
    if self.is_external_configured():
        try:
            payload = {"username": username, "password": password}
            response = requests.post(
                self.api_url,
                json=payload,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                
                # ถอดข้อมูลจาก JWT Payload ของกลุ่ม 3
                if token:
                    decoded = jwt.decode(token, options={"verify_signature": False})
                    role = decoded.get("role", "student")
                    verified_user = decoded.get("username", username)
                    return True, role, verified_user
                
                # กรณีกลุ่ม 3 ส่งข้อมูลตรงใน JSON
                role = data.get("role") or data.get("user", {}).get("role", "teacher")
                return True, role, username
            elif response.status_code in (400, 401, 403, 404):
                return False, None, None
        except Exception:
            if not self.mock_fallback:
                return False, None, None

    # กรณี Mock Fallback ทดสอบออฟไลน์
    if self.mock_fallback:
        account = MOCK_ACCOUNTS.get(username)
        if account and account["password"] == password:
            return True, account["role"], username
        return False, None, None

    return False, None, None
```

---

### 👨‍💻 สมาชิกคนที่ 6: Backend Search & Logs API
* **ไฟล์:** `backend/app/api/v1/endpoints/logs.py`
* **สิ่งที่ต้องทำ:**
  1. ใช้ `get_current_user` แทน `require_teacher_role`
  2. แยกตรรกะตาม Role:
     - **นักศึกษา:** ล็อก `search_keyword = current_user["sub"]` (ห้ามดูของคนอื่น) แต่ยังกรองห้อง, วัน, เวลา ได้
     - **อาจารย์:** ค้นหารหัสนักศึกษา, ห้อง, วัน, เวลา ได้อิสระ
  3. บันทึก Audit Log ลงตาราง `user` พร้อมระบุ `role`

```python
# backend/app/api/v1/endpoints/logs.py
from app.core.security import get_current_user  # ใช้ get_current_user
from app.services.audit_service import log_user_action

@router.get("/logs", response_model=DashboardDataResponse)
def search_access_logs(
    student_id: Optional[str] = Query(None, description="ค้นหารหัสนักศึกษา"),
    keyword: Optional[str] = Query(None),
    room: str = Query("all", description="กรองห้องเรียน"),
    selected_date: Optional[date] = Query(None, alias="date", description="กรองตามวันที่"),
    time_slot: str = Query("all", description="กรองช่วงเวลา"),
    lang: str = Query("th"),
    status: Optional[str] = Query(None, description="สถานะ IN หรือ OUT"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    user_role = current_user.get("role", "student")
    user_id = current_user.get("sub") or current_user.get("username", "unknown")

    # 🔒 ควบคุมสิทธิ์การเข้าถึงข้อมูล (RBAC Enforce Scope)
    if user_role == "student":
        # นักศึกษา: ถูกล็อกให้ดูเฉพาะรหัสของตนเองเสมอ
        search_keyword = user_id
    else:
        # อาจารย์: ค้นหารหัสนักศึกษาได้อิสระ
        search_keyword = student_id or keyword or None

    # บันทึก Audit Log ลงตาราง user (ระบุ role ของผู้ใช้งาน)
    audit_actions = []
    if user_role == "teacher" and search_keyword:
        audit_actions.append(f"Search>student={search_keyword}")
    if room and room != "all":
        audit_actions.append(f"Filter>room={room}")
    if selected_date:
        audit_actions.append(f"Filter>date={selected_date}")
    if time_slot and time_slot != "all":
        audit_actions.append(f"Filter>time={time_slot}")
    if status and status != "all":
        audit_actions.append(f"Filter>status={status}")

    if audit_actions:
        action_summary = "; ".join(audit_actions)
        log_user_action(username=user_id, action=action_summary, role=user_role)

    # ดึงข้อมูลจากฐานข้อมูล (ทั้ง 2 Role ใช้ฟิลเตอร์ ห้อง, วัน, เวลา ร่วมกันได้)
    result = get_dashboard_data(
        student_id=search_keyword,
        room=room if room != "all" else None,
        selected_date=selected_date,
        time_slot=time_slot if time_slot != "all" else None,
        status=status if status != "all" else None,
        page=page,
        limit=limit,
        lang=lang,
    )

    result["requested_by"] = user_id
    result["role"] = user_role
    result["data"] = result.get("logs", [])
    return result
```

---

### 👩‍💻 สมาชิกคนที่ 2: Frontend Dashboard UI Components
* **ไฟล์ที่ 1:** `frontend/src/components/FilterBar.tsx`
* **สิ่งที่ต้องทำ:**
  * เพิ่ม prop `role?: string` และ `currentUserId?: string`
  * เมื่อ `role === 'student'`: ให้ช่องค้นหารหัสนักศึกษาอยู่ในสถานะ **`readOnly` / `disabled`** พร้อมแสดงรหัสนักศึกษาของตนเอง และมีไอคอนรูปกุญแจ 🔒
  * ตัวกรอง **ห้อง (Room), วันที่ (Date), เวลา (Time Slot), สถานะ (IN/OUT)** ให้เปิดใช้งานได้ตามปกติ

```tsx
// frontend/src/components/FilterBar.tsx
import { Search, Lock, Calendar, Clock, DoorClosed, Filter } from 'lucide-react';

interface FilterBarProps {
  filters: FilterParams;
  onChange: (field: keyof FilterParams, value: any) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading: boolean;
  role?: string;           // <--- เพิ่ม prop role
  currentUserId?: string;  // <--- รหัสนักศึกษาที่ล็อกอินอยู่
}

// ภายใน JSX ส่วนช่องค้นหารหัส:
<div className="relative">
  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
    {role === 'student' ? 'รหัสนักศึกษาของคุณ' : `${t('tableHeaderId')} / ${t('tableHeaderName')}`}
  </label>
  
  {role === 'student' ? (
    // 🔒 โหมดนักศึกษา: ล็อกรหัสของตนเอง ไม่ให้แก้ไข
    <div className="relative">
      <Lock className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        id="studentId"
        value={currentUserId || filters.studentId || ''}
        readOnly
        disabled
        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-semibold cursor-not-allowed select-none"
        title="ล็อกรหัสนักศึกษาของคุณอัตโนมัติ"
      />
    </div>
  ) : (
    // 🔓 โหมดอาจารย์: ค้นหาได้อิสระ
    <div className="relative">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        id="studentId"
        value={filters.studentId || ''}
        onChange={(e) => onChange('studentId', e.target.value)}
        placeholder={t('filterStudentPlaceholder')}
        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
      />
    </div>
  )}
</div>
```

* **ไฟล์ที่ 2:** `frontend/src/components/Header.tsx`
  * ปรับ Badge แสดง Role:
    ```tsx
    <span className={`inline-block mt-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${
      user?.role === 'student' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
    }`}>
      {user?.role === 'student' ? 'นักศึกษา (Student)' : t('lecturerRole')}
    </span>
    ```

---

### 👨‍💻 สมาชิกคนที่ 3: Frontend State & Integration
* **ไฟล์:** `frontend/src/app/dashboard/page.tsx`
* **สิ่งที่ต้องทำ:**
  1. ดึง `user` จาก `useAuth()`
  2. ส่ง `role={user?.role}` และ `currentUserId={user?.username}` ให้กับ `<FilterBar />`
  3. ฟังก์ชัน `handleReset()`: ถ้านักศึกษาเป็นผู้ใช้ ให้รีเซ็ตตัวกรองอื่น (ห้อง/วัน/เวลา) แต่คงค่า `studentId: user?.username` ไว้

```tsx
// frontend/src/app/dashboard/page.tsx
const { user, token, isAuthenticated, logout } = useAuth();

// กำหนด studentId เริ่มต้นถ้าเป็นนักศึกษา
useEffect(() => {
  if (user?.role === 'student' && user?.username) {
    setFilters((prev) => ({ ...prev, studentId: user.username }));
  }
}, [user]);

// เมื่อกด Reset ตัวกรอง
const handleReset = () => {
  const resetFilters: FilterParams = {
    studentId: user?.role === 'student' ? (user.username || '') : '', // คงรหัสนักศึกษาไว้
    room: 'all',
    date: '',
    timeSlot: 'all',
    status: 'all',
    page: 1,
    limit: 10,
    lang,
  };
  setFilters(resetFilters);
  loadData(resetFilters);
};

// ส่ง Props ให้ FilterBar:
<FilterBar
  filters={filters}
  onChange={handleFilterChange}
  onSearch={handleSearch}
  onReset={handleReset}
  isLoading={isLoading}
  role={user?.role}
  currentUserId={user?.username}
/>
```

---

### 👩‍💻 สมาชิกคนที่ 1: Frontend Authentication UI
* **ไฟล์:** `frontend/src/app/login/page.tsx`
* **สิ่งที่ต้องทำ:** ปรับ Placeholder และคำแนะนำ:
  * Placeholder: `"รหัสนักศึกษา หรือ Username อาจารย์"`
  * เพิ่มปุ่ม Demo สำหรับสิทธิ์นักศึกษา (เช่น `student_somchai`) เพื่อความสะดวกในการนำเสนอผลงาน

---

### 👨‍💻 สมาชิกคนที่ 7: DBA & QA Testing
* **ไฟล์:** `backend/tests/test_auth.py`
* **สิ่งที่ต้องทำ:** เขียน Test Case ตรวจสอบ:
  1. นักศึกษาล็อกอินแล้วยิงดูข้อมูลตนเองได้ (`200 OK`)
  2. ข้อมูลที่ได้รับคืนมาต้องมีเฉพาะ `student_id` ของตนเองเท่านั้น
  3. หากนักศึกษาพยายามส่ง `?student_id=รหัสเพื่อน` Backend จะต้องละเว้นและส่งคืนเฉพาะของตนเอง

```python
def test_student_isolation_security():
    # 1. Login เป็น student
    login_res = client.post("/api/v1/auth/login", json={"username": "student_somchai", "password": "1234"})
    token = login_res.json()["access_token"]
    
    # 2. พยายามเรียกดูข้อมูลของเพื่อน (IDOR Attempt)
    res = client.get("/api/v1/logs?student_id=65010234", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    
    # 3. ต้องได้เฉพาะข้อมูลของ student_somchai เท่านั้น
    assert data["role"] == "student"
    assert data["requested_by"] == "student_somchai"
    for item in data["data"]:
        assert item["student_id"] == "student_somchai"
```

---

## 5. การตรวจสอบความเรียบร้อย (Final Verification)

- [x] **Database Schema:** ตาราง `user` มีคอลัมน์ `role ENUM('teacher', 'student')` และ Index พร้อมใช้งาน
- [ ] **อาจารย์ (Teacher Flow):**
  - ค้นหารหัสนักศึกษาได้อิสระ
  - กรองห้อง, วัน, เวลา, สถานะได้
  - ตารางแสดงประวัติของนักศึกษาทุกคน
  - มี Audit Log บันทึกลงตาราง `user` (role='teacher')
- [ ] **นักศึกษา (Student Flow):**
  - ช่องรหัสนักศึกษาถูก **ล็อก (Lock 🔒 / Disabled)** แสดงรหัสตนเอง
  - กรองห้อง, วัน, เวลา, สถานะของตนเองได้
  - ตารางแสดงเฉพาะประวัติของตนเองเท่านั้น
  - Backend ป้องกัน IDOR อย่างสมบูรณ์
  - มี Audit Log บันทึกลงตาราง `user` (role='student')
- [ ] **กลุ่ม 3 Integration:** รองรับ Token Payload ตามสเปก `REPLY-GROUP4.md`

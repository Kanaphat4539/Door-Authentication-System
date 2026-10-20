# 📊 แผนภาพ Use Case Diagram ระบบเว็บแอปพลิเคชันกลุ่ม 4
**โครงการ:** ระบบจัดการการเข้าห้องเรียนอัจฉริยะ (Classroom Access Management System)  
**ระบบเครือข่าย:** VM4 Proxmox (`http://172.16.10.200:3001`)  

---

## 🖼️ แผนภาพ Use Case Diagram

```mermaid
flowchart LR
    %% Actors
    Student["🧑‍🎓 นักศึกษา (Student)"]
    Teacher["👨‍🏫 อาจารย์ (Teacher)"]

    %% System Boundary
    subgraph System ["ระบบจัดการการเข้าห้องเรียนและสถิติ (Classroom Access System)"]
        %% Common Use Cases
        UC_Login(["1. เข้าสู่ระบบ (Login)"])
        UC_Logout(["2. ออกจากระบบ (Logout)"])
        UC_Lang(["3. สลับภาษา (TH / EN)"])

        %% Student Use Cases
        UC_ViewOwn(["4. ดูประวัติการแตะบัตรเฉพาะของตนเอง (IDOR Guard)"])
        UC_FilterOwn(["5. กรองประวัติตนเอง (ห้องเรียน / วันที่ / เวลา)"])
        UC_ActiveOwn(["6. ตรวจสอบสถานะ 'กำลังใช้งาน' ของตนเอง"])
        UC_StatOwn(["7. ดูการ์ดสถิติส่วนบุคคล (ยอดเข้าห้องของฉัน)"])

        %% Teacher Use Cases
        UC_ViewAll(["8. ดูประวัติการแตะบัตรของทุกคนทุกห้องเรียน (RBAC)"])
        UC_Search(["9. ค้นหาประวัติตามรหัสนักศึกษา (Search Keyword)"])
        UC_FilterAll(["10. กรองประวัติภาพรวม (ห้องเรียน / วันที่ / เวลา)"])
        UC_ActiveAll(["11. ตรวจสอบคนกำลังใช้งานห้องล่าสุด (มีเฉพาะ IN ยังไม่ OUT)"])
        UC_StatAll(["12. ดูการ์ดสถิติภาพรวม (ห้องที่เปิดใช้งาน / ยอดรวมทั้งหมด)"])
    end

    %% External Systems
    subgraph External ["ระบบภายนอก (External Systems)"]
        G3["🔐 Central Auth API (กลุ่ม 3)"]
        G6["📡 IoT Card Readers (กลุ่ม 6)"]
    end

    %% Student Relationships
    Student --> UC_Login
    Student --> UC_Logout
    Student --> UC_Lang
    Student --> UC_StatOwn
    Student --> UC_ViewOwn
    Student --> UC_FilterOwn
    Student --> UC_ActiveOwn

    %% Teacher Relationships
    Teacher --> UC_Login
    Teacher --> UC_Logout
    Teacher --> UC_Lang
    Teacher --> UC_StatAll
    Teacher --> UC_ViewAll
    Teacher --> UC_Search
    Teacher --> UC_FilterAll
    Teacher --> UC_ActiveAll

    %% Include / External System Links
    UC_Login -.->|"<<include>> ยืนยันรหัสผ่าน & สิทธิ์"| G3
    UC_ViewOwn -.->|"<<include>> ข้อมูลแตะบัตร Real-time"| G6
    UC_ViewAll -.->|"<<include>> ข้อมูลแตะบัตร Real-time"| G6
    UC_ActiveAll -.->|"<<include>> ข้อมูลแตะบัตร Real-time"| G6
```

---

## 📋 รายละเอียดการเปรียบเทียบสิทธิ์และ Use Cases

| Use Case (ฟังก์ชันการใช้งาน) | นักศึกษา (Student) | อาจารย์ (Teacher) | คำอธิบายและมาตรการความปลอดภัย |
| :--- | :---: | :---: | :--- |
| **1. เข้าสู่ระบบ (Login)** | ✅ | ✅ | ส่งไปตรวจสอบ Username/Password กับ API กลุ่ม 3 |
| **2. ออกจากระบบ (Logout)** | ✅ | ✅ | ลบ Token ออกจาก Browser Session |
| **3. สลับภาษา (TH / EN)** | ✅ | ✅ | สลับภาษาในหน้า Dashboard และตารางข้อมูล |
| **4. ขอบเขตข้อมูลประวัติแตะบัตร** | **เฉพาะของตนเอง** | **ทุกคนทุกห้อง** | **IDOR Protection:** นักศึกษาจะถูกล็อก Scope ให้ดูได้เฉพาะของตนเองเสมอ |
| **5. ค้นหารหัสนักศึกษาคนอื่น** | ❌ *(ซ่อนช่องค้นหา)* | ✅ | อาจารย์สามารถพิมพ์ค้นหารหัสนักศึกษาเพื่อดูประวัติเจาะจงได้ |
| **6. กรองตามห้องเรียน / วันที่ / เวลา** | ✅ *(กรองเฉพาะของตนเอง)* | ✅ *(กรองภาพรวมทุกคน)* | กรองประวัติตามเงื่อนไขห้อง วันที่ และช่วงเวลา |
| **7. ค้นหาสถานะ "กำลังใช้งาน"** | ✅ | ✅ | แสดงเฉพาะคนที่กำลังใช้งานห้องเรียนล่าสุด (มีแค่ `IN` ยังไม่ `OUT`) |
| **8. การ์ดสถานะห้องเรียน (`activeRooms`)** | **ห้องที่ตนเองเข้าวันนี้** | **ทุกห้องที่เปิดใช้งานวันนี้** | คำนวณสรุปจำนวนห้องที่ active ตามขอบเขตบทบาท |
| **9. การ์ดยอดการเข้าใช้งาน (`totalAccess`)** | **ยอดสแกนบัตรของฉัน** | **ยอดสแกนบัตรของทุกคน** | สรุปจำนวนครั้งการแตะบัตรเข้า-ออกห้องเรียน |
| **10. การบันทึก Audit Log ลงตาราง `user`** | ✅ *(ViewOwnLogs)* | ✅ *(Search/Filter)* | บันทึกประวัติการสืบค้นเพื่อความปลอดภัยและตรวจสอบย้อนหลังได้ |

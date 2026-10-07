# Database Admin (Group 2) - CE Student User Management Portal

ระบบบริหารจัดการฐานข้อมูลผู้ใช้ (Central User Database) สำหรับโครงการควบคุมการเข้า-ออกและยืนยันตัวตนผ่าน Wi-Fi 802.1X (RADIUS)

## 📌 สถาปัตยกรรมระบบ (System Architecture)
- **Database Server:** PostgreSQL on Supabase
- **Admin & Student Web Portal:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Deployment Platform:** Vercel
- **Authentication Integration:** FreeRADIUS (Group 1) ผ่าน SQL query / radcheck view

## 🌿 Git Branching Model
- `main`: Production-ready release branch (Vercel Production)
- `DEV`: Integration and development branch (Vercel Preview / Staging)
- `feature/*`: Specific feature branches (branched from `DEV` and merged back to `DEV`)

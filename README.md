# Database Admin (Group 2) - CE Student User Management Portal

ระบบบริหารจัดการฐานข้อมูลผู้ใช้ (Central User Database) สำหรับโครงการควบคุมการเข้า-ออกและยืนยันตัวตนผ่าน Wi-Fi 802.1X (RADIUS)

## 📌 สถาปัตยกรรมระบบ (System Architecture)
- **Database Server:** PostgreSQL on Supabase
- **Admin & Student Web Portal:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Deployment Platform:** Vercel
- **Authentication Integration:** FreeRADIUS (Group 1) ผ่าน SQL query / radcheck view

## 🌿 Git Branching Model
- `main`: Production-ready release branch (Vercel Production)
- `DEV`: Integration and development branch (Vercel Preview / Staging)
- `feature/*`: Specific feature branches (branched from `DEV` and merged back to `DEV`)
  - `feature/init-nextjs`: Bootstrap Next.js 16 + Tailwind CSS + Supabase Client
  - `feature/supabase-schema`: Database SQL Schema, Supabase migrations & radcheck view
  - `feature/crud-portal`: Full CRUD Web Management UI for CE Student & Admin
  - `feature/radius-integration-hub`: RADIUS configuration guide and test tools

## 🚀 Getting Started

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Setup environment variables (สร้างไฟล์ `.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (optional for server-side admin)
```

3. Run development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

4. Build for Production:
```bash
npm run build
```

## 🌐 Deploy to Vercel
1. Push code to GitHub repository
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Set Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

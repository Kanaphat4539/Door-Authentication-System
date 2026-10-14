// ==========================================
// Dashboard JavaScript (เชื่อมโยง HTML, CSS, JS)
// ==========================================

// ภาษาปัจจุบัน (default: th)
let currentLang = 'th';

// คลังคำสำหรับสลับภาษา TH / EN
const i18nData = {
    th: {
        pageTitle: "ระบบติดตามการเข้าใช้ห้อง - ระบบบริหารจัดการการเข้าใช้ห้องเรียน",
        headerTitle: "ระบบบริหารจัดการการเข้าใช้ห้องเรียน",
        headerSubtitle: "ระบบบันทึกและติดตามการเข้าใช้งานห้องเรียนอัตโนมัติ",
        userName: "อาจารย์ ลูกอ๊อดตัวน้อย",
        userRole: "อาจารย์ผู้สอน",
        roleBadge: "อาจารย์ผู้สอน",
        logoutBtn: "ออกจากระบบ",
        logoutConfirm: "คุณต้องการออกจากระบบหรือไม่?",
        dashboardTitle: "ระบบติดตามการเข้าใช้ห้อง",
        refreshBtn: "รีเฟรชข้อมูล",
        stat1Title: "ห้องเรียนที่เปิดใช้งานอยู่ขณะนี้",
        stat1Desc: "สถานะห้องเรียนที่เปิดใช้งาน",
        stat1Unit: "/ 8 ห้อง",
        stat2Title: "จำนวนการเข้าใช้งานวันนี้",
        stat2Desc: "ยอดการเข้าห้องเรียนวันนี้",
        stat2Unit: "ครั้ง",
        labelStudentId: "รหัสนักศึกษา",
        phStudentId: "ระบุรหัสนักศึกษา...",
        labelClassroom: "ห้องเรียน",
        optAllRooms: "ทุกห้องเรียน",
        labelRecordDate: "วันที่บันทึก",
        valDate: "",
        labelTimeSlot: "ช่วงเวลา",
        optAllTime: "ทุกช่วงเวลา",
        tableHeaderTitle: "ประวัติการเข้า-ออกห้องเรียนล่าสุด",
        tableHeaderSub: "บันทึกการแตะบัตรห้องเรียนแบบเรียลไทม์ • ซิงค์อัตโนมัติทุก 10 วินาที",
        thTimestamp: "วันและเวลา",
        thStudentId: "รหัสนักศึกษา",
        thFullName: "ชื่อ-นามสกุล",
        thClassroom: "ห้องเรียน",
        thStatus: "สถานะการเข้าใช้ห้อง",
        noData: "ยังไม่มีข้อมูลในขณะนี้",
        noDataSub: "ระบบจะแสดงรายการอัตโนมัติเมื่อมีการบันทึกการแตะบัตรเข้าห้องเรียน",
        paginationInfo: "แสดง {from} ถึง {to} จากทั้งหมด {total} รายการ",
        loadingText: "กำลังโหลดข้อมูล...",
        statusIn: "เข้าใช้ห้องเรียน",
        statusOut: "ออกจากห้องเรียน",
        labelStatus: "สถานะ",
        optAllStatus: "ทุกสถานะ",
        optStatusIn: "เข้าห้อง (IN)",
        optStatusOut: "ออกห้อง (OUT)"
    },
    en: {
        pageTitle: "Room Access Tracking Dashboard - Classroom Access Management",
        headerTitle: "ระบบบริหารจัดการการเข้าใช้ห้องเรียน",
        headerSubtitle: "ระบบบันทึกและติดตามการเข้าใช้งานห้องเรียนอัตโนมัติ",
        userName: "อาจารย์ ลูกอ๊อดตัวน้อย",
        userRole: "Lecturer",
        roleBadge: "Lecturer",
        logoutBtn: "Logout",
        logoutConfirm: "Are you sure you want to log out?",
        dashboardTitle: "Room Access Tracking Dashboard",
        refreshBtn: "Refresh Data",
        stat1Title: "Active Classrooms Status",
        stat1Desc: "Classroom Operating Status",
        stat1Unit: "/ 8 Rooms",
        stat2Title: "Total Daily Access",
        stat2Desc: "Today's Total Entries",
        stat2Unit: "Entries",
        labelStudentId: "Student ID",
        phStudentId: "Enter student ID...",
        labelClassroom: "Classroom",
        optAllRooms: "All Classrooms",
        labelRecordDate: "Record Date",
        valDate: "",
        labelTimeSlot: "Time Slot",
        optAllTime: "All Time Slots",
        tableHeaderTitle: "Recent Classroom Access Logs",
        tableHeaderSub: "Real-time smart badge tap records • Auto-synced every 10 seconds",
        thTimestamp: "TIMESTAMP",
        thStudentId: "STUDENT ID",
        thFullName: "FULL NAME",
        thClassroom: "CLASSROOM",
        thStatus: "ACCESS STATUS",
        noData: "No data available at the moment",
        noDataSub: "Records will appear automatically when access logs are recorded.",
        paginationInfo: "Showing {from} to {to} of {total} entries",
        loadingText: "Loading data...",
        statusIn: "Entering Classroom",
        statusOut: "Leaving Classroom",
        labelStatus: "Status",
        optAllStatus: "All Statuses",
        optStatusIn: "Entering (IN)",
        optStatusOut: "Leaving (OUT)"
    }
};

// เก็บข้อมูล logs ปัจจุบัน (เริ่มต้นเป็นค่าว่างเมื่อยังไม่มีข้อมูล)
let currentLogs = [];

// ฟังก์ชันแสดงสถานะกำลังโหลด (Loading State)
function renderLoadingState() {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr class="empty-row">
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 48px;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--accent-blue); margin-bottom: 8px;"></i>
                <div>${i18nData[currentLang].loadingText}</div>
            </td>
        </tr>
    `;
}

// อัปเดตตัวเลขสถิติบนการ์ดด้านบน
function updateStats(activeRooms = 0, totalAccess = 0) {
    const activeRoomsEl = document.getElementById('activeRoomsNum');
    const totalAccessEl = document.getElementById('totalAccessNum');
    if (activeRoomsEl) activeRoomsEl.innerText = activeRooms;
    if (totalAccessEl) totalAccessEl.innerText = Number(totalAccess).toLocaleString();
}

// อัปเดตข้อความ Pagination และสถานะของปุ่ม
function updatePagination(pagination = {}) {
    const paginationEl = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const currentBtn = document.getElementById('currentPageBtn');

    // รองรับทั้งกรณีส่งเป็น number (totalCount) หรือ object จาก Backend
    const isObject = typeof pagination === 'object' && pagination !== null;
    const page = isObject ? (pagination.page || 1) : 1;
    const limit = isObject ? (pagination.limit || 10) : 10;
    const total = isObject ? (pagination.total ?? 0) : (Number(pagination) || 0);
    const totalPages = isObject ? (pagination.totalPages || Math.max(1, Math.ceil(total / limit))) : Math.max(1, Math.ceil(total / limit));

    if (currentBtn) currentBtn.innerText = page;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (!paginationEl) return;

    if (total === 0) {
        paginationEl.innerText = (currentLang === 'th') 
            ? "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ" 
            : "Showing 0 to 0 of 0 entries";
    } else {
        const from = (page - 1) * limit + 1;
        const to = Math.min(page * limit, total);
        const template = i18nData[currentLang].paginationInfo;
        paginationEl.innerText = template
            .replace('{from}', from.toLocaleString())
            .replace('{to}', to.toLocaleString())
            .replace('{total}', total.toLocaleString());
    }
}

// ฟังก์ชันเรนเดอร์แถวในตาราง
function renderTable(data = []) {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // หากไม่มีข้อมูล ให้แสดงข้อความ Empty State ที่ระบุว่า "ยังไม่มีข้อมูลในขณะนี้"
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                  <div class="empty-state-container">
                    <i class="fa-regular fa-folder-open empty-state-icon"></i>
                    <div class="empty-state-title" data-i18n="noData">
                      ${i18nData[currentLang].noData}
                    </div>
                    <div class="empty-state-desc" data-i18n="noDataSub">
                      ${i18nData[currentLang].noDataSub}
                    </div>
                  </div>
                </td>
            </tr>
        `;
        updatePagination(0);
        return;
    }

    data.forEach(log => {
        const tr = document.createElement('tr');

        let statusText = '';
        let badgeClass = 'status-success';

        if (log.status === 'IN') {
            statusText = i18nData[currentLang].statusIn;
            badgeClass = 'status-success'; // สีเขียว
        } else if (log.status === 'OUT') {
            statusText = i18nData[currentLang].statusOut;
            badgeClass = 'status-gray'; // สีเทา
        } else {
            statusText = log.status;
            badgeClass = 'status-warning';
        }

        const displayName = (currentLang === 'en' && log.nameEn) ? log.nameEn : (log.name || log.student_name || '-');
        const displayRoomSub = (currentLang === 'en' && log.roomSubEn) ? log.roomSubEn : (log.roomSub || '');
        const displayDate = (currentLang === 'en' && log.dateEn) ? log.dateEn : (log.date || log.dateRaw || '-');
        const displayTime = (currentLang === 'en' && log.timeEn) ? log.timeEn : (log.time || '-');

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${displayTime}</div>
                <div class="room-sub">${displayDate}</div>
            </td>
            <td><a href="#" class="student-link" onclick="event.preventDefault();">${log.id || log.student_id || '-'}</a></td>
            <td style="font-weight: 500;">${displayName}</td>
            <td>
                <div style="font-weight: 600;">${log.room || '-'}</div>
                <div class="room-sub">${displayRoomSub}</div>
            </td>
            <td>
                <span class="status-badge ${badgeClass}">
                    <span class="dot"></span>
                    ${statusText}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePagination(data.length);
}

// ฟังก์ชันสำหรับดึงข้อมูลจาก Backend API
async function loadDashboardData(searchParams = {}) {
    renderLoadingState();

    try {
        const queryObj = { lang: currentLang, ...searchParams };
        Object.keys(queryObj).forEach(key => {
            if (queryObj[key] === '' || queryObj[key] === null || queryObj[key] === undefined || queryObj[key] === 'all') {
                delete queryObj[key];
            }
        });
        const queryString = new URLSearchParams(queryObj).toString();
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
            ? CONFIG.API_BASE_URL
            : 'http://192.168.50.86:8000/api/v1';
        const apiUrl = queryString ? `${baseUrl}/logs?${queryString}` : `${baseUrl}/logs`;

        const response = await fetch(apiUrl, { headers });
        if (!response.ok) {
            throw new Error('ไม่พบข้อมูลจากเซิร์ฟเวอร์');
        }

        const result = await response.json();
        const logs = result.logs || [];

        // อัปเดตสถิติจากการตอบกลับของ API
        updateStats(result.activeRooms ?? 0, result.totalAccess ?? 0);
        currentLogs = logs;
        renderTable(currentLogs);

    } catch (error) {
        // กรณีไม่มีข้อมูล หรือยังไม่ได้เชื่อมต่อ Backend ให้แสดง Empty State
        currentLogs = [];
        updateStats(0, 0);
        renderTable([]);
    }
}

// ฟังก์ชันสลับภาษาของ UI
function switchLanguage(lang) {
    currentLang = lang;
    const texts = i18nData[lang];

    // อัปเดตข้อความทั่วไปที่มี data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) {
            el.innerText = texts[key];
        }
    });

    // อัปเดต placeholder
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (texts[key]) {
            el.placeholder = texts[key];
        }
    });

    // อัปเดตปุ่มสลับภาษา
    const btnTH = document.getElementById('btnTH');
    const btnEN = document.getElementById('btnEN');
    if (btnTH) btnTH.classList.toggle('active', lang === 'th');
    if (btnEN) btnEN.classList.toggle('active', lang === 'en');

    // Live Badge
    const liveBadge = document.getElementById('liveBadge');
    if (liveBadge) {
        liveBadge.style.display = lang === 'en' ? 'flex' : 'none';
    }

    // เรนเดอร์ตารางและ Pagination ในภาษาใหม่
    renderTable(currentLogs);
}

// ตั้งค่าระบบ Dropdown ของโปรไฟล์ผู้ใช้
function setupProfileDropdown() {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!userProfileBtn || !profileDropdown) return;

    // คลิกเปิด/ปิด Dropdown
    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = profileDropdown.classList.toggle('show');
        userProfileBtn.classList.toggle('active', isOpen);
    });

    // คลิกที่อื่นเพื่อปิด Dropdown
    document.addEventListener('click', (e) => {
        if (!userProfileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
            userProfileBtn.classList.remove('active');
        }
    });

    // กดปุ่ม Escape เพื่อปิด Dropdown
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            profileDropdown.classList.remove('show');
            userProfileBtn.classList.remove('active');
        }
    });

    // จัดการปุ่มออกจากระบบ (เชื่อมต่อกับคนที่ 1)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const confirmed = confirm(i18nData[currentLang].logoutConfirm);
            if (confirmed) {
                // ล้าง Token และ User Session
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Redirect กลับไปหน้า Login
                window.location.href = '../login/index.html';
            }
        });
    }
}

// ==========================================
// Authentication & User Integration (เชื่อมต่อกับคนที่ 1)
// ==========================================

// ตรวจสอบสิทธิ์การเข้าใช้งาน (Route Guard)
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        // หากยังไม่ได้เข้าสู่ระบบ ให้ Redirect ไปที่หน้า Login ของคนที่ 1
        window.location.href = '../login/index.html';
        return false;
    }
    return true;
}

// ดึงข้อมูลโปรไฟล์ผู้ใช้จากคนที่ 1 มาแสดงบน Header และ Dropdown
function loadUserProfile() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const displayName = user.username || user.name || 'อาจารย์';

            // อัปเดตคลังคำเพื่อให้การสลับภาษาไม่เขียนทับชื่อผู้ใช้จริง
            if (i18nData.th) i18nData.th.userName = displayName;
            if (i18nData.en) i18nData.en.userName = user.nameEn || displayName;
            
            // อัปเดตชื่อผู้ใช้
            document.querySelectorAll('.user-name, [data-i18n="userName"]').forEach(el => {
                el.innerText = displayName;
            });

            // อัปเดตอีเมล (ถ้ามี)
            const userEmailEl = document.querySelector('.dropdown-user-info p');
            if (userEmailEl) {
                userEmailEl.innerText = user.email || `${user.username || 'user'}@university.ac.th`;
            }

            // อัปเดต Role
            const roleBadge = document.querySelector('.role-badge');
            if (roleBadge && user.role) {
                const roleText = (user.role.toLowerCase() === 'teacher') 
                    ? (currentLang === 'th' ? 'อาจารย์ผู้สอน' : 'Lecturer') 
                    : user.role;
                roleBadge.innerText = roleText;
            }
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }
}

// ดึงพารามิเตอร์จากฟิลเตอร์ในหน้าจอ
function getFilterParams() {
    const studentIdInput = document.getElementById('studentId');
    const roomSelect = document.getElementById('roomSelect');
    const dateSelect = document.getElementById('dateSelect');
    const timeSelect = document.getElementById('timeSelect');

    return {
        student_id: studentIdInput ? studentIdInput.value.trim() : '',
        room: roomSelect ? roomSelect.value : 'all',
        date: dateSelect ? dateSelect.value : '',
        time_slot: timeSelect ? timeSelect.value : 'all'
    };
}

// ทำงานเมื่อโครงสร้าง DOM โหลดเสร็จสิ้น
document.addEventListener('DOMContentLoaded', () => {
    // 0. ตรวจสอบสิทธิ์การเข้าใช้งาน (ถ้ายังไม่ล็อกอินจะเด้งไปหน้า Login ทันที)
    if (!checkAuth()) return;

    // 0.1 โหลดข้อมูลโปรไฟล์ผู้ใช้ที่ล็อกอินเข้ามา
    loadUserProfile();

    // 1. ตั้งค่าปุ่มสลับภาษา
    const btnTH = document.getElementById('btnTH');
    const btnEN = document.getElementById('btnEN');
    if (btnTH) btnTH.addEventListener('click', () => switchLanguage('th'));
    if (btnEN) btnEN.addEventListener('click', () => switchLanguage('en'));

    // 2. ติดตั้ง User Profile Dropdown
    setupProfileDropdown();

    // 3. ติดตั้ง Event ค้นหาและกรองข้อมูล
    const searchBtn = document.getElementById('searchBtn');
    const studentIdInput = document.getElementById('studentId');
    const roomSelect = document.getElementById('roomSelect');
    const timeSelect = document.getElementById('timeSelect');
    const dateSelect = document.getElementById('dateSelect');
    const refreshBtn = document.getElementById('refreshBtn');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            loadDashboardData(getFilterParams());
        });
    }

    if (studentIdInput) {
        studentIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadDashboardData(getFilterParams());
            }
        });
    }

    if (roomSelect) {
        roomSelect.addEventListener('change', () => {
            loadDashboardData(getFilterParams());
        });
    }

    if (timeSelect) {
        timeSelect.addEventListener('change', () => {
            loadDashboardData(getFilterParams());
        });
    }

    if (dateSelect) {
        dateSelect.addEventListener('change', () => {
            loadDashboardData(getFilterParams());
        });
    }

    // 4. ติดตั้งปุ่มรีเฟรชข้อมูล
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');

            // รีเซ็ตค่าฟิลเตอร์
            if (studentIdInput) studentIdInput.value = '';
            if (roomSelect) roomSelect.value = 'all';
            if (timeSelect) timeSelect.value = 'all';
            if (dateSelect) dateSelect.value = '';

            loadDashboardData({}).finally(() => {
                setTimeout(() => {
                    if (icon) icon.classList.remove('fa-spin');
                }, 600);
            });
        });
    }

    // 5. โหลดข้อมูลตั้งต้นของ Dashboard (แสดง Empty State ทันที)
    switchLanguage('th');
    loadDashboardData({});
});
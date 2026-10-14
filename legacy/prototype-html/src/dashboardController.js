/**
 * dashboardController.js
 * 
 * คนที่ 3: Frontend Developer (State Management & Search Integration)
 * หน้าที่หลัก:
 * 1. จัดการ Application State (State Management) สำหรับตัวกรอง, Pagination, และข้อมูล Access Logs
 * 2. เชื่อมโยง UI Components ของคนที่ 2 เข้ากับ Backend API ของคนที่ 6
 * 3. จัดการสถานะการแสดงผล: Loading State, Empty State, และ Error Handling
 * 4. แนบ Authorization Bearer Token จากคนที่ 1 และจัดการกรณี Session หมดอายุ (401 Redirect)
 * 5. จัดการระบบ Pagination (Next / Prev Page)
 * 6. ระบบ Auto-Sync ข้อมูลทุก 10 วินาทีแบบ Real-time พร้อม Live Badge
 */

(function () {
  'use strict';

  // 1. Centralized Application State
  const State = {
    filters: {
      student_id: '',
      room: 'all',
      date: '',
      time_slot: 'all',
      status: 'all',
      lang: 'th'
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
    },
    stats: {
      activeRooms: 0,
      totalAccess: 0
    },
    logs: [],
    isLoading: false,
    autoSyncTimer: null,
    isInputFocused: false
  };

  /**
   * ดึงค่าตัวกรองปัจจุบันจากฟอร์มในหน้าจอ (เชื่อมต่อกับคอมโพเนนต์ของคนที่ 2)
   */
  function syncFiltersFromUI() {
    const studentIdEl = document.getElementById('studentId');
    const roomSelectEl = document.getElementById('roomSelect');
    const dateSelectEl = document.getElementById('dateSelect');
    const timeSelectEl = document.getElementById('timeSelect');

    State.filters.student_id = studentIdEl ? studentIdEl.value.trim() : '';
    State.filters.room = roomSelectEl ? roomSelectEl.value : 'all';
    State.filters.date = dateSelectEl ? dateSelectEl.value : '';
    State.filters.time_slot = timeSelectEl ? timeSelectEl.value : 'all';
    State.filters.status = 'all';
    State.filters.lang = (typeof currentLang !== 'undefined') ? currentLang : 'th';
  }

  /**
   * ล้างค่าตัวกรองในฟอร์มกลับเป็นค่าเริ่มต้น
   */
  function resetFilterUI() {
    const studentIdEl = document.getElementById('studentId');
    const roomSelectEl = document.getElementById('roomSelect');
    const dateSelectEl = document.getElementById('dateSelect');
    const timeSelectEl = document.getElementById('timeSelect');

    if (studentIdEl) studentIdEl.value = '';
    if (roomSelectEl) roomSelectEl.value = 'all';
    if (dateSelectEl) dateSelectEl.value = '';
    if (timeSelectEl) timeSelectEl.value = 'all';

    syncFiltersFromUI();
  }

  /**
   * ฟังก์ชันหลักในการดึงข้อมูลจาก API (จัดการ State, Loading, Error, Pagination)
   * @param {boolean} isSilentRefresh - หากเป็น true (เช่น auto-sync) จะไม่อัปเดต Loading Spinner ให้เสียสมาธิ
   */
  async function loadData(isSilentRefresh = false) {
    if (State.isLoading) return;

    // ตรวจสอบ Token จากคนที่ 1
    const token = localStorage.getItem('token');
    if (!token) {
      handleAuthFailure('กรุณาเข้าสู่ระบบก่อนใช้งาน');
      return;
    }

    State.isLoading = true;

    // เรียกฟังก์ชันเรนเดอร์ Loading State ของคนที่ 2
    if (!isSilentRefresh && typeof renderLoadingState === 'function') {
      renderLoadingState();
    }

    try {
      const requestParams = {
        ...State.filters,
        page: State.pagination.page,
        limit: State.pagination.limit,
        lang: (typeof currentLang !== 'undefined') ? currentLang : State.filters.lang
      };

      // เรียก API Service ของคนที่ 3 (src/api/logService.js)
      const fetchFn = (typeof LogService !== 'undefined' && LogService.fetchDashboardData)
        ? LogService.fetchDashboardData
        : (typeof fetchDashboardData === 'function' ? fetchDashboardData : null);

      if (!fetchFn) {
        throw new Error('ไม่พบโมดูล API Service (logService.js)');
      }

      const result = await fetchFn(requestParams, token);

      // อัปเดตข้อมูล State
      State.stats.activeRooms = result.activeRooms ?? 0;
      State.stats.totalAccess = result.totalAccess ?? 0;
      State.logs = Array.isArray(result.logs) ? result.logs : [];

      if (result.pagination) {
        State.pagination.page = result.pagination.page;
        State.pagination.limit = result.pagination.limit;
        State.pagination.total = result.pagination.total;
        State.pagination.totalPages = result.pagination.totalPages;
      } else {
        State.pagination.total = State.logs.length;
        State.pagination.totalPages = Math.max(1, Math.ceil(State.logs.length / State.pagination.limit));
      }

      // นำข้อมูลไปแสดงผลบน UI ของคนที่ 2
      if (typeof updateStats === 'function') {
        updateStats(State.stats.activeRooms, State.stats.totalAccess);
      }

      if (typeof renderTable === 'function') {
        renderTable(State.logs);
      }

      if (typeof updatePagination === 'function') {
        updatePagination(State.pagination);
      }

      // แสดง Live Stream Badge เพื่อยืนยันว่าระบบเชื่อมต่อสมบูรณ์
      const liveBadge = document.getElementById('liveBadge');
      if (liveBadge) {
        liveBadge.style.display = 'flex';
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);

      // จัดการกรณี 401 Unauthorized หรือ Token หมดอายุ (เชื่อมต่อกับคนที่ 1)
      if (error && error.isAuthError) {
        handleAuthFailure(error.message || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        return;
      }

      // กรณีเกิด Network Error หรือ Backend ออฟไลน์
      if (!isSilentRefresh) {
        if (typeof renderTable === 'function') {
          renderTable([]); // แสดง Empty State อัตโนมัติ
        }
        if (typeof updateStats === 'function') {
          updateStats(0, 0);
        }
        if (typeof updatePagination === 'function') {
          updatePagination({ page: 1, limit: State.pagination.limit, total: 0, totalPages: 1 });
        }
      }
    } finally {
      State.isLoading = false;
    }
  }

  /**
   * จัดการเมื่อ Token หมดอายุหรือไม่ถูกต้อง (Redirect กลับไปหน้า Login ของคนที่ 1)
   */
  function handleAuthFailure(message) {
    if (State.autoSyncTimer) {
      clearInterval(State.autoSyncTimer);
      State.autoSyncTimer = null;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert(message);
    window.location.href = '../login/index.html';
  }

  /**
   * ติดตั้ง Event Listeners บน UI Controls ของคนที่ 2
   */
  function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const studentIdInput = document.getElementById('studentId');
    const roomSelect = document.getElementById('roomSelect');
    const dateSelect = document.getElementById('dateSelect');
    const timeSelect = document.getElementById('timeSelect');
    const statusSelect = document.getElementById('statusSelect');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const btnTH = document.getElementById('btnTH');
    const btnEN = document.getElementById('btnEN');

    // 1. กดค้นหา -> รีเซ็ตหน้าเป็นหน้า 1 และโหลดข้อมูล
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        syncFiltersFromUI();
        State.pagination.page = 1;
        loadData(false);
      });
    }

    // 2. พิมพ์ในช่องค้นหาแล้วกด Enter
    if (studentIdInput) {
      studentIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          syncFiltersFromUI();
          State.pagination.page = 1;
          loadData(false);
        }
      });
      // ติดตาม Focus เพื่อไม่ให้ Auto-Sync รบกวนขณะพิมพ์
      studentIdInput.addEventListener('focus', () => { State.isInputFocused = true; });
      studentIdInput.addEventListener('blur', () => { State.isInputFocused = false; });
    }

    // 3. เปลี่ยนค่าใน Select ต่างๆ -> ค้นหาทันที
    [roomSelect, dateSelect, timeSelect].forEach(el => {
      if (el) {
        el.addEventListener('change', () => {
          syncFiltersFromUI();
          State.pagination.page = 1;
          loadData(false);
        });
      }
    });

    // 4. ปุ่มรีเฟรช -> รีเซ็ตฟิลเตอร์และกลับสู่หน้า 1
    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const icon = refreshBtn.querySelector('i');
        if (icon) icon.classList.add('fa-spin');

        resetFilterUI();
        State.pagination.page = 1;

        loadData(false).finally(() => {
          setTimeout(() => {
            if (icon) icon.classList.remove('fa-spin');
          }, 600);
        });
      });
    }

    // 5. ปุ่ม Pagination: หน้าก่อนหน้า (Previous Page)
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (State.pagination.page > 1) {
          State.pagination.page -= 1;
          loadData(false);
        }
      });
    }

    // 6. ปุ่ม Pagination: หน้าถัดไป (Next Page)
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (State.pagination.page < State.pagination.totalPages) {
          State.pagination.page += 1;
          loadData(false);
        }
      });
    }

    // 7. สลับภาษา -> โหลดข้อมูลซ้ำด้วยภาษาใหม่
    if (btnTH) {
      btnTH.addEventListener('click', () => {
        State.filters.lang = 'th';
        loadData(false);
      });
    }
    if (btnEN) {
      btnEN.addEventListener('click', () => {
        State.filters.lang = 'en';
        loadData(false);
      });
    }
  }

  /**
   * ติดตั้งระบบ Auto-Sync / Polling ทุก 10 วินาทีตามสเปก
   */
  function startAutoSync() {
    if (State.autoSyncTimer) {
      clearInterval(State.autoSyncTimer);
    }

    // Polling ทุก 10,000 มิลลิวินาที (10 วินาที)
    State.autoSyncTimer = setInterval(() => {
      // หากผู้ใช้กำลังพิมพ์ค้นหาอยู่ จะพักการ Polling ไว้ชั่วคราวเพื่อไม่ให้ขัดจังหวะ
      if (!State.isInputFocused && !State.isLoading) {
        syncFiltersFromUI();
        loadData(true); // โหมด Silent Refresh ไม่แสดง spinner ให้รบกวนสายตา
      }
    }, 10000);
  }

  /**
   * เริ่มต้นการทำงานของ Controller
   */
  function init() {
    // 1. ตรวจสอบสิทธิ์ Route Guard
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.replace('../login/index.html');
      return;
    }

    // 2. เชื่อมโยง Event Listeners
    setupEventListeners();

    // 3. เริ่มต้นโหลดข้อมูลรอบแรก
    syncFiltersFromUI();
    loadData(false);

    // 4. เปิดระบบ Auto-Sync ทุก 10 วินาที
    startAutoSync();
  }

  // ผูกเข้ากับ Lifecycle เมื่อ DOM โหลดเสร็จสิ้น
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ส่งออกฟังก์ชันสู่ Window เผื่อให้ภายนอกเรียกใช้งานได้
  window.DashboardController = {
    getState: () => ({ ...State }),
    refresh: () => loadData(false),
    loadPage: (page) => {
      State.pagination.page = page;
      loadData(false);
    }
  };

  // Override loadDashboardData เดิมเพื่อให้รองรับโค้ดเก่า
  window.loadDashboardData = function (params) {
    if (params) {
      State.filters = { ...State.filters, ...params };
    }
    return loadData(false);
  };

})();

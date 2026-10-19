async function loginAPI(username, password) {
    let response;
    try {
        response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.AUTH_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    } catch {
        throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบเครือข่ายและลองใหม่');
    }
    if (response.status === 401) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (!response.ok) {
        throw new Error('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error('ข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง');
    }
    if (data?.status !== 'success' || typeof data.access_token !== 'string' ||
        !data.access_token.trim() || typeof data.token_type !== 'string' ||
        data.token_type.toLowerCase() !== 'bearer' ||
        typeof data.user?.username !== 'string' || typeof data.user?.role !== 'string') {
        throw new Error('ข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ครบถ้วน');
    }
    return data;
}

// Temporary integration test: Frontend Login (member 1) + Backend Auth (member 4).
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const btnSubmit = document.getElementById("btnSubmit");
const btnText = document.getElementById("btnText");
const alertError = document.getElementById("alertError");

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.getAttribute("type") === "password";
  passwordInput.setAttribute("type", isPassword ? "text" : "password");
  togglePassword.classList.toggle("fa-eye");
  togglePassword.classList.toggle("fa-eye-slash");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (btnSubmit.disabled) return;
  hideError();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showError("กรุณากรอก Username และ Password ให้ครบถ้วน");
    return;
  }
  setLoading(true);
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const result = await loginAPI(username, password);
    try {
      localStorage.setItem("token", result.access_token);
      localStorage.setItem("user", JSON.stringify(result.user));
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      throw new Error(
        "ไม่สามารถบันทึกการเข้าสู่ระบบได้ กรุณาอนุญาตให้เบราว์เซอร์จัดเก็บข้อมูล",
      );
    }
    // Only enabled here for the temporary integration test.
    console.log("ล็อกอินสำเร็จ! ข้อมูลตอบกลับจากคนที่ 4:", result);
    // เด้งเข้าสู่หน้า Dashboard ทันที
    window.location.href = "../dashboard/index.html";
  } catch (error) {
    showError(error.message || "ไม่สามารถเชื่อมต่อกับ Server ได้");
  } finally {
    setLoading(false);
  }
});

function showError(message) {
  alertError.innerText = message;
  alertError.style.display = "block";
}
function hideError() {
  alertError.innerText = "";
  alertError.style.display = "none";
}
function setLoading(isLoading) {
  btnSubmit.disabled = isLoading;
  btnText.innerText = isLoading ? "Signing In..." : "Sign In";
}

// ปุ่มจำลองการเข้าสู่ระบบสำหรับทดสอบ (Demo Login)
const btnDemoLogin = document.getElementById("btnDemoLogin");
if (btnDemoLogin) {
  btnDemoLogin.addEventListener("click", () => {
    localStorage.setItem("token", "mock-jwt-bearer-token-teacher-dev");
    localStorage.setItem(
      "user",
      JSON.stringify({
        username: "ajarn_security",
        name: "อาจารย์ สมชาย ใจดี",
        nameEn: "Dr. Somchai Jaidee",
        role: "teacher",
        email: "ajarn.somchai@university.ac.th"
      })
    );
    window.location.href = "../dashboard/index.html";
  });
}

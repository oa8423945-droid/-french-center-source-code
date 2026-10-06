const form = document.getElementById('loginForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const errorBox = document.getElementById('loginError');
const submitButton = document.getElementById('loginButton');
const togglePassword = document.getElementById('togglePassword');
const setupForm = document.getElementById('setupForm');
const setupUsername = document.getElementById('setupUsername');
const setupPassword = document.getElementById('setupPassword');
const setupConfirmPassword = document.getElementById('setupConfirmPassword');
const setupError = document.getElementById('setupError');
const setupButton = document.getElementById('setupButton');
const loginTitle = document.getElementById('loginTitle');
const loginIntro = document.querySelector('.login-card > .intro');

async function checkFirstRunSetup() {
  try {
    const response = await fetch('/api/setup-status', { headers: { Accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.setupRequired) return;
    form.hidden = true;
    togglePassword.hidden = true;
    setupForm.hidden = false;
    loginTitle.textContent = 'إعداد المدير الأول';
    loginIntro.textContent = 'أنشئ حساب المدير الأول لبدء استخدام نظام المركز الفرنسي.';
  } catch (_) {
    // تظل شاشة الدخول ظاهرة إذا تعذر فحص حالة الإعداد.
  }
}

setupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setupError.textContent = '';
  const name = setupUsername.value.trim();
  if (name.length < 2 || name.length > 80) { setupError.textContent = 'اسم المستخدم يجب أن يكون بين حرفين و80 حرفًا.'; return; }
  if (setupPassword.value.length < 12) { setupError.textContent = 'كلمة المرور يجب ألا تقل عن 12 حرفًا.'; return; }
  if (setupPassword.value !== setupConfirmPassword.value) { setupError.textContent = 'تأكيد كلمة المرور غير مطابق.'; setupConfirmPassword.select(); return; }
  setupButton.disabled = true;
  setupButton.textContent = 'جارٍ إنشاء حساب المدير...';
  try {
    const response = await fetch('/api/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: name, password: setupPassword.value, confirmPassword: setupConfirmPassword.value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر إنشاء حساب المدير.');
    window.location.replace('/');
  } catch (error) {
    setupError.textContent = error.message;
    if (error.message.includes('بالفعل')) {
      setupForm.hidden = true;
      form.hidden = false;
      togglePassword.hidden = false;
      loginTitle.textContent = 'تسجيل الدخول';
      loginIntro.textContent = 'أدخل بيانات المستخدم المسجلة لفتح نظام المركز الفرنسي.';
    }
  } finally {
    setupButton.disabled = false;
    setupButton.textContent = 'إنشاء حساب المدير';
  }
});

togglePassword.addEventListener('click', () => {
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  togglePassword.textContent = visible ? 'إظهار' : 'إخفاء';
  togglePassword.setAttribute('aria-label', visible ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  if (!username.value.trim() || !password.value) {
    errorBox.textContent = 'اكتب اسم المستخدم وكلمة المرور.';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ تسجيل الدخول...';
  document.body.classList.add('is-authenticating');
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim(), password: password.value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر تسجيل الدخول.');
    window.location.replace('/');
  } catch (error) {
    document.body.classList.remove('is-authenticating');
    errorBox.textContent = error.message;
    password.select();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'دخول إلى النظام';
  }
});

checkFirstRunSetup();

const form = document.getElementById('loginForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const errorBox = document.getElementById('loginError');
const submitButton = document.getElementById('loginButton');
const togglePassword = document.getElementById('togglePassword');

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

const API = {
  auth: '/api/auth',
  users: '/api/users'
};

function token() { return localStorage.getItem('rrr_token'); }
function setToken(t) { localStorage.setItem('rrr_token', t); }
function clearToken() { localStorage.removeItem('rrr_token'); }

async function req(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const r = await fetch(url, { ...opts, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || r.statusText);
  return j;
}

document.addEventListener('DOMContentLoaded', () => {
  // elements (optional if they exist)
  const authSection = document.getElementById('auth-section');
  const profileSection = document.getElementById('profile-section');
  const signInForm = document.getElementById('form-signin');
  const signUpForm = document.getElementById('form-signup');

  const pfEmail = document.getElementById('pf-email');
  const pfName = document.getElementById('pf-name');
  const pfId = document.getElementById('pf-id');

  const msg = document.getElementById('account-msg');

  function showAuth() {
    if (authSection) authSection.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
  }
  function showProfile() {
    if (authSection) authSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';
  }
  function setMsg(t) { if (msg) msg.textContent = t || ''; }

  async function loadMe() {
    if (!token()) { showAuth(); return; }
    try {
      const me = await req(`${API.users}/me`);
      if (pfEmail) pfEmail.textContent = me.email || '';
      if (pfName) pfName.textContent = me.name || (me.first_name || '');
      if (pfId) pfId.textContent = me.customer_id;
      showProfile();
      setMsg('');
    } catch {
      clearToken();
      showAuth();
    }
  }

  if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMsg('');
      const data = Object.fromEntries(new FormData(signUpForm).entries());
      //"try"ing our best :) 
      try {
        const r = await req(`${API.auth}/register`, {
          method: 'POST',
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            first_name: data.first_name || null,
            last_name: data.last_name || null
          })
        });
        setToken(r.token);
        await loadMe();
      } catch (err) {
        setMsg(err.message);
      }
    });
  }

  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMsg('');
      const data = Object.fromEntries(new FormData(signInForm).entries());
      //make sure it's an email
      try {
        const r = await req(`${API.auth}/login`, {
          method: 'POST',
          body: JSON.stringify({ email: data.email, password: data.password })
        });
        setToken(r.token);
        await loadMe();
      } catch (err) {
        setMsg(err.message);
      }
    });
  }

  //need a logout button bhy
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearToken();
      showAuth();
    });
  }

  loadMe();
});

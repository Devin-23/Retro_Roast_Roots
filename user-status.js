function token() { return localStorage.getItem('rrr_token'); }

async function apiMe() {
  const t = token();
  if (!t) throw new Error('no token');
  const r = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } });
  if (!r.ok) throw new Error('unauthorized');
  return r.json();
}

//adding this little user logged in box
document.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('user-message');
  //was gonna add a logout button but it kept breaking things
  const logout = document.getElementById('nav-logout');

  try {
    const me = await apiMe();
    if (el) el.textContent = me.name ? `Hi, ${me.name}` : me.email;
    if (logout) {
      logout.style.display = 'inline-block';
      logout.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('rrr_token');
        location.href = '/account.html';
      });
    }
  } catch {
    if (el) el.textContent = 'Sign in';
  }
});

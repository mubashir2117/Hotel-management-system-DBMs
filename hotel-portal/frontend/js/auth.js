// auth.js - Authentication guard and utilities

function requireAdmin() {
  const token = localStorage.getItem('hotelToken');
  const role = localStorage.getItem('hotelRole');
  if (!token || role !== 'admin') {
    localStorage.clear();
    window.location.href = '/login.html';
  }
  loadUserInfo();
}

function requireGuest() {
  const token = localStorage.getItem('hotelToken');
  const role = localStorage.getItem('hotelRole');
  if (!token || role !== 'guest') {
    localStorage.clear();
    window.location.href = '/login.html';
  }
  loadUserInfo();
}

function loadUserInfo() {
  const name = localStorage.getItem('hotelName') || 'User';
  const role = localStorage.getItem('hotelRole') || '';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');

  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
}

function logout() {
  localStorage.clear();
  window.location.href = '/login.html';
}

function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) item.classList.add('active');
  });
}

function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.style.display = 'none';
    });
  }
}

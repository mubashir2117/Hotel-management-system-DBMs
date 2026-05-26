// api.js - Central API request handler
const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(method, endpoint, body = null) {
  const token = localStorage.getItem('hotelToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/login.html';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (err) {
    throw err;
  }
}

// Convenience methods
const api = {
  get: (endpoint) => apiRequest('GET', endpoint),
  post: (endpoint, body) => apiRequest('POST', endpoint, body),
  put: (endpoint, body) => apiRequest('PUT', endpoint, body),
  patch: (endpoint, body) => apiRequest('PATCH', endpoint, body),
  delete: (endpoint) => apiRequest('DELETE', endpoint),
};

// Status badge helper
function statusBadge(status) {
  const map = {
    'Available':        'badge-green',
    'Occupied':         'badge-red',
    'Under Maintenance':'badge-orange',
    'Reserved':         'badge-blue',
    'Confirmed':        'badge-green',
    'Pending':          'badge-orange',
    'Checked-In':       'badge-navy',
    'Checked-Out':      'badge-gray',
    'Cancelled':        'badge-red',
    'Completed':        'badge-green',
    'In Progress':      'badge-blue',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

// Format currency
function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Show alert
function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

// Confirm dialog
function confirmAction(message) {
  return window.confirm(message);
}

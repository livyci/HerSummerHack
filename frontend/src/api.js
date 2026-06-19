// API base: empty in dev (Vite proxies /api -> Django), set to the Railway
// backend URL in production via VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  return `${API_BASE}${path}`
}

export function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }
  return fetch(apiUrl(path), { ...options, headers })
}

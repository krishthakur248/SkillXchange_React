/**
 * SkillXchange — Central API Client
 *
 * The backend URL is controlled by the VITE_API_URL environment variable:
 *   - Development:  http://localhost:5000   (set in .env)
 *   - Production:   https://your-app.onrender.com  (set in .env.production)
 */

// ─────────────────────────────────────────────
// BACKEND URL — change this variable when you deploy to Render
// ─────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Core fetch wrapper — automatically attaches Authorization header
 * and parses JSON responses.
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('sx_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// ── Auth ──
export const authApi = {
  register: (body)  => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body)  => apiFetch('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()      => apiFetch('/api/auth/me'),
};

// ── Home ──
export const homeApi = {
  get: () => apiFetch('/api/home'),
};

// ── Mentors ──
export const mentorsApi = {
  list:     (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/mentors${qs ? `?${qs}` : ''}`);
  },
  trending: () => apiFetch('/api/mentors/trending'),
};

// ── Learn & Teach ──
export const learnTeachApi = {
  incoming:             ()         => apiFetch('/api/learn-teach/incoming'),
  sent:                 ()         => apiFetch('/api/learn-teach/sent'),
  recommended:          ()         => apiFetch('/api/learn-teach/recommended'),
  connections:          ()         => apiFetch('/api/learn-teach/connections'),
  sendRequest:          (body)     => apiFetch('/api/learn-teach/request',                    { method: 'POST',  body: JSON.stringify(body) }),
  updateRequest:        (id, body) => apiFetch(`/api/learn-teach/request/${id}`,             { method: 'PATCH', body: JSON.stringify(body) }),
  completeRequest:      (id)       => apiFetch(`/api/learn-teach/request/${id}/complete`,    { method: 'POST' }),
  cancelCompleteRequest:(id)       => apiFetch(`/api/learn-teach/request/${id}/cancel-complete`, { method: 'POST' }),
};

// ── Chat ──
export const chatApi = {
  conversations:  ()             => apiFetch('/api/chat/conversations'),
  messages:       (userId)       => apiFetch(`/api/chat/messages/${userId}`),
  sendMessage:    (userId, body) => apiFetch(`/api/chat/messages/${userId}`, { method: 'POST', body: JSON.stringify(body) }),
};

// ── Video Sessions ──
export const videoApi = {
  list:    ()        => apiFetch('/api/video-sessions'),
  create:  (body)    => apiFetch('/api/video-sessions',     { method: 'POST',   body: JSON.stringify(body) }),
  update:  (id, body) => apiFetch(`/api/video-sessions/${id}`, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:  (id)       => apiFetch(`/api/video-sessions/${id}`, { method: 'DELETE' }),
};

// ── Profile ──
export const profileApi = {
  get:     ()     => apiFetch('/api/profile'),
  update:  (body) => apiFetch('/api/profile',         { method: 'PATCH', body: JSON.stringify(body) }),
  matches: ()     => apiFetch('/api/profile/matches'),
};

// ── Progress ──
export const progressApi = {
  get: () => apiFetch('/api/progress'),
};

// ── Mentor Flow ──
export const mentorFlowApi = {
  become:        ()          => apiFetch('/api/mentor/become',                { method: 'POST' }),
  quit:          ()          => apiFetch('/api/mentor/quit',                  { method: 'POST' }),
  verifyDocument:(body)      => apiFetch('/api/mentor/verify/document',       { method: 'POST', body: JSON.stringify(body) }),
  verifyEmail:   (body)      => apiFetch('/api/mentor/verify/email',          { method: 'POST', body: JSON.stringify(body) }),
  testBypass:    (body)      => apiFetch('/api/mentor/verify/test-bypass',    { method: 'POST', body: JSON.stringify(body) }),
  listClasses:   ()          => apiFetch('/api/mentor/classes'),
  createClass:   (body)      => apiFetch('/api/mentor/classes',               { method: 'POST',   body: JSON.stringify(body) }),
  updateClass:   (id, body)  => apiFetch(`/api/mentor/classes/${id}`,        { method: 'PATCH',  body: JSON.stringify(body) }),
  deleteClass:   (id)        => apiFetch(`/api/mentor/classes/${id}`,        { method: 'DELETE' }),
  completeClass: (id)        => apiFetch(`/api/mentor/classes/${id}/complete`, { method: 'POST' }),
  enrollClass:   (id)        => apiFetch(`/api/mentor/classes/${id}/enroll`, { method: 'POST' }),
  requestMentorship:(body)   => apiFetch('/api/mentor/request',              { method: 'POST', body: JSON.stringify(body) }),
  browse:        (params)    => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/api/mentor/browse${qs}`);
  },
};

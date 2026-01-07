// API base URL - uses env var in development, relative URL in production
export const API_BASE = import.meta.env.VITE_API_URL || '';

// Helper function to make authenticated API requests
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  return fetch(url, { ...options, headers });
}

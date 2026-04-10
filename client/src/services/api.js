import axios from "axios";

// In dev: Vite proxy handles /api → localhost:5000
// In production: VITE_API_URL points to the Render backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

// ── CRITICAL: Attach JWT token to every request ──
// Without this, ALL protected routes return 401 "Authentication required"
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("officegit_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Handle 401 globally — auto-redirect to login ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("officegit_token");
      localStorage.removeItem("officegit_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
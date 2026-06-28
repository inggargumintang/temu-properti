import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 (except /auth/me), broadcast a session-expired event
// so the app can redirect to /login. /auth/me 401 is handled silently by AuthContext.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error?.config?.url || "";
    const status = error?.response?.status;
    if (status === 401 && !url.includes("/auth/me") && !url.includes("/auth/login") && !url.includes("/auth/register")) {
      // Session expired — clear hint and redirect once
      try {
        localStorage.removeItem("speedhome_auth_hint");
        if (window.location.pathname !== "/login" && !window.__speedhomeRedirected) {
          window.__speedhomeRedirected = true;
          window.location.replace("/login");
        }
      } catch (_e) { /* noop */ }
    }
    return Promise.reject(error);
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;

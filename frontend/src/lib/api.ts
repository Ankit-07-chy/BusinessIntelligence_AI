import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "./constants";

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      if (!window.location.pathname.endsWith("/login") && !window.location.pathname.startsWith("/prototype")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * The backend returns 403 (with a human-readable `error` message) when a
 * role's RLS/CLS policy is what's hiding something, as opposed to a plain
 * 404 for genuinely missing data. Returns that message, or null if `error`
 * wasn't a 403 from this API.
 */
export function getRestrictionMessage(error: unknown): string | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 403) return null;
  return (error.response.data as { error?: string })?.error ?? "Restricted by your role's data policy.";
}

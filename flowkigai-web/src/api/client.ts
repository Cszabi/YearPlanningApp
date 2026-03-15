import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Concurrent refresh queue ─────────────────────────────────────────────────
// When multiple requests fail with 401 simultaneously, only one refresh
// happens and all queued requests retry once it resolves.

let isRefreshing = false;
type Resolver = (token: string) => void;
type Rejector = (err: unknown) => void;
let waitQueue: { resolve: Resolver; reject: Rejector }[] = [];

function drainQueue(token: string) {
  waitQueue.forEach(({ resolve }) => resolve(token));
  waitQueue = [];
}
function rejectQueue(err: unknown) {
  waitQueue.forEach(({ reject }) => reject(err));
  waitQueue = [];
}

// On 401: attempt token refresh, then retry original request
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          waitQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post("/api/v1/auth/refresh", { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        drainQueue(accessToken);
        return api(original);
      } catch (refreshErr) {
        rejectQueue(refreshErr);
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

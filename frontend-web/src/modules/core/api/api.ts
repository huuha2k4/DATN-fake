import axios, { type AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Refresh tokens are rotated by the server. Multiple expired requests must share
// one refresh call; otherwise the later calls look like token reuse and revoke the session.
let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('Không có refresh token');

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const data = response.data?.data;
    const accessToken = data?.access_token || data?.tokens?.access_token;
    if (!accessToken) throw new Error('Không nhận được access token mới');

    localStorage.setItem('access_token', accessToken);
    if (data?.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    return accessToken;
  })();

  return refreshInFlight.finally(() => { refreshInFlight = null; });
};

// Request interceptor - add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 or 403 (expired JWT token) and not already retrying
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - chỉ xóa thông tin xác thực phiên làm việc, giữ nguyên theme và cài đặt thiết bị
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const api = apiClient;

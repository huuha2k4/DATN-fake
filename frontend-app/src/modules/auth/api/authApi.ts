import { NativeModules, Platform } from 'react-native';

/**
 * Tự động phát hiện Host IP của máy tính đang chạy Metro Bundler (Ví dụ: exp://192.168.1.14:8081 -> IP: 192.168.1.14).
 * Giúp điện thoại thật chạy Expo Go kết nối thẳng tới Backend trên máy tính mà không sợ bị trỏ nhầm về localhost!
 */
function getAutoDetectedApiUrl(): string {
  // 1. Tuyệt đối ưu tiên 100% biến môi trường EXPO_PUBLIC_API_URL từ file .env nếu có
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  // 2. Nếu không đặt trong .env, tự động lấy IP/Host từ Metro Bundler server khi chạy Expo Go
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:1116/api/v1`;
      }
    }
  } catch {}

  // 3. Fallback mặc định
  return Platform.OS === 'android' ? 'http://10.0.2.2:1116/api/v1' : 'http://localhost:1116/api/v1';
}

export const API_BASE_URL = getAutoDetectedApiUrl();

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  otp?: string;
}

export interface LoginRequest {
  login: string; // Email hoặc username
  password: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  emailVerified: boolean;
  phone: string | null;
  avatarUrl: string | null;
  subscriptionTier: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: AuthTokens;
  };
  message?: string;
}

import * as FileSystem from 'expo-file-system/legacy';

const AUTH_FILE_NAME = 'finora_auth_session.json';
const INACTIVITY_LIMIT_MS = 3 * 24 * 60 * 60 * 1000; // 3 ngày không vào app mới thu hồi

export interface StoredSession {
  user: User;
  tokens: AuthTokens;
  lastActiveTime: number; // Timestamp ms
}

// Memory cache token phục vụ phiên đăng nhập
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;
let currentUser: User | null = null;

let onSessionExpiredCallback: (() => void) | null = null;

// Quản lý refresh token tự động
let refreshInFlight: Promise<string | null> | null = null;

export const authStorage = {
  setAuth(user: User, tokens: AuthTokens) {
    currentUser = user;
    currentAccessToken = tokens.access_token;
    currentRefreshToken = tokens.refresh_token;

    // Lưu phiên bền vững vào file hệ thống để giữ đăng nhập
    try {
      const dir = FileSystem.documentDirectory;
      if (dir) {
        const session: StoredSession = {
          user,
          tokens,
          lastActiveTime: Date.now(),
        };
        FileSystem.writeAsStringAsync(`${dir}${AUTH_FILE_NAME}`, JSON.stringify(session)).catch(() => {});
      }
    } catch {}
  },

  setOnSessionExpired(cb: () => void) {
    onSessionExpiredCallback = cb;
  },

  triggerSessionExpired() {
    this.clear();
    if (onSessionExpiredCallback) {
      onSessionExpiredCallback();
    }
  },

  getToken() {
    return currentAccessToken;
  },

  getRefreshToken() {
    return currentRefreshToken;
  },

  getUser() {
    return currentUser;
  },

  /**
   * Tự động làm mới access token khi hết hạn (15 phút) sử dụng refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const rfToken = currentRefreshToken;
      if (!rfToken) {
        this.triggerSessionExpired();
        return null;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken: rfToken }),
        });

        if (!res.ok) {
          // Refresh token cũng hết hạn -> Bắt buộc chuyển về màn hình đăng nhập
          this.triggerSessionExpired();
          return null;
        }

        const json = await res.json();
        const data = json?.data;
        const newAccessToken = data?.access_token || data?.tokens?.access_token;
        const newRefreshToken = data?.refresh_token || data?.tokens?.refresh_token || rfToken;

        if (newAccessToken && currentUser) {
          this.setAuth(currentUser, {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: 900,
          });
          return newAccessToken;
        }

        this.triggerSessionExpired();
        return null;
      } catch (e) {
        console.warn('Lỗi khi tự động refresh token:', e);
        return null;
      }
    })();

    return refreshInFlight.finally(() => {
      refreshInFlight = null;
    });
  },

  touchActivity() {
    try {
      const dir = FileSystem.documentDirectory;
      if (dir && currentUser && currentAccessToken) {
        const session: StoredSession = {
          user: currentUser,
          tokens: {
            access_token: currentAccessToken,
            refresh_token: currentRefreshToken || '',
            token_type: 'Bearer',
            expires_in: 3600,
          },
          lastActiveTime: Date.now(),
        };
        FileSystem.writeAsStringAsync(`${dir}${AUTH_FILE_NAME}`, JSON.stringify(session)).catch(() => {});
      }
    } catch {}
  },

  async loadPersistedSession(): Promise<{ user: User; tokens: AuthTokens } | null> {
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) return null;
      const path = `${dir}${AUTH_FILE_NAME}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;

      const content = await FileSystem.readAsStringAsync(path);
      if (!content) return null;

      const session: StoredSession = JSON.parse(content);
      const now = Date.now();
      const lastActive = session.lastActiveTime || 0;

      // Nếu trong vòng 3 ngày không vào app -> Hết hạn phiên, thu hồi
      if (now - lastActive > INACTIVITY_LIMIT_MS) {
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
        return null;
      }

      // Cập nhật lại thời gian hoạt động mới nhất (vì người dùng vừa mở app)
      session.lastActiveTime = now;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(session)).catch(() => {});

      currentUser = session.user;
      currentAccessToken = session.tokens.access_token;
      currentRefreshToken = session.tokens.refresh_token;

      return session;
    } catch {
      return null;
    }
  },

  clear() {
    currentUser = null;
    currentAccessToken = null;
    currentRefreshToken = null;
    try {
      const dir = FileSystem.documentDirectory;
      if (dir) {
        FileSystem.deleteAsync(`${dir}${AUTH_FILE_NAME}`, { idempotent: true }).catch(() => {});
      }
    } catch {}
  },
};

/**
 * Hàm gọi API an toàn tích hợp tự động Refresh Token khi gặp lỗi 401
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // Nếu Backend trả về 401 hoặc 403 (Token hết hạn sau 15 phút)
  if (response.status === 401 || response.status === 403) {
    const newToken = await authStorage.refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      // Thử lại request với token mới
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

export const authApi = {
  /**
   * Gửi mã OTP xác thực đăng ký qua email (/api/v1/auth/send-register-otp)
   */
  async sendRegisterOtp(email: string): Promise<{ success: boolean; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-register-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại');
      }

      return resData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Hết thời gian yêu cầu gửi OTP (Timeout). Vui lòng thử lại.');
      }
      throw err;
    }
  },

  /**
   * Gọi API đăng ký backend Spring Boot (/api/v1/auth/register)
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Đăng ký tài khoản thất bại');
      }

      if (resData.data?.user && resData.data?.tokens) {
        authStorage.setAuth(resData.data.user, resData.data.tokens);
      }

      return resData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Kết nối máy chủ quá hạn (timeout).');
      }
      throw err;
    }
  },

  /**
   * Gọi API đăng nhập backend Spring Boot (/api/v1/auth/login)
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Tài khoản hoặc mật khẩu không chính xác');
      }

      if (resData.data?.user && resData.data?.tokens) {
        authStorage.setAuth(resData.data.user, resData.data.tokens);
      }

      return resData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Kết nối máy chủ quá hạn (timeout). Vui lòng kiểm tra mạng backend.');
      }
      throw err;
    }
  },

  /**
   * Bước 1 Quên mật khẩu: Gửi OTP khôi phục qua email (/api/v1/auth/forgot-password)
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Gửi mã khôi phục thất bại');
      }

      return resData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Kết nối máy chủ quá hạn (timeout).');
      }
      throw err;
    }
  },

  /**
   * Bước 2 Quên mật khẩu: Xác thực mã OTP 6 số (/api/v1/auth/verify-reset-otp)
   */
  async verifyResetOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, otp }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
      }

      return resData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Kết nối máy chủ quá hạn (timeout).');
      }
      throw err;
    }
  },

  /**
   * Bước 3 Quên mật khẩu: Thiết lập mật khẩu mới (/api/v1/auth/reset-password)
   */
  async resetPassword(data: { email?: string; token: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Đặt lại mật khẩu thất bại');
      }

      return resData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Kết nối máy chủ quá hạn (timeout).');
      }
      throw err;
    }
  },

  /**
   * Đăng xuất khỏi hệ thống (/api/v1/auth/logout)
   */
  async logout(): Promise<void> {
    try {
      const token = authStorage.getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      // Bỏ qua lỗi mạng khi logout để luôn xóa token local
    } finally {
      authStorage.clear();
    }
  },
};


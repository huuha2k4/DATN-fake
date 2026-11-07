import { NativeModules, Platform } from 'react-native';

/**
 * Tự động phát hiện Host IP của máy tính đang chạy Metro Bundler (Ví dụ: exp://192.168.1.14:8081 -> IP: 192.168.1.14).
 * Giúp điện thoại thật chạy Expo Go kết nối thẳng tới Backend trên máy tính mà không sợ bị trỏ nhầm về localhost!
 */
function getAutoDetectedApiUrl(): string {
  // 1. Kiểm tra biến môi trường EXPO_PUBLIC_API_URL từ file .env
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl && !envUrl.includes('192.168.1.9')) {
    return envUrl;
  }

  // 2. Tự động lấy IP/Host từ Metro Bundler server đang kết nối tới Expo Go
  // Khi bạn mở Expo Go (quét mã QR từ VPS hay máy tính cá nhân), scriptURL sẽ chứa IP/Domain của máy chủ Metro.
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:1116/api/v1`;
      }
    }
  } catch {}

  // 3. Nếu envUrl có giá trị, sử dụng giá trị đó
  if (envUrl) {
    return envUrl;
  }

  // 4. Fallback mặc định theo nền tảng
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

// Memory cache token phục vụ phiên đăng nhập
let currentAccessToken: string | null = null;
let currentUser: User | null = null;

export const authStorage = {
  setAuth(user: User, tokens: AuthTokens) {
    currentUser = user;
    currentAccessToken = tokens.access_token;
  },
  getToken() {
    return currentAccessToken;
  },
  getUser() {
    return currentUser;
  },
  clear() {
    currentUser = null;
    currentAccessToken = null;
  },
};

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
};


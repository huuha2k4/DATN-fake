const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  username?: string;
}

export interface LoginRequest {
  login: string; // Can be email or username
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  emailVerified: boolean;
  phone: string | null;
  avatarUrl: string | null;
  mfaEnabled: boolean;
  userStatus: string;
  systemRole: string;
  subscriptionTier: string;
  preferredCurrency: string;
  timezone: string;
  language: string;
  lastLoginAt: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: AuthTokens;
  };
  message?: string;
}

export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Đăng ký thất bại');
    }

    return response.json();
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Đăng nhập thất bại');
    }

    return response.json();
  },

  async logout(allDevices = false): Promise<void> {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ all_devices: allDevices }),
    });

    if (!response.ok) {
      throw new Error('Đăng xuất thất bại');
    }
  },
};

export const saveAuthData = (user: User, tokens: AuthTokens) => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
};

export const clearAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getStoredUser = (): User | null => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

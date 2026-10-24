import { api } from '../../core/api/api';

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  preferredCurrency?: string;
  timezone?: string;
  language?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  emailVerified: boolean;
  phone: string | null;
  mfaEnabled: boolean;
  userStatus: string;
  systemRole: string;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
  preferredCurrency: string;
  timezone: string;
  language: string;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

class UserApi {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/users/me');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/users/me', data);
    return response.data;
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UserProfile>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  }

  /**
   * Delete avatar image
   */
  async deleteAvatar(): Promise<void> {
    await api.delete('/users/me/avatar');
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/users/me/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  /**
   * Get avatar URL (full path) with fallback to default avatar
   */
  getAvatarUrl(avatarUrl: string | null | undefined): string {
    if (!avatarUrl || avatarUrl.trim() === '') {
      return '/default-avatar.png';
    }
    
    // If already a full URL, return as is
    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    
    // In browser environment, relative path like /uploads/avatars/... is served by Nginx / backend directly
    return avatarUrl;
  }
}

export const userApi = new UserApi();

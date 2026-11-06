import { API_BASE_URL, authStorage, type User } from '../../auth/api/authApi';

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  subscriptionTier: string;
}

export const userProfileApi = {
  /**
   * Lấy thông tin tài khoản người dùng hiện tại từ Backend (/api/v1/users/me)
   */
  async getProfile(): Promise<UserProfileResponse | null> {
    const token = authStorage.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data: UserProfileResponse = await response.json();

      // Cập nhật lại thông tin user vào authStorage
      const currentUser = authStorage.getUser();
      if (currentUser) {
        authStorage.setAuth(
          {
            ...currentUser,
            fullName: data.fullName || currentUser.fullName,
            avatarUrl: data.avatarUrl || currentUser.avatarUrl,
            phone: data.phone || currentUser.phone,
            subscriptionTier: data.subscriptionTier || currentUser.subscriptionTier,
          },
          {
            access_token: token,
            refresh_token: '',
            token_type: 'Bearer',
            expires_in: 3600,
          }
        );
      }

      return data;
    } catch {
      return null;
    }
  },

  /**
   * Tạo đường dẫn avatar đầy đủ
   */
  formatAvatarUrl(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl || avatarUrl.trim() === '') return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;

    // Nếu đường dẫn tương đối từ backend, gắn kèm origin của backend API_BASE_URL
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
    return `${baseUrl}${cleanPath}`;
  },
};


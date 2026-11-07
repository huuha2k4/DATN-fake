import { API_BASE_URL, authStorage, type User } from '../../auth/api/authApi';

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  subscriptionTier: string;
  createdAt?: string;
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
   * Cập nhật thông tin tài khoản người dùng (/api/v1/users/me)
   */
  async updateProfile(req: {
    fullName?: string;
    phone?: string;
    preferredCurrency?: string;
    timezone?: string;
    language?: string;
    avatarUrl?: string | null;
  }): Promise<UserProfileResponse> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Chưa đăng nhập');

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(req),
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson?.message || 'Không thể cập nhật hồ sơ');
    }

    const updated = resJson?.data || resJson;

    // Cập nhật local authStorage
    const currentUser = authStorage.getUser();
    if (currentUser) {
      authStorage.setAuth(
        {
          ...currentUser,
          fullName: updated.fullName || currentUser.fullName,
          avatarUrl: updated.avatarUrl !== undefined ? updated.avatarUrl : currentUser.avatarUrl,
          phone: updated.phone || currentUser.phone,
        },
        {
          access_token: token,
          refresh_token: '',
          token_type: 'Bearer',
          expires_in: 3600,
        }
      );
    }

    return updated;
  },

  /**
   * Xóa avatar người dùng trên hệ thống (/api/v1/users/me/avatar)
   */
  async deleteAvatar(): Promise<void> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Chưa đăng nhập');

    const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Không thể xóa ảnh đại diện');
    }

    const currentUser = authStorage.getUser();
    if (currentUser) {
      authStorage.setAuth(
        {
          ...currentUser,
          avatarUrl: null,
        },
        {
          access_token: token,
          refresh_token: '',
          token_type: 'Bearer',
          expires_in: 3600,
        }
      );
    }
  },

  /**
   * Upload avatar image trực tiếp qua FormData multipart (/api/v1/users/me/avatar)
   * Sử dụng XMLHttpRequest để tránh lỗi "Unsupported FormDataPart implementation" của fetch trên Expo/WinterCG
   */
  async uploadAvatar(fileData: { uri: string; name?: string; type?: string }): Promise<UserProfileResponse> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Chưa đăng nhập');

    const formData = new FormData();
    // @ts-ignore: React Native FormData file structure
    formData.append('file', {
      uri: fileData.uri,
      name: fileData.name || 'avatar.jpg',
      type: fileData.type || 'image/jpeg',
    });

    const updated = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/users/me/avatar`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res?.data || res);
          } else {
            reject(new Error(res?.message || `Lỗi tải lên (${xhr.status})`));
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({});
          } else {
            reject(new Error(`Máy chủ phản hồi HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải ảnh lên.'));
      xhr.ontimeout = () => reject(new Error('Quá thời gian tải ảnh lên.'));
      xhr.timeout = 60000;
      xhr.send(formData);
    });

    const currentUser = authStorage.getUser();
    if (currentUser) {
      authStorage.setAuth(
        {
          ...currentUser,
          avatarUrl: updated.avatarUrl || currentUser.avatarUrl,
        },
        {
          access_token: token,
          refresh_token: '',
          token_type: 'Bearer',
          expires_in: 3600,
        }
      );
    }

    return updated;
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


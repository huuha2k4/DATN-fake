import { useState, useRef, useEffect } from 'react';
import { getStoredUser, type User } from '../../auth/api/authApi';
import { userApi, type UpdateProfileRequest } from '../../user/api/userApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import './ProfileScreen.css';

interface ProfileScreenProps {
  onLogout?: () => void;
}

export function ProfileScreen({ onLogout: _onLogout }: ProfileScreenProps) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    preferredCurrency: user?.preferredCurrency || 'VND',
    timezone: user?.timezone || 'Asia/Ho_Chi_Minh',
    language: user?.language || 'vi-VN',
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() => userApi.getAvatarUrl(user?.avatarUrl));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync avatar and latest profile on mount
  useEffect(() => {
    setAvatarPreview(userApi.getAvatarUrl(user?.avatarUrl));

    // Fetch latest user details from server to ensure fresh state
    userApi.getCurrentUser()
      .then((fresh) => {
        setUser(prev => {
          const merged: User = {
            ...prev!,
            ...fresh,
            username: fresh.username || undefined,
            avatarUrl: fresh.avatarUrl || null,
            lastLoginAt: fresh.lastLoginAt || prev?.lastLoginAt || new Date().toISOString(),
          };
          localStorage.setItem('user', JSON.stringify(merged));
          return merged;
        });
        setFormData({
          fullName: fresh.fullName || '',
          username: fresh.username || '',
          email: fresh.email || '',
          phone: fresh.phone || '',
          preferredCurrency: fresh.preferredCurrency || 'VND',
          timezone: fresh.timezone || 'Asia/Ho_Chi_Minh',
          language: fresh.language || 'vi-VN',
        });
        if (fresh.avatarUrl) {
          setAvatarPreview(userApi.getAvatarUrl(fresh.avatarUrl));
        }
      })
      .catch((err) => {
        console.warn('Could not sync current user profile:', err);
      });
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('Kích thước ảnh đại diện không được vượt quá 100MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Định dạng ảnh không được hỗ trợ. Vui lòng chọn JPG, PNG, GIF hoặc WEBP');
        return;
      }

      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);
      await userApi.deleteAvatar();
      setSelectedFile(null);
      setAvatarPreview(null);
      if (user) {
        const updated: User = { ...user, avatarUrl: null };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
      setSuccess('Đã xóa ảnh đại diện thành công');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa ảnh đại diện');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let latestAvatarUrl = user?.avatarUrl || null;

      // 1. Upload avatar if new file is selected
      if (selectedFile) {
        try {
          const avatarResponse = await userApi.uploadAvatar(selectedFile);
          latestAvatarUrl = avatarResponse.avatarUrl || null;
          setSelectedFile(null);
        } catch (uploadErr: any) {
          console.error('Avatar upload failed:', uploadErr);
          const uploadMsg = uploadErr.response?.data?.message || uploadErr.message || 'Lỗi khi tải ảnh đại diện';
          setError(`Lỗi ảnh đại diện: ${uploadMsg}`);
          setLoading(false);
          return;
        }
      }

      // 2. Update profile information
      const profileUpdate: UpdateProfileRequest = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || undefined,
        preferredCurrency: formData.preferredCurrency,
        timezone: formData.timezone,
        language: formData.language,
      };

      const response = await userApi.updateProfile(profileUpdate);
      
      // Update local stored user
      if (user) {
        const updatedUser: User = {
          ...user,
          fullName: response.fullName,
          username: response.username || '',
          phone: response.phone || '',
          preferredCurrency: response.preferredCurrency,
          timezone: response.timezone,
          language: response.language,
          avatarUrl: latestAvatarUrl,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setSuccess('Cập nhật thông tin hồ sơ thành công!');
    } catch (err: any) {
      console.error('Update profile error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Cập nhật thông tin thất bại';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-screen-container">

      {success && (
        <div className="profile-alert-banner success" role="status">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="profile-alert-banner error" role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="profile-card-layout">
        {/* Hero Avatar Row */}
        <div className="profile-hero-card">
          <div className="avatar-wrapper-relative">
            <div className="avatar-image-inner">
              <img
                src={avatarPreview || '/default-avatar.png'}
                alt={user.fullName || 'Avatar'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                }}
              />
            </div>
            <button
              type="button"
              className="avatar-badge-btn"
              onClick={handleAvatarClick}
              title="Đổi ảnh đại diện"
              aria-label="Đổi ảnh đại diện"
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="profile-hero-meta">
            <h2>{user.fullName || 'Người dùng Finora'}</h2>
            <div className="profile-tags-row">
              <span className="tag-verified">
                <FinanceIcon name="shield" size={13} />
                Đã xác thực
              </span>
              <span className="tag-tier">
                ⭐ {user.subscriptionTier || 'Gói Tiêu Chuẩn'}
              </span>
              <span className="tag-user-id" style={{ fontSize: '12px' }}>
                ID: {user.id ? `${user.id.slice(0, 8)}...` : 'N/A'}
              </span>
            </div>

            <div className="avatar-action-links">
              <button type="button" className="btn-upload-text" onClick={handleAvatarClick}>
                Tải ảnh mới
              </button>
              {avatarPreview && (
                <button type="button" className="btn-remove-avatar" onClick={handleRemoveAvatar}>
                  Xóa ảnh đại diện
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleSubmit} className="profile-form-body">
          <div className="form-grid-2col">
            <div className="profile-input-group">
              <label htmlFor="fullName">Họ và tên *</label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="profile-input-group">
              <label htmlFor="username">
                <span>Tên đăng nhập (Username)</span>
                <span className="field-lock-badge">Cố định</span>
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                disabled
                title="Tên đăng nhập không thể thay đổi sau khi tạo"
              />
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="profile-input-group">
              <label htmlFor="email">
                <span>Địa chỉ Email</span>
                <span className="field-lock-badge">Đã liên kết</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                disabled
              />
            </div>

            <div className="profile-input-group">
              <label htmlFor="phone">Số điện thoại liên lạc</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912 345 678"
              />
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="profile-input-group">
              <label htmlFor="currency">Đơn vị tiền tệ hiển thị</label>
              <select
                id="currency"
                value={formData.preferredCurrency}
                onChange={(e) => setFormData({ ...formData, preferredCurrency: e.target.value })}
              >
                <option value="VND">VND (₫) - Việt Nam Đồng</option>
                <option value="USD">USD ($) - Đô la Mỹ</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="JPY">JPY (¥) - Yên Nhật</option>
              </select>
            </div>

            <div className="profile-input-group">
              <label htmlFor="timezone">Múi giờ hệ thống</label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                <option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option>
                <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
                <option value="Asia/Singapore">Singapore (GMT+8)</option>
                <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              </select>
            </div>
          </div>

          <div className="profile-input-group" style={{ maxWidth: '48%', marginBottom: '10px' }}>
            <label htmlFor="language">Ngôn ngữ giao diện</label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            >
              <option value="vi-VN">Tiếng Việt (vi-VN)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </div>

          <div className="profile-actions-bar">
            <button
              type="button"
              className="btn-reset-changes"
              onClick={() => {
                setFormData({
                  fullName: user?.fullName || '',
                  username: user?.username || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                  preferredCurrency: user?.preferredCurrency || 'VND',
                  timezone: user?.timezone || 'Asia/Ho_Chi_Minh',
                  language: user?.language || 'vi-VN',
                });
                setSelectedFile(null);
                setAvatarPreview(user?.avatarUrl ? userApi.getAvatarUrl(user.avatarUrl) : null);
                setError('');
                setSuccess('');
              }}
            >
              Đặt lại
            </button>
            <button
              type="submit"
              className="btn-save-profile"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <span>Lưu thay đổi hồ sơ</span>
                  <FinanceIcon name="arrow" size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { userApi } from '../../user/api/userApi';
import { getStoredUser, saveAuthData, getStoredTokens } from '../../auth/api/authApi';
import {
  User as UserIcon,
  Lock,
  Calendar,
  Eye,
  EyeOff,
  Check,
  X,
  Camera,
  Info,
  ArrowRight,
} from 'lucide-react';
import './CompleteProfileModal.css';

interface CompleteProfileModalWebProps {
  isOpen: boolean;
  onSuccess: () => void;
  onSkip?: () => void;
}

export const CompleteProfileModalWeb: React.FC<CompleteProfileModalWebProps> = ({
  isOpen,
  onSuccess,
  onSkip,
}) => {
  const currentUser = getStoredUser();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl || null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(true);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setFullName(currentUser.fullName);
      if (currentUser.username) setUsername(currentUser.username);
      if (currentUser.avatarUrl) setAvatarUrl(currentUser.avatarUrl);
      if (currentUser.dateOfBirth) setDateOfBirth(currentUser.dateOfBirth);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Tính độ mạnh mật khẩu
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '#CBD5E1' };
    if (password.length < 6) return { level: 1, text: 'Mật khẩu yếu', color: '#EF4444' };
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    if (password.length >= 8 && hasLetter && hasNumber && hasSpecial) {
      return { level: 3, text: 'Mật khẩu mạnh', color: '#10B981' };
    }
    if (password.length >= 6 && ((hasLetter && hasNumber) || (hasLetter && hasSpecial))) {
      return { level: 2, text: 'Mật khẩu vừa', color: '#F59E0B' };
    }
    return { level: 1, text: 'Mật khẩu yếu', color: '#EF4444' };
  };

  const strength = getPasswordStrength();

  // Validate username
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(val);

    if (val.length < 4 || val.length > 20) {
      setIsUsernameValid(false);
      setUsernameError('Tên đăng nhập từ 4–20 ký tự');
    } else {
      setIsUsernameValid(true);
      setUsernameError(null);
    }
  };

  // Chọn ảnh từ máy tính
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await userApi.uploadAvatar(file);
      if (res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể tải ảnh đại diện lên');
    } finally {
      setLoading(false);
    }
  };

  // Format ngày sinh DD/MM/YYYY
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleaned = val.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDateOfBirth(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập tên hiển thị');
      return;
    }
    if (!username.trim() || username.length < 4) {
      setErrorMsg('Tên đăng nhập phải từ 4-20 ký tự (không dấu, không khoảng trắng)');
      return;
    }
    if (password && password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password && password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    // Chuyển sang YYYY-MM-DD nếu cần
    let formattedDob: string | undefined = undefined;
    if (dateOfBirth && dateOfBirth.includes('/')) {
      const parts = dateOfBirth.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        formattedDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (dateOfBirth && dateOfBirth.includes('-')) {
      formattedDob = dateOfBirth;
    }

    setLoading(true);
    try {
      const updated = await userApi.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim() ? password.trim() : undefined,
        dateOfBirth: formattedDob,
      });

      // Lưu lại user mới cập nhật
      const tokens = getStoredTokens();
      if (currentUser && tokens) {
        saveAuthData(
          {
            ...currentUser,
            fullName: updated.fullName,
            username: updated.username || currentUser.username,
            dateOfBirth: updated.dateOfBirth || currentUser.dateOfBirth,
            avatarUrl: updated.avatarUrl || currentUser.avatarUrl,
          },
          tokens
        );
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể lưu thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-profile-overlay">
      <div className="complete-profile-card">
        {/* HEADER HERO BANNER XANH RỪNG */}
        <div className="complete-profile-hero">
          <div className="complete-profile-nav">
            <div className="complete-profile-brand">
              <img
                src="/logo.png"
                alt="Finora Logo"
                className="complete-profile-brand-logo-img"
              />
              <span className="complete-profile-brand-name">Finora</span>
            </div>
          </div>

          <div className="complete-profile-header-content">
            <div className="complete-profile-title-col">
              <h2>Hoàn thiện hồ sơ</h2>
              <p>Cập nhật thông tin để hoàn tất đăng ký và bảo mật tài khoản Finora nhé!</p>
            </div>
            <img
              src="/onboarding/profile_robot_card.png"
              alt="Finora Robot"
              className="complete-profile-robot-img"
            />
          </div>
        </div>

        {/* BODY FORM TRẮNG */}
        <div className="complete-profile-body">
          {/* AVATAR CÓ CAMERA BADGE */}
          <div className="complete-profile-avatar-wrap">
            <label className="complete-profile-avatar-box">
              <img
                src={avatarUrl || '/onboarding/default_user_boy.png'}
                alt="Avatar"
                className="complete-profile-avatar-img"
              />
              <span className="complete-profile-camera-badge">
                <Camera size={14} color="#FFFFFF" />
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {errorMsg && (
            <div className="complete-profile-error-banner">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="complete-profile-form">
            {/* TÊN HIỂN THỊ */}
            <div className="form-field-group">
              <label className="field-label-row">
                <UserIcon size={15} color="#007B58" />
                <span>
                  Tên hiển thị <strong className="star-red">*</strong>
                </span>
              </label>
              <div className="field-input-box">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập tên của bạn"
                  required
                />
                {fullName && (
                  <button type="button" onClick={() => setFullName('')} className="btn-clear-text">
                    <X size={15} color="#94A3B8" />
                  </button>
                )}
              </div>
            </div>

            {/* TÊN ĐĂNG NHẬP */}
            <div className="form-field-group">
              <label className="field-label-row">
                <span className="at-symbol">@</span>
                <span>
                  Tên đăng nhập <strong className="star-red">*</strong>
                </span>
              </label>
              <div className={`field-input-box ${usernameError ? 'field-error' : ''}`}>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="huuha2k4"
                  required
                />
                {isUsernameValid && username.length >= 4 && (
                  <Check size={16} color="#10B981" />
                )}
              </div>
              <small className="field-hint">
                {usernameError ||
                  'Dùng để đăng nhập vào Finora (không dấu, không khoảng trắng, từ 4–20 ký tự).'}
              </small>
            </div>

            {/* MẬT KHẨU */}
            <div className="form-field-group">
              <label className="field-label-row">
                <Lock size={15} color="#007B58" />
                <span>
                  Mật khẩu <strong className="star-red">*</strong>
                </span>
              </label>
              <div className="field-input-box">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-toggle-eye"
                >
                  {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="strength-meter-row">
                  <div className="strength-bars">
                    <span
                      style={{
                        backgroundColor: strength.level >= 1 ? strength.color : '#E2E8F0',
                      }}
                    />
                    <span
                      style={{
                        backgroundColor: strength.level >= 2 ? strength.color : '#E2E8F0',
                      }}
                    />
                    <span
                      style={{
                        backgroundColor: strength.level >= 3 ? strength.color : '#E2E8F0',
                      }}
                    />
                  </div>
                  <div className="strength-label" style={{ color: strength.color }}>
                    <Check size={12} />
                    <span>{strength.text}</span>
                  </div>
                </div>
              )}
            </div>

            {/* XÁC NHẬN MẬT KHẨU */}
            <div className="form-field-group">
              <label className="field-label-row">
                <Lock size={15} color="#007B58" />
                <span>
                  Xác nhận mật khẩu <strong className="star-red">*</strong>
                </span>
              </label>
              <div className="field-input-box">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="btn-toggle-eye"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} color="#94A3B8" />
                  ) : (
                    <Eye size={16} color="#94A3B8" />
                  )}
                </button>
              </div>
            </div>

            {/* NGÀY SINH */}
            <div className="form-field-group">
              <label className="field-label-row">
                <Calendar size={15} color="#007B58" />
                <span>
                  Ngày sinh <span className="label-optional">(Tùy chọn)</span>
                </span>
              </label>
              <div className="field-input-box">
                <input
                  type="text"
                  value={dateOfBirth}
                  onChange={handleDobChange}
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                />
                <Calendar size={16} color="#94A3B8" />
              </div>
            </div>

            {/* BOX THÔNG TIN */}
            <div className="complete-profile-callout">
              <div className="callout-icon-circle">
                <Info size={13} color="#10B981" />
              </div>
              <p>
                Bạn có thể sử dụng Tên đăng nhập và Mật khẩu để đăng nhập vào Finora, hoặc tiếp tục đăng nhập bằng Google.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <button
              type="submit"
              className="complete-profile-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Hoàn tất</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {onSkip && (
              <button
                type="button"
                className="complete-profile-skip-btn"
                onClick={onSkip}
                disabled={loading}
              >
                Bỏ qua
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

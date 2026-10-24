import { useState } from 'react';
import { authApi, saveAuthData, type RegisterRequest } from '../api/authApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import './AuthModal.css';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ onClose, onSuccess, onSwitchToLogin }: RegisterModalProps) {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    fullName: '',
    username: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn');
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Email không hợp lệ');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return false;
    }

    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[!@#$%^&*]/.test(formData.password)) {
      setError('Mật khẩu cần tối thiểu 8 ký tự (gồm chữ hoa, chữ thường, số và ký tự đặc biệt !@#$%^&*)');
      return false;
    }

    if (formData.password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        username: formData.username?.trim() || undefined,
      });
      saveAuthData(response.data.user, response.data.tokens);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet modal-register-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
          ✕
        </button>

        <div className="modal-top-header">
          <h2 className="modal-header-title">Đăng ký tài khoản</h2>
          <p className="modal-subtitle">Trải nghiệm quản lý chi tiêu và trợ lý thông minh ngay hôm nay</p>
        </div>

        {error && (
          <div className="form-alert error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form compact-form">
          {/* Row 1: Full name and Email in 2 columns */}
          <div className="form-row-2col">
            <div className="form-field">
              <label className="form-label" htmlFor="reg-fullname">Họ và tên *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="user" size={16} />
                </span>
                <input
                  id="reg-fullname"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  required
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="reg-email">Email *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Username */}
          <div className="form-field">
            <label className="form-label" htmlFor="reg-username">
              <span>Tên tài khoản / Username</span>
              <span className="form-optional-tag">(không bắt buộc)</span>
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon">@</span>
              <input
                id="reg-username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="VD: nguyen_vana"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Row 3: Password and Confirm password in 2 columns */}
          <div className="form-row-2col">
            <div className="form-field">
              <label className="form-label" htmlFor="reg-pass">Mật khẩu *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="shield" size={16} />
                </span>
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  className="with-toggle"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn' : 'Hiện'}
                  aria-label="Ẩn hiện mật khẩu"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="reg-confirm-pass">Xác nhận mật khẩu *</label>
              <div className="form-input-wrapper">
                <span className="input-icon">
                  <FinanceIcon name="shield" size={16} />
                </span>
                <input
                  id="reg-confirm-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Compact security notice */}
          <p className="password-policy-hint">
            🔒 Mật khẩu từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)
          </p>

          <button
            type="submit"
            className="btn-submit-emerald"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <>
                <span>Hoàn tất tạo tài khoản</span>
                <FinanceIcon name="arrow" size={17} />
              </>
            )}
          </button>
        </form>

        <div className="modal-footer-box compact-footer">
          <p className="modal-footer-text">
            Đã có tài khoản Finora?{' '}
            <button
              type="button"
              className="btn-text-emerald"
              onClick={onSwitchToLogin}
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

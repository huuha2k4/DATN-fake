import { useState } from 'react';
import { authApi, saveAuthData, type LoginRequest } from '../api/authApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import './AuthModal.css';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export function LoginModal({ onClose, onSuccess, onSwitchToRegister }: LoginModalProps) {
  const [formData, setFormData] = useState<LoginRequest>({
    login: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      saveAuthData(response.data.user, response.data.tokens);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tài khoản hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Đóng cửa sổ">
          ✕
        </button>

        <h2 className="modal-header-title">Đăng nhập</h2>
        <p className="modal-subtitle">Truy cập không gian quản lý tài chính và trợ lý AI của bạn</p>

        {error && (
          <div className="form-alert error" role="alert">
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label className="form-label" htmlFor="login-identity">
              Email hoặc Tên tài khoản
            </label>
            <div className="form-input-wrapper">
              <span className="input-icon">
                <FinanceIcon name="user" size={17} />
              </span>
              <input
                id="login-identity"
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                placeholder="VD: nguyenvan@gmail.com hoặc username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-field">
            <div className="form-label">
              <label htmlFor="login-pass">Mật khẩu</label>
            </div>
            <div className="form-input-wrapper">
              <span className="input-icon">
                <FinanceIcon name="shield" size={17} />
              </span>
              <input
                id="login-pass"
                type={showPassword ? 'text' : 'password'}
                className="with-toggle"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Nhập mật khẩu của bạn"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-label="Ẩn hiện mật khẩu"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-submit-emerald"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Đang xử lý đăng nhập...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <FinanceIcon name="arrow" size={17} />
              </>
            )}
          </button>
        </form>

        <div className="modal-footer-box">
          <p className="modal-footer-text">
            Chưa có tài khoản Finora?{' '}
            <button
              type="button"
              className="btn-text-emerald"
              onClick={onSwitchToRegister}
            >
              Đăng ký tài khoản mới
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { userApi } from '../../user/api/userApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu cũ');
      return;
    }

    try {
      setLoading(true);
      const res = await userApi.changePassword(currentPassword, newPassword);
      onSuccess(res.message || 'Đổi mật khẩu thành công!');
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đổi mật khẩu thất bại';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="pwd-modal-overlay" onClick={handleClose}>
      <div className="pwd-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pwd-modal-header">
          <div className="pwd-modal-title-box">
            <span className="pwd-modal-icon-badge">
              <FinanceIcon name="lock" size={20} />
            </span>
            <div>
              <h3>Đổi mật khẩu</h3>
              <p>Cập nhật mật khẩu để bảo vệ tài khoản Finora của bạn</p>
            </div>
          </div>
          <button type="button" className="pwd-modal-close" onClick={handleClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {error && (
          <div className="pwd-modal-alert error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="pwd-modal-form">
          <div className="pwd-input-group">
            <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
            <div className="pwd-input-wrapper">
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Nhập mật khẩu đang dùng"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="pwd-toggle-visibility"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="pwd-input-group">
            <label htmlFor="newPassword">Mật khẩu mới</label>
            <div className="pwd-input-wrapper">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="pwd-toggle-visibility"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="pwd-input-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
            <div className="pwd-input-wrapper">
              <input
                id="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pwd-modal-actions">
            <button
              type="button"
              className="pwd-btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="pwd-btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="pwd-spinner" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <FinanceIcon name="shield" size={16} />
                  <span>Lưu mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

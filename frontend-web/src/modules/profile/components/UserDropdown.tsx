import { useState, useRef, useEffect } from 'react';
import { getStoredUser, clearAuthData, authApi } from '../../auth/api/authApi';
import './UserDropdown.css';

interface UserDropdownProps {
  onOpenProfile: () => void;
  onLogout: () => void;
}

export function UserDropdown({ onOpenProfile, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = getStoredUser();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      onLogout();
    }
  };

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="user-dropdown-container" ref={dropdownRef}>
      <button
        className={`user-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <div className="user-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} />
          ) : (
            initials
          )}
        </div>
        <div className="user-info">
          <div className="user-name">{user.fullName}</div>
          <div className="user-email">{user.email}</div>
        </div>
        <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <button
            className="dropdown-item"
            onClick={() => {
              setIsOpen(false);
              onOpenProfile();
            }}
          >
            <span className="dropdown-item-icon">👤</span>
            Thông tin cá nhân
          </button>
          
          <div className="dropdown-divider" />
          
          <button
            className="dropdown-item danger"
            onClick={handleLogout}
          >
            <span className="dropdown-item-icon">🚪</span>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

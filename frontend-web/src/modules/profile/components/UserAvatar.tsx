import { useState, useRef, useEffect } from 'react';
import { getStoredUser } from '../../auth/api/authApi';
import { userApi } from '../../user/api/userApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import './UserAvatar.css';

interface UserAvatarProps {
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

// Map subscription tiers to full clean names
const tierMap: Record<string, { label: string; icon: string }> = {
  FREE: { label: 'Free', icon: '🌱' },
  STANDARD: { label: 'Standard', icon: '⭐' },
  PREMIUM: { label: 'Premium', icon: '👑' },
  VIP: { label: 'VIP', icon: '💎' },
};

function getGreetingByHour(hours: number): string {
  if (hours >= 5 && hours < 11) return 'Chào buổi sáng';
  if (hours >= 11 && hours < 14) return 'Chào buổi trưa';
  if (hours >= 14 && hours < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatCurrentDate(date: Date): string {
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName}, Ngày ${day} Tháng ${month} Năm ${year}`;
}

export function UserAvatar({ onOpenProfile, onOpenChangePassword, onLogout }: UserAvatarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState<any>(() => getStoredUser());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync real-time clock and listen to user profile/storage changes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    const handleStorageChange = () => {
      const stored = getStoredUser();
      if (stored) setUser(stored);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    // If no user in state, try to fetch current user profile
    if (!user) {
      userApi.getCurrentUser()
        .then((fresh) => {
          if (fresh) {
            setUser(fresh);
            localStorage.setItem('user', JSON.stringify(fresh));
          }
        })
        .catch(() => {});
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Display fallback data if user object is not yet loaded in localStorage
  const activeUser = user || {
    fullName: 'Người dùng',
    email: '',
    subscriptionTier: 'FREE',
    avatarUrl: null,
  };

  const avatarUrl = userApi.getAvatarUrl(activeUser.avatarUrl);
  const greetingText = getGreetingByHour(currentTime.getHours());
  const dateFormatted = formatCurrentDate(currentTime);
  const tierInfo = tierMap[activeUser.subscriptionTier?.toUpperCase() || ''] || {
    label: activeUser.subscriptionTier || 'Tiêu chuẩn',
    icon: '⭐',
  };

  return (
    <div className="topbar-user-area" ref={containerRef}>
      {/* 1. Real-time dynamic greeting + user tier badge */}
      <div className="topbar-greeting-box">
        <div className="topbar-greeting-primary">
          <strong className="greeting-headline" title={`${greetingText}, ${activeUser.fullName || 'Người dùng'}`}>
            {greetingText}, {activeUser.fullName || 'Người dùng'}
          </strong>
          <span className="user-tier-badge" title={`Gói dịch vụ: ${tierInfo.label}`}>
            <span className="user-tier-icon">{tierInfo.icon}</span>
            <span className="user-tier-text">{tierInfo.label}</span>
          </span>
        </div>
        <p className="greeting-sub-meta">
          <span>{dateFormatted}</span>
        </p>
      </div>

      {/* 2. ONLY the Avatar is the clickable interactive button to toggle dropdown */}
      <div className="avatar-dropdown-wrapper">
        <button
          type="button"
          className={`avatar-interactive-trigger ${dropdownOpen ? 'is-active' : ''}`}
          onClick={() => setDropdownOpen(prev => !prev)}
          aria-label="Menu tài khoản"
          aria-expanded={dropdownOpen}
          title="Tài khoản cá nhân"
        >
          <div className="avatar-circle-lg">
            <img
              src={avatarUrl}
              alt={activeUser.fullName || 'Avatar'}
              onError={(e) => {
                // Fallback directly to default avatar if image fails to load
                (e.target as HTMLImageElement).src = '/default-avatar.png';
              }}
            />
          </div>
        </button>

        {dropdownOpen && (
          <div className="user-profile-menu-dropdown" role="menu">
            <div className="menu-user-brief">
              <span className="menu-user-name">{activeUser.fullName || 'Người dùng Finora'}</span>
              <span className="menu-user-email">{activeUser.email}</span>
            </div>

            <div className="menu-divider" />

            {/* Chức năng 1: Thông tin cá nhân */}
            <button
              type="button"
              className="menu-item-row"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                onOpenProfile();
              }}
            >
              <span className="menu-item-icon"><FinanceIcon name="user" size={17} /></span>
              <span>Thông tin cá nhân</span>
            </button>

            {/* Chức năng 2: Đổi mật khẩu */}
            <button
              type="button"
              className="menu-item-row"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                onOpenChangePassword();
              }}
            >
              <span className="menu-item-icon"><FinanceIcon name="lock" size={17} /></span>
              <span>Đổi mật khẩu</span>
            </button>

            <div className="menu-divider" />

            {/* Chức năng 3: Đăng xuất */}
            <button
              type="button"
              className="menu-item-row logout-item"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
            >
              <span className="menu-item-icon"><FinanceIcon name="logout" size={17} /></span>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

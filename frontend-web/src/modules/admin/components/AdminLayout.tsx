import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthData } from '../../auth/api/authApi';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import { useTheme } from '../../core/context/ThemeContext';
import { UserAvatar } from '../../profile/components/UserAvatar';
import { ChangePasswordModal } from '../../profile/components/ChangePasswordModal';
import logo from '../../../assets/logo.png';
import './admin.css';

const groups: { label: string; links: [string, string, IconName, string?][] }[] = [
  {
    label: 'Tổng quan', links: [
      ['/admin', 'Tổng quan', 'chart', 'Tài khoản, đăng ký và tình trạng vận hành hôm nay'],
      ['/admin/analytics', 'Thống kê sử dụng', 'trend', 'Đăng ký, hoạt động đăng nhập và khối lượng dữ liệu'],
    ]
  },
  {
    label: 'Người dùng & Hỗ trợ', links: [
      ['/admin/users', 'Quản lý người dùng', 'users', 'Tài khoản, trạng thái và chính sách truy cập'],
      ['/admin/feedbacks', 'Phản hồi & Hỗ trợ', 'message', 'Tiếp nhận và xử lý phản hồi'],
    ]
  },
  {
    label: 'Vận hành dịch vụ', links: [
      ['/admin/ai-management', 'Quản lý FinAI', 'bot', 'Yêu cầu, model và vòng đời đề xuất'],
      ['/admin/ocr-management', 'Quản lý OCR', 'receipt', 'Lượt quét và hóa đơn đã lưu'],
      ['/admin/broadcast', 'Thông báo hệ thống', 'bell', 'Gửi thông báo, theo dõi chiến dịch và quản lý mẫu'],
      ['/admin/system-health', 'Giám sát hệ thống', 'shield', 'Tình trạng dịch vụ và chỉ số tiến trình Backend'],
    ]
  },
  {
    label: 'Quản trị hệ thống', links: [
      ['/admin/audit-logs', 'Nhật ký hệ thống', 'calendar', 'Nhật ký hệ thống và thao tác quản trị viên'],
      ['/admin/categories', 'Danh mục hệ thống', 'wallet', 'Danh mục thu và chi mặc định'],
      ['/admin/settings', 'Cấu hình hệ thống', 'filter', 'Cài đặt vận hành và chế độ bảo trì'],
    ]
  },
];

function Navigation({ close, logout }: { close?: () => void; logout: () => void }) {
  return <>
    <nav className="admin-nav" aria-label="Điều hướng quản trị">
      {groups.map(({ label, links }) => <section className="admin-nav-group" key={label}>
        <h2>{label}</h2>
        {links.map(([path, name, icon]) => <NavLink key={path} to={path} end={path === '/admin'}
          title={name} onClick={close} aria-label={name} className="admin-nav-link">
          <FinanceIcon name={icon} size={17} /><span>{name}</span>
        </NavLink>)}
      </section>)}
    </nav>
    <div className="admin-rail-footer">
      <button className="admin-nav-link admin-signout" type="button" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
        <FinanceIcon name="logout" size={17} /><span>Đăng xuất</span>
      </button>
    </div>
  </>;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const drawer = useRef<HTMLDialogElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true');
  const group = groups.find(item => item.links.some(([path]) => path === pathname));
  const [, title, , description] = group?.links.find(([path]) => path === pathname) ?? ['', 'Hồ sơ quản trị'];

  const logout = () => {
    clearAuthData();
    navigate('/');
  };

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)');
    const close = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);

  return <div className={collapsed ? 'admin-shell is-collapsed' : 'admin-shell'}>
    <a className="admin-skip" href="#admin-content">Đến nội dung chính</a>
    <aside className="admin-rail">
      <Link className="admin-brand" to="/admin" aria-label="Finora Admin">
        <img src={logo} alt="" width={34} height={34} />
        <span>
          <strong>Finora</strong>
          <small className="text-[#007f53] dark:text-emerald-400">Admin Console</small>
        </span>
      </Link>
      <Navigation logout={logout} />
    </aside>
    <dialog ref={drawer} className="admin-mobile-drawer" aria-labelledby="admin-mobile-menu-title"
      onClose={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
      <div className="admin-mobile-inner">
        <header className="admin-brand">
          <img src={logo} alt="" width={36} height={36} />
          <strong id="admin-mobile-menu-title">Finora · Quản trị</strong>
          <button className="admin-icon-button ml-auto" type="button" aria-label="Đóng điều hướng" onClick={() => drawer.current?.close()}>×</button>
        </header>
        <Navigation logout={logout} close={() => drawer.current?.close()} />
      </div>
    </dialog>
    <div className="min-w-0">
      <header className="admin-topbar">
        <button className="admin-icon-button admin-menu-trigger" type="button" aria-label="Mở điều hướng" aria-expanded={menuOpen}
          onClick={() => { drawer.current?.showModal(); setMenuOpen(true); }}>
          <FinanceIcon name="menu" size={20} />
        </button>
        <button className="admin-icon-button admin-collapse-trigger" type="button" aria-expanded={!collapsed}
          aria-label={collapsed ? 'Mở rộng điều hướng' : 'Thu gọn điều hướng'}
          onClick={() => { setCollapsed(!collapsed); localStorage.setItem('admin_sidebar_collapsed', String(!collapsed)); }}>
          <FinanceIcon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={20} />
        </button>
        <div className="admin-topbar-title">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="admin-account">
          <button className="admin-icon-button" type="button" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}>
            <FinanceIcon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <UserAvatar isAdmin onOpenProfile={() => navigate('/admin/profile')}
            onOpenChangePassword={() => setPasswordOpen(true)} onLogout={logout} />
        </div>
      </header>
      <main className="admin-content" id="admin-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
    <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} onSuccess={setNotice} />
    {notice && <div className="toast" role="status">{notice}
      <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button>
    </div>}
  </div>;
}

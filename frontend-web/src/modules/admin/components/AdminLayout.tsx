import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getStoredUser, clearAuthData } from '../../auth/api/authApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { useTheme } from '../../core/context/ThemeContext';
import { UserAvatar } from '../../profile/components/UserAvatar';
import { ChangePasswordModal } from '../../profile/components/ChangePasswordModal';
import logoImg from '../../../assets/logo.png';

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  badge?: string | number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Map route path to human-readable screen title
const adminRouteTitles: Record<string, { title: string; subtitle?: string }> = {
  '/admin': { title: 'Tổng quan Hệ thống', subtitle: 'Bảng điều khiển và số liệu vận hành toàn cục' },
  '/admin/users': { title: 'Quản lý Người dùng', subtitle: 'Danh sách tài khoản, trạng thái và phân quyền hội viên' },
  '/admin/roles': { title: 'Vai trò & Phân quyền', subtitle: 'Cấu hình quyền hạn Quản trị viên và người dùng hệ thống' },
  '/admin/categories': { title: 'Danh mục Hệ thống', subtitle: 'Quản lý danh mục thu/chi mặc định toàn hệ thống' },
  '/admin/ai-management': { title: 'Quản lý AI (FinAI Engine)', subtitle: 'Giám sát quota Gemini AI, chi phí token và hiệu năng' },
  '/admin/ocr-management': { title: 'Quản lý OCR Hóa đơn', subtitle: 'Thống kê lượt quét hóa đơn, tỷ lệ nhận diện thành công' },
  '/admin/analytics': { title: 'Thống kê Sử dụng', subtitle: 'Biểu đồ tăng trưởng người dùng và tương tác hệ thống' },
  '/admin/feedbacks': { title: 'Phản hồi & Hỗ trợ', subtitle: 'Tiếp nhận góp ý, báo lỗi và phản hồi người dùng' },
  '/admin/broadcast': { title: 'Thông báo Hệ thống', subtitle: 'Phát thông báo bảo trì, tin tức, khuyến mãi tới toàn hệ thống' },
  '/admin/audit-logs': { title: 'Nhật ký Hoạt động (Audit Logs)', subtitle: 'Lịch sử thao tác quản trị viên để bảo đảm minh bạch' },
  '/admin/system-health': { title: 'Giám sát Hệ thống', subtitle: 'Tình trạng máy chủ, CPU, RAM và kết nối cơ sở dữ liệu' },
  '/admin/settings': { title: 'Cấu hình Hệ thống', subtitle: 'Hạn mức gói Free/Premium và chế độ bảo trì toàn hệ thống' },
  '/admin/profile': { title: 'Thông tin Cá nhân Quản trị viên', subtitle: 'Thiết lập danh tính, ngôn ngữ và tài khoản quản trị' },
};

function formatCurrentDate(date: Date): string {
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName}, Ngày ${day} Tháng ${month} Năm ${year}`;
}

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toastNotice, setToastNotice] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('admin_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  const isDark = theme === 'dark';
  const currentInfo = adminRouteTitles[location.pathname] || {
    title: 'Hệ thống Quản trị Finora',
    subtitle: 'Bảng điều khiển và số liệu vận hành',
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Báo cáo & Giám sát',
      items: [
        { name: 'Tổng quan', path: '/admin', icon: 'chart' },
        { name: 'Thống kê sử dụng', path: '/admin/analytics', icon: 'trend' },
        { name: 'Giám sát hệ thống', path: '/admin/system-health', icon: 'shield' },
        { name: 'Nhật ký hoạt động', path: '/admin/audit-logs', icon: 'calendar' },
      ],
    },
    {
      title: 'Quản trị Người dùng',
      items: [
        { name: 'Người dùng', path: '/admin/users', icon: 'users' },
        { name: 'Vai trò & Phân quyền', path: '/admin/roles', icon: 'users' },
      ],
    },
    {
      title: 'Công nghệ lõi AI & OCR',
      items: [
        { name: 'Quản lý AI', path: '/admin/ai-management', icon: 'bot' },
        { name: 'Quản lý OCR', path: '/admin/ocr-management', icon: 'receipt' },
        { name: 'Danh mục hệ thống', path: '/admin/categories', icon: 'wallet' },
      ],
    },
    {
      title: 'Vận hành & Hỗ trợ',
      items: [
        { name: 'Thông báo tổng', path: '/admin/broadcast', icon: 'bell' },
        { name: 'Phản hồi & Hỗ trợ', path: '/admin/feedbacks', icon: 'message' },
        { name: 'Cấu hình hệ thống', path: '/admin/settings', icon: 'filter' },
      ],
    },
  ];

  const handleLogout = () => {
    clearAuthData();
    navigate('/');
  };

  const currentDateFormatted = formatCurrentDate(new Date());

  return (
    <div className="dashboard-layout min-h-screen bg-[#f6f8f6] dark:bg-[#0b151e] text-[#14261e] dark:text-slate-100 antialiased">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - chuẩn form mẫu như bên User */}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'mobile-open' : ''
        } ${isSidebarCollapsed ? 'collapsed' : ''}`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between">
          <div className="brand flex-1 flex items-center gap-2.5">
            <span className="brand-mark overflow-hidden p-0 shrink-0 size-8 rounded-full">
              <img src={logoImg} alt="Finora Logo" className="size-full rounded-full object-contain" />
            </span>
            <span className="brand-text">
              <strong>Finora</strong>
              <small>ADMIN PANEL</small>
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="sidebar-scrollable flex-1 overflow-y-auto mt-2.5 flex flex-col gap-3.5 pr-1">
          {menuSections.map((sec, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <span className="nav-caption text-[11px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-500 px-3 py-1">
                {sec.title}
              </span>
              <div className="flex flex-col gap-0.5">
                {sec.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) =>
                      `admin-nav-item flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-semibold transition ${
                        isActive
                          ? 'bg-[#07543f] text-white font-bold shadow-xs'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`
                    }
                    style={{ minHeight: '38px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <FinanceIcon name={item.icon as any} size={16} />
                      <span className="nav-item-label">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.2 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nút Đăng xuất ở chân Sidebar */}
        <div className="sidebar-bottom pt-3 border-t border-[#e9eeea] dark:border-slate-800 mt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
          >
            <FinanceIcon name="logout" size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Shell - căn chỉnh theo sidebar và có Topbar giống User */}
      <div className={`main-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar: Tiêu đề trang bên trái, Theme + Profile bên phải (như bên user) */}
        <header className="topbar sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 !pl-3.5 !pr-6 backdrop-blur">
          {/* Left: Nút thu vào / đẩy ra cột sidebar và tiêu đề trang (chuẩn DashboardHeaderSection) */}
          <div className="flex items-center gap-2 py-2">
            {/* Nút đóng/mở trên Mobile */}
            <button
              type="button"
              className="mobile-sidebar-toggle flex md:hidden items-center justify-center p-2 rounded-xl text-[#244034] hover:bg-[#eaf3ee] dark:text-[#cbd5e1] dark:hover:bg-[#122838] transition-colors"
              onClick={handleToggleSidebar}
              aria-label="Mở menu danh mục"
            >
              <FinanceIcon name="menu" size={22} />
            </button>

            {/* Nút thu vào / mở ra trên Desktop */}
            <button
              type="button"
              className="desktop-sidebar-toggle hidden md:flex items-center justify-center size-8 p-1 text-[#43574c] hover:text-[#07543f] hover:bg-[#eef5f1] dark:text-[#94a3b8] dark:hover:text-white dark:hover:bg-[#1e293b] rounded-lg transition-colors cursor-pointer"
              onClick={handleToggleSidebar}
              title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              <FinanceIcon name={isSidebarCollapsed ? 'panel-left-open' : 'panel-left-close'} size={20} />
            </button>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="header-page-title text-[15px] sm:text-[19px] font-bold tracking-tight leading-tight m-0 line-clamp-1 text-[#14261e] dark:text-slate-100">
                  {currentInfo.title}
                </h1>
                <span className="user-tier-badge" title="Quyền hạn: SUPER ADMIN">
                  <span className="user-tier-icon">★</span>
                  <span className="user-tier-text">SUPER ADMIN</span>
                </span>
              </div>
              {currentInfo.subtitle && (
                <p className="text-[12px] text-[#71847a] dark:text-slate-400 font-normal hidden sm:block mt-0.5 m-0">
                  {currentInfo.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Theme Toggle & Profile Info (kèm menu thả xuống Trang cá nhân / Đổi MK / Đăng xuất) */}
          <div className="topbar-actions flex items-center gap-3">
            <button
              className="icon-button theme-toggle-btn"
              type="button"
              aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              onClick={toggleTheme}
              title={isDark ? 'Chế độ tối (Bấm để chuyển sáng)' : 'Chế độ sáng (Bấm để chuyển tối)'}
            >
              <FinanceIcon name={isDark ? 'sun' : 'moon'} size={18} />
            </button>

            <UserAvatar
              isAdmin={true}
              onOpenProfile={() => navigate('/admin/profile')}
              onOpenChangePassword={() => setIsPasswordModalOpen(true)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Change Password Modal dành cho Admin */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSuccess={(msg) => setToastNotice(msg)}
        />

        {toastNotice && (
          <div className="toast" role="status">
            <span className="toast-check">✓</span>
            {toastNotice}
            <button type="button" aria-label="Đóng thông báo" onClick={() => setToastNotice('')}>×</button>
          </div>
        )}

        {/* Content Body - Full width & responsive chuẩn màn hình */}
        <main className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

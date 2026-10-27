import { useLocation } from 'react-router-dom'
import { FinanceIcon } from './FinanceIcon'
import { UserAvatar } from '../../profile/components/UserAvatar'
import { useTheme } from '../context/ThemeContext'

type Props = { 
  onNotify: (message: string) => void; 
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  walletCount?: number | null;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

// Map route path to human-readable screen title
const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Tổng quan tài chính', subtitle: 'Bảng điều khiển và số dư tổng hợp' },
  '/dashboard': { title: 'Tổng quan tài chính', subtitle: 'Bảng điều khiển và số dư tổng hợp' },
  '/transactions': { title: 'Quản lý Thu & Chi', subtitle: 'Chi tiết các giao dịch phát sinh và dòng tiền' },
  '/budget': { title: 'Quản lý Ngân sách Chi tiêu', subtitle: 'Hạn mức chi tiêu định kỳ và theo dõi tiến độ chi dùng' },
  '/goals': { title: 'Mục tiêu Tài chính & Tích lũy', subtitle: 'Tiến độ mục tiêu tiết kiệm và quỹ tài chính tương lai' },
  '/schedules': { title: 'Lịch tài chính', subtitle: 'Lịch giao dịch định kỳ, hóa đơn và nhắc nhở thanh toán' },
  '/reminders': { title: 'Lịch tài chính', subtitle: 'Lịch giao dịch định kỳ, hóa đơn và nhắc nhở thanh toán' },
  '/debts': { title: 'Quản lý Công nợ', subtitle: 'Theo dõi các khoản đi vay, cho vay và tiến độ trả nợ' },
  '/reports': { title: 'Báo cáo & Thống kê', subtitle: 'Biểu đồ phân tích tài chính đa chiều' },
  '/ai-assistant': { title: 'AI Thông minh', subtitle: 'Trợ lý ảo phân tích và tư vấn tài chính Finora' },
  '/forecast': { title: 'Dự báo tài chính', subtitle: 'Dự đoán số dư và kế hoạch tài chính tương lai' },
  '/analysis': { title: 'Phân tích hành vi chi tiêu', subtitle: 'Xu hướng mua sắm và thói quen tài chính' },
  '/wallets': { title: 'Quản lý các loại ví & Tài khoản', subtitle: 'Kiểm soát ví điện tử, tiền mặt, tài khoản ngân hàng và thẻ tín dụng' },
  '/accounts': { title: 'Quản lý các loại ví & Tài khoản', subtitle: 'Kiểm soát ví điện tử, tiền mặt, tài khoản ngân hàng và thẻ tín dụng' },
  '/profile': { title: 'Thông tin cá nhân & Cài đặt', subtitle: 'Thiết lập danh tính, ngôn ngữ và bảo mật' },
  '/add-transaction': { title: 'Thêm giao dịch mới', subtitle: 'Ghi nhận khoản thu hoặc chi' },
  '/scan-invoice': { title: 'Quét hóa đơn thông minh (OCR)', subtitle: 'Tải ảnh hóa đơn để tự động trích xuất thông tin' },
}

export function DashboardHeaderSection({ onNotify, onOpenProfile, onOpenChangePassword, onLogout, walletCount, onToggleSidebar, isSidebarCollapsed }: Props) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const currentInfo = routeTitles[location.pathname] || { title: 'Hệ thống tài chính Finora', subtitle: '' };
  const isWalletPage = location.pathname === '/wallets' || location.pathname === '/accounts';

  const isDark = theme === 'dark';

  return (
    <header className="topbar sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 !pl-3.5 !pr-6 backdrop-blur">
      {/* Left: Nút thu vào / đẩy ra cột sidebar và tiêu đề trang */}
      <div className="flex items-center gap-2 py-2">
        {/* Nút đóng/mở trên Mobile */}
        {onToggleSidebar && (
          <button
            type="button"
            className="mobile-sidebar-toggle flex md:hidden items-center justify-center p-2 rounded-xl text-[#244034] hover:bg-[#eaf3ee] dark:text-[#cbd5e1] dark:hover:bg-[#122838] transition-colors"
            onClick={onToggleSidebar}
            aria-label="Mở menu danh mục"
          >
            <FinanceIcon name="menu" size={22} />
          </button>
        )}

        {/* Nút thu vào / mở ra trên Desktop: không viền, nằm sát bên trái cạnh tiêu đề trang */}
        {onToggleSidebar && (
          <button
            type="button"
            className="desktop-sidebar-toggle hidden md:flex items-center justify-center size-8 p-1 text-[#43574c] hover:text-[#07543f] hover:bg-[#eef5f1] dark:text-[#94a3b8] dark:hover:text-white dark:hover:bg-[#1e293b] rounded-lg transition-colors cursor-pointer"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-label={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            {isSidebarCollapsed ? (
              /* Icon mở ra khi đang thu gọn: 3 vạch với tam giác chỉ sang phải */
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 4.5H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M5.5 10H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3.5 15.5H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M2.5 8L5 10L2.5 12" fill="currentColor" />
              </svg>
            ) : (
              /* Icon thu vào như ảnh mẫu: 3 vạch ngang không viền, vạch giữa thụt lùi kèm mũi tên tam giác đen chỉ sang trái */
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 4.5H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 10H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3.5 15.5H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M6.5 8L3.5 10L6.5 12V8Z" fill="currentColor" />
              </svg>
            )}
          </button>
        )}

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="header-page-title text-[15px] sm:text-[19px] font-bold tracking-tight leading-tight m-0 line-clamp-1">
              {currentInfo.title}
            </h1>
            {isWalletPage && (
              <span id="wallet-count-pill" className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f4e9] px-2.5 py-0.5 text-[11px] font-semibold text-[#07543f]">
                <span className="size-2 rounded-full bg-[#10b981]" />
                <span id="wallet-count-text">{walletCount ?? 0} nguồn tiền đang theo dõi</span>
              </span>
            )}
          </div>
          {currentInfo.subtitle && (
            <p className="text-[12px] text-[#71847a] font-normal hidden sm:block mt-0.5 m-0">
              {currentInfo.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Theme Toggle, Notifications & Profile Avatar */}
      <div className="topbar-actions flex items-center gap-2.5">
        <button
          className="icon-button theme-toggle-btn"
          type="button"
          aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          onClick={toggleTheme}
          title={isDark ? 'Chế độ tối (Bấm để chuyển sáng)' : 'Chế độ sáng (Bấm để chuyển tối)'}
        >
          {/* Khi đang ở chế độ Sáng thì hiển thị biểu tượng Mặt trời (Sun) thể hiện rõ đang là Light Mode. Khi ở Tối thì hiển thị Mặt trăng (Moon) */}
          <FinanceIcon name={isDark ? 'moon' : 'sun'} size={18} />
        </button>

        <button 
          className="icon-button notification-button relative" 
          type="button" 
          aria-label="Thông báo" 
          onClick={() => onNotify('Bạn đã xem các thông báo mới nhất')}
          title="Thông báo"
        >
          <FinanceIcon name="bell" size={19} />
          <i className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ef4444]" />
        </button>
        <UserAvatar 
          onOpenProfile={onOpenProfile} 
          onOpenChangePassword={onOpenChangePassword} 
          onLogout={onLogout} 
        />
      </div>
    </header>
  );
}

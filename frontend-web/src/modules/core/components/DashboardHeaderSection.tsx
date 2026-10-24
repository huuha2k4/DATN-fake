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
}

// Map route path to human-readable screen title
const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Tổng quan tài chính', subtitle: 'Bảng điều khiển và số dư tổng hợp' },
  '/dashboard': { title: 'Tổng quan tài chính', subtitle: 'Bảng điều khiển và số dư tổng hợp' },
  '/transactions': { title: 'Quản lý Thu & Chi', subtitle: 'Chi tiết các giao dịch phát sinh và dòng tiền' },
  '/budget': { title: 'Quản lý Ngân sách Chi tiêu', subtitle: 'Hạn mức chi tiêu định kỳ và theo dõi tiến độ chi dùng' },
  '/goals': { title: 'Mục tiêu Tài chính & Tích lũy', subtitle: 'Tiến độ mục tiêu tiết kiệm và quỹ tài chính tương lai' },
  '/reminders': { title: 'Nhắc nhở tài chính', subtitle: 'Hóa đơn định kỳ và các khoản thanh toán sắp đến' },
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

export function DashboardHeaderSection({ onNotify, onOpenProfile, onOpenChangePassword, onLogout, walletCount }: Props) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const currentInfo = routeTitles[location.pathname] || { title: 'Hệ thống tài chính Finora', subtitle: '' };
  const isWalletPage = location.pathname === '/wallets' || location.pathname === '/accounts';

  const isDark = theme === 'dark';

  return (
    <header className="topbar sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 px-4 backdrop-blur sm:px-6 lg:px-8">
      {/* Left: Active Screen Name and Context Subtitle with balanced proportions */}
      <div className="flex flex-col justify-center py-2">
        <div className="flex items-center gap-3">
          <h1 className="header-page-title text-[17px] sm:text-[19px] font-bold tracking-tight leading-tight m-0">
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

      {/* Right: Theme Toggle, Notifications & Profile Avatar */}
      <div className="topbar-actions flex items-center gap-2.5">
        <button
          className="icon-button theme-toggle-btn"
          type="button"
          aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          onClick={toggleTheme}
          title={isDark ? 'Chế độ tối (Bấm để chuyển sáng)' : 'Chế độ sáng (Bấm để chuyển tối)'}
        >
          <FinanceIcon name={isDark ? 'sun' : 'moon'} size={18} />
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

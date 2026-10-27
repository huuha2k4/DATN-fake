import { FinanceIcon, type IconName } from './FinanceIcon'
import logoImg from '../../../assets/logo.png'

const navigation: { label: string; icon: IconName }[] = [
  { label: 'Tổng quan', icon: 'grid' },
  { label: 'Thêm giao dịch', icon: 'plus' },
  { label: 'Quản lý Ví', icon: 'wallet' },
  { label: 'Quản lý Thu & Chi', icon: 'arrows' },
  { label: 'Quản lý Ngân sách', icon: 'chart' },
  { label: 'Mục tiêu Tài chính', icon: 'trend' },
  { label: 'Lịch tài chính', icon: 'bell' },
  { label: 'Quản lý Nợ', icon: 'credit-card' },
  { label: 'Báo cáo & Thống kê', icon: 'chart' },
  { label: 'Phân tích hành vi chi tiêu', icon: 'trend' },
  { label: 'AI Thông minh', icon: 'spark' },
  { label: 'Dự báo tài chính', icon: 'trend' },
]

type Props = { 
  active: string; 
  onNavigate: (label: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function FinancialNavigationSection({ active, onNavigate, isOpen, onClose }: Props) {
  const navigate = (item: (typeof navigation)[number]) => {
    onNavigate(item.label)
    if (onClose) onClose()
  }

  return <>
    {/* Mobile backdrop */}
    {isOpen && (
      <div 
        className="sidebar-backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    )}
    <aside className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ${isOpen ? 'mobile-open' : ''}`}>
      <div className="flex items-center justify-between">
        <a className="brand flex-1" href="#overview" aria-label="Finora, tổng quan" onClick={() => onClose && onClose()}>
          <span className="brand-mark overflow-hidden p-0 shrink-0">
            <img src={logoImg} alt="Finora Logo" className="size-full rounded-full object-contain" />
          </span>
          <span className="brand-text"><strong>Finora</strong><small>INTELLIGENCE</small></span>
        </a>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn md:hidden"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <FinanceIcon name="close" size={20} />
          </button>
        )}
      </div>
      <p className="nav-caption">KHÔNG GIAN TÀI CHÍNH</p>
      <nav className="nav-list" aria-label="Điều hướng tài chính">
        {navigation.map((item) => (
          <button 
            key={item.label} 
            type="button" 
            title={item.label}
            className={`nav-item ${active === item.label ? 'active' : ''}`} 
            aria-current={active === item.label ? 'page' : undefined} 
            onClick={() => navigate(item)}
          >
            <FinanceIcon name={item.icon} size={20} className="shrink-0" />
            <span className="nav-item-label truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  </>
}

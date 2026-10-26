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
}

export function FinancialNavigationSection({ active, onNavigate }: Props) {
  const navigate = (item: (typeof navigation)[number]) => {
    onNavigate(item.label)
  }

  return <>
    <aside className="sidebar fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300">
      <a className="brand" href="#overview" aria-label="Finora, tổng quan">
        <span className="brand-mark overflow-hidden p-0 shrink-0">
          <img src={logoImg} alt="Finora Logo" className="size-full rounded-full object-contain" />
        </span>
        <span className="brand-text"><strong>Finora</strong><small>INTELLIGENCE</small></span>
      </a>
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

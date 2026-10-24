import { FinanceIcon, type IconName } from './FinanceIcon'
import logoImg from '../../../assets/logo.png'

const navigation: { label: string; icon: IconName }[] = [
  { label: 'Tổng quan', icon: 'grid' },
  { label: 'Thêm giao dịch', icon: 'plus' },
  { label: 'Quản lý Ví', icon: 'wallet' },
  { label: 'Quản lý Thu & Chi', icon: 'arrows' },
  { label: 'Quản lý Ngân sách', icon: 'chart' },
  { label: 'Mục tiêu Tài chính', icon: 'trend' },
  { label: 'Nhắc nhở tài chính', icon: 'bell' },
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
    <aside className="sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[264px] lg:flex-col lg:px-4 lg:py-6">
      <a className="brand" href="#overview" aria-label="Finora, tổng quan">
        <span className="brand-mark overflow-hidden p-0">
          <img src={logoImg} alt="Finora Logo" className="size-full rounded-full object-contain" />
        </span>
        <span><strong>Finora</strong><small>INTELLIGENCE</small></span>
      </a>
      <p className="nav-caption">KHÔNG GIAN TÀI CHÍNH</p>
      <nav className="nav-list" aria-label="Điều hướng tài chính">
        {navigation.map((item) => (
          <button 
            key={item.label} 
            type="button" 
            className={`nav-item ${active === item.label ? 'active' : ''}`} 
            aria-current={active === item.label ? 'page' : undefined} 
            onClick={() => navigate(item)}
          >
            <FinanceIcon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
    <nav className="mobile-nav fixed inset-x-3 bottom-2 z-20 flex justify-around rounded-xl border border-[#e4ebe6] bg-white/95 px-1 py-2 shadow-xl backdrop-blur lg:hidden" aria-label="Điều hướng chính">
      {navigation.slice(0, 6).map((item) => (
        <button 
          key={item.label} 
          type="button" 
          onClick={() => navigate(item)} 
          aria-label={item.label} 
          className={`flex min-w-[36px] flex-col items-center gap-1 p-1 text-[8px] ${active === item.label ? 'selected text-[#087557]' : 'text-[#7a877f]'}`}
        >
          <FinanceIcon name={item.icon} size={18} />
          <span>{item.label.split(' ')[0]}</span>
        </button>
      ))}
    </nav>
  </>
}

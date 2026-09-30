import { useState } from 'react'
import { FinanceIcon, type IconName } from './FinanceIcon'

const navigation: { label: string; icon: IconName; expandable?: boolean }[] = [
  { label: 'Tổng quan', icon: 'grid' },
  { label: 'Quản lý Thu & Chi', icon: 'arrows', expandable: true },
  { label: 'Ngân sách & Mục tiêu', icon: 'wallet', expandable: true },
  { label: 'Nhắc nhở tài chính', icon: 'bell', expandable: true },
  { label: 'Báo cáo & Thống kê', icon: 'chart', expandable: true },
  { label: 'Phân tích hành vi chi tiêu', icon: 'trend', expandable: true },
  { label: 'AI Thông minh', icon: 'spark', expandable: true },
  { label: 'Dự báo tài chính', icon: 'trend', expandable: true },
  { label: 'Quản lý Hồ sơ & Tài khoản', icon: 'bank', expandable: true },
  { label: 'Cài đặt hệ thống', icon: 'settings' },
]

type Props = { active: string; onNavigate: (label: string) => void }

export function FinancialNavigationSection({ active, onNavigate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const navigate = (item: (typeof navigation)[number]) => {
    onNavigate(item.label)
    setExpanded(item.expandable ? (expanded === item.label ? null : item.label) : null)
  }

  return <>
    <aside className="sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[264px] lg:flex-col lg:border-r lg:border-[#e9eeea] lg:bg-white lg:px-4 lg:py-6">
      <a className="brand" href="#overview" aria-label="FinAI, tổng quan"><span className="brand-mark"><FinanceIcon name="chart" size={21} /></span><span><strong>FinAI</strong><small>INTELLIGENCE</small></span></a>
      <p className="nav-caption">KHÔNG GIAN TÀI CHÍNH</p>
      <nav className="nav-list" aria-label="Điều hướng tài chính">
        {navigation.map((item) => <button key={item.label} type="button" className={`nav-item ${active === item.label ? 'active' : ''}`} aria-current={active === item.label ? 'page' : undefined} aria-expanded={item.expandable ? expanded === item.label : undefined} onClick={() => navigate(item)}>
          <FinanceIcon name={item.icon} size={18} /><span>{item.label}</span>{item.expandable && <span className={`nav-chevron ${expanded === item.label ? 'turned' : ''}`}>⌄</span>}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user"><span className="avatar">NA</span><span><strong>Nguyễn Văn A</strong><small>Gói Premium</small></span><FinanceIcon name="more" size={18} /></div>
      </div>
    </aside>
    <nav className="mobile-nav fixed inset-x-3 bottom-2 z-20 flex justify-around rounded-xl border border-[#e4ebe6] bg-white/95 px-1 py-2 shadow-xl backdrop-blur lg:hidden" aria-label="Điều hướng chính">
      {navigation.slice(0, 8).map((item) => <button key={item.label} type="button" onClick={() => navigate(item)} aria-label={item.label} className={`flex min-w-[36px] flex-col items-center gap-1 p-1 text-[8px] ${active === item.label ? 'selected text-[#087557]' : 'text-[#7a877f]'}`}><FinanceIcon name={item.icon} size={18} /><span>{item.label.split(' ')[0]}</span></button>)}
    </nav>
  </>
}

import { useState } from 'react'
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon'

type Props = { onNotify: (message: string) => void }
type Suggestion = { icon: IconName; title: string; priority: string; text: string; saving: string; action: string; tone: string }

const spendingCategories = [
  { name: 'Ăn uống', amount: '3.450.000 đ', share: '38%', change: '+18%', icon: 'coffee' as const, color: '#b84f46', width: '78%' },
  { name: 'Mua sắm', amount: '1.250.000 đ', share: '22%', change: '-6%', icon: 'wallet' as const, color: '#168361', width: '46%' },
  { name: 'Hóa đơn', amount: '1.145.000 đ', share: '20%', change: '-4%', icon: 'bolt' as const, color: '#d99b35', width: '42%' },
  { name: 'Di chuyển', amount: '850.000 đ', share: '15%', change: '+2%', icon: 'arrows' as const, color: '#52786c', width: '32%' },
  { name: 'Giải trí', amount: '450.000 đ', share: '5%', change: '-11%', icon: 'chart' as const, color: '#829087', width: '18%' },
]

const suggestions: Suggestion[] = [
  { icon: 'wallet', title: 'Cắt giảm ngân sách ăn uống', priority: 'Ưu tiên cao', text: 'Giảm chi tiêu ăn uống khoảng 15% và tăng mức tiết kiệm lên 20% thu nhập để bám sát mục tiêu mua laptop.', saving: 'Tiết kiệm thêm khoảng 600.000 đ/tháng', action: 'Áp dụng hạn mức', tone: 'green' },
  { icon: 'receipt', title: 'Tối ưu đăng ký định kỳ', priority: 'Tiết kiệm 240.000 đ/tháng', text: 'Có 2 dịch vụ giải trí ít được sử dụng trong 30 ngày qua. Cân nhắc tạm dừng để tăng quỹ dự phòng.', saving: 'Spotify Premium · Gym Pass', action: 'Kiểm tra dịch vụ', tone: 'blue' },
]

const tabs = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'spending', label: 'Chi tiêu' },
  { id: 'recommendations', label: 'Khuyến nghị' },
] as const

type TabId = (typeof tabs)[number]['id']

export function SpendingAnalysisScreen({ onNotify }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [confirmed, setConfirmed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [month, setMonth] = useState('09/2025')

  const refreshAnalysis = () => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 700)
    onNotify('Phân tích đã được cập nhật')
  }

  const showOverview = activeTab === 'overview'
  const showSpending = activeTab === 'overview' || activeTab === 'spending'
  const showRecommendations = activeTab === 'overview' || activeTab === 'recommendations'

  return <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-6 text-[#14251f] sm:gap-6 sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-8" aria-label="Phân tích hành vi chi tiêu">
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-2 text-[10px] text-[#718078]"><span>FinAI Intelligence</span><FinanceIcon name="arrow" size={12} /><strong className="text-[#07543f]">Phân tích AI</strong></nav><h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">Phân tích hành vi chi tiêu</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-[#718078]">Nhận diện xu hướng, phát hiện giao dịch bất thường và tìm cách tối ưu ngân sách.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex h-9 items-center gap-2 rounded-lg border border-[#e3e9e5] bg-white px-3 text-[10px]"><FinanceIcon name="calendar" size={14} /><select aria-label="Tháng phân tích" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent outline-none"><option value="09/2025">Tháng 09/2025</option><option value="08/2025">Tháng 08/2025</option><option value="07/2025">Tháng 07/2025</option></select></label><button type="button" onClick={refreshAnalysis} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#07543f] px-3 text-[10px] font-semibold text-white"><FinanceIcon name="refresh" size={14} />{refreshing ? 'Đang phân tích…' : 'Làm mới phân tích AI'}</button></div></header>

    <div className="flex w-full max-w-md gap-1 rounded-lg bg-[#eaf0fb] p-1" role="tablist" aria-label="Chế độ phân tích">{tabs.map((tab) => <button key={tab.id} id={`analysis-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls="analysis-panel" onClick={() => setActiveTab(tab.id)} className={`flex-1 rounded-md px-3 py-2 text-[10px] font-medium ${activeTab === tab.id ? 'bg-white text-[#07543f] shadow-sm' : 'text-[#66746b]'}`}>{tab.label}</button>)}</div>

    <div id="analysis-panel" role="tabpanel" aria-labelledby={`analysis-tab-${activeTab}`} className="grid gap-5">
      {showOverview && <section className="grid gap-3 md:grid-cols-3" aria-label="Chỉ số phân tích"><article className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.6px] text-[#718078]">TỔNG CHI ĂN UỐNG</span><span className="grid size-9 place-items-center rounded-lg bg-[#fff0e9] text-[#b45148]"><FinanceIcon name="coffee" size={16} /></span></div><strong className="mt-3 block text-[25px] font-semibold text-[#26372e]">3.450.000 <small className="text-xs font-normal">đ</small></strong><p className="mt-1 text-[10px] text-[#718078]">Chiếm 38% tổng chi tiêu sinh hoạt</p></article><article className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.6px] text-[#718078]">TỶ LỆ TÍCH LŨY</span><span className="grid size-9 place-items-center rounded-lg bg-[#eaf0fb] text-[#47677f]"><FinanceIcon name="trend" size={16} /></span></div><strong className="mt-3 block text-[25px] font-semibold text-[#26372e]">12%</strong><p className="mt-1 text-[10px] text-[#718078]">Mục tiêu đề xuất: 20% thu nhập</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eaf0ec]"><span className="block h-full w-[60%] rounded-full bg-[#d99b35]" /></div></article><article className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.6px] text-[#718078]">SỨC KHỎE TÀI CHÍNH</span><span className="grid size-9 place-items-center rounded-lg bg-[#e3f4e9] text-[#087557]"><FinanceIcon name="shield" size={16} /></span></div><strong className="mt-3 block text-[25px] font-semibold text-[#26372e]">Khá tốt</strong><p className="mt-1 text-[10px] text-[#718078]">Còn dư địa cải thiện khoản tiết kiệm</p></article></section>}

      {showOverview && <section className="grid gap-3 rounded-xl border border-[#ead5d2] bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center sm:p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#fff0e9] text-[#b45148]"><FinanceIcon name="expense" size={17} /></span><div><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold tracking-[.6px] text-[#a3483e]">PHÁT HIỆN GIAO DỊCH BẤT THƯỜNG</span><span className="rounded-full bg-[#fff0e9] px-2 py-0.5 text-[8px] font-semibold text-[#a3483e]">Cảnh báo rò rỉ</span></div><h2 className="mt-1 text-sm font-semibold text-[#26372e]">{confirmed ? 'Giao dịch đã được xác nhận' : 'Khoản chi 2.500.000 đ lúc 23:45'}</h2><p className="mt-1 text-[10px] leading-4 text-[#718078]">Mức chi cao hơn đáng kể so với trung bình 300.000 đ và phát sinh ngoài khung giờ thường lệ.</p></div></div><div className="flex gap-2 lg:justify-end"><button type="button" onClick={() => onNotify('Đã gắn nhãn chi đặc biệt')} className="h-9 rounded-lg border border-[#dfe7e1] px-3 text-[9px] font-medium text-[#526159]">Gắn nhãn chi đặc biệt</button><button type="button" disabled={confirmed} onClick={() => setConfirmed(true)} className="h-9 rounded-lg bg-[#a3483e] px-3 text-[9px] font-semibold text-white disabled:opacity-60">{confirmed ? 'Đã xác nhận' : 'Xác nhận khoản này'}</button></div></section>}

      {showSpending && <section className="grid gap-3"><header className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-semibold text-[#26372e]"><span className="grid size-8 place-items-center rounded-lg bg-[#e3f4e9] text-[#087557]"><FinanceIcon name="chart" size={15} /></span>Xu hướng chi tiêu theo danh mục</h2><span className="text-[9px] text-[#829087]">Chu kỳ 30 ngày gần nhất</span></header><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{spendingCategories.map((item) => <article key={item.name} className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm"><header className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f2]" style={{ color: item.color }}><FinanceIcon name={item.icon} size={16} /></span><div><h3 className="text-xs font-semibold text-[#34463b]">{item.name}</h3><p className="mt-0.5 text-[9px] text-[#829087]">{item.share} tổng chi</p></div></div><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${item.change.startsWith('+') ? 'bg-[#fff0e9] text-[#a3483e]' : 'bg-[#e3f4e9] text-[#17794f]'}`}>{item.change}</span></header><div className="mt-4 flex justify-between text-[10px]"><span className="text-[#718078]">Đã chi</span><strong className="text-[#34463b]">{item.amount}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ee]"><span className="block h-full rounded-full" style={{ width: item.width, backgroundColor: item.color }} /></div></article>)}</div></section>}

      {showRecommendations && <section className="grid gap-3"><header className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold text-[#26372e]"><span className="grid size-8 place-items-center rounded-lg bg-[#e3f4e9] text-[#087557]"><FinanceIcon name="spark" size={15} /></span>Gợi ý từ FinAI</h2><span className="rounded-full bg-[#e3f4e9] px-2.5 py-1 text-[8px] font-semibold text-[#17794f]">2 gợi ý mới</span></header><div className="grid gap-3 xl:grid-cols-2">{suggestions.map((suggestion) => <article key={suggestion.title} className="flex flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${suggestion.tone === 'green' ? 'bg-[#e3f4e9] text-[#087557]' : 'bg-[#eaf0fb] text-[#47677f]'}`}><FinanceIcon name={suggestion.icon} size={17} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-semibold text-[#34463b]">{suggestion.title}</h3><span className="rounded-full bg-[#f1f5f2] px-2 py-0.5 text-[8px] text-[#59675f]">{suggestion.priority}</span></div><p className="mt-2 text-[10px] leading-5 text-[#59675f]">{suggestion.text}</p></div></div><footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0ed] pt-3"><span className="flex items-center gap-1.5 text-[9px] text-[#087557]"><FinanceIcon name="trend" size={12} />{suggestion.saving}</span><button type="button" onClick={() => onNotify(`Đã áp dụng: ${suggestion.title}`)} className="rounded-lg bg-[#07543f] px-3 py-2 text-[9px] font-semibold text-white">{suggestion.action}</button></footer></article>)}</div></section>}
    </div>
  </main>
}

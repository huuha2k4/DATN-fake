import { useState } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'

type Props = { onNotify: (message: string) => void; onAddTransaction: () => void }

const transactions = [
  { name: 'Công ty Cổ phần Công nghệ VN', category: 'Lương', date: '08:30 · 25/09', amount: '+15.000.000 ₫', description: 'Thu nhập chính', type: 'income' as const, icon: 'income' as const },
  { name: 'Siêu thị WinMart Landmark', category: 'Ăn uống', date: '19:15 · 24/09', amount: '-420.000 ₫', description: 'Nhu yếu phẩm', type: 'expense' as const, icon: 'wallet' as const },
  { name: 'Thù lao tư vấn UI/UX dự án', category: 'Freelance', date: '14:10 · 23/09', amount: '+3.500.000 ₫', description: 'Thu nhập phụ', type: 'income' as const, icon: 'income' as const },
  { name: 'Highlands Coffee Hàm Nghi', category: 'Gặp gỡ', date: '09:45 · 23/09', amount: '-85.000 ₫', description: 'Dịch vụ', type: 'expense' as const, icon: 'coffee' as const },
  { name: 'Điện lực EVN TP.HCM', category: 'Sinh hoạt', date: '11:20 · 22/09', amount: '-1.145.000 ₫', description: 'Hóa đơn tháng', type: 'expense' as const, icon: 'bolt' as const },
]

const accounts = [
  { title: 'VIETCOMBANK', subtitle: '•••• 4519 · Hoạt động', amount: '53.000.000', description: 'Tài khoản nhận lương chính', icon: 'bank' as const, status: '+3.500.000 ₫', detail: 'Biến động tháng' },
  { title: 'VÍ MOMO & SHOPEEPAY', subtitle: 'Liên kết 2 ví · QR Pay', amount: '8.600.000', description: 'Chi tiêu linh hoạt hàng ngày', icon: 'wallet' as const, status: 'Còn 75% hạn mức', detail: 'QR / Thẻ trả trước' },
  { title: 'QUỸ KHẨN CẤP & TÍCH LŨY', subtitle: 'Sinh lời 4,5%/năm', amount: '50.000.000', description: 'Bảo vệ tài chính 6 tháng chi tiêu', icon: 'shield' as const, status: '100% mục tiêu an toàn', detail: 'Kỳ hạn linh hoạt' },
]

export function DashboardScreen({ onNotify, onAddTransaction }: Props) {
  const [month, setMonth] = useState('09/2025')
  const [showTransactions, setShowTransactions] = useState(false)
  const weeks = [
    { label: 'Tuần 1', date: '01 - 07/09', income: 67, expense: 25 },
    { label: 'Tuần 2', date: '08 - 14/09', income: 48, expense: 34 },
    { label: 'Tuần 3', date: '15 - 21/09', income: 82, expense: 38 },
    { label: 'Tuần 4', date: '22 - 28/09', income: 57, expense: 21 },
  ]
  const visibleTransactions = showTransactions ? [...transactions, ...transactions.slice(0, 2)] : transactions

  return <main id="overview" className="dashboard-content mx-auto w-full max-w-[1560px] px-3 pb-24 pt-6 sm:px-[22px] lg:px-[34px] lg:pb-12 lg:pt-8">
    <section className="welcome-row mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-5"><div><p className="eyebrow"><span className="live-dot" /> HỒ SƠ TÀI CHÍNH CÁ NHÂN</p><h1>Chào buổi sáng, Nguyễn Văn A</h1><p className="welcome-meta">Thứ Năm, ngày 25 tháng 09, 2025 <span>·</span> <strong>Ngân sách đang ổn định</strong></p></div><div className="welcome-tools"><label className="month-picker"><FinanceIcon name="calendar" size={17} /><span className="sr-only">Chọn tháng</span><select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Chọn tháng"><option value="09/2025">Tháng 09/2025</option><option value="08/2025">Tháng 08/2025</option><option value="07/2025">Tháng 07/2025</option></select></label><button className="icon-button" type="button" aria-label="Làm mới dữ liệu" onClick={() => onNotify('Dữ liệu đã được cập nhật')}><FinanceIcon name="refresh" size={17} /></button><button className="icon-button" type="button" aria-label="Tải xuống báo cáo" onClick={() => onNotify('Báo cáo đang được tải xuống')}><FinanceIcon name="download" size={17} /></button></div></section>

    <section className="summary-grid mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mb-5 lg:grid-cols-3 lg:gap-4" aria-label="Tổng quan tài chính">
      <article className="summary-card balance-card"><div className="summary-top"><span className="summary-label">TỔNG SỐ DƯ KHẢ DỤNG</span><span className="summary-icon"><FinanceIcon name="wallet" size={19} /></span></div><div className="summary-amount">12.850.000 <small>₫</small></div><div className="summary-foot"><span className="trend-pill"><FinanceIcon name="trend" size={13} /> +2,5%</span><span>so với tháng trước</span></div><span className="balance-decoration" aria-hidden="true">₫</span></article>
      <article className="summary-card"><div className="summary-top"><span className="summary-label">TỔNG THU NHẬP THÁNG</span><span className="summary-icon mint"><FinanceIcon name="income" size={19} /></span></div><div className="summary-amount">18.500.000 <small>₫</small></div><div className="summary-foot bordered"><span className="status-pill"><i />100% mục tiêu</span><span className="foot-detail">3 nguồn thu</span></div></article>
      <article className="summary-card"><div className="summary-top"><span className="summary-label">TỔNG CHI TIÊU THÁNG</span><span className="summary-icon blue"><FinanceIcon name="expense" size={19} /></span></div><div className="summary-amount">5.650.000 <small>₫</small></div><div className="budget-progress"><div className="progress-copy"><span>Đã dùng 68% hạn mức</span><strong>8.300.000 ₫</strong></div><div className="progress-track"><div className="h-full w-[68%] rounded-full bg-[#006c49]" /></div></div></article>
    </section>

    <section className="activity-grid grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(380px,.88fr)]">
      <article className="panel cashflow-panel"><div className="panel-heading"><div><h2>Dòng tiền theo tuần</h2><p>Đối chiếu thu nhập và chi tiêu · Tháng 9</p></div><div className="chart-legend"><span><i className="legend-income" />Thu nhập</span><span><i className="legend-expense" />Chi tiêu</span></div></div><div className="chart-area" role="img" aria-label="Biểu đồ thu nhập và chi tiêu theo tuần"><div className="chart-y-labels"><span>20tr</span><span>15tr</span><span>10tr</span><span>5tr</span><span>0</span></div><div className="chart-plot">{[20,40,60,80,100].map((line) => <i className="chart-gridline" key={line} style={{ bottom: `${line - 1}%` }} />)}{weeks.map((week, index) => <div className="bar-group" key={week.label}><div className="bar-pair"><i className={`bar income-bar ${index === 3 ? 'latest' : ''}`} style={{ height: `${week.income}%` }} /><i className="bar expense-bar" style={{ height: `${week.expense}%` }} /></div><strong className={index === 3 ? 'current-week' : ''}>{week.label}</strong><small>{week.date}</small></div>)}</div></div><div className="net-savings"><span><span className="savings-icon"><FinanceIcon name="trend" size={16} /></span>Dòng tiền thuần tích lũy <small>(Net Savings)</small></span><strong>+12.850.000 ₫</strong></div></article>
      <article className="panel transactions-panel"><div className="panel-heading transaction-heading"><div><h2>Giao dịch gần đây</h2><p>{showTransactions ? '7 hoạt động tài chính' : '5 hoạt động tài chính mới nhất'}</p></div><button className="text-button" type="button" onClick={() => setShowTransactions((value) => !value)}>{showTransactions ? 'Thu gọn ↑' : 'Xem tất cả →'}</button></div><div className="transaction-list">{visibleTransactions.map((transaction, index) => <div className="transaction-row" key={`${transaction.name}-${index}`}><span className={`transaction-icon ${transaction.type}`}><FinanceIcon name={transaction.icon} size={17} /></span><div className="transaction-info"><strong>{transaction.name}</strong><span><em className={transaction.type}>{transaction.category}</em><small>{transaction.date}</small></span></div><div className="transaction-value"><strong className={transaction.type}>{transaction.amount}</strong><small>{transaction.description}</small></div></div>)}</div><button className="quick-add" type="button" onClick={onAddTransaction}><FinanceIcon name="plus" size={17} />Nhập nhanh khoản thu/chi</button></article>
    </section>

    <section className="accounts-section mt-6"><div className="section-heading"><h2><span className="section-icon"><FinanceIcon name="bank" size={17} /></span>Tài khoản &amp; Nguồn tiền</h2><span className="account-count">3 tài khoản liên kết</span></div><div className="account-grid">{accounts.map((account) => <article className="account-card" key={account.title}><div className="account-top"><div><h3>{account.title}</h3><p>{account.subtitle}</p></div><span className={`account-icon ${account.icon}`}><FinanceIcon name={account.icon} size={19} /></span></div><div className="account-balance"><strong>{account.amount}</strong><span>₫</span></div><p className="account-description">{account.description}</p><div className="account-bottom"><span className="account-status">{account.status}</span><small>{account.detail}</small></div></article>)}</div></section>
  </main>
}

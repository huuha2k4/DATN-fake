import { useState } from 'react'
import { FinanceIcon } from './FinanceIcon'

type Props = { onNotify: (message: string) => void; onAddTransaction: () => void; onOpenInvoiceScanner: () => void }

export function DashboardHeaderSection({ onNotify, onAddTransaction, onOpenInvoiceScanner }: Props) {
  const [query, setQuery] = useState('')

  return <header className="topbar sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-[#e9eeea] bg-white/95 px-3 backdrop-blur sm:gap-6 sm:px-5 lg:px-8">
    <form className="search-box flex h-[38px] w-full max-w-[480px] items-center gap-2.5 rounded-lg bg-[#f3f6f4] px-3 text-[#89958e] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#acd7c3]" role="search" onSubmit={(event) => { event.preventDefault(); onNotify(query ? `Đang tìm: ${query}` : 'Nhập nội dung cần tìm') }}>
      <FinanceIcon name="search" size={18} /><input aria-label="Tìm kiếm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm giao dịch, ngân sách, phân tích tài chính..." /><kbd>⌘ K</kbd>
    </form>
    <div className="topbar-actions">
      <button className="button button-primary" type="button" onClick={onAddTransaction}><FinanceIcon name="plus" size={17} /><span>Thêm giao dịch</span></button>
      <button className="button button-soft hide-narrow" type="button" onClick={onOpenInvoiceScanner}><FinanceIcon name="receipt" size={16} /><span>Quét hóa đơn</span></button>
      <button className="button button-ai hide-narrow" type="button" onClick={() => onNotify('FinAI đang sẵn sàng hỗ trợ')}><FinanceIcon name="spark" size={16} /><span>Trợ lý AI</span></button>
      <button className="icon-button notification-button" type="button" aria-label="Thông báo" onClick={() => onNotify('Bạn đã xem các thông báo mới')}><FinanceIcon name="bell" size={18} /><i /></button>
      <button className="topbar-profile" type="button" aria-label="Mở hồ sơ người dùng" onClick={() => onNotify('Hồ sơ Nguyễn Văn A')}><span className="avatar">NA</span></button>
    </div>
  </header>
}

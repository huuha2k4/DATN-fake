import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon'

type TransactionType = 'expense' | 'income'
type Props = { onCancel: () => void; onNotify: (message: string) => void; onOpenInvoiceScanner: () => void }
type Category = { name: string; description: string; icon: IconName }
type Account = { name: string; balance: string; icon: IconName }

const categories: Category[] = [
  { name: 'Ăn uống', description: 'Cà phê, Ăn trưa', icon: 'coffee' },
  { name: 'Mua sắm', description: 'Quần áo, Đồ dùng', icon: 'wallet' },
  { name: 'Di chuyển', description: 'Xăng xe, Grab', icon: 'arrows' },
  { name: 'Hóa đơn', description: 'Điện, Nước, Net', icon: 'bolt' },
  { name: 'Giải trí', description: 'Xem phim, Game', icon: 'chart' },
  { name: 'Sức khỏe', description: 'Thuốc, Khám bệnh', icon: 'shield' },
  { name: 'Học tập', description: 'Sách, Khóa học', icon: 'receipt' },
  { name: 'Khác', description: 'Danh mục khác', icon: 'more' },
]

const incomeCategories: Category[] = [
  { name: 'Lương', description: 'Thu nhập định kỳ', icon: 'bank' },
  { name: 'Freelance', description: 'Dự án, tư vấn', icon: 'chart' },
  { name: 'Đầu tư', description: 'Lãi, cổ tức', icon: 'trend' },
  { name: 'Thưởng', description: 'Thưởng, quà tặng', icon: 'spark' },
]

const accounts: Account[] = [
  { name: 'Vietcombank Digital', balance: '53.000.000 đ', icon: 'bank' },
  { name: 'Ví MoMo', balance: '8.600.000 đ', icon: 'wallet' },
  { name: 'Tiền mặt', balance: '2.500.000 đ', icon: 'receipt' },
]
const presets = [
  { label: '+50k', value: 50_000 },
  { label: '+100k', value: 100_000 },
  { label: '+250k', value: 250_000 },
  { label: '+500k', value: 500_000 },
  { label: '+1M', value: 1_000_000 },
  { label: '+2M', value: 2_000_000 },
]
const todayTransactions = [
  { name: 'Highlands Coffee', detail: '08:15 · MoMo', amount: '-55.000 đ', icon: 'coffee' as const, income: false },
  { name: 'Petrolimex Cầu Giấy', detail: '10:30 · Tiền mặt', amount: '-80.000 đ', icon: 'bolt' as const, income: false },
  { name: 'Tiền thưởng dự án', detail: '11:45 · Vietcombank', amount: '+2.000.000 đ', icon: 'income' as const, income: true },
]

const formatAmount = (value: number) => new Intl.NumberFormat('vi-VN').format(value)

export function AddTransactionScreen({ onCancel, onNotify, onOpenInvoiceScanner }: Props) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('250000')
  const [category, setCategory] = useState('Ăn uống')
  const [account, setAccount] = useState(accounts[0].name)
  const [date, setDate] = useState('2025-09-25')
  const [time, setTime] = useState('14:30')
  const [note, setNote] = useState('Ăn trưa cùng đồng nghiệp tại Tokyo Deli')
  const [recurring, setRecurring] = useState(false)
  const [fileName, setFileName] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const availableCategories = type === 'expense' ? categories : incomeCategories
  const numericAmount = Number(amount) || 0

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Tệp đính kèm cần nhỏ hơn 5 MB.')
      event.target.value = ''
      return
    }
    setError('')
    setFileName(file.name)
    onNotify(`Đã chọn hóa đơn: ${file.name}`)
  }

  const persistTransaction = (continueAdding = false) => {
    if (numericAmount <= 0) {
      setError('Vui lòng nhập số tiền lớn hơn 0.')
      return
    }
    setError('')
    setSaved(true)
    onNotify(`${type === 'expense' ? 'Khoản chi' : 'Khoản thu'} ${formatAmount(numericAmount)} đ đã được lưu`)
    if (continueAdding) {
      setAmount('')
      setNote('')
      setFileName('')
      setSaved(false)
    }
  }

  const saveTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    persistTransaction()
  }

  return <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-6 text-[#14251f] sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-8" aria-label="Thêm giao dịch">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-2 text-[10px] text-[#718078]"><button type="button" onClick={onCancel} className="hover:text-[#087557]">Quản lý Thu &amp; Chi</button><FinanceIcon name="arrow" size={12} /><span className="font-semibold text-[#07543f]">Thêm giao dịch mới</span></nav><h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">Thêm giao dịch mới</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-[#718078]">Ghi nhận khoản thu hoặc chi tiêu. FinAI sẽ gợi ý danh mục phù hợp.</p></div><div className="flex gap-2"><button type="button" onClick={onCancel} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#eaf0fb] px-3 text-[10px] font-medium text-[#30465d]"><FinanceIcon name="arrow" size={14} />Hủy bỏ</button><button type="button" onClick={onOpenInvoiceScanner} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#dff5ec] px-3 text-[10px] font-medium text-[#07543f]"><FinanceIcon name="receipt" size={14} />Dùng OCR quét ảnh</button></div></header>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)]">
      <form onSubmit={saveTransaction} className="flex flex-col gap-6 rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:gap-7 sm:p-6">
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h2 className="text-xs font-semibold text-[#34463b]">Loại giao dịch</h2><div className="grid grid-cols-2 rounded-lg bg-[#f1f5f2] p-1"><button type="button" aria-pressed={type === 'expense'} onClick={() => { setType('expense'); setCategory('Ăn uống') }} className={`flex items-center justify-center gap-2 rounded-md px-5 py-2 text-xs font-semibold ${type === 'expense' ? 'bg-[#07543f] text-white shadow-sm' : 'text-[#68766e]'}`}><FinanceIcon name="expense" size={15} />Chi tiêu</button><button type="button" aria-pressed={type === 'income'} onClick={() => { setType('income'); setCategory('Lương') }} className={`flex items-center justify-center gap-2 rounded-md px-5 py-2 text-xs font-semibold ${type === 'income' ? 'bg-[#07543f] text-white shadow-sm' : 'text-[#68766e]'}`}><FinanceIcon name="income" size={15} />Thu nhập</button></div></section>

        <section className="flex flex-col items-center rounded-xl bg-[#f3f7f4] p-4 sm:p-6"><label htmlFor="transaction-amount" className="text-[9px] font-bold tracking-[.8px] text-[#77837b]">SỐ TIỀN GIAO DỊCH</label><div className="flex w-full max-w-md items-center justify-center gap-2 py-2"><input id="transaction-amount" type="number" min="0" step="1000" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setSaved(false) }} className="w-full min-w-0 bg-transparent text-center text-3xl font-semibold tracking-tight text-[#07543f] outline-none sm:text-4xl" aria-label="Số tiền giao dịch" /><span className="text-3xl font-semibold text-[#087557] sm:text-4xl">đ</span></div><div className="flex flex-wrap justify-center gap-2 pt-2">{presets.map((preset) => <button key={preset.value} type="button" onClick={() => { setAmount(String(preset.value)); setSaved(false) }} className={`rounded-md bg-white px-3 py-1.5 text-[10px] font-semibold text-[#34463b] shadow-sm ${numericAmount === preset.value ? 'ring-2 ring-[#07543f]' : ''}`}>{preset.label}</button>)}</div></section>

        <section className="grid gap-3"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-semibold text-[#34463b]">{type === 'expense' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}</h2><span className="flex items-center gap-1 text-[9px] font-medium text-[#087557]"><FinanceIcon name="spark" size={12} />Gợi ý theo AI: {category}</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{availableCategories.map((item) => <button key={item.name} type="button" aria-pressed={category === item.name} onClick={() => setCategory(item.name)} className={`flex min-w-0 items-center gap-2 rounded-lg p-2.5 text-left transition ${category === item.name ? 'bg-[#eaf4ed] ring-2 ring-[#07543f]' : 'bg-[#f3f7f4] hover:bg-[#eaf4ed]'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-md ${category === item.name ? 'bg-[#07543f] text-white' : 'bg-[#e1eaf4] text-[#47677f]'}`}><FinanceIcon name={item.icon} size={15} /></span><span className="min-w-0"><strong className="block truncate text-[10px] font-semibold text-[#34463b]">{item.name}</strong><small className="mt-0.5 block truncate text-[8px] text-[#829087]">{item.description}</small></span></button>)}</div></section>

        <section className="grid gap-3"><h2 className="text-xs font-semibold text-[#34463b]">Nguồn tiền / Tài khoản thanh toán</h2><div className="grid gap-2 sm:grid-cols-3">{accounts.map((item) => <button key={item.name} type="button" aria-pressed={account === item.name} onClick={() => setAccount(item.name)} className={`flex min-w-0 items-center gap-2.5 rounded-lg p-3 text-left ${account === item.name ? 'bg-[#eaf4ed] ring-2 ring-[#07543f]' : 'bg-[#f3f7f4]'}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${account === item.name ? 'bg-[#07543f] text-white' : 'bg-[#e1eaf4] text-[#47677f]'}`}><FinanceIcon name={item.icon} size={16} /></span><span className="min-w-0"><strong className="block truncate text-[10px] font-semibold text-[#34463b]">{item.name}</strong><small className="mt-0.5 block text-[9px] text-[#718078]">{item.balance}</small></span></button>)}</div></section>

        <section className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-[10px] font-medium text-[#59675f]">Ngày thực hiện<span className="relative"><FinanceIcon name="calendar" size={15} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-lg bg-[#f3f7f4] px-3 text-xs text-[#34463b] outline-none focus:ring-1 focus:ring-[#a9cfb5]" /></span></label><label className="grid gap-1.5 text-[10px] font-medium text-[#59675f]">Thời gian<span className="relative"><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-10 w-full rounded-lg bg-[#f3f7f4] px-3 text-xs text-[#34463b] outline-none focus:ring-1 focus:ring-[#a9cfb5]" /></span></label></section>

        <label className="grid gap-1.5 text-[10px] font-medium text-[#59675f]">Diễn giải / Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Nhập nội dung giao dịch..." className="w-full resize-y rounded-lg bg-[#f3f7f4] px-3 py-2.5 text-xs leading-5 text-[#34463b] outline-none placeholder:text-[#99a39c] focus:ring-1 focus:ring-[#a9cfb5]" /></label>

        <section className="grid gap-3 rounded-xl bg-[#f3f7f4] p-3.5"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#e1eaf4] text-[#47677f]"><FinanceIcon name="refresh" size={15} /></span><span><strong className="block text-[10px] font-semibold text-[#34463b]">Giao dịch lặp lại định kỳ</strong><small className="mt-0.5 block text-[9px] text-[#829087]">Tự động ghi nhận mỗi tháng hoặc tuần</small></span></span><button type="button" role="switch" aria-checked={recurring} aria-label="Giao dịch lặp lại định kỳ" onClick={() => setRecurring((value) => !value)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${recurring ? 'bg-[#087557]' : 'bg-[#cbd7cf]'}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${recurring ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div><button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[#b9c8bd] bg-white p-3 text-left hover:border-[#6aa687]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eaf0fb] text-[#47677f]"><FinanceIcon name="receipt" size={17} /></span><span className="min-w-0"><strong className="block truncate text-[10px] font-semibold text-[#34463b]">{fileName || 'Đính kèm hóa đơn hoặc biên lai'}</strong><small className="mt-1 block text-[9px] text-[#829087]">JPG, PNG hoặc PDF · tối đa 5 MB</small></span><span className="ml-auto text-[10px] font-semibold text-[#087557]">Tải lên</span></button><input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileChange} className="hidden" /></section>

        {error && <p role="alert" className="text-[10px] font-medium text-[#b45148]">{error}</p>}{saved && <p role="status" className="text-[10px] font-medium text-[#087557]">Giao dịch đã được lưu.</p>}
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#edf0ed] pt-4 sm:flex-row"><button type="button" onClick={onCancel} className="h-10 rounded-lg bg-[#eaf0fb] px-4 text-[10px] font-semibold text-[#344b62]">Hủy</button><button type="button" onClick={() => persistTransaction(true)} className="h-10 rounded-lg bg-[#e3f4e9] px-4 text-[10px] font-semibold text-[#07543f]">Lưu &amp; tiếp tục thêm</button><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#07543f] px-5 text-[10px] font-semibold text-white shadow-sm"><FinanceIcon name="plus" size={14} />Lưu giao dịch</button></div>
      </form>

      <aside className="grid gap-4"><section className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5"><header className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold text-[#26372e]"><span className="grid size-8 place-items-center rounded-lg bg-[#07543f] text-[#b5efd3]"><FinanceIcon name="spark" size={15} /></span>FinAI Insights</h2><span className="rounded-full bg-[#e3f4e9] px-2 py-1 text-[8px] font-semibold text-[#17794f]">An toàn</span></header><div className="mt-4 rounded-lg bg-[#f3f7f4] p-3"><div className="flex items-start justify-between gap-2"><span className="text-[10px] font-medium text-[#59675f]">Ngân sách {category}<br />tháng 9</span><strong className="text-[11px] text-[#07543f]">71% đã dùng</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce9e1]"><span className="block h-full w-[71%] rounded-full bg-[#087557]" /></div><div className="mt-2 flex justify-between gap-2 text-[9px] text-[#718078]"><span>Đã chi: 1.775.000 đ</span><strong className="text-[#087557]">Còn: 725.000 đ</strong></div></div><div className="mt-3 grid gap-2 text-[10px] leading-4 text-[#647168]"><p className="flex gap-2"><FinanceIcon name="shield" size={14} />Sau giao dịch này, ngân sách vẫn trong giới hạn kiểm soát.</p><p className="flex gap-2"><FinanceIcon name="bank" size={14} />Số dư {account} dự kiến còn {formatAmount(Math.max(0, 53_000_000 - (type === 'expense' ? numericAmount : 0)))} đ.</p></div><p className="mt-3 rounded-lg bg-[#eaf0fb] p-3 text-[9px] leading-4 text-[#52677c]">Gợi ý: duy trì số lần cà phê hiện tại có thể giúp tiết kiệm khoảng 450.000 đ/tháng.</p></section>
        <section className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5"><header className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold text-[#26372e]">Giao dịch trong ngày</h2><button type="button" onClick={onCancel} className="text-[9px] font-semibold text-[#087557]">Xem tất cả</button></header><div className="divide-y divide-[#edf0ed]">{todayTransactions.map((item) => <div key={item.name} className="flex items-center justify-between gap-2 py-2.5"><span className="flex min-w-0 items-center gap-2"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.income ? 'bg-[#e3f4e9] text-[#087557]' : 'bg-[#eaf0fb] text-[#47677f]'}`}><FinanceIcon name={item.icon} size={14} /></span><span className="min-w-0"><strong className="block truncate text-[10px] font-semibold text-[#34463b]">{item.name}</strong><small className="mt-0.5 block text-[8px] text-[#829087]">{item.detail}</small></span></span><strong className={`whitespace-nowrap text-[10px] ${item.income ? 'text-[#087557]' : 'text-[#b45148]'}`}>{item.amount}</strong></div>)}</div></section><section className="rounded-xl bg-gradient-to-br from-[#063d31] to-[#07543f] p-4 text-white shadow-sm"><h2 className="flex items-center gap-2 text-xs font-semibold text-[#b5efd3]"><FinanceIcon name="receipt" size={15} />OCR hóa đơn</h2><p className="mt-2 text-[10px] leading-4 text-white/75">Chọn ảnh hoặc PDF để lưu kèm giao dịch. Trích xuất OCR sẽ được bổ sung khi kết nối dịch vụ.</p><button type="button" onClick={() => fileRef.current?.click()} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-[#b5efd3] text-[10px] font-semibold text-[#07543f]"><FinanceIcon name="receipt" size={13} />Chọn hóa đơn</button></section></aside>
    </div>
  </main>
}

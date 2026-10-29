import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { ocrApi, type OcrReceiptResult } from '../api/ocrApi'
import { accountApi, type AccountItem } from '../../account-management/api/accountApi'
import { transactionApi, type CategoryItem } from '../../cash-flow-management/api/transactionApi'

type Props = { onCancel: () => void; onNotify: (message: string) => void }

export function InvoiceOcrScreen({ onCancel, onNotify }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Loading / scan states
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<OcrReceiptResult | null>(null)
  const [recentReceipts, setRecentReceipts] = useState<OcrReceiptResult[]>([])
  const [loadingReceipts, setLoadingReceipts] = useState(false)

  // Reference data
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')

  // Form fields (pre-filled from OCR)
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [note, setNote] = useState('')

  // Filter for recent receipts table
  const [filter, setFilter] = useState('')

  // Load reference data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingReceipts(true)
      try {
        const [accs, cats, receiptsResp] = await Promise.all([
          accountApi.getAccounts(),
          transactionApi.getCategories('EXPENSE'),
          ocrApi.getReceipts(),
        ])
        setAccounts(accs)
        if (accs.length > 0) setSelectedAccountId(accs[0].id)
        setCategories(cats)
        setRecentReceipts(receiptsResp.receipts)
      } catch {
        // silently ignore initial load errors
      } finally {
        setLoadingReceipts(false)
      }
    }
    loadInitialData()
  }, [])

  const reloadReceipts = async () => {
    try {
      const resp = await ocrApi.getReceipts()
      setRecentReceipts(resp.receipts)
    } catch {
      // ignore
    }
  }

  const chooseDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      onNotify('Hóa đơn cần nhỏ hơn 15 MB')
      event.target.value = ''
      return
    }
    setScanning(true)
    try {
      const result = await ocrApi.scanReceipt(file)
      setScanResult(result)
      setMerchant(result.merchantName ?? '')
      setDate(result.transactionDate ?? '')
      setTime(result.transactionTime ?? '')
      setAmount(result.totalAmount?.toString() ?? '')
      setSelectedCategoryId(result.aiCategoryId ?? '')
      onNotify(`Quét thành công: ${result.merchantName ?? file.name}`)
    } catch (err: any) {
      onNotify(err?.response?.data?.message ?? err?.message ?? 'Không thể quét hóa đơn. Vui lòng thử lại.')
    } finally {
      setScanning(false)
      event.target.value = ''
    }
  }

  const resetScan = () => {
    setScanResult(null)
    setMerchant('')
    setDate('')
    setTime('')
    setAmount('')
    setSelectedCategoryId('')
    setNote('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleConfirm = async () => {
    if (!scanResult) {
      onNotify('Chưa có kết quả OCR. Vui lòng quét hóa đơn trước.')
      return
    }
    if (!selectedAccountId) {
      onNotify('Vui lòng chọn tài khoản.')
      return
    }
    try {
      const parsedAmount = parseFloat(amount)
      await ocrApi.createTransaction({
        receiptId: scanResult.id,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId || undefined,
        description: merchant,
        note: note || undefined,
        overrideAmount: !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      })
      onNotify(`Đã xác nhận hóa đơn ${merchant}`)
      resetScan()
      await reloadReceipts()
    } catch (err: any) {
      onNotify(err?.response?.data?.message ?? err?.message ?? 'Không thể lưu giao dịch. Vui lòng thử lại.')
    }
  }

  const filteredReceipts = useMemo(
    () =>
      recentReceipts.filter((r) =>
        `${r.merchantName ?? ''} ${r.aiCategoryName ?? ''} ${r.currency}`
          .toLowerCase()
          .includes(filter.toLowerCase()),
      ),
    [recentReceipts, filter],
  )

  // Confidence display helper
  const confidenceLabel = (c: number) => `${Math.round(c * 100)}%`

  // Date+time display helper
  const dateTimeLabel = (r: OcrReceiptResult) => {
    const parts = [r.transactionDate, r.transactionTime].filter(Boolean)
    return parts.join(' · ') || '—'
  }

  const documentName = scanResult?.merchantName
    ? `${scanResult.merchantName}`
    : scanning
    ? 'Đang xử lý…'
    : 'Chưa chọn hóa đơn'

  return (
    <main
      className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-6 text-[#14251f] sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-8"
      aria-label="Quét hóa đơn OCR"
    >
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-2 text-[10px] text-[#718078]">
            <button type="button" onClick={onCancel} className="hover:text-[#087557]">
              Giao dịch &amp; Dòng tiền
            </button>
            <FinanceIcon name="arrow" size={12} />
            <strong className="text-[#07543f]">Quét hóa đơn OCR</strong>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">
              Quét hóa đơn &amp; Nhận diện tự động
            </h1>
            <span className="rounded-full bg-[#e3f4e9] px-2.5 py-1 text-[9px] font-semibold text-[#17794f]">
              FinAI Vision · 3.2
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#718078]">
            Nhận diện hóa đơn để điền sẵn cửa hàng, số tiền và danh mục. Kiểm tra thông tin trước khi xác nhận.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#eaf0fb] px-3 text-[10px] font-medium text-[#344b62]"
          >
            <FinanceIcon name="clock" size={14} />
            Lịch sử quét
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#07543f] px-3 text-[10px] font-semibold text-white"
          >
            <FinanceIcon name="download" size={14} />
            Tải ảnh / PDF
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*,.pdf" onChange={chooseDocument} className="hidden" />
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {/* Left: preview / scanning */}
        <section className="grid gap-3">
          <div className="relative flex min-h-[430px] items-center justify-center overflow-hidden rounded-xl bg-[#213145] p-5 shadow-sm sm:min-h-[530px]">
            <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
              <span className="flex items-center gap-2 text-[9px] font-semibold tracking-[.6px] text-[#a8ebca]">
                <i className="size-2 rounded-full bg-[#6ffbbe]" />
                FINAI OCR · {scanning ? 'ĐANG XỬ LÝ' : 'BẢN XEM TRƯỚC'}
              </span>
              <span className="flex items-center gap-1.5 text-[9px] text-[#eaf1ff]">
                <FinanceIcon name="spark" size={12} />
                {scanResult ? `Độ tin cậy · ${confidenceLabel(scanResult.confidence)}` : 'Nhận diện mẫu · 99%'}
              </span>
            </div>

            {scanning ? (
              <div className="flex flex-col items-center gap-4 text-white">
                <svg
                  className="size-12 animate-spin text-[#6ffbbe]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-label="Đang xử lý"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <p className="text-sm font-medium text-[#a8ebca]">Đang nhận diện hóa đơn…</p>
              </div>
            ) : scanResult ? (
              <article className="relative w-full max-w-[340px] rounded-lg bg-white p-4 shadow-2xl">
                <div className="border-b border-dashed border-[#bfc9c4] pb-3 text-center">
                  <span className="mx-auto grid size-9 place-items-center rounded-full bg-[#eaf0fb] text-[#47677f]">
                    <FinanceIcon name="receipt" size={17} />
                  </span>
                  <h2 className="mt-1 text-lg font-bold tracking-[1px] text-[#07543f]">
                    {scanResult.merchantName?.toUpperCase() ?? 'HÓA ĐƠN'}
                  </h2>
                  <p className="text-[10px] text-[#59675f]">{scanResult.aiCategoryName ?? ''}</p>
                  <div className="mt-2 flex justify-between border-t border-[#edf0ed] pt-2 text-[8px] text-[#829087]">
                    <span>ID: {scanResult.id.slice(0, 8)}</span>
                    <span>
                      {scanResult.transactionDate ?? ''}
                      {scanResult.transactionTime ? ` · ${scanResult.transactionTime}` : ''}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 border-t border-dashed border-[#bfc9c4] pt-3 text-[9px] text-[#718078]">
                  <div className="flex justify-between pt-1 text-sm font-bold text-[#26372e]">
                    <span>Tổng cộng</span>
                    <span className="text-[#087557]">
                      {scanResult.totalAmount?.toLocaleString('vi-VN') ?? '—'} {scanResult.currency}
                    </span>
                  </div>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-[8px] font-semibold text-[#087557]">
                  <FinanceIcon name="shield" size={10} />
                  Hóa đơn được xử lý riêng tư
                </p>
              </article>
            ) : (
              <article className="relative w-full max-w-[340px] rounded-lg bg-white p-4 shadow-2xl">
                <div className="border-b border-dashed border-[#bfc9c4] pb-3 text-center">
                  <span className="mx-auto grid size-9 place-items-center rounded-full bg-[#eaf0fb] text-[#47677f]">
                    <FinanceIcon name="coffee" size={17} />
                  </span>
                  <h2 className="mt-1 text-lg font-bold tracking-[1px] text-[#07543f]">COFFEE HOUSE</h2>
                  <p className="text-[10px] text-[#59675f]">Cà phê · Bánh ngọt</p>
                  <p className="mt-1 text-[9px] font-medium text-[#829087]">123 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                  <div className="mt-2 flex justify-between border-t border-[#edf0ed] pt-2 text-[8px] text-[#829087]">
                    <span>HĐ: #CH-88219</span>
                    <span>11/09/2025 · 14:32</span>
                  </div>
                </div>
                <div className="space-y-2 py-3 text-[10px]">
                  {[
                    ['Cà phê đen', '1 × 45.000 đ', '45.000 đ'],
                    ['Bánh muffin', '1 × 35.000 đ', '35.000 đ'],
                  ].map(([name, quantity, price]) => (
                    <div key={name} className="flex justify-between">
                      <span>
                        <strong className="block text-[#34463b]">{name}</strong>
                        <small className="text-[#829087]">{quantity}</small>
                      </span>
                      <strong className="text-[#34463b]">{price}</strong>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 border-t border-dashed border-[#bfc9c4] pt-3 text-[9px] text-[#718078]">
                  <div className="flex justify-between">
                    <span>Tạm tính</span>
                    <span>80.000 đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>0 đ</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-[#26372e]">
                    <span>Tổng cộng</span>
                    <span className="text-[#087557]">80.000 đ</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-[#edf0ed] pt-2 text-center text-[9px] italic text-[#829087]">
                  Cảm ơn quý khách và hẹn gặp lại
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-[8px] font-semibold text-[#087557]">
                  <FinanceIcon name="shield" size={10} />
                  Hóa đơn được xử lý riêng tư
                </p>
              </article>
            )}

            <div className="absolute bottom-3 left-3 right-3 flex flex-col justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 text-[9px] text-[#eaf1ff] backdrop-blur sm:flex-row sm:items-center">
              <span className="flex items-center gap-2">
                <FinanceIcon name="search" size={13} />
                <strong className="text-[#a8ebca]">{documentName}</strong>
                <span>· {scanResult ? 'Kết quả AI' : 'Bản xem thử'}</span>
              </span>
              <div className="flex gap-1.5">
                <button type="button" onClick={resetScan} className="rounded-md bg-white/15 px-2 py-1.5">
                  Chọn lại
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-md bg-[#b5efd3] px-2 py-1.5 font-semibold text-[#07543f]"
                >
                  Đổi ảnh
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Thời gian xử lý', value: '0,42s', icon: 'clock' as const },
              { label: 'Độ phân giải', value: '1920 × 1080', icon: 'chart' as const },
              { label: 'Tính hợp lệ', value: 'Biên lai gốc', icon: 'shield' as const },
            ].map((item) => (
              <article
                key={item.label}
                className="flex items-center gap-2 rounded-lg border border-[#e7ece8] bg-white p-3"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-[#f1f5f2] text-[#087557]">
                  <FinanceIcon name={item.icon} size={15} />
                </span>
                <span>
                  <small className="block text-[8px] text-[#829087]">{item.label}</small>
                  <strong className="text-[9px] text-[#34463b]">{item.value}</strong>
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* Right: extracted info form */}
        <section className="flex flex-col justify-between gap-4 rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0ed] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-[#07543f] text-[#b5efd3]">
                  <FinanceIcon name="receipt" size={17} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#26372e]">Thông tin trích xuất</h2>
                  <p className="mt-0.5 text-[9px] text-[#829087]">
                    {scanResult ? 'Dữ liệu AI có thể chỉnh sửa trước khi lưu' : 'Dữ liệu mẫu có thể chỉnh sửa trước khi lưu'}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-[#e3f4e9] px-2.5 py-1 text-[9px] font-semibold text-[#17794f]">
                <FinanceIcon name="shield" size={12} />
                {scanResult ? `Độ tin cậy ${confidenceLabel(scanResult.confidence)}` : 'Độ tin cậy 99%'}
              </span>
            </header>

            <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
              TÊN CỬA HÀNG
              <input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="h-9 rounded-md border border-[#e3e9e5] bg-white px-2.5 text-xs font-medium text-[#34463b] outline-none focus:ring-1 focus:ring-[#a9cfb5]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
                NGÀY
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 min-w-0 rounded-md border border-[#e3e9e5] bg-white px-2 text-[10px] font-medium text-[#34463b]"
                />
              </label>
              <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
                GIỜ
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 min-w-0 rounded-md border border-[#e3e9e5] bg-white px-2 text-[10px] font-medium text-[#34463b]"
                />
              </label>
            </div>
            <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
              TỔNG THANH TOÁN
              <div className="flex h-9 items-center rounded-md border border-[#d5e7db] bg-white px-2">
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Tổng thanh toán"
                  className="w-full bg-transparent text-sm font-semibold text-[#087557] outline-none"
                />
                <span className="text-[10px] font-semibold text-[#087557]">đ</span>
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
                DANH MỤC
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="h-9 rounded-md border border-[#e3e9e5] bg-white px-2 text-[10px] font-medium text-[#34463b]"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
                NGUỒN TIỀN
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-9 rounded-md border border-[#e3e9e5] bg-white px-2 text-[10px] font-medium text-[#34463b]"
                >
                  <option value="">-- Chọn tài khoản --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                      {acc.accountNumberMasked ? ` (${acc.accountNumberMasked})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1.5 rounded-lg bg-[#f3f7f4] p-3 text-[9px] font-semibold text-[#718078]">
              GHI CHÚ
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-y rounded-md border border-[#e3e9e5] bg-white p-2 text-[10px] font-medium leading-4 text-[#34463b]"
              />
            </label>

            <div className="rounded-lg bg-[#edf4f8] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#344f60]">
                <FinanceIcon name="spark" size={13} />
                Gợi ý từ FinAI Copilot · Ngân sách an toàn
              </p>
              <p className="mt-1 text-[9px] leading-4 text-[#617381]">
                {scanResult
                  ? `Khoản chi ${scanResult.totalAmount?.toLocaleString('vi-VN') ?? '—'} ${scanResult.currency} đã được nhận diện. Kiểm tra danh mục và tài khoản trước khi xác nhận.`
                  : 'Tải ảnh hóa đơn lên để FinAI tự động trích xuất thông tin và phân loại giao dịch.'}
              </p>
            </div>
          </div>

          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-[#edf0ed] pt-4 sm:flex-row">
            <button
              type="button"
              onClick={resetScan}
              className="h-9 rounded-lg bg-[#eaf0fb] px-3 text-[9px] font-semibold text-[#344b62]"
            >
              Hủy &amp; quét lại
            </button>
            <button
              type="button"
              onClick={() => onNotify('Đã lưu hóa đơn nháp')}
              className="h-9 rounded-lg bg-[#f1f5f2] px-3 text-[9px] font-semibold text-[#34463b]"
            >
              Lưu nháp
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!scanResult}
              className="h-9 rounded-lg bg-[#07543f] px-3.5 text-[9px] font-semibold text-white disabled:opacity-50"
            >
              Xác nhận &amp; lưu giao dịch
            </button>
          </footer>
        </section>
      </div>

      {/* Recent receipts table */}
      <section className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5">
        <header className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-[#26372e]">Hóa đơn đã quét gần đây</h2>
            <p className="mt-1 text-[9px] text-[#829087]">Các hóa đơn OCR đã ghi nhận</p>
          </div>
          <div className="flex gap-2">
            <label className="flex h-9 items-center gap-2 rounded-lg bg-[#f1f5f2] px-2.5 text-[#718078]">
              <FinanceIcon name="search" size={13} />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Lọc hóa đơn"
                placeholder="Lọc cửa hàng, danh mục..."
                className="w-full bg-transparent text-[9px] outline-none placeholder:text-[#89958d] sm:w-48"
              />
            </label>
            <button
              type="button"
              onClick={onCancel}
              className="whitespace-nowrap rounded-lg bg-[#eaf0fb] px-3 text-[9px] font-medium text-[#344b62]"
            >
              Xem tất cả ({recentReceipts.length})
            </button>
          </div>
        </header>

        <div className="overflow-x-auto">
          {loadingReceipts ? (
            <p className="py-8 text-center text-[10px] text-[#829087]">Đang tải hóa đơn…</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-[9px]">
              <thead className="bg-[#f1f5f2] font-bold tracking-[.45px] text-[#68766e]">
                <tr>
                  <th className="p-3">HÓA ĐƠN / ĐƠN VỊ</th>
                  <th className="p-3">THỜI GIAN</th>
                  <th className="p-3">DANH MỤC</th>
                  <th className="p-3">LOẠI</th>
                  <th className="p-3">ĐỘ TIN CẬY OCR</th>
                  <th className="p-3 text-right">SỐ TIỀN</th>
                  <th className="p-3">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-[#edf0ed] last:border-0">
                    <td className="p-3">
                      <span className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-lg bg-[#eaf0fb] text-[#47677f]">
                          <FinanceIcon name="receipt" size={14} />
                        </span>
                        <span>
                          <strong className="block text-[10px] text-[#34463b]">
                            {receipt.merchantName ?? '—'}
                          </strong>
                          <small className="text-[8px] text-[#829087]">{receipt.aiCategoryName ?? ''}</small>
                        </span>
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-[#68766e]">{dateTimeLabel(receipt)}</td>
                    <td className="p-3 text-[#34463b]">{receipt.aiCategoryName ?? '—'}</td>
                    <td className="p-3 text-[#68766e]">{receipt.currency}</td>
                    <td className="p-3 font-semibold text-[#087557]">{confidenceLabel(receipt.confidence)}</td>
                    <td className="p-3 text-right font-semibold text-[#34463b]">
                      {receipt.totalAmount != null
                        ? `-${receipt.totalAmount.toLocaleString('vi-VN')} ${receipt.currency}`
                        : '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-semibold ${
                          receipt.kind === 'paid'
                            ? 'bg-[#e3f4e9] text-[#17794f]'
                            : receipt.kind === 'draft'
                            ? 'bg-[#fff0e9] text-[#a3483e]'
                            : 'bg-[#f1f5f2] text-[#68766e]'
                        }`}
                      >
                        {receipt.kind === 'paid' ? 'Đã lưu' : receipt.kind === 'draft' ? 'Nháp' : 'Chưa rõ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loadingReceipts && filteredReceipts.length === 0 && (
            <p className="py-8 text-center text-[10px] text-[#829087]">
              {recentReceipts.length === 0
                ? 'Chưa có hóa đơn nào được quét.'
                : 'Không tìm thấy hóa đơn phù hợp.'}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

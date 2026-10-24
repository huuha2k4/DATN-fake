import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { 
  transactionApi, 
  type TransactionType, 
  type CategoryItem, 
  type TransactionItem 
} from '../../cash-flow-management/api/transactionApi'
import { accountApi, type AccountItem } from '../../account-management/api/accountApi'

type Props = { 
  onCancel: () => void; 
  onNotify: (message: string) => void; 
  onOpenInvoiceScanner: () => void;
}

const presets = [
  { label: '+5k', value: 5_000 },
  { label: '+10k', value: 10_000 },
  { label: '+20k', value: 20_000 },
  { label: '+50k', value: 50_000 },
  { label: '+100k', value: 100_000 },
  { label: '+200k', value: 200_000 },
  { label: '+500k', value: 500_000 },
]

export function AddTransactionScreen({ onCancel, onNotify, onOpenInvoiceScanner }: Props) {
  // Types
  const [type, setType] = useState<TransactionType>('EXPENSE')
  
  // Real database states
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([])
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Custom Dropdown Open States
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isToAccountPickerOpen, setIsToAccountPickerOpen] = useState(false)
  const categoryPickerRef = useRef<HTMLDivElement>(null)
  const accountPickerRef = useRef<HTMLDivElement>(null)
  const toAccountPickerRef = useRef<HTMLDivElement>(null)

  // Form Fields
  const [amount, setAmount] = useState<string>('50000')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('') // for TRANSFER
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = useState<string>(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [description, setDescription] = useState<string>('')
  const [recurring, setRecurring] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string>('')

  const fileRef = useRef<HTMLInputElement>(null)
  const numericAmount = Number(amount) || 0

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setIsCategoryPickerOpen(false)
      }
      if (accountPickerRef.current && !accountPickerRef.current.contains(e.target as Node)) {
        setIsAccountPickerOpen(false)
      }
      if (toAccountPickerRef.current && !toAccountPickerRef.current.contains(e.target as Node)) {
        setIsToAccountPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch real categories, accounts and recent transactions
  const loadData = async () => {
    try {
      setLoadingMetadata(true)
      const [catsRes, accsRes, txsRes] = await Promise.all([
        transactionApi.getCategories().catch(() => []),
        accountApi.getAccounts().catch(() => []),
        transactionApi.getTransactions({ pageSize: 5 }).catch(() => ({ transactions: [] })),
      ])

      setCategories(catsRes)
      setAccounts(accsRes)
      if (txsRes?.transactions) {
        setRecentTransactions(txsRes.transactions)
      }

      // Default selections
      if (accsRes.length > 0) {
        setSelectedAccountId(accsRes[0].id)
        if (accsRes.length > 1) {
          setToAccountId(accsRes[1].id)
        }
      }
    } catch {
      onNotify('Không thể nạp dữ liệu danh mục & tài khoản từ máy chủ')
    } finally {
      setLoadingMetadata(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto pick default category based on transaction type
  useEffect(() => {
    if (type === 'TRANSFER') {
      setSelectedCategoryId('')
      return
    }
    const filtered = categories.filter((c) => c.kind === type)
    if (filtered.length > 0) {
      const exists = filtered.some((c) => c.id === selectedCategoryId)
      if (!exists) {
        setSelectedCategoryId(filtered[0].id)
      }
    } else {
      setSelectedCategoryId('')
    }
  }, [type, categories])

  const filteredCategories = categories.filter((c) => c.kind === type)
  const selectedAccountObj = accounts.find((a) => a.id === selectedAccountId)
  const toAccountObj = accounts.find((a) => a.id === toAccountId)
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId)

  const formatAmount = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  const renderCategoryIcon = (iconName?: string, fallbackKind?: string, size = 16) => {
    if (!iconName) {
      return <FinanceIcon name={fallbackKind === 'INCOME' ? 'income' : 'expense'} size={size} />
    }
    if (/\p{Extended_Pictographic}/u.test(iconName)) {
      return <span style={{ fontSize: `${size}px` }}>{iconName}</span>
    }
    return <FinanceIcon name={iconName as any} size={size} />
  }

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

  const handleSaveTransaction = async (continueAdding = false) => {
    if (numericAmount <= 0) {
      setError('Vui lòng nhập số tiền lớn hơn 0.')
      return
    }
    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản thanh toán.')
      return
    }
    if (type !== 'TRANSFER' && !selectedCategoryId) {
      setError('Vui lòng chọn danh mục cho giao dịch.')
      return
    }
    if (type === 'TRANSFER' && (!toAccountId || toAccountId === selectedAccountId)) {
      setError('Vui lòng chọn tài khoản nhận khác với tài khoản chuyển.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await transactionApi.createTransaction({
        transactionType: type,
        accountId: selectedAccountId,
        toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
        amount: numericAmount,
        currencyCode: selectedAccountObj?.currencyCode || 'VND',
        description: description.trim() || (type === 'INCOME' ? 'Khoản thu' : type === 'TRANSFER' ? 'Chuyển tiền nội bộ' : 'Khoản chi'),
        transactionDate: date,
        transactionTime: time ? `${time}:00` : undefined,
        categoryId: type !== 'TRANSFER' ? selectedCategoryId : undefined,
      })

      const typeLabel = type === 'EXPENSE' ? 'Khoản chi' : type === 'INCOME' ? 'Khoản thu' : 'Chuyển khoản'
      onNotify(`Thành công! Đã ghi nhận ${typeLabel} ${formatAmount(numericAmount)} ₫`)

      // Refresh recent transactions & accounts balance
      const [accsRes, txsRes] = await Promise.all([
        accountApi.getAccounts().catch(() => accounts),
        transactionApi.getTransactions({ pageSize: 5 }).catch(() => ({ transactions: [] })),
      ])
      setAccounts(accsRes)
      if (txsRes?.transactions) {
        setRecentTransactions(txsRes.transactions)
      }

      if (continueAdding) {
        setAmount('')
        setDescription('')
        setFileName('')
      } else {
        onCancel()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu giao dịch vào cơ sở dữ liệu'
      setError(msg)
      onNotify(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleSaveTransaction(false)
  }

  const projectedBalance = (selectedAccountObj?.balance || 0) + (type === 'INCOME' ? numericAmount : -numericAmount)

  if (loadingMetadata) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-4xl items-center justify-center p-8 text-xs text-[#718579]">
        <div className="flex flex-col items-center gap-3">
          <FinanceIcon name="refresh" size={28} className="animate-spin text-[#07543f]" />
          <span className="font-semibold text-sm text-[#14261e]">Đang tải dữ liệu ví & danh mục...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#f6f8f6] px-4 pb-20 pt-6 text-[#14251f] sm:px-6">
      {/* Two-Column Responsive Workspace */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)] items-start">
        {/* LEFT COLUMN: Main Form Container */}
        <div className="overflow-hidden rounded-3xl border border-[#e2ece5] bg-white shadow-xl">
        {/* HERO BANNER: Type Toggle & Big Amount Display */}
        <div className={`relative p-6 sm:p-8 text-white transition-colors duration-300 ${
          type === 'EXPENSE'
            ? 'bg-gradient-to-br from-[#1c2c24] via-[#163a2b] to-[#124230]'
            : type === 'INCOME'
            ? 'bg-gradient-to-br from-[#0c382b] via-[#094d3a] to-[#07543f]'
            : 'bg-gradient-to-br from-[#1e293b] via-[#1a384f] to-[#0d4a63]'
        }`}>
          {/* Top Bar: 3-Way Toggle on the Left, OCR Scanner on the Right */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Segmented 3-Way Pill Switch on Left */}
            <div className="flex h-9 w-full sm:w-auto max-w-sm items-center rounded-xl bg-white/10 p-0.5 backdrop-blur-md border border-white/15 shadow-inner">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`h-full flex-1 rounded-lg px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  type === 'EXPENSE'
                    ? 'bg-white text-rose-700 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <FinanceIcon name="expense" size={13} />
                <span>Tiền chi</span>
              </button>

              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`h-full flex-1 rounded-lg px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  type === 'INCOME'
                    ? 'bg-white text-emerald-800 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <FinanceIcon name="income" size={13} />
                <span>Tiền thu</span>
              </button>

              <button
                type="button"
                onClick={() => setType('TRANSFER')}
                className={`h-full flex-1 rounded-lg px-3.5 text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  type === 'TRANSFER'
                    ? 'bg-white text-sky-800 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <FinanceIcon name="arrows" size={13} />
                <span>Chuyển ví</span>
              </button>
            </div>

            {/* OCR Scanner Button on Right */}
            <button
              type="button"
              onClick={onOpenInvoiceScanner}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/15 px-3.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 hover:bg-white/25 active:scale-95 transition shadow-sm"
              title="Tự động nhận diện số tiền, ngày và thông tin từ hóa đơn"
            >
              <FinanceIcon name="receipt" size={14} />
              <span>Quét hóa đơn OCR</span>
            </button>
          </div>

          {/* Large Hero Amount Input */}
          <div className="mt-6 flex flex-col items-center justify-center">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-200">
              {type === 'EXPENSE' ? 'Số tiền muốn chi' : type === 'INCOME' ? 'Số tiền nhận được' : 'Số tiền muốn chuyển'}
            </span>
            <div className="mt-2 flex items-center justify-center">
              <div className="relative inline-flex items-center justify-center">
                <input
                  id="hero-amount-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '')
                    setAmount(raw)
                  }}
                  style={{ 
                    width: `${Math.max(1, (amount ? Number(amount).toLocaleString('vi-VN') : '0').length)}ch`,
                    fontSize: 'clamp(26px, 3.8vw, 36px)',
                    lineHeight: '1',
                    outline: 'none',
                    border: 'none',
                    boxShadow: 'none',
                  }}
                  className="bg-transparent text-center font-black text-white outline-none border-none ring-0 tracking-tight placeholder:text-white/20"
                  autoFocus
                />
                <span 
                  style={{ fontSize: 'clamp(20px, 2.8vw, 28px)' }} 
                  className="absolute left-full ml-1.5 font-extrabold text-emerald-300 select-none self-center leading-none"
                >
                  ₫
                </span>
              </div>
            </div>

            {/* Quick Increment Presets */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setAmount(String((Number(amount) || 0) + preset.value))}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:scale-105 active:scale-95 transition"
                >
                  {preset.label}
                </button>
              ))}
              {numericAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="rounded-full border border-rose-300/40 bg-rose-500/25 px-3 py-1 text-[11px] font-semibold text-rose-200 backdrop-blur-sm hover:bg-rose-500/40 transition"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Row 1: Source Account & Category Selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Account / Wallet Dropdown Picker */}
            <div className="relative" ref={accountPickerRef}>
              <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#14261e]">
                <span>{type === 'TRANSFER' ? 'Từ tài khoản (Nguồn)' : 'Nguồn tiền thanh toán'}</span>
                {selectedAccountObj && (
                  <span className="text-[11px] font-medium text-[#718579]">
                    Số dư: <strong className="text-[#07543f]">{formatAmount(selectedAccountObj.balance)} ₫</strong>
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsAccountPickerOpen((prev) => !prev)
                  setIsCategoryPickerOpen(false)
                  setIsToAccountPickerOpen(false)
                }}
                className={`flex h-12 w-full items-center justify-between rounded-xl border bg-[#f9fbf9] px-3.5 text-left transition ${
                  isAccountPickerOpen
                    ? 'border-[#07543f] bg-white ring-2 ring-[#07543f]/20'
                    : 'border-[#d5ded8] hover:border-[#b0c2b7]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#07543f] border border-emerald-100">
                    <FinanceIcon name="wallet" size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#14261e]">
                      {selectedAccountObj?.name || 'Chọn tài khoản'}
                    </p>
                    <p className="text-[10px] text-[#718579] truncate">
                      {selectedAccountObj?.currencyCode || 'VND'} · Số dư: {formatAmount(selectedAccountObj?.balance || 0)} ₫
                    </p>
                  </div>
                </div>

                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-gray-400 transition-transform ${isAccountPickerOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Account Dropdown Menu */}
              {isAccountPickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto rounded-2xl border border-[#d5ded8] bg-white p-1.5 shadow-2xl animate-fadeIn">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(acc.id)
                          setIsAccountPickerOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                          isSelected ? 'bg-emerald-50 text-[#07543f]' : 'hover:bg-[#f3f7f4] text-[#14261e]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="grid size-7 place-items-center rounded-lg bg-gray-100 text-gray-700 shrink-0">
                            <FinanceIcon name="wallet" size={14} />
                          </span>
                          <div className="truncate">
                            <p className="truncate text-xs font-bold">{acc.name}</p>
                            <p className="text-[10px] text-gray-500">{formatAmount(acc.balance)} ₫</p>
                          </div>
                        </div>
                        {isSelected && <span className="font-bold text-[#07543f] ml-2">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* If TRANSFER: Destination Account. If EXPENSE/INCOME: Category Picker */}
            {type === 'TRANSFER' ? (
              <div className="relative" ref={toAccountPickerRef}>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#14261e]">
                  <span>Đến tài khoản (Đích)</span>
                  {toAccountObj && (
                    <span className="text-[11px] font-medium text-[#718579]">
                      Số dư: <strong className="text-[#07543f]">{formatAmount(toAccountObj.balance)} ₫</strong>
                    </span>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsToAccountPickerOpen((prev) => !prev)
                    setIsAccountPickerOpen(false)
                    setIsCategoryPickerOpen(false)
                  }}
                  className={`flex h-12 w-full items-center justify-between rounded-xl border bg-[#f9fbf9] px-3.5 text-left transition ${
                    isToAccountPickerOpen
                      ? 'border-[#07543f] bg-white ring-2 ring-[#07543f]/20'
                      : 'border-[#d5ded8] hover:border-[#b0c2b7]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                      <FinanceIcon name="arrows" size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#14261e]">
                        {toAccountObj?.name || 'Chọn ví nhận'}
                      </p>
                      <p className="text-[10px] text-[#718579] truncate">
                        Số dư hiện tại: {formatAmount(toAccountObj?.balance || 0)} ₫
                      </p>
                    </div>
                  </div>

                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-gray-400 transition-transform ${isToAccountPickerOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* To Account Dropdown */}
                {isToAccountPickerOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto rounded-2xl border border-[#d5ded8] bg-white p-1.5 shadow-2xl animate-fadeIn">
                    {accounts.filter((a) => a.id !== selectedAccountId).map((acc) => {
                      const isSelected = toAccountId === acc.id
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setToAccountId(acc.id)
                            setIsToAccountPickerOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                            isSelected ? 'bg-sky-50 text-sky-800' : 'hover:bg-[#f3f7f4] text-[#14261e]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="grid size-7 place-items-center rounded-lg bg-sky-50 text-sky-700 shrink-0">
                              <FinanceIcon name="wallet" size={14} />
                            </span>
                            <div className="truncate">
                              <p className="truncate text-xs font-bold">{acc.name}</p>
                              <p className="text-[10px] text-gray-500">{formatAmount(acc.balance)} ₫</p>
                            </div>
                          </div>
                          {isSelected && <span className="font-bold text-sky-700 ml-2">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Category Picker */
              <div className="relative" ref={categoryPickerRef}>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#14261e]">
                  <span>Phân loại danh mục</span>
                  <span className="text-[11px] text-[#718579]">{filteredCategories.length} danh mục</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryPickerOpen((prev) => !prev)
                    setIsAccountPickerOpen(false)
                    setIsToAccountPickerOpen(false)
                  }}
                  className={`flex h-12 w-full items-center justify-between rounded-xl border bg-[#f9fbf9] px-3.5 text-left transition ${
                    isCategoryPickerOpen
                      ? 'border-[#07543f] bg-white ring-2 ring-[#07543f]/20'
                      : 'border-[#d5ded8] hover:border-[#b0c2b7]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span 
                      className="grid size-8 shrink-0 place-items-center rounded-lg"
                      style={{
                        backgroundColor: selectedCategoryObj?.color ? `${selectedCategoryObj.color}15` : '#f0f4f1',
                        color: selectedCategoryObj?.color || (type === 'INCOME' ? '#10b981' : '#f43f5e'),
                      }}
                    >
                      {renderCategoryIcon(selectedCategoryObj?.icon, type, 16)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#14261e]">
                        {selectedCategoryObj?.name || 'Chọn danh mục'}
                      </p>
                      <p className="text-[10px] text-[#718579] truncate">
                        {type === 'EXPENSE' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}
                      </p>
                    </div>
                  </div>

                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-gray-400 transition-transform ${isCategoryPickerOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Category Dropdown Grid */}
                {isCategoryPickerOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 overflow-y-auto rounded-2xl border border-[#d5ded8] bg-white p-2 shadow-2xl animate-fadeIn">
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredCategories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId(cat.id)
                              setIsCategoryPickerOpen(false)
                            }}
                            className={`flex items-center gap-2 rounded-xl p-2 text-left transition border ${
                              isSelected
                                ? 'border-[#07543f] bg-emerald-50 text-[#07543f] font-bold'
                                : 'border-transparent hover:bg-[#f3f7f4] text-[#14261e]'
                            }`}
                          >
                            <span
                              className="grid size-7 place-items-center rounded-lg text-sm shrink-0"
                              style={{
                                backgroundColor: cat.color ? `${cat.color}15` : '#f0f4f1',
                                color: cat.color || (cat.kind === 'INCOME' ? '#10b981' : '#f43f5e'),
                              }}
                            >
                              {renderCategoryIcon(cat.icon, cat.kind, 14)}
                            </span>
                            <span className="truncate text-xs">{cat.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Date & Time Picker */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#14261e]">
                Ngày giao dịch
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#d5ded8] bg-[#f9fbf9] px-3.5 text-xs font-medium text-[#14261e] outline-none focus:border-[#07543f] focus:bg-white focus:ring-1 focus:ring-[#07543f] transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#14261e]">
                Thời gian thực hiện
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#d5ded8] bg-[#f9fbf9] px-3.5 text-xs font-medium text-[#14261e] outline-none focus:border-[#07543f] focus:bg-white focus:ring-1 focus:ring-[#07543f] transition"
              />
            </div>
          </div>

          {/* Row 3: Description Note */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#14261e]">
              Ghi chú / Diễn giải
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Ăn trưa bún bò, Đổ xăng xe máy, Tiền thưởng dự án..."
              className="h-11 w-full rounded-xl border border-[#d5ded8] bg-[#f9fbf9] px-3.5 text-xs text-[#14261e] outline-none placeholder:text-gray-400 focus:border-[#07543f] focus:bg-white focus:ring-1 focus:ring-[#07543f] transition"
            />
          </div>

            {/* Row 4: Recurring Monthly Switch & Receipt Attachment */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-[#e2ece5] bg-[#f8faf8] p-3.5">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#718579]">Lặp lại giao dịch hàng tháng:</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={recurring}
                  onClick={() => setRecurring(!recurring)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    recurring ? 'bg-[#07543f]' : 'bg-[#cbd7cf]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      recurring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName ? (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-[#07543f] shadow-2xs">
                    <FinanceIcon name="receipt" size={14} className="text-[#07543f]" />
                    <span className="max-w-[170px] truncate" title={fileName}>{fileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFileName('');
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="ml-1 text-xs text-rose-500 hover:text-rose-700 font-bold"
                      title="Gỡ ảnh đính kèm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbe0d3] bg-white px-3.5 py-1.5 text-xs font-bold text-[#07543f] shadow-2xs hover:bg-[#eaf4ee] hover:border-[#07543f] active:scale-95 transition"
                  >
                    <FinanceIcon name="receipt" size={14} />
                    <span>+ Đính kèm ảnh hóa đơn</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 animate-fadeIn">
                ⚠️ {error}
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#edf0ed] pt-4 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={onCancel}
                className="h-11 rounded-xl bg-gray-100 px-6 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveTransaction(true)}
                className="h-11 rounded-xl bg-[#e3f4e9] px-6 text-xs font-bold text-[#07543f] hover:bg-[#d2edd9] transition"
              >
                Lưu &amp; Tiếp tục thêm
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#07543f] px-8 text-xs font-bold text-white shadow-md hover:bg-[#0b6c52] transition disabled:opacity-50"
              >
                <FinanceIcon name="plus" size={15} />
                <span>{submitting ? 'Đang lưu vào ví...' : 'Lưu giao dịch ngay'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Projected Balance Card & Recent Transactions Panel */}
        <div className="flex flex-col gap-6">
          {/* Card 1: Số tiền còn lại / Dự tính số dư */}
          <div className="rounded-3xl border border-[#e2ece5] bg-white p-6 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-[#edf2ee]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#e3f4e9] text-[#07543f] font-bold">
                  <FinanceIcon name="trend" size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#14261e]">Dự tính số dư sau khi lưu</h3>
                  <p className="text-[11px] text-[#718579]">Tài khoản: {selectedAccountObj?.name || 'Chưa chọn'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#718579]">Số dư hiện tại:</span>
                <strong className="text-[#14261e] font-bold">
                  {formatAmount(selectedAccountObj?.balance || 0)} ₫
                </strong>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#718579]">
                  {type === 'INCOME' ? 'Số tiền nhận:' : type === 'TRANSFER' ? 'Số tiền chuyển đi:' : 'Số tiền muốn chi:'}
                </span>
                <strong className={type === 'INCOME' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {type === 'INCOME' ? '+' : '-'}{formatAmount(numericAmount)} ₫
                </strong>
              </div>

              <div className="my-1 border-t border-dashed border-[#d5ded8]" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#14261e]">Số dư còn lại dự kiến:</span>
                <span className={`text-base font-black ${projectedBalance < 0 ? 'text-rose-600' : 'text-[#07543f]'}`}>
                  {formatAmount(Math.max(0, projectedBalance))} ₫
                </span>
              </div>

              {projectedBalance < 0 && (
                <div className="rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                  ⚠️ Cảnh báo: Khoản chi lớn hơn số dư hiện có trong ví ({formatAmount(projectedBalance)} ₫).
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Bảng giao dịch gần đây */}
          <div className="rounded-3xl border border-[#e2ece5] bg-white p-6 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ee]">
              <div>
                <h3 className="text-sm font-bold text-[#14261e]">Giao dịch gần đây</h3>
                <p className="text-[11px] text-[#718579]">Lịch sử ghi chép thu chi mới nhất</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-bold text-[#07543f] hover:underline"
              >
                Xem tất cả →
              </button>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-[#edf2ee]">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#718579]">
                  Chưa có giao dịch nào được ghi nhận gần đây.
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  const isInc = tx.transactionType === 'INCOME'
                  const isTrf = tx.transactionType === 'TRANSFER'
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span 
                          className="grid size-9 shrink-0 place-items-center rounded-xl border text-xs"
                          style={{
                            backgroundColor: tx.category?.color ? `${tx.category.color}15` : isInc ? '#ecfdf5' : '#fef2f2',
                            borderColor: tx.category?.color ? `${tx.category.color}30` : isInc ? '#a7f3d0' : '#fecaca',
                            color: tx.category?.color || (isInc ? '#059669' : '#dc2626')
                          }}
                        >
                          {renderCategoryIcon(tx.category?.icon, tx.transactionType, 16)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#14261e]">
                            {tx.description || tx.category?.name || 'Giao dịch'}
                          </p>
                          <p className="text-[11px] text-[#718579] truncate">
                            {tx.accountName || 'Ví chính'} {tx.category?.name ? `· ${tx.category.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-extrabold ${
                          isInc ? 'text-emerald-600' : isTrf ? 'text-blue-600' : 'text-rose-600'
                        }`}>
                          {isInc ? '+' : isTrf ? '' : '-'}{formatAmount(tx.amount)} ₫
                        </span>
                        <p className="text-[10px] text-gray-400">
                          {tx.transactionDate}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

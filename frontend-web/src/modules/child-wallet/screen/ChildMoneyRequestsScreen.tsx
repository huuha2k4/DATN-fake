import { useEffect, useMemo, useState, useRef } from 'react'
import { getStoredUser } from '../../auth/api/authApi'
import { groupApi, type ChildWalletResponse, type SpendRequestItem } from '../../group/api/groupApi'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import moneyRequestApproved from '../../../assets/icons/money_request_approved.png'
import moneyRequestPending from '../../../assets/icons/money_request_pending.png'
import moneyRequestRejected from '../../../assets/icons/money_request_rejected.png'

type Props = { onNotify: (message: string) => void }

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

const formatTxDateTime = (dateString?: string) => {
  if (!dateString) return { date: 'Vừa xong', time: '' }
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return { date: dateString, time: '' }
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return { date, time }
}

const formatFullDateTime = (dateString?: string) => {
  if (!dateString) return 'Chưa ghi nhận'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ChildMoneyRequestsScreen({ onNotify }: Props) {
  const user = getStoredUser()
  const groupId = user?.childWalletGroupId
  const walletId = user?.childWalletId
  const [, setWallet] = useState<ChildWalletResponse | null>(null)
  const [requests, setRequests] = useState<SpendRequestItem[]>([])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<(SpendRequestItem & { cleanDesc: string }) | null>(null)

  // Filters state tương tự Quản lý thu chi
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const load = async () => {
    if (!groupId || !walletId) return
    setLoading(true)
    try {
      const [walletData, requestData] = await Promise.all([
        groupApi.getChildWallet(groupId, walletId),
        groupApi.getSpendRequests(groupId, walletId),
      ])
      setWallet(walletData)
      setRequests(requestData)
    } catch {
      onNotify('Không thể tải lịch sử yêu cầu xin tiền')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericAmount = Number(amount.replace(/[^0-9]/g, ''))
    if (!numericAmount || numericAmount <= 0) {
      onNotify('Vui lòng nhập số tiền muốn xin')
      return
    }
    if (!description.trim()) {
      onNotify('Vui lòng nhập lý do / mục đích xin tiền')
      return
    }
    if (!groupId || !walletId) return

    try {
      setSubmitting(true)
      await groupApi.createMoneyRequest(groupId, walletId, numericAmount, description.trim())
      onNotify('Đã gửi yêu cầu xin tiền tới bố mẹ! Hãy đợi bố mẹ duyệt nhé 🎉')
      setAmount('')
      setDescription('')
      setIsModalOpen(false)
      load()
    } catch (error: any) {
      onNotify(error?.response?.data?.message || 'Không thể gửi yêu cầu xin tiền')
    } finally {
      setSubmitting(false)
    }
  }

  // Danh sách các yêu cầu hợp lệ
  const moneyRequests = useMemo(() => {
    return requests
      .filter(req => req.description?.startsWith('[MONEY_REQUEST] ') || req.status === 'PENDING')
      .map(req => {
        const cleanDesc = req.description?.replace(/^\[MONEY_REQUEST\]\s*/, '') || 'Xin tiền tiêu vặt'
        return {
          ...req,
          cleanDesc,
        }
      })
  }, [requests])

  // Danh sách các tháng có yêu cầu
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    const now = new Date()
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

    moneyRequests.forEach((req) => {
      if (req.createdAt) {
        const d = new Date(req.createdAt)
        if (!Number.isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }
      }
    })

    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [year, month] = key.split('-')
        return { key, label: `Tháng ${Number(month)}/${year}` }
      })
  }, [moneyRequests])

  // Danh sách các yêu cầu theo tháng được chọn (hoặc tất cả các tháng) để tính thống kê KPI
  const monthRequests = useMemo(() => {
    return moneyRequests.filter((item) => {
      if (selectedMonth !== 'ALL' && item.createdAt) {
        const d = new Date(item.createdAt)
        if (!Number.isNaN(d.getTime())) {
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (mKey !== selectedMonth) return false
        }
      }
      return true
    })
  }, [moneyRequests, selectedMonth])

  // Lọc theo Tab, Tháng, Tìm kiếm cho danh sách bảng
  const filteredRequests = useMemo(() => {
    return monthRequests.filter((item) => {
      if (activeTab === 'PENDING' && item.status !== 'PENDING') return false
      if (activeTab === 'APPROVED' && item.status !== 'APPROVED') return false
      if (activeTab === 'REJECTED' && item.status !== 'REJECTED') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const descMatch = item.cleanDesc.toLowerCase().includes(q)
        const amtMatch = String(item.amount).includes(q)
        if (!descMatch && !amtMatch) return false
      }

      return true
    })
  }, [monthRequests, activeTab, searchQuery])

  const pendingCount = monthRequests.filter(r => r.status === 'PENDING').length
  const approvedTotal = monthRequests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalRequestsCount = monthRequests.length

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-5">
      {/* 1. Top KPI Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-13 shrink-0 rounded-2xl bg-[#FFEDD5] dark:bg-amber-950/60 p-2.5 border border-amber-200/60 dark:border-amber-800/50 shadow-2xs grid place-items-center text-[#EA580C] dark:text-amber-400">
              <FinanceIcon name="clock" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Chờ duyệt</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-[#EA580C] dark:text-amber-400">{pendingCount}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-13 shrink-0 rounded-2xl bg-[#DCFCE7] dark:bg-emerald-950/60 p-2.5 border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs grid place-items-center text-[#16A34A] dark:text-emerald-400">
              <FinanceIcon name="wallet" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Đã được cấp</p>
              <p className="mt-1 text-xl sm:text-2xl font-black text-[#16A34A] dark:text-emerald-400">
                +{money(approvedTotal)}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-13 shrink-0 rounded-2xl bg-[#E0F2FE] dark:bg-sky-950/60 p-2.5 border border-sky-200/60 dark:border-sky-800/50 shadow-2xs grid place-items-center text-[#0284C7] dark:text-sky-400">
              <FinanceIcon name="gift" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Tổng lượt yêu cầu</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100">{totalRequestsCount}</p>
            </div>
          </div>
        </article>
      </section>

      {/* 2. Filter Toolbar */}
      <section className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-gray-100 dark:bg-slate-800/90 border border-transparent dark:border-slate-700/60 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-[#007F53] dark:text-emerald-300 shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              Chờ duyệt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('APPROVED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'APPROVED'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              Đã duyệt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('REJECTED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'REJECTED'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              Từ chối
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm nội dung xin tiền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/80 pl-8 pr-8 text-xs text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007F53] dark:focus:ring-emerald-500"
              />
              <span className="absolute left-2.5 top-2.5 text-gray-400">
                <FinanceIcon name="search" size={13} />
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  <FinanceIcon name="close" size={13} />
                </button>
              )}
            </div>

            <div className="relative shrink-0" ref={monthDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                className="h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/80 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <FinanceIcon name="calendar" size={13} className="text-gray-400" />
                <span>
                  {selectedMonth === 'ALL'
                    ? 'Tất cả tháng'
                    : availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth}
                </span>
                <span className="text-[10px] text-gray-400">▼</span>
              </button>

              {isMonthDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-44 max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-xl animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth('ALL')
                      setIsMonthDropdownOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      selectedMonth === 'ALL'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 font-bold text-[#007F53] dark:text-emerald-400'
                        : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span>Tất cả thời gian</span>
                    {selectedMonth === 'ALL' && <span className="text-emerald-600">✓</span>}
                  </button>

                  <div className="my-1 border-t border-gray-100 dark:border-slate-700" />

                  {availableMonths.map((m) => {
                    const isSelected = selectedMonth === m.key
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(m.key)
                          setIsMonthDropdownOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 font-bold text-[#007F53] dark:text-emerald-400'
                            : 'text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <span>{m.label}</span>
                        {isSelected && <span className="text-emerald-600">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-[#007F53] hover:bg-[#004D3B] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FinanceIcon name="plus" size={13} />
              <span>Xin tiền</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Bảng Lịch sử Xin tiền */}
      <section className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center p-8 text-center text-xs text-gray-400 dark:text-slate-500">
            <FinanceIcon name="refresh" size={20} className="animate-spin text-emerald-600 mr-2" />
            <span>Đang tải lịch sử xin tiền...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <span className="text-4xl mb-3">📭</span>
            <strong className="text-sm font-bold text-gray-800 dark:text-slate-200">
              Không tìm thấy yêu cầu nào
            </strong>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-400 max-w-sm mb-4">
              Không có yêu cầu xin tiền nào trong tháng này hoặc bộ lọc đã chọn.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#007F53] hover:bg-[#004D3B] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FinanceIcon name="plus" size={13} />
              <span>Gửi yêu cầu xin tiền ngay</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left">
              <thead className="bg-[#f8fafc] dark:bg-slate-800/80 text-[11px] font-bold tracking-wider text-[#64748b] dark:text-slate-400 border-b border-[#e2e8f0] dark:border-slate-800">
                <tr>
                  <th className="w-[40%] px-4 py-3.5">MỤC ĐÍCH XIN TIỀN</th>
                  <th className="w-[18%] px-3 py-3.5">THỜI GIAN GỬI</th>
                  <th className="w-[16%] px-3 py-3.5 text-center">TRẠNG THÁI</th>
                  <th className="w-[16%] px-4 py-3.5 text-right">SỐ TIỀN XIN</th>
                  <th className="w-[10%] px-3 py-3.5 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] dark:divide-slate-800/70 text-xs">
                {filteredRequests.map((item) => {
                  const dt = formatTxDateTime(item.createdAt)
                  const isApproved = item.status === 'APPROVED'
                  const isRejected = item.status === 'REJECTED'
                  const isPending = item.status === 'PENDING'

                  const statusConfig = isApproved
                    ? {
                        label: 'Đã duyệt',
                        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                        iconImg: moneyRequestApproved,
                        subText: 'Đã cộng vào ví',
                      }
                    : isRejected
                    ? {
                        label: 'Từ chối',
                        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                        iconImg: moneyRequestRejected,
                        subText: 'Chưa duyệt',
                      }
                    : {
                        label: 'Chờ duyệt',
                        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                        iconImg: moneyRequestPending,
                        subText: 'Bố mẹ đang xem',
                      }

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedRequest(item)}
                      className="transition-colors hover:bg-[#f6faf7] dark:hover:bg-slate-800/60 group cursor-pointer"
                    >
                      {/* Cột 1 */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-11 shrink-0 grid place-items-center rounded-2xl bg-white dark:bg-slate-800 p-1 border border-gray-200/80 dark:border-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                            <img src={statusConfig.iconImg} alt="status" className="size-full object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-slate-100 text-[13px] truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {item.cleanDesc}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                              Yêu cầu xin tiền tiêu vặt
                            </p>
                            {item.status === 'REJECTED' && item.rejectionReason && (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1 truncate">
                                ❌ Lý do từ chối: {item.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 2 */}
                      <td className="px-3 py-3.5">
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-[12px] leading-tight">
                          {dt.date}
                        </p>
                        {dt.time && (
                          <p className="text-[10.5px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">
                            {dt.time}
                          </p>
                        )}
                      </td>

                      {/* Cột 3 */}
                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold border shadow-2xs ${statusConfig.badgeClass}`}>
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      {/* Cột 4 */}
                      <td className="px-4 py-3.5 text-right font-black text-sm">
                        <span className="text-[14px] font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                          +{money(item.amount)}
                        </span>
                        <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 mt-0.5">
                          {statusConfig.subText}
                        </p>
                      </td>

                      {/* Cột 5: Nút Xem chi tiết */}
                      <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(item)}
                          className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-[#007F53] dark:hover:bg-slate-800 transition cursor-pointer mx-auto"
                          title="Xem chi tiết yêu cầu"
                        >
                          <FinanceIcon name="eye" size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Popup Chi tiết Yêu cầu xin tiền */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-11 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-gray-200/80 dark:border-slate-700 shadow-2xs grid place-items-center">
                  <img
                    src={
                      selectedRequest.status === 'APPROVED'
                        ? moneyRequestApproved
                        : selectedRequest.status === 'REJECTED'
                        ? moneyRequestRejected
                        : moneyRequestPending
                    }
                    alt="status"
                    className="size-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 m-0">
                    Chi tiết yêu cầu xin tiền
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-slate-400">
                    Thông tin phê duyệt từ bố mẹ
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="size-8 grid place-items-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thẻ số tiền xin nổi bật */}
            <div className="my-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Số tiền xin cấp
              </span>
              <div className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                +{money(selectedRequest.amount)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${
                  selectedRequest.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : selectedRequest.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {selectedRequest.status === 'APPROVED' ? '✓ Đã được bố mẹ duyệt' : selectedRequest.status === 'REJECTED' ? '✕ Đã bị từ chối' : '⏳ Đang chờ bố mẹ xét duyệt'}
                </span>
              </div>
            </div>

            {/* Chi tiết nội dung */}
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 font-medium block mb-1">Mục đích sử dụng:</span>
                <strong className="text-sm font-bold text-gray-900 dark:text-slate-100 block leading-relaxed">
                  {selectedRequest.cleanDesc}
                </strong>
                {selectedRequest.notes && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedRequest.notes}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 font-medium block">Thời gian gửi</span>
                  <strong className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-1 block">
                    {formatFullDateTime(selectedRequest.createdAt)}
                  </strong>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 font-medium block">Người phản hồi</span>
                  <strong className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-1 block">
                    {selectedRequest.respondedByUserName || (selectedRequest.status === 'PENDING' ? 'Đang đợi bố mẹ' : 'Bố mẹ')}
                  </strong>
                </div>
              </div>

              {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
                  <strong className="font-bold block mb-1">❌ Lý do bố mẹ chưa duyệt:</strong>
                  <span>{selectedRequest.rejectionReason}</span>
                </div>
              )}

              {selectedRequest.status === 'APPROVED' && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Trạng thái số dư ví:</span>
                  <strong className="font-bold">Đã được nạp trực tiếp vào ví của em ✓</strong>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Form Xin tiền bố mẹ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => !submitting && setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-1.5 border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs grid place-items-center">
                  <img src={moneyRequestApproved} alt="Xin tiền" className="size-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 m-0">
                    Xin tiền bố mẹ
                  </h3>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                    Gửi yêu cầu xin tiền tiêu vặt hoặc mua sắm
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="size-8 grid place-items-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  Số tiền muốn xin (₫) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setAmount(raw)
                    }}
                    placeholder="0"
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 text-base font-black text-emerald-600 dark:text-emerald-400 placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#007F53] dark:focus:ring-emerald-500"
                    required
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-gray-400">VND</span>
                </div>
              </div>

              {/* Quick suggestions */}
              <div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 block mb-1.5">
                  Gợi ý số tiền:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[5000, 10000, 20000, 50000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(String(val))}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer border border-emerald-100 dark:border-emerald-800/40"
                    >
                      {money(val)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  Mục đích sử dụng cụ thể *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Mua bút màu, sách bài tập, đóng tiền quỹ lớp, ăn sáng..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 text-xs font-medium text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007F53] dark:focus:ring-emerald-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !amount || !description.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#007F53] hover:bg-[#004D3B] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-bold text-white transition shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FinanceIcon name="plus" size={14} />
                  <span>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu tới bố mẹ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

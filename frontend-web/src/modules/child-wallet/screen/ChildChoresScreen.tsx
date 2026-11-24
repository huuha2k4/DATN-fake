import { useEffect, useMemo, useState, useRef } from 'react'
import { getStoredUser } from '../../auth/api/authApi'
import { groupApi, type ChildChoreItem, type ChildWalletResponse } from '../../group/api/groupApi'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import { resolveChoreIconUrl } from '../components/choreIcons'

type Props = { onNotify: (message: string) => void }

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Không có hạn'
  const [year, month, day] = dateString.split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return dateString
}

const formatDateTime = (dateString?: string) => {
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

const choreStatusMap: Record<string, { label: string; bg: string; text: string; darkBg: string; darkText: string }> = {
  ASSIGNED: { label: 'Cần làm', bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-950/70', darkText: 'dark:text-amber-300' },
  IN_PROGRESS: { label: 'Đang làm', bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-950/70', darkText: 'dark:text-blue-300' },
  SUBMITTED: { label: 'Chờ duyệt', bg: 'bg-purple-100', text: 'text-purple-800', darkBg: 'dark:bg-purple-950/70', darkText: 'dark:text-purple-300' },
  APPROVED: { label: 'Đã nhận thưởng', bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-950/70', darkText: 'dark:text-emerald-300' },
  REJECTED: { label: 'Cần làm lại', bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-950/70', darkText: 'dark:text-amber-300' },
  FAILED: { label: 'Không hoàn thành', bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-950/70', darkText: 'dark:text-rose-300' },
}

export function ChildChoresScreen({ onNotify }: Props) {
  const user = getStoredUser()
  const groupId = user?.childWalletGroupId
  const walletId = user?.childWalletId
  const [, setWallet] = useState<ChildWalletResponse | null>(null)
  const [chores, setChores] = useState<ChildChoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChore, setSelectedChore] = useState<ChildChoreItem | null>(null)

  // Filters state
  const [activeTab, setActiveTab] = useState<'ALL' | 'ASSIGNED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('ALL')
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
      const [walletData, choreData] = await Promise.all([
        groupApi.getChildWallet(groupId, walletId),
        groupApi.getChores(groupId, walletId),
      ])
      setWallet(walletData)
      setChores(choreData)
    } catch {
      onNotify('Không thể tải dữ liệu nhiệm vụ của bé')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submitChore = async (chore: ChildChoreItem) => {
    if (!groupId || !walletId) return
    try {
      await groupApi.completeChore(groupId, walletId, chore.id)
      onNotify('Đã báo hoàn thành nhiệm vụ! Chờ bố mẹ duyệt thưởng nhé 🎉')
      if (selectedChore?.id === chore.id) {
        setSelectedChore({ ...chore, status: 'SUBMITTED' })
      }
      load()
    } catch (error: any) {
      onNotify(error?.response?.data?.message || 'Không thể báo hoàn thành nhiệm vụ')
    }
  }

  // Danh sách các tháng
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>()
    const now = new Date()
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

    chores.forEach((c) => {
      const dateStr = c.createdAt || c.dueDate
      if (dateStr) {
        const d = new Date(dateStr)
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
  }, [chores])

  // Danh sách các nhiệm vụ theo tháng được chọn để tính KPI
  const monthChores = useMemo(() => {
    return chores.filter((chore) => {
      if (selectedMonth !== 'ALL') {
        const dateStr = chore.createdAt || chore.dueDate
        if (dateStr) {
          const d = new Date(dateStr)
          if (!Number.isNaN(d.getTime())) {
            const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (mKey !== selectedMonth) return false
          }
        }
      }
      return true
    })
  }, [chores, selectedMonth])

  // Lọc nhiệm vụ cho danh sách hiển thị
  const filteredChores = useMemo(() => {
    return monthChores.filter((chore) => {
      if (activeTab === 'ASSIGNED' && chore.status !== 'ASSIGNED' && chore.status !== 'IN_PROGRESS') return false
      if (activeTab === 'SUBMITTED' && chore.status !== 'SUBMITTED') return false
      if (activeTab === 'APPROVED' && chore.status !== 'APPROVED') return false
      if (activeTab === 'REJECTED' && chore.status !== 'REJECTED' && chore.status !== 'FAILED') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = chore.title?.toLowerCase().includes(q)
        const descMatch = chore.description?.toLowerCase().includes(q)
        const amountMatch = String(chore.rewardAmount).includes(q)
        if (!titleMatch && !descMatch && !amountMatch) return false
      }

      return true
    })
  }, [monthChores, activeTab, searchQuery])

  const assignedCount = monthChores.filter(c => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length
  const submittedCount = monthChores.filter(c => c.status === 'SUBMITTED').length
  const approvedTotalReward = monthChores
    .filter(c => c.status === 'APPROVED')
    .reduce((sum, c) => sum + (c.rewardAmount || 0), 0)

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-5">
      {/* 1. Top KPI Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-13 shrink-0 rounded-2xl bg-amber-50 dark:bg-amber-950/60 p-2.5 border border-amber-200/60 dark:border-amber-800/50 shadow-2xs grid place-items-center text-amber-600 dark:text-amber-400">
              <FinanceIcon name="star" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Nhiệm vụ cần làm</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{assignedCount}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-13 shrink-0 rounded-2xl bg-purple-50 dark:bg-purple-950/60 p-2.5 border border-purple-200/60 dark:border-purple-800/50 shadow-2xs grid place-items-center text-purple-600 dark:text-purple-400">
              <FinanceIcon name="clock" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Chờ bố mẹ duyệt</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">{submittedCount}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-13 shrink-0 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 p-2.5 border border-emerald-200/60 dark:border-emerald-800/50 shadow-2xs grid place-items-center text-emerald-600 dark:text-emerald-400">
              <FinanceIcon name="wallet" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Tổng thưởng đã nhận</p>
              <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                +{money(approvedTotalReward)}
              </p>
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
              onClick={() => setActiveTab('ASSIGNED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'ASSIGNED'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              Cần làm
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUBMITTED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'SUBMITTED'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs'
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
              Đã thưởng
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
              Làm lại
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm tên nhiệm vụ, nội dung..."
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
          </div>
        </div>
      </section>

      {/* 3. Bảng Danh sách Nhiệm vụ */}
      <section className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center p-8 text-center text-xs text-gray-400 dark:text-slate-500">
            <FinanceIcon name="refresh" size={20} className="animate-spin text-emerald-600 mr-2" />
            <span>Đang tải danh sách nhiệm vụ...</span>
          </div>
        ) : filteredChores.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <span className="text-4xl mb-3">⭐</span>
            <strong className="text-sm font-bold text-gray-800 dark:text-slate-200">
              Không tìm thấy nhiệm vụ nào
            </strong>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-400 max-w-sm">
              Không có nhiệm vụ nào trong tháng này hoặc bộ lọc đã chọn. Hãy nhắc bố mẹ giao thêm việc nhà nhé!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left">
              <thead className="bg-[#f8fafc] dark:bg-slate-800/80 text-[11px] font-bold tracking-wider text-[#64748b] dark:text-slate-400 border-b border-[#e2e8f0] dark:border-slate-800">
                <tr>
                  <th className="w-[36%] px-4 py-3.5">NHIỆM VỤ &amp; CHI TIẾT</th>
                  <th className="w-[18%] px-3 py-3.5">HẠN HOÀN THÀNH</th>
                  <th className="w-[16%] px-3 py-3.5 text-center">TRẠNG THÁI</th>
                  <th className="w-[16%] px-4 py-3.5 text-right">TIỀN THƯỞNG</th>
                  <th className="w-[14%] px-3 py-3.5 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] dark:divide-slate-800/70 text-xs">
                {filteredChores.map((chore) => {
                  const statusStyle = choreStatusMap[chore.status] || {
                    label: chore.status,
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    darkBg: 'dark:bg-slate-800',
                    darkText: 'dark:text-slate-300',
                  }
                  const iconUrl = resolveChoreIconUrl(chore.icon, chore.id || chore.title)

                  return (
                    <tr
                      key={chore.id}
                      onClick={() => setSelectedChore(chore)}
                      className="transition-colors hover:bg-[#f6faf7] dark:hover:bg-slate-800/60 group cursor-pointer"
                    >
                      {/* Cột 1 */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 p-1 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                            <img src={iconUrl} alt="chore icon" className="size-full object-contain" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-slate-100 text-[13px] truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {chore.title}
                            </p>
                            {chore.description ? (
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5" title={chore.description}>
                                {chore.description}
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                                Giao ngày {formatDateTime(chore.createdAt)}
                              </p>
                            )}

                            {chore.status === 'REJECTED' && chore.rejectionReason && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1 truncate">
                                ⚠️ Cần làm lại: {chore.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 2 */}
                      <td className="px-3 py-3.5">
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-[12px] leading-tight">
                          {formatDate(chore.dueDate)}
                        </p>
                        {chore.dueDate && (
                          <p className="text-[10.5px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">
                            Hạn nộp
                          </p>
                        )}
                      </td>

                      {/* Cột 3 */}
                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${statusStyle.bg} ${statusStyle.text} ${statusStyle.darkBg} ${statusStyle.darkText} shadow-2xs border border-transparent`}>
                          <span>{statusStyle.label}</span>
                        </span>
                      </td>

                      {/* Cột 4 */}
                      <td className="px-4 py-3.5 text-right font-black text-sm">
                        <span className="text-[14px] font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                          +{money(chore.rewardAmount)}
                        </span>
                        <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 mt-0.5">
                          Tiền thưởng ví
                        </p>
                      </td>

                      {/* Cột 5 */}
                      <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {(chore.status === 'ASSIGNED' || chore.status === 'IN_PROGRESS') && (
                            <button
                              type="button"
                              onClick={() => submitChore(chore)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              <span>✓</span>
                              <span>Báo xong</span>
                            </button>
                          )}

                          {chore.status === 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => submitChore(chore)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                              title="Bấm để báo cho bố mẹ sau khi đã hoàn thành làm lại nhiệm vụ"
                            >
                              <span>🔄</span>
                              <span>Làm lại</span>
                            </button>
                          )}

                          {chore.status === 'SUBMITTED' && (
                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                              Đang duyệt...
                            </span>
                          )}

                          {chore.status === 'APPROVED' && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Đã thưởng ✓
                            </span>
                          )}

                          {chore.status === 'FAILED' && (
                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              Hết hạn
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedChore(chore)}
                            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-[#007F53] dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Xem chi tiết nhiệm vụ"
                          >
                            <FinanceIcon name="eye" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Chi tiết Nhiệm vụ nhận thưởng */}
      {selectedChore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedChore(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-12 place-items-center rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1.5 shadow-2xs shrink-0 overflow-hidden">
                  <img
                    src={resolveChoreIconUrl(selectedChore.icon, selectedChore.id || selectedChore.title)}
                    alt="chore icon"
                    className="size-full object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 m-0 truncate">
                    {selectedChore.title}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-slate-400">
                    Chi tiết nhiệm vụ và tiền thưởng
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChore(null)}
                className="size-8 grid place-items-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            {/* Thẻ tiền thưởng nổi bật */}
            <div className="my-4 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Tiền thưởng nhận được
              </span>
              <div className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                +{money(selectedChore.rewardAmount)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${choreStatusMap[selectedChore.status]?.bg || 'bg-gray-100'} ${choreStatusMap[selectedChore.status]?.text || 'text-gray-700'} ${choreStatusMap[selectedChore.status]?.darkBg || 'dark:bg-slate-800'} ${choreStatusMap[selectedChore.status]?.darkText || 'dark:text-slate-300'}`}>
                  {choreStatusMap[selectedChore.status]?.label || selectedChore.status}
                </span>
                {selectedChore.frequency && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    · Tần suất: {selectedChore.frequency === 'DAILY' ? 'Hàng ngày' : selectedChore.frequency === 'WEEKLY' ? 'Hàng tuần' : 'Một lần'}
                  </span>
                )}
              </div>
            </div>

            {/* Chi tiết nội dung */}
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3.5 border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 font-medium block mb-1">Mô tả việc cần làm:</span>
                {selectedChore.description ? (
                  <p className="text-xs text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap m-0 font-medium">
                    {selectedChore.description}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic m-0">
                    Không có mô tả chi tiết kèm theo.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 font-medium block">Hạn hoàn thành</span>
                  <strong className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-1 block">
                    {formatDate(selectedChore.dueDate)}
                  </strong>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 font-medium block">Ngày giao việc</span>
                  <strong className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-1 block">
                    {formatDateTime(selectedChore.createdAt)}
                  </strong>
                </div>
              </div>

              {selectedChore.status === 'REJECTED' && selectedChore.rejectionReason && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
                  <strong className="font-bold block mb-1">⚠️ Lời nhắn từ bố mẹ (Cần làm lại):</strong>
                  <span>{selectedChore.rejectionReason}</span>
                </div>
              )}

              {selectedChore.status === 'FAILED' && selectedChore.rejectionReason && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
                  <strong className="font-bold block mb-1">❌ Lý do không thành công:</strong>
                  <span>{selectedChore.rejectionReason}</span>
                </div>
              )}

              {selectedChore.status === 'APPROVED' && selectedChore.approvedAt && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Thời gian duyệt thưởng:</span>
                  <strong className="font-bold">{formatDateTime(selectedChore.approvedAt)}</strong>
                </div>
              )}
            </div>

            {/* Footer hành động */}
            <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedChore(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng
              </button>

              {(selectedChore.status === 'ASSIGNED' || selectedChore.status === 'IN_PROGRESS' || selectedChore.status === 'REJECTED') && (
                <button
                  type="button"
                  onClick={() => submitChore(selectedChore)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✓</span>
                  <span>{selectedChore.status === 'REJECTED' ? 'Báo đã làm lại' : 'Báo hoàn thành việc'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

import { useEffect, useState } from 'react'
import { getStoredUser } from '../../auth/api/authApi'
import { groupApi, type ChildChoreItem, type ChildWalletResponse, type SpendRequestItem } from '../../group/api/groupApi'
import { FinanceIcon } from '../../core/components/FinanceIcon'

type Props = { onNotify: (message: string) => void }

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return dateString
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'Vừa xong'
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

const choreStatusMap: Record<string, { label: string; bg: string; text: string }> = {
  ASSIGNED: { label: 'Cần làm', bg: 'bg-amber-100 dark:bg-amber-950/70 dark:border dark:border-amber-800/60', text: 'text-amber-800 dark:text-amber-300' },
  IN_PROGRESS: { label: 'Đang làm', bg: 'bg-blue-100 dark:bg-blue-950/70 dark:border dark:border-blue-800/60', text: 'text-blue-800 dark:text-blue-300' },
  SUBMITTED: { label: 'Chờ xác nhận', bg: 'bg-purple-100 dark:bg-purple-950/70 dark:border dark:border-purple-800/60', text: 'text-purple-800 dark:text-purple-300' },
  APPROVED: { label: 'Đã nhận thưởng', bg: 'bg-emerald-100 dark:bg-emerald-950/70 dark:border dark:border-emerald-800/60', text: 'text-emerald-800 dark:text-emerald-300' },
  REJECTED: { label: 'Cần làm lại', bg: 'bg-amber-100 dark:bg-amber-950/70 dark:border dark:border-amber-800/60', text: 'text-amber-800 dark:text-amber-300' },
  FAILED: { label: 'Không thành công', bg: 'bg-rose-100 dark:bg-rose-950/70 dark:border dark:border-rose-800/60', text: 'text-rose-800 dark:text-rose-300' },
}

export function ChildWalletScreen({ onNotify }: Props) {
  const user = getStoredUser()
  const groupId = user?.childWalletGroupId
  const walletId = user?.childWalletId
  const [wallet, setWallet] = useState<ChildWalletResponse | null>(null)
  const [requests, setRequests] = useState<SpendRequestItem[]>([])
  const [chores, setChores] = useState<ChildChoreItem[]>([])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [choreTab, setChoreTab] = useState<'ALL' | 'ASSIGNED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'>('ALL')

  const load = async () => {
    if (!groupId || !walletId) return
    setLoading(true)
    try {
      const [walletData, requestData, choreData] = await Promise.all([
        groupApi.getChildWallet(groupId, walletId),
        groupApi.getSpendRequests(groupId, walletId),
        groupApi.getChores(groupId, walletId),
      ])
      setWallet(walletData)
      setRequests(requestData)
      setChores(choreData)
    } catch {
      onNotify('Không thể tải dữ liệu ví của bé')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const askForMoney = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number(amount.replace(/[^0-9]/g, ''))
    if (!groupId || !walletId || value <= 0 || !description.trim()) {
      onNotify('Vui lòng nhập số tiền và lý do xin tiền')
      return
    }
    try {
      setSubmitting(true)
      await groupApi.createMoneyRequest(groupId, walletId, value, description.trim())
      setAmount('')
      setDescription('')
      onNotify('Đã gửi yêu cầu xin tiền tới bố mẹ!')
      load()
    } catch (error: any) {
      onNotify(error?.response?.data?.message || 'Không gửi được yêu cầu xin tiền')
    } finally {
      setSubmitting(false)
    }
  }

  const submitChore = async (chore: ChildChoreItem) => {
    if (!groupId || !walletId) return
    try {
      await groupApi.completeChore(groupId, walletId, chore.id)
      onNotify('Đã báo hoàn thành nhiệm vụ! Chờ bố mẹ duyệt thưởng nhé 🎉')
      load()
    } catch (error: any) {
      onNotify(error?.response?.data?.message || 'Không thể báo hoàn thành nhiệm vụ')
    }
  }

  if (!user?.childAccount) return null

  // Lọc danh sách yêu cầu xin tiền bố mẹ
  const moneyRequests = requests
    .filter(req => req.description?.startsWith('[MONEY_REQUEST] ') || req.status === 'PENDING')
    .map(req => {
      const cleanDesc = req.description?.replace(/^\[MONEY_REQUEST\]\s*/, '') || 'Xin tiền tiêu vặt'
      return {
        ...req,
        cleanDesc,
      }
    })

  const filteredRequests = moneyRequests.filter(item => {
    if (activeTab === 'PENDING') return item.status === 'PENDING'
    if (activeTab === 'APPROVED') return item.status === 'APPROVED'
    if (activeTab === 'REJECTED') return item.status === 'REJECTED'
    return true
  })

  const filteredChores = chores.filter(chore => {
    if (choreTab === 'ASSIGNED') return chore.status === 'ASSIGNED' || chore.status === 'IN_PROGRESS'
    if (choreTab === 'SUBMITTED') return chore.status === 'SUBMITTED'
    if (choreTab === 'APPROVED') return chore.status === 'APPROVED'
    if (choreTab === 'REJECTED') return chore.status === 'REJECTED' || chore.status === 'FAILED'
    return true
  })

  const pendingCount = moneyRequests.filter(item => item.status === 'PENDING').length

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-6">
      {/* Top Banner: Thẻ ví và Form xin tiền - cân đối đồng bộ 2 cột với hàng dưới */}
      <div className="grid gap-5 lg:grid-cols-2 items-stretch">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064232] via-[#07543f] to-[#0d7357] dark:from-[#04281e] dark:via-[#064232] dark:to-[#095843] p-5 text-white shadow-xs flex flex-col justify-between min-h-[190px] border border-emerald-800/40 dark:border-emerald-700/30">
          {/* Background shapes */}
          <div className="absolute -right-10 -top-10 size-36 rounded-full bg-white/10 dark:bg-emerald-400/10 blur-xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 size-32 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-lg pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-white/15 dark:bg-white/10 backdrop-blur-md grid place-items-center text-xl border border-white/20 dark:border-white/15 shadow-inner">
                👶
              </div>
              <div>
                <span className="text-[10px] font-semibold text-emerald-200 dark:text-emerald-300 tracking-wider uppercase block">Ví tiền của em</span>
                <h1 className="text-sm sm:text-base font-bold text-white m-0 leading-tight">{wallet?.childName || user.fullName}</h1>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 dark:bg-white/15 backdrop-blur-md border border-white/25 text-emerald-100">
              Finora Kids ⭐
            </span>
          </div>

          <div className="relative my-3">
            <span className="text-[11px] text-emerald-200/90 dark:text-emerald-300/90 font-medium block">Số dư khả dụng</span>
            <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight block mt-0.5 text-white">
              {loading ? '---' : money(wallet?.balance || 0)}
            </strong>
          </div>

          <div className="relative grid grid-cols-2 gap-2 border-t border-white/15 pt-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-lg bg-white/10 dark:bg-white/15 grid place-items-center text-xs">🎁</span>
              <div>
                <span className="text-emerald-200 dark:text-emerald-300 block text-[10px]">Trợ cấp tuần</span>
                <strong className="font-semibold text-white text-xs">{money(wallet?.weeklyAllowance || 0)}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-lg bg-white/10 dark:bg-white/15 grid place-items-center text-xs">🛡️</span>
              <div>
                <span className="text-emerald-200 dark:text-emerald-300 block text-[10px]">Hạn mức / ngày</span>
                <strong className="font-semibold text-white text-xs">
                  {wallet?.spendLimitDaily ? money(wallet.spendLimitDaily) : 'Không giới hạn'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Xin tiền bố mẹ */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-[#07543f] dark:text-emerald-300 border border-transparent dark:border-emerald-800/40 grid place-items-center font-bold text-sm">
                💸
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">Xin tiền bố mẹ</h2>
                <p className="text-[11px] text-[#718579] dark:text-slate-400 m-0">Nhập lý do chính đáng để bố mẹ xét duyệt</p>
              </div>
            </div>

            <form onSubmit={askForMoney} className="mt-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-gray-600 dark:text-slate-300 block mb-1">
                  Số tiền cần xin (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setAmount(raw)
                    }}
                    placeholder="VD: 20.000, 50.000..."
                    className="w-full h-9 px-3 pr-7 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 text-xs font-semibold text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#07543f] dark:focus:ring-emerald-500"
                    required
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs font-bold text-gray-400 dark:text-slate-500">₫</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-600 dark:text-slate-300 block mb-1">
                  Mục đích sử dụng
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="VD: Mua bút màu, sách bài tập, ăn sáng..."
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 text-xs font-medium text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#07543f] dark:focus:ring-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !amount || !description.trim()}
                className="w-full h-9 rounded-xl bg-[#07543f] hover:bg-[#064232] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-bold text-white transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FinanceIcon name="plus" size={13} />
                <span>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu tới bố mẹ'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Thông báo nếu có yêu cầu đang chờ duyệt */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <strong className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Có {pendingCount} yêu cầu xin tiền đang chờ bố mẹ duyệt
              </strong>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 m-0 mt-0.5">
                Bố mẹ sẽ nhận được thông báo và xem xét cấp tiền vào ví cho em.
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border border-transparent dark:border-amber-700/50 px-3 py-1 rounded-full">
            Đang chờ duyệt
          </span>
        </div>
      )}

      {/* 2 Cột: Nhiệm vụ kiếm tiền & Lịch sử Thu Chi */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cột 1: Nhiệm vụ của em */}
        <section className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">⭐</span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0 truncate">
                  Nhiệm vụ nhận thưởng ({chores.length})
                </h3>
                <p className="text-[11px] text-[#718579] dark:text-slate-400 m-0 mt-0.5 truncate">
                  Làm việc nhà chăm chỉ để tích lũy tiền thưởng
                </p>
              </div>
            </div>

            {/* Filter Pill Tabs cho Nhiệm vụ */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/90 border border-transparent dark:border-slate-700/60 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setChoreTab('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${choreTab === 'ALL' ? 'bg-white dark:bg-slate-700 text-[#07543f] dark:text-emerald-300 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setChoreTab('ASSIGNED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${choreTab === 'ASSIGNED' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Cần làm
              </button>
              <button
                type="button"
                onClick={() => setChoreTab('SUBMITTED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${choreTab === 'SUBMITTED' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                onClick={() => setChoreTab('APPROVED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${choreTab === 'APPROVED' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Đã thưởng
              </button>
              <button
                type="button"
                onClick={() => setChoreTab('REJECTED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${choreTab === 'REJECTED' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Làm lại
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 max-h-[380px] pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">Đang tải nhiệm vụ...</div>
            ) : filteredChores.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center gap-2">
                <span className="text-3xl">🎉</span>
                <strong className="text-xs font-bold text-gray-700 dark:text-slate-200">
                  Không có nhiệm vụ nào trong mục này
                </strong>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 m-0">Hãy kiểm tra các mục khác hoặc nhắc bố mẹ giao thêm việc nhé!</p>
              </div>
            ) : (
              filteredChores.map((chore) => {
                const statusStyle = choreStatusMap[chore.status] || { label: chore.status, bg: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-700 dark:text-slate-300' }
                return (
                  <div
                    key={chore.id}
                    className="p-3.5 rounded-2xl bg-[#fafcfa] dark:bg-slate-800/80 border border-[#edf3ee] dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-10 rounded-2xl grid place-items-center shrink-0 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/40 text-lg">
                        ⭐
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-[#14261e] dark:text-slate-100 truncate">
                            {chore.title}
                          </strong>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>

                        {chore.description && (
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 m-0 mt-0.5 line-clamp-1">
                            {chore.description}
                          </p>
                        )}

                        {chore.dueDate && (
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 dark:text-slate-500">
                            <span>Hạn: {formatDate(chore.dueDate)}</span>
                          </div>
                        )}

                        {chore.status === 'REJECTED' && chore.rejectionReason && (
                          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 m-0 mt-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-lg px-2 py-0.5">
                            Lý do cần làm lại: {chore.rejectionReason}
                          </p>
                        )}

                        {chore.status === 'FAILED' && chore.rejectionReason && (
                          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 m-0 mt-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-lg px-2 py-0.5">
                            Lý do không thành công: {chore.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <strong className="text-sm font-extrabold text-[#07543f] dark:text-emerald-400">
                        +{money(chore.rewardAmount)}
                      </strong>

                      {(chore.status === 'ASSIGNED' || chore.status === 'IN_PROGRESS') && (
                        <button
                          type="button"
                          onClick={() => submitChore(chore)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs transition shrink-0 cursor-pointer"
                        >
                          Báo xong ✓
                        </button>
                      )}

                      {chore.status === 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => submitChore(chore)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-[11px] font-bold shadow-2xs transition shrink-0 cursor-pointer flex items-center gap-1"
                          title="Bấm để báo cho bố mẹ sau khi đã hoàn thành làm lại nhiệm vụ"
                        >
                          <span>🔄</span>
                          <span>Đã làm lại</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Cột 2: Lịch sử xin tiền bố mẹ */}
        <section className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">📩</span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0 truncate">
                  Lịch sử xin tiền ({moneyRequests.length})
                </h3>
                <p className="text-[11px] text-[#718579] dark:text-slate-400 m-0 mt-0.5 truncate">
                  Trạng thái bố mẹ xét duyệt
                </p>
              </div>
            </div>

            {/* Filter Pill Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/90 border border-transparent dark:border-slate-700/60 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${activeTab === 'ALL' ? 'bg-white dark:bg-slate-700 text-[#07543f] dark:text-emerald-300 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PENDING')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${activeTab === 'PENDING' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('APPROVED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${activeTab === 'APPROVED' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Đã duyệt
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REJECTED')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${activeTab === 'REJECTED' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
              >
                Từ chối
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 max-h-[380px] pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">Đang tải lịch sử...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center gap-2">
                <span className="text-3xl">📭</span>
                <strong className="text-xs font-bold text-gray-700 dark:text-slate-200">
                  Chưa có yêu cầu xin tiền nào
                </strong>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 m-0">Khi em gửi yêu cầu xin tiền, trạng thái bố mẹ duyệt hay từ chối sẽ hiển thị ở đây.</p>
              </div>
            ) : (
              filteredRequests.map((item) => {
                const statusConfig = item.status === 'APPROVED'
                  ? { label: 'Đã duyệt', bg: 'bg-emerald-100 dark:bg-emerald-950/70 dark:border dark:border-emerald-800/60', text: 'text-emerald-700 dark:text-emerald-300', icon: '✓' }
                  : item.status === 'REJECTED'
                  ? { label: 'Từ chối', bg: 'bg-rose-100 dark:bg-rose-950/70 dark:border dark:border-rose-800/60', text: 'text-rose-700 dark:text-rose-300', icon: '✕' }
                  : { label: 'Chờ duyệt', bg: 'bg-amber-100 dark:bg-amber-950/70 dark:border dark:border-amber-800/60', text: 'text-amber-800 dark:text-amber-300', icon: '⏳' }

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#fafcfa] dark:bg-slate-800/80 border border-[#edf3ee] dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-2xs hover:border-gray-300 dark:hover:border-slate-600 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`size-10 rounded-2xl grid place-items-center shrink-0 ${statusConfig.bg} ${statusConfig.text} font-bold text-base`}>
                        {statusConfig.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-[#14261e] dark:text-slate-100 truncate">
                            {item.cleanDesc}
                          </strong>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                          <span>Xin tiền</span>
                          <span>·</span>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                        {item.status === 'REJECTED' && item.rejectionReason && (
                          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 m-0 mt-1">
                            Lý do: {item.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <strong className="text-sm font-extrabold shrink-0 text-[#07543f] dark:text-emerald-400">
                      +{money(item.amount)}
                    </strong>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

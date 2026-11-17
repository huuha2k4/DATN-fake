import { useEffect, useState } from 'react'
import { getStoredUser } from '../../auth/api/authApi'
import { groupApi, type ChildWalletResponse, type SpendRequestItem } from '../../group/api/groupApi'
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon'
import { useNavigate } from 'react-router-dom'
import kidAvatarBoy from '../../../assets/icons/kid_avatar_boy.png'

type Props = { onNotify: (message: string) => void }

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

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

export function ChildWalletScreen({ onNotify }: Props) {
  const user = getStoredUser()
  const groupId = user?.childWalletGroupId
  const walletId = user?.childWalletId
  const [wallet, setWallet] = useState<ChildWalletResponse | null>(null)
  const [requests, setRequests] = useState<SpendRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      onNotify('Không thể tải dữ liệu ví của bé')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Thống kê danh sách giao dịch đã duyệt
  const approvedItems = requests.filter(r => r.status === 'APPROVED')

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-6">
      {/* Hàng 1: Thẻ ví chính & Các nút điều hướng nhanh */}
      <div className="grid gap-5 lg:grid-cols-12 items-stretch">
        {/* Thẻ Ví Của Em (7 cột) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064232] via-[#07543f] to-[#0d7357] dark:from-[#04281e] dark:via-[#064232] dark:to-[#095843] p-6 text-white shadow-md flex flex-col justify-between min-h-[220px] border border-emerald-800/40 dark:border-emerald-700/30">
          <div className="absolute -right-12 -top-12 size-44 rounded-full bg-white/10 dark:bg-emerald-400/10 blur-xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 size-40 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-lg pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-white/20 dark:bg-white/15 backdrop-blur-md grid place-items-center border border-white/25 dark:border-white/20 shadow-inner overflow-hidden p-1">
                <img
                  src={kidAvatarBoy}
                  alt="avatar bé"
                  className="size-full object-contain"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-200 dark:text-emerald-300 tracking-wider uppercase block">
                  Ví tiền của em
                </span>
                <h1 className="text-lg font-black text-white m-0 leading-tight">
                  {wallet?.childName || user?.fullName || 'Bé'}
                </h1>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 dark:bg-white/15 backdrop-blur-md border border-white/25 text-emerald-100 shadow-sm flex items-center gap-1.5">
              <span>Finora Kids</span>
              <FinanceIcon name="spark" size={13} className="text-amber-300" />
            </span>
          </div>

          <div className="relative my-4">
            <span className="text-xs text-emerald-200/90 dark:text-emerald-300/90 font-medium block">Số dư khả dụng</span>
            <strong className="text-3xl sm:text-4xl font-black tracking-tight block mt-1 text-white">
              {loading ? '---' : money(wallet?.balance || 0)}
            </strong>
          </div>

          <div className="relative grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="size-8 rounded-xl bg-white/15 dark:bg-white/15 grid place-items-center text-emerald-200">
                <FinanceIcon name="gift" size={16} />
              </span>
              <div>
                <span className="text-emerald-200 dark:text-emerald-300 block text-[10px]">Trợ cấp tuần</span>
                <strong className="font-bold text-white text-xs">{money(wallet?.weeklyAllowance || 0)}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-8 rounded-xl bg-white/15 dark:bg-white/15 grid place-items-center text-emerald-200">
                <FinanceIcon name="shield" size={16} />
              </span>
              <div>
                <span className="text-emerald-200 dark:text-emerald-300 block text-[10px]">Hạn mức chi / ngày</span>
                <strong className="font-bold text-white text-xs">
                  {wallet?.spendLimitDaily ? money(wallet.spendLimitDaily) : 'Không giới hạn'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Khối Thao tác & Hành động nhanh (5 cột) */}
        <div className="lg:col-span-5 flex flex-col justify-stretch">
          <div className="rounded-3xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex-1 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Thao tác nhanh
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Finora</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 flex-1 items-stretch">
              <button
                type="button"
                onClick={() => navigate('/add-transaction')}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:bg-emerald-50/30 transition shadow-2xs cursor-pointer min-h-[96px] group"
              >
                <div className="size-11 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/60 grid place-items-center text-[#15803D] dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <FinanceIcon name="plus" size={20} />
                </div>
                <span>Ghi thu chi</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/child-requests')}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-blue-300 dark:hover:border-blue-700/60 hover:bg-blue-50/30 transition shadow-2xs cursor-pointer min-h-[96px] group"
              >
                <div className="size-11 rounded-xl bg-[#E0F2FE] dark:bg-sky-950/60 grid place-items-center text-[#0284C7] dark:text-sky-400 group-hover:scale-105 transition-transform">
                  <FinanceIcon name="gift" size={20} />
                </div>
                <span>Xin tiền bố mẹ</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/child-chores')}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-amber-300 dark:hover:border-amber-700/60 hover:bg-amber-50/30 transition shadow-2xs cursor-pointer min-h-[96px] group"
              >
                <div className="size-11 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/60 grid place-items-center text-[#D97706] dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <FinanceIcon name="star" size={20} />
                </div>
                <span>Làm nhiệm vụ</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/goals')}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-purple-300 dark:hover:border-purple-700/60 hover:bg-purple-50/30 transition shadow-2xs cursor-pointer min-h-[96px] group"
              >
                <div className="size-11 rounded-xl bg-[#F3E8FF] dark:bg-purple-950/60 grid place-items-center text-[#9333EA] dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <FinanceIcon name="piggy-bank" size={20} />
                </div>
                <span>Nuôi heo đất</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hàng 2: Lịch sử hoạt động ví của em */}
      <section className="rounded-3xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-[#14261e] dark:text-slate-100 m-0">
              Hoạt động ví gần đây
            </h2>
            <p className="text-[11px] text-[#718579] dark:text-slate-400 m-0 mt-0.5">
              Danh sách các khoản nạp, rút, thưởng nhiệm vụ và chi tiêu mua sắm của ví
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="text-xs font-bold text-[#07543f] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Xem tất cả →
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {loading ? (
            <div className="p-10 text-center text-xs text-gray-400 dark:text-slate-500">Đang tải lịch sử ví...</div>
          ) : approvedItems.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center gap-2">
              <span className="text-3xl">👛</span>
              <strong className="text-xs font-bold text-gray-700 dark:text-slate-200">Chưa có giao dịch nào</strong>
              <p className="text-[11px] text-gray-400 dark:text-slate-400 m-0">Hãy hoàn thành nhiệm vụ để nhận thưởng hoặc xin bố mẹ nạp ví nhé!</p>
            </div>
          ) : (
            approvedItems.slice(0, 5).map((item) => {
              const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ')
              const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ')
              const isGiftIncome = item.description?.startsWith('[INCOME_GIFT] ')
              const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ')
              const isGoalDeposit = item.description?.startsWith('[GOAL_DEPOSIT]') || item.description?.startsWith('[SAVINGS_DEPOSIT]') || item.description?.startsWith('[INVESTMENT_DEPOSIT]')
              const isGoalWithdraw = item.description?.startsWith('[GOAL_WITHDRAW]') || item.description?.startsWith('[SAVINGS_WITHDRAW]') || item.description?.startsWith('[INVESTMENT_WITHDRAW]')
              const isInc = isDeposit || isChoreReward || isGiftIncome || isMoneyReq || isGoalWithdraw

              let cleanTitle = item.description || 'Giao dịch'
              if (cleanTitle === 'Chi tiêu cá nhân của bé') {
                cleanTitle = 'Ăn uống / Mua sắm'
              }
              let subLabel = 'Chi tiêu'

              if (isDeposit) {
                cleanTitle = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`
                subLabel = 'Bố/mẹ nạp vào ví'
              } else if (isChoreReward) {
                cleanTitle = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`
                subLabel = 'Thưởng làm việc nhà'
              } else if (isGiftIncome) {
                cleanTitle = item.description.replace('[INCOME_GIFT] ', '')
                subLabel = 'Lì xì / Người thân cho'
              } else if (isMoneyReq) {
                cleanTitle = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`
                subLabel = 'Bố/mẹ đã cấp'
              } else if (isGoalDeposit || isGoalWithdraw) {
                cleanTitle = item.description.replace(/\[.*?\]\s*/g, '')
                subLabel = isGoalWithdraw ? 'Khoản thu · Rút từ heo đất' : 'Khoản chi · Nuôi heo đất'
              }

              const iconName =
                cleanTitle.toLowerCase().includes('tiết kiệm') ||
                cleanTitle.toLowerCase().includes('mục tiêu') ||
                cleanTitle.toLowerCase().includes('đầu tư') ||
                cleanTitle.toLowerCase().includes('quỹ') ||
                cleanTitle.toLowerCase().includes('tích lũy') ||
                isGoalDeposit ||
                isGoalWithdraw
                  ? 'piggy-bank'
                  : isDeposit
                  ? 'wallet'
                  : isChoreReward
                  ? 'award'
                  : isMoneyReq
                  ? 'coins'
                  : isGiftIncome
                  ? 'gift'
                  : resolveCategoryIconName(undefined, isInc ? 'INCOME' : 'EXPENSE', cleanTitle)

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#fafcfa] dark:bg-slate-800/80 border border-[#edf3ee] dark:border-slate-700/60 flex items-center justify-between gap-3 shadow-2xs hover:border-gray-300 dark:hover:border-slate-600 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`size-10 rounded-2xl grid place-items-center shrink-0 border border-gray-100 dark:border-slate-700 ${
                        isInc
                          ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-[#FEE2E2] text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      <FinanceIcon
                        name={iconName}
                        size={17}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="text-xs font-bold text-[#14261e] dark:text-slate-100 truncate block">
                        {cleanTitle}
                      </strong>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 block mt-0.5">
                        {subLabel} · {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <strong className={`text-sm font-extrabold shrink-0 ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isInc ? '+' : '-'}{money(item.amount)}
                  </strong>
                </div>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}

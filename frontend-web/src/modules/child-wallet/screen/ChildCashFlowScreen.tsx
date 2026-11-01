import { useEffect, useState } from 'react'
import { getStoredUser } from '../../auth/api/authApi'
import { groupApi, type SpendRequestItem } from '../../group/api/groupApi'

type Props = { onNotify: (message: string) => void; onAddTransaction: () => void }
const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`

export function ChildCashFlowScreen({ onNotify, onAddTransaction }: Props) {
  const user = getStoredUser()
  const [items, setItems] = useState<SpendRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user?.childWalletGroupId || !user?.childWalletId) return
    groupApi.getSpendRequests(user.childWalletGroupId, user.childWalletId)
      .then(setItems).catch(() => onNotify('Không thể tải lịch sử thu chi của ví'))
      .finally(() => setLoading(false))
  }, [])
  const moneyEvents = items.filter((item) => item.description.startsWith('[MONEY_REQUEST] ') && item.status === 'APPROVED')
  const expenses = items.filter((item) => !item.description.startsWith('[MONEY_REQUEST] '))
  const history = [...moneyEvents, ...expenses]
  return <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
    <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-black text-[#14261e]">Lịch sử thu & chi</h2><p className="text-sm text-slate-500">Các khoản thực tế của ví em</p></div><button onClick={onAddTransaction} className="rounded-xl bg-[#07543f] px-4 py-2 text-sm font-bold text-white">+ Thêm khoản chi</button></div>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {loading ? (
        <p className="p-10 text-center text-sm text-slate-400">Đang tải lịch sử...</p>
      ) : history.length ? (
        history.map((item) => {
          const isDeposit = item.description?.startsWith('[INCOME_DEPOSIT] ');
          const isChoreReward = item.description?.startsWith('[INCOME_CHORE] ');
          const isMoneyReq = item.description?.startsWith('[MONEY_REQUEST] ');
          const income = isDeposit || isChoreReward || isMoneyReq;

          let displayTitle = item.description;
          let subText = 'Khoản chi · Ví của em';

          if (isDeposit) {
            displayTitle = `Bố/mẹ nạp ví: ${item.description.replace('[INCOME_DEPOSIT] ', '')}`;
            subText = 'Khoản thu · Bố/mẹ nạp vào ví';
          } else if (isChoreReward) {
            displayTitle = `Thưởng nhiệm vụ: ${item.description.replace('[INCOME_CHORE] ', '')}`;
            subText = 'Khoản thu · Thưởng làm việc nhà';
          } else if (isMoneyReq) {
            displayTitle = `Bố/mẹ cấp tiền: ${item.description.replace('[MONEY_REQUEST] ', '')}`;
            subText = 'Khoản thu · Bố/mẹ đã cấp';
          }

          return (
            <div key={item.id} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0">
              <div>
                <strong className="text-[#14261e]">{displayTitle}</strong>
                <p className="mt-1 text-xs text-slate-500">{subText}</p>
              </div>
              <b className={income ? 'text-emerald-600' : 'text-rose-600'}>
                {income ? '+' : '-'}{money(item.amount)}
              </b>
            </div>
          );
        })
      ) : (
        <p className="p-10 text-center text-sm text-slate-400">Chưa có giao dịch nào.</p>
      )}
    </section>
  </main>
}

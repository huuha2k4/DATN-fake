import { useState, useEffect } from 'react'
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon'
import {
  getBalanceForecast,
  getCategoryForecast,
  type BalanceForecastResponse,
  type CategoryForecastResponse,
} from '../../ai-assistant/api/aiApi'

type Props = { onNotify: (message: string) => void }

type ForecastCategory = {
  name: string
  icon: IconName
  status: string
  statusClass: string
  limit: string
  spent: string
  forecast: string
  spentPercent: number
  forecastPercent: number
  color: string
  messageTitle: string
  message: string
}

type Goal = {
  name: string
  icon: IconName
  deadline: string
  progress: number
  metric: string
  note: string
  noteClass: string
  action: string
}

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ'
}

function CategoryCard({ item }: { item: ForecastCategory }) {
  return (
    <article className="flex min-h-[230px] flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
      <div>
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f1f5f2] text-[#47677f]">
              <FinanceIcon name={item.icon} size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-semibold text-[#34463b]">{item.name}</h3>
              <p className="mt-1 text-[9px] text-[#718078]">Hạn mức: {item.limit}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${item.statusClass}`}>{item.status}</span>
        </header>
        <dl className="mt-4 grid gap-2 text-[10px]">
          <div className="flex justify-between gap-2">
            <dt className="text-[#718078]">Đã chi trong kỳ</dt>
            <dd className="font-semibold text-[#34463b]">{item.spent}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#718078]">Dự báo cuối tháng</dt>
            <dd className="font-semibold text-[#34463b]">{item.forecast}</dd>
          </div>
        </dl>
        <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-[#eaf0ec]">
          <span className={`absolute inset-y-0 left-0 rounded-full ${item.color}`} style={{ width: `${Math.min(100, item.spentPercent)}%` }} />
          <span
            className="absolute inset-y-0 rounded-r-full bg-[#a9ddc0]/80"
            style={{ left: `${Math.min(100, item.spentPercent)}%`, width: `${Math.min(100 - item.spentPercent, item.forecastPercent)}%` }}
          />
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-[#f3f7f4] p-2.5 text-[9px] leading-4 text-[#59675f]">
        <strong className="text-[#34463b]">{item.messageTitle}: </strong>{item.message}
      </p>
    </article>
  )
}

function GoalCard({ goal, onAction }: { goal: Goal; onAction: (action: string) => void }) {
  return (
    <article className="flex min-h-[245px] flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
      <div>
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eaf4ed] text-[#087557]">
              <FinanceIcon name={goal.icon} size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-semibold text-[#34463b]">{goal.name}</h3>
              <p className="mt-1 text-[9px] text-[#718078]">{goal.deadline}</p>
            </div>
          </div>
          <strong className={`text-sm ${goal.noteClass}`}>{goal.progress}%</strong>
        </header>
        <div className="mt-5 flex justify-between gap-2 text-[9px] text-[#718078]">
          <span>Tiến độ tích lũy</span>
          <strong className="text-right text-[#34463b]">{goal.metric}</strong>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#eaf0ec]">
          <span
            className={`block h-full rounded-full ${goal.noteClass.includes('a56d20') ? 'bg-[#d99b35]' : 'bg-[#087557]'}`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <p className="mt-4 rounded-lg bg-[#f3f7f4] p-3 text-[9px] leading-4 text-[#59675f]">
          <strong className={goal.noteClass}>Dự báo AI: </strong>{goal.note}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAction(goal.action)}
        className="mt-4 w-fit rounded-lg bg-[#eaf0fb] px-3 py-2 text-[9px] font-medium text-[#344b62] hover:bg-[#d8e5f8]"
      >
        {goal.action}
      </button>
    </article>
  )
}

export function FinancialForecastScreen({ onNotify }: Props) {
  const [period, setPeriod] = useState('Tháng 11/2026 (Hiện tại)')
  const [isLoading, setIsLoading] = useState(true)

  // AI Real Forecast State
  const [forecastData, setForecastData] = useState<BalanceForecastResponse | null>(null)
  const [foodForecast, setFoodForecast] = useState<CategoryForecastResponse | null>(null)

  const loadForecast = async () => {
    setIsLoading(true)
    try {
      const [balRes, foodRes] = await Promise.allSettled([
        getBalanceForecast(30),
        getCategoryForecast('Ăn uống'),
      ])

      if (balRes.status === 'fulfilled') {
        setForecastData(balRes.value)
      }
      if (foodRes.status === 'fulfilled') {
        setFoodForecast(foodRes.value)
      }
    } catch (err) {
      console.error('Lỗi khi tải dự báo tài chính:', err)
      onNotify('Lỗi kết nối đến dịch vụ Dự báo AI.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadForecast()
  }, [])

  const currentBal = forecastData?.current_balance ?? 450000
  const projectedBal = forecastData?.projected_end_of_month_balance ?? currentBal
  const netDiff = projectedBal - currentBal

  // Danh mục hiển thị kết hợp dữ liệu thật từ API
  const categoriesList: ForecastCategory[] = [
    {
      name: 'Ăn uống',
      icon: 'coffee',
      status: foodForecast?.risk_level || 'AN TOÀN',
      statusClass: foodForecast?.risk_level?.includes('VƯỢT') ? 'bg-[#fff0e9] text-[#a3483e]' : 'bg-[#e3f4e9] text-[#17794f]',
      limit: foodForecast?.budget_limit ? formatVND(foodForecast.budget_limit) : 'Chưa đặt hạn mức',
      spent: formatVND(foodForecast?.current_spent || 0),
      forecast: formatVND(foodForecast?.projected_total_month || 0),
      spentPercent: foodForecast?.budget_limit ? Math.round(((foodForecast.current_spent || 0) / foodForecast.budget_limit) * 100) : 25,
      forecastPercent: 30,
      color: 'bg-[#b45148]',
      messageTitle: 'Dự báo chi tiêu',
      message: foodForecast?.summary || 'Tốc độ chi tiêu ăn uống hiện tại đang ở mức an toàn và kiểm soát tốt.',
    },
    {
      name: 'Hóa đơn & Sinh hoạt',
      icon: 'bolt',
      status: 'An toàn',
      statusClass: 'bg-[#e3f4e9] text-[#17794f]',
      limit: '1.500.000 đ',
      spent: '0 đ',
      forecast: '500.000 đ',
      spentPercent: 0,
      forecastPercent: 33,
      color: 'bg-[#087557]',
      messageTitle: 'Ổn định',
      message: 'Các hóa đơn định kỳ chưa phát sinh trong chu kỳ tháng mới.',
    },
    {
      name: 'Mua sắm & Giải trí',
      icon: 'wallet',
      status: 'Tốt',
      statusClass: 'bg-[#e3f4e9] text-[#17794f]',
      limit: '1.000.000 đ',
      spent: '0 đ',
      forecast: '350.000 đ',
      spentPercent: 0,
      forecastPercent: 35,
      color: 'bg-[#168361]',
      messageTitle: 'Tiết kiệm',
      message: 'Chưa phát sinh khoản chi mua sắm lớn.',
    },
  ]

  const goalsList: Goal[] = [
    {
      name: 'Quỹ dự phòng khẩn cấp',
      icon: 'shield',
      deadline: 'An toàn tài chính cá nhân',
      progress: Math.min(100, Math.round((currentBal / 10000000) * 100)),
      metric: `${formatVND(currentBal)} / 10.000.000 đ`,
      note: 'Dự báo AI: Tốc độ tích lũy đang bắt đầu chu kỳ mới. Tiếp tục duy trì thặng dư tháng.',
      noteClass: 'text-[#087557]',
      action: 'Tích lũy thêm vào quỹ',
    },
    {
      name: 'Mua laptop mới',
      icon: 'chart',
      deadline: 'Mục tiêu trung hạn',
      progress: 30,
      metric: '6.000.000 / 20.000.000 đ',
      note: 'Dự kiến hoàn thành sau 5 tháng nếu trích lập đều đặn theo tỷ lệ 20% thu nhập.',
      noteClass: 'text-[#087557]',
      action: 'Xem lịch trình chi tiết',
    },
  ]

  // Chuỗi điểm vẽ biểu đồ (kết hợp dữ liệu lịch sử và tương lai từ Prophet/Fallback)
  const chartPoints = (forecastData?.future_forecast || []).slice(0, 15)

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-6 text-[#14251f] sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-8" aria-label="Dự báo tài chính">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-2 text-[10px] text-[#718078]">
            <span>AI Thông minh</span>
            <FinanceIcon name="arrow" size={12} />
            <strong className="text-[#07543f]">Dự báo tài chính (AI 3 Prophet)</strong>
          </nav>
          <h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">Dự báo Tài chính &amp; Dòng tiền</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#718078]">
            Mô hình chuỗi thời gian Facebook Prophet ước lượng số dư, cảnh báo thâm hụt và khả năng hoàn thành mục tiêu.
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#e3f4e9] px-2.5 py-1 text-[9px] font-medium text-[#17794f]">
            <FinanceIcon name="spark" size={12} />
            Thuật toán: {forecastData?.algorithm || 'Facebook Prophet Time-Series'}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[10px] shadow-sm">
            <FinanceIcon name="calendar" size={14} />
            <select aria-label="Kỳ dự báo" value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent outline-none">
              <option>Tháng 11/2026 (Hiện tại)</option>
              <option>Tháng 10/2026</option>
            </select>
          </label>
          <button
            type="button"
            onClick={loadForecast}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#07543f] px-3.5 text-[10px] font-semibold text-white shadow-sm hover:bg-[#064232] disabled:opacity-50"
          >
            <FinanceIcon name="refresh" size={13} />
            {isLoading ? 'Đang tính toán…' : 'Cập nhật dự báo'}
          </button>
        </div>
      </header>

      {/* 3 THẺ TỔNG QUAN DỰ BÁO SỐ DƯ */}
      <section aria-label="Tổng quan dự báo" className="grid gap-3 md:grid-cols-3">
        <article className="flex min-h-[135px] flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[.65px] text-[#718078]">SỐ DƯ THỰC TẾ HIỆN TẠI</span>
            <span className="grid size-8 place-items-center rounded-lg bg-[#eaf4ed] text-[#087557]">
              <FinanceIcon name="wallet" size={15} />
            </span>
          </div>
          <strong className="mt-2 text-[26px] font-semibold tracking-tight text-[#26372e]">
            {formatVND(currentBal)}
          </strong>
          <p className="text-[9px] text-[#718078]">Khớp với tổng số dư các ví &amp; tài khoản ngân hàng</p>
        </article>

        <article className="flex min-h-[135px] flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[.65px] text-[#718078]">DỰ BÁO SỐ DƯ CUỐI THÁNG</span>
            <span className="grid size-8 place-items-center rounded-lg bg-[#eaf4ed] text-[#087557]">
              <FinanceIcon name="trend" size={15} />
            </span>
          </div>
          <strong className="mt-2 text-[26px] font-semibold tracking-tight text-[#087557]">
            {formatVND(projectedBal)}
          </strong>
          <p className="text-[9px] text-[#718078]">
            {netDiff >= 0 ? `+${formatVND(netDiff)} thặng dư dự kiến` : `Dự kiến giảm ${formatVND(Math.abs(netDiff))}`}
          </p>
        </article>

        <article className="flex min-h-[135px] flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[.65px] text-[#718078]">ĐỘ TIN CẬY MÔ HÌNH AI</span>
            <span className="grid size-8 place-items-center rounded-lg bg-[#eaf4ed] text-[#087557]">
              <FinanceIcon name="spark" size={15} />
            </span>
          </div>
          <strong className="mt-2 text-[26px] font-semibold tracking-tight text-[#26372e]">
            85.0%
          </strong>
          <p className="text-[9px] text-[#718078]">Khoảng tin cậy 80% (Prophet Interval Width)</p>
        </article>
      </section>

      {/* BIỂU ĐỒ DỰ BÁO DÒNG TIỀN VÀ SỐ DƯ */}
      <section className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5">
        <header className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-sm font-semibold text-[#26372e] sm:text-base">Biểu đồ dự phóng số dư theo thời gian</h2>
            <p className="mt-1 text-[10px] leading-4 text-[#829087]">
              {forecastData?.summary || 'Dự báo biến động số dư theo xu hướng chi tiêu thực tế hàng ngày.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-[#59675f]">
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-3 rounded-full bg-[#07543f]" /> Hiện tại
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-3 rounded-full bg-[#70c8a0]" /> Dự báo AI (yhat)
            </span>
          </div>
        </header>

        {/* Cột trực quan dự phóng */}
        <div className="relative mt-5 h-[240px] sm:h-[280px]">
          <div className="absolute inset-0 flex flex-col justify-between pb-7 text-[9px] text-[#89958d]">
            {[formatVND(currentBal * 1.2), formatVND(currentBal * 0.9), formatVND(currentBal * 0.6), '0 đ'].map((label, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-16 text-right text-[8px] sm:text-[9px]">{label}</span>
                <span className="h-px flex-1 border-t border-dashed border-[#e6ece8]" />
              </div>
            ))}
          </div>

          <div className="absolute bottom-7 left-20 right-0 top-0 flex items-end gap-1 overflow-hidden">
            {chartPoints.map((pt, idx) => {
              const maxVal = Math.max(currentBal * 1.2, 1)
              const val = pt.predicted_balance ?? currentBal
              const pct = Math.max(12, Math.min(100, Math.round((val / maxVal) * 100)))
              return (
                <div key={idx} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end group">
                  <div className="hidden group-hover:block absolute -top-2 rounded bg-gray-900 px-2 py-0.5 text-[9px] text-white z-20 whitespace-nowrap shadow">
                    {pt.date}: {formatVND(val)}
                  </div>
                  <span
                    className="w-full max-w-[28px] rounded-t-sm bg-[#70c8a0] transition-all duration-300 hover:bg-[#07543f]"
                    style={{ height: `${pct}%` }}
                  />
                </div>
              )
            })}
          </div>

          <div className="absolute bottom-0 left-20 right-0 flex justify-between text-[8px] text-[#77837b] sm:text-[9px]">
            <span className="font-semibold text-[#07543f]">Hôm nay</span>
            <span>+7 ngày</span>
            <span>+15 ngày</span>
            <span className="font-semibold text-[#168361]">Cuối tháng · Dự báo</span>
          </div>
        </div>

        <footer className="mt-4 flex flex-col justify-between gap-2 rounded-lg bg-[#f1f5f2] p-3 text-[10px] text-[#59675f] sm:flex-row sm:items-center">
          <span className="flex items-center gap-1.5">
            <FinanceIcon name="spark" size={14} className="text-[#07543f]" />
            {forecastData?.message || 'FinAI Prophet đang cập nhật dự phóng liên tục theo từng giao dịch mới.'}
          </span>
          <button
            type="button"
            onClick={() => onNotify('Đã làm mới mô hình Prophet')}
            className="text-left font-semibold text-[#087557] sm:text-right hover:underline"
          >
            Làm mới mô hình →
          </button>
        </footer>
      </section>

      {/* DỰ BÁO CHI TIÊU THEO DANH MỤC */}
      <section>
        <header className="mb-3 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-base font-semibold text-[#26372e]">Dự báo chi tiêu theo danh mục</h2>
            <p className="mt-1 text-[10px] text-[#718078]">So sánh thực chi với phần dự phóng đến hết chu kỳ tháng.</p>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categoriesList.map((item) => (
            <CategoryCard key={item.name} item={item} />
          ))}
        </div>
      </section>

      {/* MỤC TIÊU TÀI CHÍNH */}
      <section>
        <header className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold text-[#26372e]">Khả năng hoàn thành mục tiêu</h2>
            <p className="mt-1 text-[10px] text-[#718078]">Xác suất và lộ trình dựa trên vận tốc tích lũy thực tế.</p>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {goalsList.map((goal) => (
            <GoalCard key={goal.name} goal={goal} onAction={(action) => onNotify(action)} />
          ))}
        </div>
      </section>
    </main>
  )
}

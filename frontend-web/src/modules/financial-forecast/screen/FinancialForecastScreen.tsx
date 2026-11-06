import { useState, useEffect } from 'react'
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon'
import {
  getBalanceForecast,
  getTopCategoryForecasts,
  getGoalsForecast,
  type BalanceForecastResponse,
  type CategoryForecastResponse,
  type GoalForecastResponse,
} from '../../ai-assistant/api/aiApi'

type Props = { onNotify: (message: string) => void }

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ'
}

export function FinancialForecastScreen({ onNotify }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; val: number; x: number; y: number } | null>(null)

  // AI Real Forecast State (100% từ mô hình AI thật)
  const [balanceForecast, setBalanceForecast] = useState<BalanceForecastResponse | null>(null)
  const [categoryForecasts, setCategoryForecasts] = useState<CategoryForecastResponse[]>([])
  const [goalsForecast, setGoalsForecast] = useState<GoalForecastResponse | null>(null)

  const loadForecast = async (showFeedback = false) => {
    setIsLoading(true)
    try {
      const [balRes, categoriesRes, goalRes] = await Promise.allSettled([
        getBalanceForecast(30),
        getTopCategoryForecasts(3),
        getGoalsForecast(),
      ])

      if (balRes.status === 'fulfilled') {
        setBalanceForecast(balRes.value)
      }
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.status === 'success') {
        setCategoryForecasts(categoriesRes.value.forecasts)
      } else {
        setCategoryForecasts([])
      }
      if (goalRes.status === 'fulfilled') {
        setGoalsForecast(goalRes.value)
      }
      if (showFeedback) {
        onNotify('Đã cập nhật dự báo từ dữ liệu tài chính mới nhất.')
      }
    } catch (err) {
      console.error('Lỗi khi tải dự báo tài chính:', err)
      onNotify('Không thể kết nối đến AI Service.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadForecast()
  }, [])

  const currentBal = balanceForecast?.current_balance ?? 0
  const projectedBal = balanceForecast?.projected_end_of_month_balance ?? currentBal
  const netDiff = projectedBal - currentBal
  const chartPoints = (balanceForecast?.future_forecast || balanceForecast?.forecast_points || []).slice(0, 15)

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] dark:bg-[#07131d] px-3 pb-24 pt-4 text-[#14251f] dark:text-[#e2eaf0] sm:px-[22px] lg:px-[34px] lg:pb-10" aria-label="Dự báo tài chính">
      {/* 3 THẺ TỔNG QUAN DỰ BÁO SỐ DƯ TỪ AI */}
      <section aria-label="Tổng quan dự báo" className="grid gap-3.5 md:grid-cols-3">
        <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-5 shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all hover:border-[#cbd5e1] dark:hover:border-[#2b5170]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[.7px] text-[#64748b] dark:text-[#94a3b8]">SỐ DƯ THỰC TẾ HIỆN TẠI</span>
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf4ed] dark:bg-[#163f39] text-[#087557] dark:text-[#34d399] shadow-inner">
              <FinanceIcon name="wallet" size={17} />
            </span>
          </div>
          <strong className="mt-2 text-[28px] font-bold tracking-tight text-[#1e293b] dark:text-white">
            {formatVND(currentBal)}
          </strong>
          <span className="text-[11px] text-[#64748b] dark:text-[#8fa7b7]">Tổng hợp từ tất cả ví cá nhân</span>
        </article>

        <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-5 shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all hover:border-[#cbd5e1] dark:hover:border-[#2b5170]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[.7px] text-[#64748b] dark:text-[#94a3b8]">DỰ BÁO SỐ DƯ CUỐI THÁNG</span>
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf0fb] dark:bg-[#153e5c] text-[#3b82f6] dark:text-[#38bdf8] shadow-inner">
              <FinanceIcon name="spark" size={17} />
            </span>
          </div>
          <strong className="mt-2 text-[28px] font-bold tracking-tight text-[#07543f] dark:text-[#34d399]">
            {formatVND(projectedBal)}
          </strong>
          <span className="text-[11px] text-[#64748b] dark:text-[#8fa7b7]">
            {balanceForecast?.projected_range
              ? `Khoảng dao động: ${formatVND(balanceForecast.projected_range.lower)} ~ ${formatVND(balanceForecast.projected_range.upper)}`
              : 'Ước lượng theo xu hướng chi tiêu'}
          </span>
        </article>

        <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-5 shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all hover:border-[#cbd5e1] dark:hover:border-[#2b5170]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[.7px] text-[#64748b] dark:text-[#94a3b8]">BIẾN ĐỘNG DÒNG TIỀN DỰ KIẾN</span>
            <span className="grid size-9 place-items-center rounded-xl bg-[#f0fdf4] dark:bg-[#174431] text-[#10b981] dark:text-[#34d399] shadow-inner">
              <FinanceIcon name="trend" size={17} />
            </span>
          </div>
          <strong className={`mt-2 text-[28px] font-bold tracking-tight ${netDiff >= 0 ? 'text-[#087557] dark:text-[#34d399]' : 'text-[#e11d48]'}`}>
            {netDiff >= 0 ? `+${formatVND(netDiff)}` : `-${formatVND(Math.abs(netDiff))}`}
          </strong>
          <span className="text-[11px] text-[#64748b] dark:text-[#8fa7b7]">
            {netDiff >= 0 ? 'Dự kiến thặng dư vào cuối chu kỳ' : 'Dự kiến suy giảm số dư do chi tiêu'}
          </span>
        </article>
      </section>

      {/* BIỂU ĐỒ CHUỖI THỜI GIAN AI (TIME-SERIES CHART) */}
      <section className="rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-4 shadow-sm dark:shadow-[0_12px_28px_rgba(0,0,0,0.38)] sm:p-5">
        <header className="flex flex-col justify-between gap-3 border-b border-[#edf0ed] dark:border-[#1a3449] pb-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[#1e293b] dark:text-[#f8fafc]">Đồ thị Dự phóng Số dư Ví (15 ngày tới)</h2>
            <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
              {balanceForecast?.summary || 'Dự báo biến động số dư theo xu hướng chi tiêu thực tế hàng ngày.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadForecast(true)}
            disabled={isLoading}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#07543f] px-3 text-[11px] font-semibold text-white transition hover:bg-[#064a36] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FinanceIcon name="refresh" size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Đang tính...' : 'Cập nhật dự báo'}
          </button>
        </header>

        {chartPoints.length > 0 ? (() => {
          const values = chartPoints.map((pt) => pt.predicted_balance ?? currentBal)
          const rawMin = Math.min(...values, currentBal)
          const rawMax = Math.max(...values, currentBal)
          // Để đồ thị dao động nhịp nhàng, rõ đường lên xuống như bảng chứng khoán
          const diff = rawMax - rawMin
          const margin = diff > 0 ? diff * 0.35 : Math.max(rawMax * 0.05, 100000)
          const yMin = Math.max(0, rawMin - margin)
          const yMax = rawMax + margin
          const yRange = yMax - yMin || 1

          const svgWidth = 800
          const svgHeight = 220
          const padLeft = 20
          const padRight = 20
          const padTop = 30
          const padBottom = 30
          const plotW = svgWidth - padLeft - padRight
          const plotH = svgHeight - padTop - padBottom

          const coords = chartPoints.map((pt, idx) => {
            const val = pt.predicted_balance ?? currentBal
            const x = padLeft + (idx / Math.max(chartPoints.length - 1, 1)) * plotW
            const y = padTop + plotH - ((val - yMin) / yRange) * plotH
            return { x, y, val, date: pt.date }
          })

          // Tạo đường cong Bezier mềm mại (Spline) cho giống TradingView / Bảng chứng khoán
          let linePath = ''
          if (coords.length > 0) {
            linePath = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`
            for (let i = 0; i < coords.length - 1; i++) {
              const curr = coords[i]
              const next = coords[i + 1]
              const cp1x = curr.x + (next.x - curr.x) / 2
              const cp1y = curr.y
              const cp2x = curr.x + (next.x - curr.x) / 2
              const cp2y = next.y
              linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`
            }
          }

          const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`

          return (
            <div className="relative mt-5">
              {/* Thanh Header đồ thị: Chỉ số Đỉnh - Đáy & Biến động */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f8faf9] dark:bg-[#071926] px-3.5 py-2.5 border border-[#edf0ed] dark:border-[#132c3f] text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Cao nhất:</span>
                  <strong className="text-[#07543f] dark:text-[#34d399] font-semibold">{formatVND(rawMax)}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#0284c7] shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Thấp nhất:</span>
                  <strong className="text-[#0284c7] dark:text-[#38bdf8] font-semibold">{formatVND(rawMin)}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Biên độ:</span>
                  <strong className={`font-semibold ${rawMax >= rawMin ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                    {rawMax - rawMin > 0 ? `+${formatVND(rawMax - rawMin)}` : formatVND(rawMax - rawMin)}
                  </strong>
                </div>
              </div>

              {/* Khung đồ thị chứng khoán chuyên nghiệp */}
              <div className="relative w-full h-[230px] sm:h-[270px] select-none mt-2 rounded-xl bg-gradient-to-b from-[#f8faf9]/50 to-white dark:from-[#081b29] dark:to-[#05121b] border border-[#e2e8f0]/60 dark:border-[#132c3f] p-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id="tradingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                      <stop offset="50%" stopColor="#10b981" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="tradingLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="40%" stopColor="#10b981" />
                      <stop offset="80%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#6ee7b7" />
                    </linearGradient>
                    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
                    </filter>
                  </defs>

                  {/* Lưới ngang Gridlines mờ sang trọng */}
                  {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                    const y = padTop + plotH * ratio
                    return (
                      <line
                        key={idx}
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="currentColor"
                        className="text-[#cbd5e1]/40 dark:text-[#18364d]/60"
                        strokeDasharray="5 5"
                        strokeWidth="1"
                      />
                    )
                  })}

                  {/* Vùng bóng mờ gradient chuyển sắc */}
                  <path d={areaPath} fill="url(#tradingAreaGrad)" />

                  {/* Đường sóng lượn chứng khoán Neon Glow */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#tradingLineGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#neonGlow)"
                  />

                  {/* Cột mốc hover và đường ngắm dọc (crosshair line) */}
                  {hoveredPoint && (
                    <line
                      x1={(hoveredPoint.x / 100) * svgWidth}
                      y1={padTop}
                      x2={(hoveredPoint.x / 100) * svgWidth}
                      y2={padTop + plotH}
                      stroke="#38bdf8"
                      strokeDasharray="3 3"
                      strokeWidth="1.2"
                      className="opacity-70"
                    />
                  )}

                  {/* Các điểm nút (Nodes) phát sáng tinh gọn */}
                  {coords.map((c, idx) => {
                    const isHovered = hoveredPoint?.date === c.date
                    return (
                      <g key={idx} className="cursor-pointer">
                        {/* Vùng bắt chuột rộng rãi */}
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r="16"
                          fill="transparent"
                          onMouseEnter={() => setHoveredPoint({ date: c.date, val: c.val, x: (c.x / svgWidth) * 100, y: (c.y / svgHeight) * 100 })}
                        />
                        {/* Chấm tròn biểu diễn */}
                        {isHovered ? (
                          <>
                            <circle cx={c.x} cy={c.y} r="8" fill="#10b981" opacity="0.3" className="animate-ping" />
                            <circle cx={c.x} cy={c.y} r="5" fill="#34d399" stroke="#ffffff" strokeWidth="2" />
                          </>
                        ) : (
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r="3"
                            className="fill-[#10b981] dark:fill-[#34d399] transition-transform hover:scale-150"
                          />
                        )}
                      </g>
                    )
                  })}
                </svg>

                {/* Tooltip phong cách sàn chứng khoán / Crypto */}
                {hoveredPoint && (
                  <div
                    className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-xl bg-[#0b1b28]/95 border border-[#1e4460] px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md transition-all duration-75"
                    style={{
                      left: `${Math.min(92, Math.max(8, hoveredPoint.x))}%`,
                      top: `${Math.max(4, hoveredPoint.y - 6)}%`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-[#38bdf8] font-medium">
                      <span className="size-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
                      <span>{hoveredPoint.date}</span>
                    </div>
                    <div className="mt-1 text-sm font-extrabold tracking-tight text-white flex items-baseline gap-1">
                      <span>{formatVND(hoveredPoint.val)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mốc thời gian trục X */}
              <div className="mt-2.5 flex justify-between px-2 text-[10px] font-medium text-[#718078] dark:text-[#8fa7b7]">
                <span className="text-[#07543f] dark:text-[#34d399] font-bold">Hôm nay</span>
                <span>+5 ngày</span>
                <span>+10 ngày</span>
                <span className="text-[#10b981] dark:text-[#38bdf8] font-bold">Dự báo 15 ngày tới</span>
              </div>
            </div>
          )
        })() : (
          <div className="py-12 text-center text-xs text-[#718078] dark:text-[#8fa7b7]">
            Đang tải dữ liệu chuỗi thời gian từ mô hình Prophet...
          </div>
        )}
      </section>

      {/* DỰ BÁO CHI TIÊU DANH MỤC THỰC TẾ (ĂN UỐNG) */}
      {categoryForecasts.length > 0 && (
        <section>
          <header className="mb-3">
            <h2 className="text-base font-semibold text-[#26372e] dark:text-[#f8fafc]">Dự báo chi tiêu Danh mục Thực tế</h2>
            <p className="mt-1 text-[10px] text-[#718078] dark:text-[#8fa7b7]">
              Phân tích tốc độ chi tiêu theo chu kỳ tháng và đối soát ngân sách.
            </p>
          </header>
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {categoryForecasts.map((categoryForecast) => (
            <article key={categoryForecast.category_name} className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-5 shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
              <div>
                <header className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-9 place-items-center rounded-lg"
                      style={{
                        backgroundColor: `${categoryForecast.category_color || '#b45148'}20`,
                        color: categoryForecast.category_color || '#b45148',
                      }}
                    >
                      <FinanceIcon name={resolveCategoryIconName(categoryForecast.category_icon || undefined, 'EXPENSE', categoryForecast.category_name)} size={16} />
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold text-[#34463b] dark:text-[#e2eaf0]">{categoryForecast.category_name}</h3>
                      <p className="mt-0.5 text-[9px] text-[#718078] dark:text-[#8fa7b7]">
                        Hạn mức: {categoryForecast.budget_limit ? formatVND(categoryForecast.budget_limit) : 'Chưa đặt hạn mức'}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold ${categoryForecast.risk_level?.includes('VƯỢT') ? 'bg-[#fff0e9] text-[#b45148]' : 'bg-[#e3f4e9] text-[#087557]'}`}>
                    {categoryForecast.risk_level || 'AN TOÀN'}
                  </span>
                </header>

                <div className="mt-4 grid gap-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#718078] dark:text-[#8fa7b7]">Đã chi trong tháng:</span>
                    <strong className="text-[#26372e] dark:text-[#f8fafc]">{formatVND(categoryForecast.current_spent || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718078] dark:text-[#8fa7b7]">Dự báo tổng chi cả tháng:</span>
                    <strong style={{ color: categoryForecast.category_color || '#b45148' }}>{formatVND(categoryForecast.projected_total_month || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718078] dark:text-[#8fa7b7]">Tốc độ chi trung bình:</span>
                    <span className="text-[#59675f] dark:text-[#cbd5e1]">{formatVND(categoryForecast.daily_rate || 0)}/ngày</span>
                  </div>
                </div>

                <p className="mt-3 rounded-lg bg-[#f8faf9] dark:bg-[#122838] p-2.5 text-[10px] leading-4 text-[#59675f] dark:text-[#cbd5e1]">
                  💡 {categoryForecast.summary}
                </p>
              </div>
            </article>
            ))}
          </div>
        </section>
      )}

      {/* DỰ BÁO TIẾN ĐỘ MỤC TIÊU TÀI CHÍNH THỰC TẾ TỪ AI */}
      {goalsForecast && goalsForecast.goals && goalsForecast.goals.length > 0 && (
        <section>
          <header className="mb-3">
            <h2 className="text-base font-semibold text-[#26372e] dark:text-[#f8fafc]">Dự báo Khả năng Hoàn thành Mục tiêu</h2>
            <p className="mt-1 text-[10px] text-[#718078] dark:text-[#8fa7b7]">
              {goalsForecast.summary || 'Ước tính thời gian đạt mục tiêu dựa trên thặng dư tiết kiệm trung bình hàng tháng.'}
            </p>
          </header>
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {goalsForecast.goals.map((g) => (
              <article key={g.goal_id} className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-5 shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                <div>
                  <header className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-[#eaf4ed] dark:bg-[#15454b] text-[#087557] dark:text-[#5eead4]">
                        <FinanceIcon name="shield" size={16} />
                      </span>
                      <div>
                        <h3 className="text-xs font-semibold text-[#34463b] dark:text-[#e2eaf0]">{g.name}</h3>
                        <p className="mt-0.5 text-[9px] text-[#718078] dark:text-[#8fa7b7]">
                          Dự kiến xong: <strong>{g.estimated_completion_month}</strong>
                        </p>
                      </div>
                    </div>
                    <strong className="text-sm font-bold text-[#087557] dark:text-[#5eead4]">{g.progress_pct}%</strong>
                  </header>

                  <div className="mt-4 flex justify-between text-[10px] text-[#718078] dark:text-[#8fa7b7]">
                    <span>Tiến độ tích lũy:</span>
                    <strong className="text-[#34463b] dark:text-[#e2eaf0]">
                      {formatVND(g.current_amount)} / {formatVND(g.target_amount)}
                    </strong>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ee] dark:bg-[#1e3a4e]">
                    <span
                      className="block h-full rounded-full bg-[#10b981]"
                      style={{ width: `${Math.min(100, g.progress_pct)}%` }}
                    />
                  </div>

                  <p className="mt-3 rounded-lg bg-[#f8faf9] dark:bg-[#122838] p-2.5 text-[10px] text-[#59675f] dark:text-[#cbd5e1]">
                    🎯 Còn thiếu {formatVND(g.remaining_amount)}. Cần khoảng <strong>{g.months_needed} tháng</strong> với tốc độ tiết kiệm hiện tại.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

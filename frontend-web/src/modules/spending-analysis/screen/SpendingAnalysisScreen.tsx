import { useState, useEffect } from 'react'
import { FinanceIcon } from '../../core/components/FinanceIcon'
import {
  getBehaviorProfile,
  getSpendingAnomalies,
  getAiRecommendations,
  type BehaviorProfileResponse,
  type AnomalyItem,
  type RecommendationResponse,
} from '../../ai-assistant/api/aiApi'

type Props = { onNotify: (message: string) => void }

const tabs = [
  { id: 'overview', label: 'Hồ sơ Persona & Chỉ số' },
  { id: 'spending', label: 'Cơ cấu Danh mục' },
  { id: 'anomalies', label: 'Giao dịch Bất thường' },
  { id: 'recommendations', label: 'Khuyến nghị FinAI' },
] as const

type TabId = (typeof tabs)[number]['id']

function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ'
}

export function SpendingAnalysisScreen({ onNotify }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isLoading, setIsLoading] = useState(true)

  // Real AI State
  const [profile, setProfile] = useState<BehaviorProfileResponse | null>(null)
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [profileData, anomaliesData, recsData] = await Promise.allSettled([
        getBehaviorProfile(),
        getSpendingAnomalies(),
        getAiRecommendations(),
      ])

      if (profileData.status === 'fulfilled') {
        setProfile(profileData.value)
      }
      if (anomaliesData.status === 'fulfilled') {
        setAnomalies(anomaliesData.value || [])
      }
      if (recsData.status === 'fulfilled') {
        setRecommendations(recsData.value)
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu AI:', err)
      onNotify('Không thể kết nối đến AI Service, vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const refreshAnalysis = async () => {
    await loadData()
    onNotify('Phân tích hành vi AI đã được cập nhật thành công!')
  }

  const persona = profile?.persona
  const r50 = profile?.rule_50_30_20
  const dining = profile?.dining_analysis
  const radar = profile?.radar_scores
  const findings = profile?.findings || []

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] dark:bg-[#07131d] px-3 pb-24 pt-4 text-[#14251f] dark:text-[#e2eaf0] sm:gap-6 sm:px-[22px] lg:px-[34px] lg:pb-10" aria-label="Phân tích hành vi chi tiêu">
      {/* Thanh điều khiển: 4 Tab dàn trải rộng rãi + Nút làm mới phân tích AI ngang hàng */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-1 rounded-xl bg-[#eaf0fb] dark:bg-[#102334] p-1 border border-[#d6e3f5] dark:border-[#1e3c54] shadow-sm dark:shadow-[0_4px_14px_rgba(0,0,0,0.25)]" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg py-2 px-3 text-xs sm:text-[13px] transition-all cursor-pointer text-center font-medium ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#1c3850] text-[#07543f] dark:text-[#38bdf8] shadow-sm font-bold border border-transparent dark:border-[#2d5272]'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#07543f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={refreshAnalysis}
          disabled={isLoading}
          className="inline-flex h-[38px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#07543f] dark:bg-[#10b981] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#064232] dark:hover:bg-[#059669] disabled:opacity-50 transition cursor-pointer"
        >
          <FinanceIcon name="refresh" size={14} />
          {isLoading ? 'Đang phân tích dữ liệu…' : 'Làm mới phân tích AI'}
        </button>
      </div>

      {/* TRẠNG THÁI ĐANG PHÂN TÍCH DỮ LIỆU TỪ AI */}
      {isLoading && !profile ? (
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-[#e2e8f0] dark:border-[#1e3c54] bg-white dark:bg-[#102334] p-8 text-center shadow-sm dark:shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
          <div className="relative mb-4 grid size-16 place-items-center rounded-2xl bg-emerald-500/10 text-[#10b981]">
            <span className="size-8 rounded-full border-3 border-[#10b981] border-t-transparent animate-spin" />
          </div>
          <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
            FinAI đang phân tích hồ sơ & hành vi chi tiêu...
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            Hệ thống đang trích xuất dữ liệu giao dịch thực tế, đối soát quy tắc 50/30/20 và quét phát hiện bất thường qua Isolation Forest. Vui lòng chờ giây lát!
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
        {/* TAB 1: PERSONA & CHỈ SỐ RADAR */}
        {activeTab === 'overview' && (
          <>
            {persona && (
              <section className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-gradient-to-r from-[#063d31] to-[#0a664d] p-5 text-white shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl shadow-inner backdrop-blur">
                      {persona.icon || '⚖️'}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                          Hình mẫu tài chính (Persona)
                        </span>
                        {profile?.status === 'COLD_START' && (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[8px] font-semibold text-amber-300">
                            Đang tích lũy giao dịch
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 text-xl font-bold tracking-tight">{persona.title}</h2>
                      <p className="mt-1 text-xs text-white/90 font-medium">{persona.tagline}</p>
                      <p className="mt-2 text-[11px] leading-5 text-white/80 max-w-2xl">{persona.description}</p>
                    </div>
                  </div>

                  {/* Radar summary stats từ AI thật */}
                  {radar && (
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/10 p-3 text-center text-xs backdrop-blur min-w-[200px]">
                      <div className="border-r border-white/10 pr-2">
                        <span className="block text-[9px] text-white/70">Kỷ luật tích lũy</span>
                        <strong className="text-base font-bold text-emerald-300">{radar.savings_discipline}/100</strong>
                      </div>
                      <div className="pl-2">
                        <span className="block text-[9px] text-white/70">Cân đối thiết yếu</span>
                        <strong className="text-base font-bold text-sky-300">{radar.needs_control}/100</strong>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* CÁC PHÁT HIỆN HÀNH VI TỪ AI (FINDINGS) */}
            {findings.length > 0 && (
              <section className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm">
                <header className="mb-3 flex items-center gap-2 border-b border-[#edf0ed] dark:border-[#1e3a4e] pb-2.5">
                  <span className="grid size-7 place-items-center rounded-lg bg-[#e3f4e9] dark:bg-[#0f494c] text-[#087557] dark:text-[#5eead4]">
                    <FinanceIcon name="spark" size={14} />
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#26372e] dark:text-[#f8fafc]">
                    Đặc trưng thói quen chi tiêu được AI phát hiện
                  </h3>
                </header>
                <div className="grid gap-2 sm:grid-cols-2">
                  {findings.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-[#f8faf9] dark:bg-[#122838] p-2.5 text-[11px] text-[#34463b] dark:text-[#cbd5e1]">
                      <span className="size-1.5 rounded-full bg-[#10b981] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3 CHỈ SỐ QUAN TRỌNG: 50/30/20, ĂN UỐNG, HEALTH SCORE */}
            <section className="grid gap-3 md:grid-cols-3">
              {/* Thẻ 1: Ăn uống */}
              {dining && (
                <article className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[.6px] text-[#718078] dark:text-[#8fa7b7]">CHI TIÊU ĂN UỐNG</span>
                    <span className="grid size-9 place-items-center rounded-lg bg-[#fff0e9] dark:bg-[#341816] text-[#b45148]">
                      <FinanceIcon name="coffee" size={16} />
                    </span>
                  </div>
                  <strong className="mt-3 block text-[24px] font-semibold text-[#26372e] dark:text-[#f8fafc]">
                    {formatVND(dining.dining_amount)}
                  </strong>
                  <p className="mt-1 text-[10px] text-[#718078] dark:text-[#8fa7b7]">
                    Chiếm <strong className="text-[#b45148]">{dining.dining_percentage}%</strong> tổng chi tiêu
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eaf0ec] dark:bg-[#1e3a4e]">
                    <span
                      className="block h-full rounded-full bg-[#b45148]"
                      style={{ width: `${Math.min(100, dining.dining_percentage)}%` }}
                    />
                  </div>
                </article>
              )}

              {/* Thẻ 2: Tỷ lệ tích lũy & Quy tắc 50/30/20 */}
              {r50 && (
                <article className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[.6px] text-[#718078] dark:text-[#8fa7b7]">QUY TẮC 50/30/20</span>
                    <span className="grid size-9 place-items-center rounded-lg bg-[#eaf0fb] dark:bg-[#153448] text-[#3b82f6]">
                      <FinanceIcon name="trend" size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <strong className="text-[24px] font-semibold text-[#26372e] dark:text-[#f8fafc]">
                      {r50.savings_pct}%
                    </strong>
                    <span className="text-xs text-[#718078] dark:text-[#8fa7b7]">Tích lũy</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#718078] dark:text-[#8fa7b7]">
                    Thiết yếu: {r50.needs_pct}% | Hưởng thụ: {r50.wants_pct}%
                  </p>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#eaf0ec] dark:bg-[#1e3a4e]">
                    <span className="bg-[#087557]" style={{ width: `${r50.needs_pct}%` }} title="Thiết yếu" />
                    <span className="bg-[#f59e0b]" style={{ width: `${r50.wants_pct}%` }} title="Hưởng thụ" />
                    <span className="bg-[#38bdf8]" style={{ width: `${r50.savings_pct}%` }} title="Tích lũy" />
                  </div>
                </article>
              )}

              {/* Thẻ 3: Điểm sức khỏe tài chính */}
              {recommendations && (
                <article className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[.6px] text-[#718078] dark:text-[#8fa7b7]">SỨC KHỎE TÀI CHÍNH</span>
                    <span className="grid size-9 place-items-center rounded-lg bg-[#e3f4e9] dark:bg-[#0f494c] text-[#087557] dark:text-[#5eead4]">
                      <FinanceIcon name="shield" size={16} />
                    </span>
                  </div>
                  <strong className="mt-3 block text-[24px] font-semibold text-[#087557] dark:text-[#34d399]">
                    {recommendations.health_score}/100
                  </strong>
                  <p className="mt-1 text-[10px] text-[#718078] dark:text-[#8fa7b7]">
                    Đánh giá: <strong>{recommendations.health_rating}</strong>
                  </p>
                  <p className="mt-2 text-[10px] text-[#59675f] dark:text-[#cbd5e1] line-clamp-2">
                    {recommendations.overall_advice}
                  </p>
                </article>
              )}
            </section>
          </>
        )}

        {/* TAB 2: CƠ CẤU DANH MỤC THỰC TẾ */}
        {activeTab === 'spending' && (
          <section className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm sm:p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0ed] dark:border-[#1e3a4e] pb-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#26372e] dark:text-[#f8fafc]">
                <span className="grid size-8 place-items-center rounded-lg bg-[#e3f4e9] dark:bg-[#0f494c] text-[#087557] dark:text-[#5eead4]">
                  <FinanceIcon name="chart" size={15} />
                </span>
                Phân bổ chi tiêu theo danh mục thực tế
              </h2>
              <span className="text-[10px] text-[#829087] dark:text-[#8fa7b7]">Dữ liệu thật trích xuất từ database</span>
            </header>

            {profile?.top_categories && profile.top_categories.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {profile.top_categories.map((cat, idx) => {
                  const catName = cat.category_name || (cat as any).category || 'Danh mục'
                  const catAmount = cat.total_amount ?? (cat as any).amount ?? 0
                  const catPercent = cat.percentage ?? 0
                  return (
                    <article key={cat.category_id || idx} className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0e2230] p-4 shadow-sm">
                      <header className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f2] dark:bg-[#153448] text-[#07543f] dark:text-[#38bdf8]">
                            <FinanceIcon name="wallet" size={16} />
                          </span>
                          <div>
                            <h3 className="text-xs font-semibold text-[#34463b] dark:text-[#e2eaf0]">{catName}</h3>
                            <p className="mt-0.5 text-[9px] text-[#829087] dark:text-[#8fa7b7]">{catPercent}% tổng chi</p>
                          </div>
                        </div>
                      </header>
                      <div className="mt-4 flex justify-between text-[11px]">
                        <span className="text-[#718078] dark:text-[#8fa7b7]">Số tiền đã chi:</span>
                        <strong className="text-[#34463b] dark:text-[#f8fafc]">{formatVND(catAmount)}</strong>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ee] dark:bg-[#1e3a4e]">
                        <span
                          className="block h-full rounded-full bg-[#087557] dark:bg-[#10b981]"
                          style={{ width: `${Math.min(100, catPercent)}%` }}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-[#f8faf9] dark:bg-[#091722] p-8 text-center text-xs text-[#718078] dark:text-[#8fa7b7]">
                Chưa có danh mục nào phát sinh giao dịch trong kỳ. Khi bạn thêm giao dịch, AI sẽ tự động phân bổ tại đây!
              </div>
            )}
          </section>
        )}

        {/* TAB 3: GIAO DỊCH BẤT THƯỜNG (AI ISOLATION FOREST) */}
        {activeTab === 'anomalies' && (
          <section className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm sm:p-5">
            <header className="flex items-center justify-between border-b border-[#edf0ed] dark:border-[#1e3a4e] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-[#fff0e9] dark:bg-[#341816] text-[#b45148]">
                  <FinanceIcon name="expense" size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#26372e] dark:text-[#f8fafc] sm:text-base">
                    Phát hiện giao dịch bất thường (Isolation Forest)
                  </h2>
                  <p className="text-[10px] text-[#829087] dark:text-[#8fa7b7]">
                    Quét toàn bộ lịch sử chi tiêu để phát hiện các giao dịch đột biến về số tiền hoặc thời điểm giờ khuya
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#f1f5f2] dark:bg-[#153448] px-2.5 py-1 text-[9px] font-semibold text-[#59675f] dark:text-[#cbd5e1]">
                {anomalies.length} cảnh báo
              </span>
            </header>

            {anomalies.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-[#e3f4e9] dark:bg-[#0f494c] p-4 text-[#17794f] dark:text-[#5eead4]">
                <FinanceIcon name="shield" size={18} />
                <p className="text-xs font-medium">
                  Hệ thống không phát hiện giao dịch bất thường nào. Tất cả các khoản chi tiêu đều hoàn toàn tự nhiên và an toàn!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((a, idx) => (
                  <div
                    key={a.transaction_id || idx}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-[#ead5d2] dark:border-[#4a2220] bg-[#fff8f7] dark:bg-[#1e1312] p-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#b45148] px-2 py-0.5 text-[8px] font-bold text-white uppercase">
                          {a.severity}
                        </span>
                        <strong className="text-xs text-[#26372e] dark:text-[#f8fafc]">
                          {a.category || 'Chi tiêu'}: {formatVND(a.amount)}
                        </strong>
                        {a.date && <span className="text-[10px] text-[#829087] dark:text-[#8fa7b7]">({a.date})</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-[#59675f] dark:text-[#cbd5e1]">{a.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: KHUYẾN NGHỊ VÀ GỢI Ý CÁ NHÂN HÓA (AI 5) */}
        {activeTab === 'recommendations' && (
          <section className="grid gap-3">
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#26372e] dark:text-[#f8fafc]">
                <span className="grid size-8 place-items-center rounded-lg bg-[#e3f4e9] dark:bg-[#0f494c] text-[#087557] dark:text-[#5eead4]">
                  <FinanceIcon name="spark" size={15} />
                </span>
                Gợi ý &amp; Tư vấn tài chính cá nhân hóa từ FinAI
              </h2>
              {recommendations?.total_monthly_potential_savings ? (
                <span className="rounded-full bg-[#e3f4e9] dark:bg-[#0f494c] px-3 py-1 text-[9px] font-semibold text-[#17794f] dark:text-[#5eead4]">
                  Tiềm năng tiết kiệm: +{formatVND(recommendations.total_monthly_potential_savings)}/tháng
                </span>
              ) : null}
            </header>

            {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {recommendations.recommendations.map((rec, i) => (
                  <article key={i} className="flex flex-col justify-between rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e3f4e9] dark:bg-[#0f494c] text-xl">
                        {rec.icon || '💡'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-semibold text-[#34463b] dark:text-[#f8fafc]">{rec.title}</h3>
                          {rec.priority && (
                            <span className="rounded-full bg-[#f1f5f2] dark:bg-[#153448] px-2 py-0.5 text-[8px] font-semibold text-[#087557] dark:text-[#5eead4]">
                              {rec.priority}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] leading-5 text-[#59675f] dark:text-[#cbd5e1]">{rec.explanation || rec.summary}</p>
                        {rec.action_steps && rec.action_steps.length > 0 && (
                          <ul className="mt-2 space-y-1 text-[10px] text-[#718078] dark:text-[#8fa7b7]">
                            {rec.action_steps.map((step, sIdx) => (
                              <li key={sIdx} className="flex items-center gap-1.5">
                                <span className="size-1 rounded-full bg-[#087557] dark:bg-[#10b981]" />
                                {step}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0ed] dark:border-[#1e3a4e] pt-3">
                      <span className="text-[10px] font-medium text-[#087557] dark:text-[#5eead4]">
                        {rec.summary || 'Đề xuất từ FinAI'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNotify(`Đã ghi nhận hành động: ${rec.title}`)}
                        className="rounded-lg bg-[#07543f] px-3.5 py-1.5 text-[9px] font-semibold text-white hover:bg-[#064232] cursor-pointer"
                      >
                        Áp dụng đề xuất
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#e7ece8] dark:border-[#1e3a4e] bg-white dark:bg-[#0b1c28] p-6 text-center text-xs text-[#718078] dark:text-[#8fa7b7]">
                {recommendations?.message || 'Chưa có khuyến nghị mới. FinAI sẽ tiếp tục học thói quen chi tiêu của bạn!'}
              </div>
            )}
          </section>
        )}
      </div>
      )}
    </main>
  )
}

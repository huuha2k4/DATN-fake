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
  { id: 'overview', label: 'Tổng quan' },
  { id: 'spending', label: 'Chi tiêu' },
  { id: 'recommendations', label: 'Khuyến nghị AI' },
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

  const showOverview = activeTab === 'overview'
  const showSpending = activeTab === 'overview' || activeTab === 'spending'
  const showRecommendations = activeTab === 'overview' || activeTab === 'recommendations'

  const persona = profile?.persona || {
    title: 'Người Chi Tiêu Cân Bằng',
    tagline: 'Biết cân đối hài hòa giữa nhu cầu thiết yếu và tích lũy.',
    icon: '⚖️',
    color: '#38bdf8',
    description: 'Bạn giữ được sự cân đối tương đối tốt giữa nhu cầu sống thiết yếu và thói quen tiết kiệm.',
  }

  const r50 = profile?.rule_50_30_20 || { needs_pct: 50, wants_pct: 30, savings_pct: 20 }
  const dining = profile?.dining_analysis || { dining_amount: 0, dining_percentage: 0 }
  const radar = profile?.radar_scores || {
    savings_discipline: 60,
    needs_control: 60,
    lifestyle_moderation: 60,
    temporal_stability: 60,
    food_moderation: 60,
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-5 bg-[#f6f8f6] px-3 pb-24 pt-6 text-[#14251f] sm:gap-6 sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-8" aria-label="Phân tích hành vi chi tiêu">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-2 text-[10px] text-[#718078]">
            <span>FinAI Intelligence</span>
            <FinanceIcon name="arrow" size={12} />
            <strong className="text-[#07543f]">Phân tích hành vi chi tiêu (AI 2 &amp; AI 4)</strong>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold leading-tight text-[#17261f] sm:text-[28px]">Hồ sơ Hành vi &amp; Sức khỏe Tài chính</h1>
            <span className="rounded-full bg-[#e3f4e9] px-2.5 py-1 text-[9px] font-semibold text-[#17794f]">
              Mô hình Phân cụm AI + Isolation Forest
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#718078]">
            Được phân tích trực tiếp từ dữ liệu thu chi thực tế của tài khoản trong hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshAnalysis}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#07543f] px-4 text-[10px] font-semibold text-white shadow-sm hover:bg-[#064232] disabled:opacity-50"
          >
            <FinanceIcon name="refresh" size={14} />
            {isLoading ? 'Đang phân tích dữ liệu…' : 'Làm mới phân tích AI'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex w-full max-w-md gap-1 rounded-lg bg-[#eaf0fb] p-1" role="tablist" aria-label="Chế độ phân tích">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`analysis-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="analysis-panel"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-[10px] font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-[#07543f] shadow-sm' : 'text-[#66746b] hover:text-[#07543f]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id="analysis-panel" role="tabpanel" aria-labelledby={`analysis-tab-${activeTab}`} className="grid gap-5">
        {/* KHU VỰC 1: PERSONA ARCHETYPE BANNER */}
        {showOverview && (
          <section className="rounded-xl border border-[#e7ece8] bg-gradient-to-r from-[#063d31] to-[#0a664d] p-5 text-white shadow-sm">
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
                  <p className="mt-2 text-[11px] leading-5 text-white/75 max-w-2xl">{persona.description}</p>
                </div>
              </div>

              {/* Radar summary stats */}
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
            </div>
          </section>
        )}

        {/* KHU VỰC 2: 3 CHỈ SỐ QUAN TRỌNG (50/30/20, ĂN UỐNG, HEALTH SCORE) */}
        {showOverview && (
          <section className="grid gap-3 md:grid-cols-3" aria-label="Chỉ số phân tích">
            {/* Thẻ 1: Ăn uống */}
            <article className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-[.6px] text-[#718078]">CHI TIÊU ĂN UỐNG</span>
                <span className="grid size-9 place-items-center rounded-lg bg-[#fff0e9] text-[#b45148]">
                  <FinanceIcon name="coffee" size={16} />
                </span>
              </div>
              <strong className="mt-3 block text-[24px] font-semibold text-[#26372e]">
                {formatVND(dining.dining_amount)}
              </strong>
              <p className="mt-1 text-[10px] text-[#718078]">
                Chiếm <strong className="text-[#b45148]">{dining.dining_percentage}%</strong> tổng chi tiêu sinh hoạt
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eaf0ec]">
                <span
                  className="block h-full rounded-full bg-[#b45148]"
                  style={{ width: `${Math.min(100, dining.dining_percentage)}%` }}
                />
              </div>
            </article>

            {/* Thẻ 2: Tỷ lệ tích lũy & Quy tắc 50/30/20 */}
            <article className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-[.6px] text-[#718078]">QUY TẮC 50/30/20</span>
                <span className="grid size-9 place-items-center rounded-lg bg-[#eaf0fb] text-[#47677f]">
                  <FinanceIcon name="trend" size={16} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-[24px] font-semibold text-[#26372e]">
                  {r50.savings_pct}%
                </strong>
                <span className="text-xs text-[#718078]">Tích lũy</span>
              </div>
              <p className="mt-1 text-[10px] text-[#718078]">
                Thiết yếu: {r50.needs_pct}% | Hưởng thụ: {r50.wants_pct}%
              </p>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#eaf0ec]">
                <span className="bg-[#087557]" style={{ width: `${r50.needs_pct}%` }} title="Thiết yếu (Needs)" />
                <span className="bg-[#f59e0b]" style={{ width: `${r50.wants_pct}%` }} title="Hưởng thụ (Wants)" />
                <span className="bg-[#38bdf8]" style={{ width: `${r50.savings_pct}%` }} title="Tích lũy (Savings)" />
              </div>
            </article>

            {/* Thẻ 3: Điểm sức khỏe tài chính */}
            <article className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-[.6px] text-[#718078]">SỨC KHỎE TÀI CHÍNH</span>
                <span className="grid size-9 place-items-center rounded-lg bg-[#e3f4e9] text-[#087557]">
                  <FinanceIcon name="shield" size={16} />
                </span>
              </div>
              <strong className="mt-3 block text-[24px] font-semibold text-[#087557]">
                {recommendations?.health_score || 78}/100
              </strong>
              <p className="mt-1 text-[10px] text-[#718078]">
                Đánh giá: <strong>{recommendations?.health_rating || 'Khá an toàn'}</strong>
              </p>
              <p className="mt-2 text-[10px] text-[#59675f] line-clamp-2">
                {recommendations?.overall_advice || 'Duy trì kỷ luật tích lũy và kiểm soát các khoản chi đột xuất.'}
              </p>
            </article>
          </section>
        )}

        {/* KHU VỰC 3: GIAO DỊCH BẤT THƯỜNG (AI 4: ISOLATION FOREST) */}
        {showOverview && (
          <section className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5">
            <header className="flex items-center justify-between border-b border-[#edf0ed] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-[#fff0e9] text-[#b45148]">
                  <FinanceIcon name="expense" size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#26372e] sm:text-base">
                    Phát hiện giao dịch bất thường (AI Anomaly Detection)
                  </h2>
                  <p className="text-[10px] text-[#829087]">
                    Mô hình học máy Isolation Forest quét liên tục để phát hiện các giao dịch đột biến hoặc giờ khuya
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#f1f5f2] px-2.5 py-1 text-[9px] font-semibold text-[#59675f]">
                {anomalies.length} cảnh báo
              </span>
            </header>

            {anomalies.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-[#e3f4e9] p-3.5 text-[#17794f]">
                <FinanceIcon name="shield" size={18} />
                <p className="text-xs font-medium">
                  Hệ thống không phát hiện giao dịch bất thường nào. Tất cả các khoản chi tiêu đều phù hợp với thói quen của bạn!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.slice(0, 3).map((a, idx) => (
                  <div
                    key={a.transaction_id || idx}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-[#ead5d2] bg-[#fff8f7] p-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#b45148] px-2 py-0.5 text-[8px] font-bold text-white uppercase">
                          {a.severity}
                        </span>
                        <strong className="text-xs text-[#26372e]">{a.category || 'Chi tiêu'}: {formatVND(a.amount)}</strong>
                        {a.date && <span className="text-[10px] text-[#829087]">({a.date})</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-[#59675f]">{a.explanation}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onNotify('Đã gắn nhãn kiểm tra giao dịch')}
                        className="rounded-lg border border-[#dfe7e1] bg-white px-3 py-1.5 text-[9px] font-medium text-[#526159]"
                      >
                        Gắn nhãn
                      </button>
                      <button
                        type="button"
                        onClick={() => onNotify('Đã xác nhận khoản chi')}
                        className="rounded-lg bg-[#07543f] px-3 py-1.5 text-[9px] font-semibold text-white"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* KHU VỰC 4: CHI TIÊU THEO DANH MỤC */}
        {showSpending && (
          <section className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0ed] pb-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#26372e]">
                <span className="grid size-8 place-items-center rounded-lg bg-[#e3f4e9] text-[#087557]">
                  <FinanceIcon name="chart" size={15} />
                </span>
                Phân bổ chi tiêu theo danh mục
              </h2>
              <span className="text-[10px] text-[#829087]">Số liệu thực tế từ tài khoản</span>
            </header>

            {profile?.top_categories && profile.top_categories.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {profile.top_categories.map((cat) => (
                  <article key={cat.category_id} className="rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
                    <header className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f2] text-[#07543f]">
                          <FinanceIcon name="wallet" size={16} />
                        </span>
                        <div>
                          <h3 className="text-xs font-semibold text-[#34463b]">{cat.category_name}</h3>
                          <p className="mt-0.5 text-[9px] text-[#829087]">{cat.percentage}% tổng chi</p>
                        </div>
                      </div>
                    </header>
                    <div className="mt-4 flex justify-between text-[11px]">
                      <span className="text-[#718078]">Số tiền đã chi:</span>
                      <strong className="text-[#34463b]">{formatVND(cat.total_amount)}</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ee]">
                      <span
                        className="block h-full rounded-full bg-[#087557]"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-[#f8faf9] p-4 text-center text-xs text-[#718078]">
                Chưa có đủ danh mục phát sinh chi tiêu trong kỳ. Các khoản chi mới sẽ tự động hiển thị tại đây!
              </div>
            )}
          </section>
        )}

        {/* KHU VỰC 5: KHUYẾN NGHỊ VÀ GỢI Ý CÁ NHÂN HÓA (AI 5) */}
        {showRecommendations && (
          <section className="grid gap-3">
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#26372e]">
                <span className="grid size-8 place-items-center rounded-lg bg-[#e3f4e9] text-[#087557]">
                  <FinanceIcon name="spark" size={15} />
                </span>
                Gợi ý &amp; Tư vấn tài chính cá nhân hóa từ FinAI
              </h2>
              {recommendations?.total_monthly_potential_savings ? (
                <span className="rounded-full bg-[#e3f4e9] px-3 py-1 text-[9px] font-semibold text-[#17794f]">
                  Tiềm năng tiết kiệm: +{formatVND(recommendations.total_monthly_potential_savings)}/tháng
                </span>
              ) : null}
            </header>

            {recommendations?.recommendations && recommendations.recommendations.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {recommendations.recommendations.map((rec, i) => (
                  <article key={i} className="flex flex-col justify-between rounded-xl border border-[#e7ece8] bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e3f4e9] text-xl">
                        {rec.icon || '💡'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-semibold text-[#34463b]">{rec.title}</h3>
                          {rec.priority && (
                            <span className="rounded-full bg-[#f1f5f2] px-2 py-0.5 text-[8px] font-semibold text-[#087557]">
                              {rec.priority}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] leading-5 text-[#59675f]">{rec.explanation || rec.summary}</p>
                        {rec.action_steps && rec.action_steps.length > 0 && (
                          <ul className="mt-2 space-y-1 text-[10px] text-[#718078]">
                            {rec.action_steps.map((step, sIdx) => (
                              <li key={sIdx} className="flex items-center gap-1.5">
                                <span className="size-1 rounded-full bg-[#087557]" />
                                {step}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0ed] pt-3">
                      <span className="text-[10px] font-medium text-[#087557]">
                        {rec.summary || 'Đề xuất từ FinAI'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNotify(`Đã ghi nhận hành động: ${rec.title}`)}
                        className="rounded-lg bg-[#07543f] px-3.5 py-1.5 text-[9px] font-semibold text-white hover:bg-[#064232]"
                      >
                        Áp dụng đề xuất
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#e7ece8] bg-white p-6 text-center text-xs text-[#718078]">
                {recommendations?.message || 'Chưa có khuyến nghị mới. FinAI sẽ tiếp tục học thói quen chi tiêu của bạn!'}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

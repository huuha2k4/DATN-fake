import type { ReactNode } from 'react'

export type IconName =
  | 'grid' | 'arrows' | 'wallet' | 'chart' | 'spark' | 'bank' | 'settings'
  | 'search' | 'plus' | 'receipt' | 'bell' | 'calendar' | 'refresh' | 'download'
  | 'trend' | 'income' | 'expense' | 'coffee' | 'bolt' | 'more' | 'arrow' | 'shield' | 'clock' | 'user'

export function FinanceIcon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const drawings: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    arrows: <><path d="M7 7h13l-3-3" /><path d="m20 7-3 3M17 17H4l3 3" /><path d="m4 17 3-3" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2.5" /><path d="M3 9h18M16 14h2" /><path d="M6 5V4a1 1 0 0 1 1-1h12" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    bank: <path d="m3 9 9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M2 18h20" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" transform="translate(-1 -1)" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M9 8h6m-6 4h6" /></>,
    bell: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2" /></>,
    download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5m-5 5V3" />,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    income: <path d="M12 19V5m-6 6 6-6 6 6" />,
    expense: <path d="M12 5v14m6-6-6 6-6-6" />,
    coffee: <path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 2h2a2 2 0 1 1 0 4h-2M8 3v2m4-2v2" />,
    bolt: <path d="m13 2-3 9h7L9 22l2-9H4l9-11Z" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  }

  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{drawings[name]}</svg>
}

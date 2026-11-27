import type { ReactNode } from 'react';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';

export type BadgeTone = 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';

const badgeStyles: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/14 text-amber-800 dark:text-amber-300',
  rose: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  sky: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

const dotStyles: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-400',
};

export function AdminBadge({
  tone = 'slate',
  dot = true,
  children,
  className = '',
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${badgeStyles[tone]} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`size-1.5 rounded-full shrink-0 ${dotStyles[tone]}`} />}
      <span>{children}</span>
    </span>
  );
}

export type StatTone = 'default' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';

export interface StatItem {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  tone?: StatTone;
  icon?: IconName;
}

const statToneClass: Record<StatTone, string> = {
  default: 'text-[var(--admin-ink)]',
  emerald: 'text-[#007f53] dark:text-emerald-400',
  sky: 'text-sky-700 dark:text-sky-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  violet: 'text-violet-600 dark:text-violet-400',
};

const statIconBg: Record<StatTone, string> = {
  default: 'bg-[var(--admin-surface-subtle)] text-[var(--admin-ink-secondary)]',
  emerald: 'bg-emerald-500/14 text-[#007f53] dark:text-emerald-300',
  sky: 'bg-sky-500/14 text-sky-700 dark:text-sky-300',
  amber: 'bg-amber-500/16 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/14 text-rose-600 dark:text-rose-300',
  violet: 'bg-violet-500/14 text-violet-600 dark:text-violet-300',
};

const statTintedBg: Record<StatTone, string> = {
  default: '!bg-[var(--admin-surface-subtle)]',
  emerald: '!bg-emerald-500/8 dark:!bg-emerald-500/12 border-emerald-500/20',
  sky: '!bg-sky-500/8 dark:!bg-sky-500/12 border-sky-500/20',
  amber: '!bg-amber-500/10 dark:!bg-amber-500/12 border-amber-500/20',
  rose: '!bg-rose-500/8 dark:!bg-rose-500/12 border-rose-500/20',
  violet: '!bg-violet-500/8 dark:!bg-violet-500/12 border-violet-500/20',
};

const statPastelCard: Record<StatTone, string> = {
  default: 'bg-[var(--admin-surface-subtle)] border-[var(--admin-border)]',
  emerald: 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/90 dark:from-emerald-950/30 dark:via-[var(--admin-surface)] dark:to-emerald-900/20 border-emerald-500/15',
  sky: 'bg-gradient-to-br from-sky-50/80 via-white to-sky-50/90 dark:from-sky-950/30 dark:via-[var(--admin-surface)] dark:to-sky-900/20 border-sky-500/15',
  amber: 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/90 dark:from-amber-950/30 dark:via-[var(--admin-surface)] dark:to-amber-900/20 border-amber-500/15',
  rose: 'bg-gradient-to-br from-rose-50/80 via-white to-rose-50/90 dark:from-rose-950/30 dark:via-[var(--admin-surface)] dark:to-rose-900/20 border-rose-500/15',
  violet: 'bg-gradient-to-br from-violet-50/80 via-white to-violet-50/90 dark:from-violet-950/30 dark:via-[var(--admin-surface)] dark:to-violet-900/20 border-violet-500/15',
};

export function AdminStatStrip({
  items,
  busy = false,
  variant = 'default',
  columns,
  className = '',
}: {
  items: StatItem[];
  busy?: boolean;
  variant?: 'default' | 'tinted' | 'pastel';
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const effectiveCols = columns ?? (variant === 'tinted' ? 3 : items.length);
  const pastelGridClass =
    effectiveCols === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : effectiveCols === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : effectiveCols === 5
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const containerClass =
    variant === 'pastel'
      ? `grid gap-3.5 ${pastelGridClass} ${className}`
      : `admin-stat-strip ${variant === 'tinted' ? '!grid-cols-1 sm:!grid-cols-3' : ''} ${className}`;

  return (
    <dl
      className={containerClass}
      aria-busy={busy}
    >
      {items.map((item) => {
        const tone = item.tone ?? 'default';
        if (variant === 'tinted') {
          return (
            <div
              key={item.label}
              className={`admin-stat-cell items-center text-center py-4 ${statTintedBg[tone]}`}
            >
              {item.icon && (
                <span className={`grid size-8 place-items-center rounded-lg ${statIconBg[tone]}`}>
                  <FinanceIcon name={item.icon} size={16} />
                </span>
              )}
              <dt className="admin-stat-label mt-1">{item.label}</dt>
              <dd className="admin-stat-value text-[var(--admin-ink)]">{item.value}</dd>
            </div>
          );
        }
        if (variant === 'pastel') {
          return (
            <div
              key={item.label}
              className={`flex items-start gap-3.5 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${statPastelCard[tone]}`}
            >
              {item.icon && (
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${statIconBg[tone]}`}>
                  <FinanceIcon name={item.icon} size={18} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-semibold text-[var(--admin-ink-secondary)]">{item.label}</dt>
                <dd className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-[var(--admin-ink)] leading-none">
                  {item.value}
                </dd>
                {item.meta && (
                  <span className="mt-2 block text-[11px] font-medium text-[var(--admin-ink-muted)]">
                    {item.meta}
                  </span>
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={item.label} className="admin-stat-cell">
            <div className="flex items-start justify-between gap-2">
              <dt className="admin-stat-label">{item.label}</dt>
              {item.icon && (
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${statIconBg[tone]}`}>
                  <FinanceIcon name={item.icon} size={14} />
                </span>
              )}
            </div>
            <dd className={`admin-stat-value ${statToneClass[tone]}`}>{item.value}</dd>
            {item.meta && <span className="admin-stat-meta">{item.meta}</span>}
          </div>
        );
      })}
    </dl>
  );
}

export function AdminSurface({
  title,
  subtitle,
  action,
  icon,
  headerVariant = 'default',
  children,
  busy = false,
  noPadding = false,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
  headerVariant?: 'default' | 'brand' | 'mint';
  children: ReactNode;
  busy?: boolean;
  noPadding?: boolean;
  className?: string;
}) {
  const isBrand = headerVariant === 'brand';
  const isMint = headerVariant === 'mint';
  const headerClass = isBrand
    ? 'admin-surface-header bg-gradient-to-r from-[#007f53] to-[#046846] text-white border-b-0 rounded-t-[calc(0.75rem-1px)]'
    : isMint
    ? 'admin-surface-header bg-emerald-500/8 dark:bg-emerald-500/10'
    : 'admin-surface-header';

  return (
    <section className={`admin-surface overflow-hidden ${className}`} aria-busy={busy}>
      {(title || action) && (
        <header className={headerClass}>
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                  isBrand
                    ? 'bg-white/15 text-white border border-white/25'
                    : 'bg-[var(--admin-selected)] text-[var(--admin-selected-text)]'
                }`}
              >
                <FinanceIcon name={icon} size={15} />
              </span>
            )}
            <div className="min-w-0">
              {title &&
                (typeof title === 'string' ? (
                  <h2 className={isBrand ? '!text-white' : ''}>{title}</h2>
                ) : (
                  title
                ))}
              {subtitle && (
                <p className={isBrand ? '!text-emerald-50/90' : ''}>{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={noPadding ? 'min-w-0 flex-1' : 'admin-surface-body flex-1 flex flex-col justify-center'}>{children}</div>
    </section>
  );
}

export function AdminNotice({
  tone = 'emerald',
  message,
  onClose,
  action,
}: {
  tone?: 'emerald' | 'rose' | 'amber';
  message: string;
  onClose?: () => void;
  action?: ReactNode;
}) {
  const styles = {
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    rose: 'border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
  };
  const icon: Record<typeof tone, IconName> = {
    emerald: 'check',
    rose: 'alert',
    amber: 'alert',
  };
  return (
    <div
      role={tone === 'rose' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-xs font-medium ${styles[tone]}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FinanceIcon name={icon[tone]} size={15} className="shrink-0" />
        <span className="break-words">{message}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thông báo"
            className="inline-grid size-6 place-items-center rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <FinanceIcon name="close" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminEmptyState({
  icon = 'search',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <div className="grid size-10 place-items-center rounded-lg bg-[var(--admin-selected)] text-[var(--admin-selected-text)]">
        <FinanceIcon name={icon} size={18} />
      </div>
      <p className="text-sm font-semibold text-[var(--admin-ink)] m-0">{title}</p>
      {description && <p className="text-xs text-[var(--admin-ink-muted)] max-w-md m-0">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

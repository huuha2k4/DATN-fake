import { useState } from 'react';
import { metric } from './monitoringFormat';

function computeTicks(maxValue: number): { niceMax: number; ticks: number[] } {
  const safeMax = Math.max(1, Math.ceil(maxValue));
  if (safeMax <= 4) {
    const ticks: number[] = [];
    for (let v = safeMax; v >= 0; v -= 1) {
      ticks.push(v);
    }
    return { niceMax: safeMax, ticks };
  }
  const rawStep = safeMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceStep =
    normalized <= 1 ? magnitude : normalized <= 2 ? 2 * magnitude : normalized <= 5 ? 5 * magnitude : 10 * magnitude;
  const step = Math.max(1, Math.ceil(niceStep));
  const niceMax = step * 4;
  return {
    niceMax,
    ticks: [niceMax, step * 3, step * 2, step, 0],
  };
}

export function AdminTrend({
  days,
  series,
}: {
  days: { date: string; values: number[] }[];
  series: string[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!days.length) {
    return (
      <p className="py-6 text-center text-xs text-[var(--admin-ink-muted)]">
        Chưa có dữ liệu theo ngày.
      </p>
    );
  }

  const rawMax = Math.max(1, ...days.flatMap((day) => day.values));
  const { niceMax, ticks } = computeTicks(rawMax);
  const chartHeight = 224;
  const activeDay = hovered !== null ? days[hovered] : days[days.length - 1];

  return (
    <figure className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <figcaption className="flex flex-wrap items-center gap-4 text-[var(--admin-ink-secondary)]">
          {series.map((label, index) => (
            <span key={label} className="inline-flex items-center gap-2 font-semibold">
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-xs ${
                  index === 0 ? 'bg-[#007f53] dark:bg-emerald-400' : 'bg-sky-600 dark:bg-sky-400'
                }`}
              />
              {label}
            </span>
          ))}
        </figcaption>
        {activeDay && (
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span className="font-medium text-[var(--admin-ink-muted)]">
              {activeDay.date.slice(8)}/{activeDay.date.slice(5, 7)}:
            </span>
            {activeDay.values.map((val, idx) => (
              <span
                key={series[idx] ?? idx}
                className={`inline-flex items-center rounded-md px-2 py-0.5 font-semibold ${
                  idx === 0
                    ? 'bg-emerald-500/12 text-[#006744] dark:text-emerald-300'
                    : 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
                }`}
              >
                {series[idx] ? `${series[idx]} ` : ''}
                {metric(val)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Column Chart with Y-Axis & Value Pills */}
      <div className="flex items-stretch gap-3 pt-4" role="region" aria-label={series.join(', ')}>
        {/* Y-Axis Labels */}
        <div
          aria-hidden="true"
          className="flex flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-[var(--admin-ink-muted)] select-none"
          style={{ height: chartHeight + 24 }}
        >
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {metric(tick)}
            </span>
          ))}
        </div>

        {/* Plot Area */}
        <div className="relative flex-1 min-w-0">
          {/* Horizontal Dashed Gridlines */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height: chartHeight }}
          >
            {ticks.map((tick, idx) => (
              <div
                key={tick}
                className={`w-full border-t ${
                  idx === ticks.length - 1
                    ? 'border-[var(--admin-border-strong)]'
                    : 'border-dashed border-[var(--admin-border)]'
                }`}
              />
            ))}
          </div>

          <div
            className="relative grid items-end gap-1.5 sm:gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day, dayIdx) => {
              const isHovered = hovered === dayIdx;
              const isSingleSeries = series.length === 1;
              return (
                <div
                  key={day.date}
                  onMouseEnter={() => setHovered(dayIdx)}
                  onMouseLeave={() => setHovered(null)}
                  className="group flex flex-col items-center gap-2"
                >
                  <div
                    className={`relative flex w-full items-end justify-center gap-1 rounded-t px-1 transition-colors ${
                      isHovered ? 'bg-[var(--admin-surface-hover)]/60' : ''
                    }`}
                    style={{ height: chartHeight }}
                  >
                    {day.values.map((value, seriesIdx) => {
                      const pct = value > 0 ? Math.max(6, Math.round((value / niceMax) * 100)) : 0;
                      return (
                        <div
                          key={series[seriesIdx] ?? seriesIdx}
                          className={`relative flex flex-col items-center justify-end h-full ${
                            isSingleSeries ? 'w-full max-w-9' : 'w-full max-w-5'
                          }`}
                        >
                          {value > 0 && (
                            <>
                              {isSingleSeries && (
                                <span
                                  className={`mb-1.5 inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums transition-transform ${
                                    seriesIdx === 0
                                      ? 'bg-emerald-500/14 text-[#006744] dark:text-emerald-300'
                                      : 'bg-sky-500/14 text-sky-700 dark:text-sky-300'
                                  } ${isHovered ? 'scale-105' : ''}`}
                                >
                                  {metric(value)}
                                </span>
                              )}
                              <div
                                title={`${day.date.slice(8)}/${day.date.slice(5, 7)} · ${series[seriesIdx] ?? ''}: ${metric(value)}`}
                                className={`w-full rounded-t-md transition-all duration-200 ${
                                  seriesIdx === 0
                                    ? 'bg-[#007f53] group-hover:bg-[#006642] dark:bg-emerald-500 dark:group-hover:bg-emerald-400'
                                    : 'bg-sky-600 group-hover:bg-sky-700 dark:bg-sky-400 dark:group-hover:bg-sky-300'
                                }`}
                                style={{ height: `${pct}%` }}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <time
                    dateTime={day.date}
                    className={`text-[11px] tabular-nums transition-colors ${
                      isHovered
                        ? 'font-semibold text-[var(--admin-ink)]'
                        : 'text-[var(--admin-ink-muted)]'
                    }`}
                  >
                    {day.date.slice(8)}/{day.date.slice(5, 7)}
                  </time>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </figure>
  );
}

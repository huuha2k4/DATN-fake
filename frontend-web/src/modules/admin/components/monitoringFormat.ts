import type { Period } from '../api/monitoringApi';

const vietnam = 'Asia/Ho_Chi_Minh';
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: vietnam });
export const dateOnly = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'UTC' });
export const monitorControl = 'admin-input';
const fmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function metric(value: unknown, suffix = '') {
  return value == null ? 'N/A' : `${typeof value === 'number' ? fmt.format(value) : String(value)}${suffix}`;
}
export function monitorTime(value: unknown) {
  if (value == null) return 'N/A';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? 'N/A' : dateTime.format(date);
}
export function periodFor(days: number): Period {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: vietnam, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to: today };
}

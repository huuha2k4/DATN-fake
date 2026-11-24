/**
 * Utility functions for Date and Time formatting & parsing across Finora.
 * 
 * Quy chuẩn:
 * - Hiển thị: dd/MM/yyyy (Việt Nam)
 * - Giờ hiển thị: 24h (HH:mm hoặc HH:mm:ss)
 * - Dữ liệu ngày gửi API: YYYY-MM-DD
 * - Dữ liệu thời điểm gửi API: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
 */

/**
 * Format a Date or date string to 'dd/MM/yyyy'
 */
export function formatDisplayDate(dateInput?: Date | string | null, fallback: string = ''): string {
  if (!dateInput) return fallback;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return fallback;

    // Check if YYYY-MM-DD
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return fallback;
}

/**
 * Format a Date to 'HH:mm' (24-hour format)
 */
export function formatDisplayTime(dateInput?: Date | string | null, fallback: string = '00:00'): string {
  if (!dateInput) return fallback;

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return fallback;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format a Date to 'dd/MM/yyyy HH:mm'
 */
export function formatDisplayDateTime(dateInput?: Date | string | null, fallback: string = ''): string {
  if (!dateInput) return fallback;
  const d = formatDisplayDate(dateInput);
  const t = formatDisplayTime(dateInput);
  if (!d) return fallback;
  return `${d} ${t}`;
}

/**
 * Convert a Date to 'YYYY-MM-DD' without timezone shift
 */
export function toApiDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse 'YYYY-MM-DD' or 'DD/MM/YYYY' into a local Date instance
 */
export function parseLocalDate(str?: string | null): Date {
  if (!str) return new Date();
  const trimmed = str.trim();

  // If DD/MM/YYYY
  const vnMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    const d = parseInt(vnMatch[1], 10);
    const m = parseInt(vnMatch[2], 10) - 1;
    const y = parseInt(vnMatch[3], 10);
    return new Date(y, m, d);
  }

  // If YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d);
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

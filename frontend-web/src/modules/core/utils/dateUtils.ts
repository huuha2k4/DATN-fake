/**
 * Utility functions for date formatting across the application.
 * Standard display format: DD/MM/YYYY
 */

/**
 * Format a date string (YYYY-MM-DD, ISO string, or Date) to DD/MM/YYYY.
 * If input is invalid or falsy, returns the fallback string or empty string.
 */
export function formatDate(
  dateInput?: string | Date | null,
  fallback: string = ''
): string {
  if (!dateInput) return fallback;

  // Handle string input
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return fallback;

    // Check if it's strictly YYYY-MM-DD or starts with YYYY-MM-DD
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    // Try parsing as generic date
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return trimmed;
  }

  // Handle Date instance
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return fallback;
}

/**
 * Format date time string with time
 */
export function formatDateTime(
  dateInput?: string | Date | null,
  timeStr?: string,
  fallback: string = ''
): string {
  const formatted = formatDate(dateInput, fallback);
  if (!formatted) return fallback;
  if (!timeStr) return formatted;
  return `${formatted} ${timeStr.slice(0, 5)}`;
}

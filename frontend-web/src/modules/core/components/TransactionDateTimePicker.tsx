import React from 'react';
import { DatePicker } from './DatePicker';
import { format, parse, isValid } from 'date-fns';

export interface WebTransactionDateTimePickerProps {
  dateValue?: string | Date | null; // YYYY-MM-DD
  timeValue?: string; // HH:mm
  onChange: (dateStr: string, timeStr: string, fullIsoStr: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Component chuẩn chọn Ngày & Giờ cho Giao dịch trên Web
 */
export const TransactionDateTimePicker: React.FC<WebTransactionDateTimePickerProps> = ({
  dateValue = format(new Date(), 'yyyy-MM-dd'),
  timeValue = format(new Date(), 'HH:mm'),
  onChange,
  className = '',
  disabled = false,
}) => {
  const currentDateStr = (() => {
    if (!dateValue) return format(new Date(), 'yyyy-MM-dd');
    if (dateValue instanceof Date) return format(dateValue, 'yyyy-MM-dd');
    return dateValue.substring(0, 10);
  })();

  const currentTimeStr = timeValue || format(new Date(), 'HH:mm');

  const handleDateChange = (newDateStr: string) => {
    const fullDate = parse(`${newDateStr} ${currentTimeStr}`, 'yyyy-MM-dd HH:mm', new Date());
    const iso = isValid(fullDate) ? fullDate.toISOString() : new Date().toISOString();
    onChange(newDateStr, currentTimeStr, iso);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const fullDate = parse(`${currentDateStr} ${newTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const iso = isValid(fullDate) ? fullDate.toISOString() : new Date().toISOString();
    onChange(currentDateStr, newTime, iso);
  };

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      {/* Date Picker (Lịch Popover) */}
      <div className="flex-1">
        <DatePicker
          value={currentDateStr}
          onChange={handleDateChange}
          disabled={disabled}
        />
      </div>

      {/* Time Input (24h) */}
      <div className="w-32">
        <input
          type="time"
          value={currentTimeStr}
          onChange={handleTimeChange}
          disabled={disabled}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      </div>
    </div>
  );
};

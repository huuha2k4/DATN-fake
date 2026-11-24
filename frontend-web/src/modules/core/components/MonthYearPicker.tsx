import React from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { vi } from 'date-fns/locale';

export interface MonthYearPickerProps {
  month: number; // 1 - 12
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

/**
 * Component chọn Tháng / Năm cho Báo cáo tài chính, Ngân sách
 */
export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  month,
  year,
  onChange,
  className = '',
  minYear = 2020,
  maxYear = new Date().getFullYear() + 5,
}) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Chọn Tháng */}
      <select
        value={month}
        onChange={(e) => onChange(Number(e.target.value), year)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            Tháng {m}
          </option>
        ))}
      </select>

      {/* Chọn Năm */}
      <select
        value={year}
        onChange={(e) => onChange(month, Number(e.target.value))}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            Năm {y}
          </option>
        ))}
      </select>
    </div>
  );
};

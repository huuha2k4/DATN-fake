import React, { useRef, useState, useEffect } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FinanceIcon } from './FinanceIcon';
import 'react-day-picker/dist/style.css';
import './Calendar.css';

export interface WebDateRangePickerProps {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  onChange: (startStr: string, endStr: string, startObj?: Date, endObj?: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Component chọn khoảng ngày trên Web (DateRangePicker)
 */
export const DateRangePicker: React.FC<WebDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
  placeholder = 'Chọn khoảng ngày (dd/mm/yyyy - dd/mm/yyyy)',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseD = (v?: string | Date | null) => {
    if (!v) return undefined;
    if (v instanceof Date) return isValid(v) ? v : undefined;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
        const d = parse(trimmed.substring(0, 10), 'yyyy-MM-dd', new Date());
        return isValid(d) ? d : undefined;
      }
    }
    return undefined;
  };

  const startObj = parseD(startDate);
  const endObj = parseD(endDate);

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startObj,
    to: endObj,
  });

  useEffect(() => {
    setSelectedRange({ from: parseD(startDate), to: parseD(endDate) });
  }, [startDate, endDate]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (range?: DateRange) => {
    setSelectedRange(range);
    if (range?.from && range?.to) {
      const startStr = format(range.from, 'yyyy-MM-dd');
      const endStr = format(range.to, 'yyyy-MM-dd');
      onChange(startStr, endStr, range.from, range.to);
      setIsOpen(false);
    } else if (range?.from && !range?.to) {
      const startStr = format(range.from, 'yyyy-MM-dd');
      onChange(startStr, startStr, range.from, range.from);
    }
  };

  const displayString =
    startObj && endObj
      ? `${format(startObj, 'dd/MM/yyyy')} - ${format(endObj, 'dd/MM/yyyy')}`
      : startObj
      ? `${format(startObj, 'dd/MM/yyyy')} - ...`
      : '';

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative flex items-center justify-between cursor-pointer transition select-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm shadow-sm hover:border-emerald-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <span
          className={
            displayString
              ? 'text-slate-900 dark:text-white font-medium'
              : 'text-slate-400 dark:text-slate-500 font-normal'
          }
        >
          {displayString || placeholder}
        </span>
        <FinanceIcon name="calendar" size={17} className="text-slate-400 ml-2 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="fixed left-3 right-3 sm:left-0 sm:right-auto sm:absolute top-auto sm:top-full z-50 mt-2 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95 max-w-[calc(100vw-24px)] overflow-x-auto">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            locale={vi}
            numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
            className="finora-calendar"
          />
        </div>
      )}
    </div>
  );
};

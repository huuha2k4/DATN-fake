import React, { useRef, useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FinanceIcon } from './FinanceIcon';
import './Calendar.css';

export interface WebDatePickerProps {
  value?: string | Date | null; // YYYY-MM-DD hoặc Date object
  onChange: (val: string, dateObj?: Date) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  captionLayout?: 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'label';
  /** Hướng mở: 'auto' (tự tính theo màn hình), 'top' (mở lên trên), 'bottom' (mở xuống dưới) */
  placement?: 'auto' | 'top' | 'bottom';
}

/**
 * Component DatePicker chuẩn Web cho Finora (theo phong cách shadcn/ui + react-day-picker + date-fns)
 * - Hiển thị dạng Popover lịch chuẩn, điều hướng nhanh tháng/năm.
 * - Format hiển thị dd/MM/yyyy.
 * - Giá trị trả về chuẩn API: YYYY-MM-DD.
 * - Hỗ trợ theme sáng/tối và phím Escape/bấm ngoài để đóng.
 */
export const DatePicker: React.FC<WebDatePickerProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  required = false,
  minDate,
  maxDate,
  disabled = false,
  captionLayout = 'dropdown',
  placement = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value to Date
  const parsedDate = (() => {
    if (!value) return undefined;
    if (value instanceof Date) return isValid(value) ? value : undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      // If YYYY-MM-DD
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
        const d = parse(trimmed.substring(0, 10), 'yyyy-MM-dd', new Date());
        return isValid(d) ? d : undefined;
      }
      // If DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
        const d = parse(trimmed, 'dd/MM/yyyy', new Date());
        return isValid(d) ? d : undefined;
      }
      const generic = new Date(trimmed);
      return isValid(generic) ? generic : undefined;
    }
    return undefined;
  })();

  const displayString = parsedDate ? format(parsedDate, 'dd/MM/yyyy') : '';

  // Close on outside click & Check placement
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 240;

      // 1. Kiểm tra chiều dọc (Top vs Bottom)
      if (placement === 'top') {
        setOpenUpward(true);
      } else if (placement === 'bottom') {
        setOpenUpward(false);
      } else {
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 310);
      }

      // 2. Kiểm tra chiều ngang: Nếu cách mép phải < 240px thì luôn căn mép phải (right-0)
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < popoverWidth + 16 || rect.right > window.innerWidth - 100);
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, placement]);

  const handleSelect = (selected?: Date) => {
    if (selected) {
      const apiStr = format(selected, 'yyyy-MM-dd');
      onChange(apiStr, selected);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative flex items-center justify-between cursor-pointer transition select-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm shadow-sm hover:border-emerald-500 dark:hover:border-emerald-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
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

        <span className="text-slate-400 group-hover:text-emerald-600 flex items-center pointer-events-none ml-2">
          <FinanceIcon name="calendar" size={17} />
        </span>
      </div>

      {/* Popover Calendar (Compact & Smart Responsive) */}
      {isOpen && (
        <div
          className={`absolute z-[9999] p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95 w-max ${alignRight ? 'right-0' : 'left-0'
            } ${openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          <DayPicker
            mode="single"
            selected={parsedDate}
            onSelect={handleSelect}
            locale={vi}
            captionLayout={captionLayout}
            startMonth={minDate || new Date(1950, 0)}
            endMonth={maxDate || new Date(2050, 11)}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            className="finora-calendar"
          />
        </div>
      )}
    </div>
  );
};

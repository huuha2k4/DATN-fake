import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FinanceIcon } from './FinanceIcon';
import './Calendar.css';

export interface WebDatePickerProps {
  value?: string | Date | null;
  onChange: (val: string, dateObj?: Date) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  captionLayout?: 'buttons' | 'dropdown' | 'dropdown-months' | 'dropdown-years';
}

/**
 * Component DatePicker Portal chuẩn cho Web Finora:
 * - Render lịch trực tiếp ra document.body qua React Portal.
 * - KHÔNG BAO GIỜ bị overflow: hidden của modal, card, banner hay container che khuất.
 * - Tự động tính toán toạ độ getBoundingClientRect() chính xác đến từng pixel.
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Toạ độ fixed theo viewport
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);

  // Parse value to Date
  const parsedDate = (() => {
    if (!value) return undefined;
    if (value instanceof Date) return isValid(value) ? value : undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
        const d = parse(trimmed.substring(0, 10), 'yyyy-MM-dd', new Date());
        return isValid(d) ? d : undefined;
      }
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

  // Tính toán vị trí hiển thị chính xác theo viewport
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 310;

    // Chiều dọc: nếu bên dưới còn < 320px thì lật lên trên
    let top = rect.bottom + 6;
    if (window.innerHeight - rect.bottom < popoverHeight && rect.top > popoverHeight) {
      top = rect.top - popoverHeight - 6;
    }

    // Chiều ngang: nếu mép phải tràn màn hình -> căn lề phải theo input
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, rect.right - popoverWidth);
    }

    setPopoverCoords({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScrollOrResize = () => {
        updatePosition();
      };

      const handleOutsideClick = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          containerRef.current &&
          !containerRef.current.contains(target) &&
          popoverRef.current &&
          !popoverRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      document.addEventListener('mousedown', handleOutsideClick);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [isOpen]);

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
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`relative flex items-center justify-between cursor-pointer transition select-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm shadow-sm hover:border-emerald-500 dark:hover:border-emerald-500 ${
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

        <span className="text-slate-400 group-hover:text-emerald-600 flex items-center pointer-events-none ml-2">
          <FinanceIcon name="calendar" size={17} />
        </span>
      </div>

      {/* Popover Calendar via Portal ra body - Bất chấp mọi overflow: hidden */}
      {isOpen &&
        popoverCoords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 999999,
            }}
            className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95 w-max select-none"
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
          </div>,
          document.body
        )}
    </div>
  );
};

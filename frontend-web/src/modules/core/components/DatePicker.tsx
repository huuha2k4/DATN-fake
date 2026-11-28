import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  /** Ẩn icon lịch bên phải khi dùng trong thanh lọc gọn */
  hideIcon?: boolean;
}

/**
 * Component DatePicker chuẩn Web cho Finora (react-day-picker + date-fns + Portal)
 * - Popover render qua Portal vào document.body (position: fixed) nên không bao giờ bị cắt trong modal có overflow-hidden/auto.
 * - Tự động căn chỉnh không tràn mép phải/trái/dưới màn hình.
 * - Format hiển thị dd/MM/yyyy, giá trị trả về chuẩn API YYYY-MM-DD.
 */
export const DatePicker: React.FC<WebDatePickerProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  minDate,
  maxDate,
  disabled = false,
  captionLayout = 'dropdown',
  placement = 'auto',
  hideIcon = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; ready: boolean }>({
    top: 0,
    left: 0,
    ready: false,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popRect = popoverRef.current?.getBoundingClientRect();
    const popW = popRect?.width || 308;
    const popH = popRect?.height || 336;
    const margin = 10;

    let top = rect.bottom + 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (placement === 'top' || (placement === 'auto' && spaceBelow < popH + margin && spaceAbove > spaceBelow)) {
      top = Math.max(margin, rect.top - popH - 6);
    } else if (top + popH > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - popH - margin);
    }

    let left = rect.left;
    if (left + popW > window.innerWidth - margin) {
      left = Math.max(margin, rect.right - popW);
    }
    if (left + popW > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - popW - margin);
    }
    if (left < margin) {
      left = margin;
    }

    setCoords({ top, left, ready: true });
  }, [placement]);

  useEffect(() => {
    if (!isOpen) {
      setCoords((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    updatePosition();
    const rafId = window.requestAnimationFrame(updatePosition);

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

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
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
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

        {!hideIcon && (
          <span className="text-slate-400 group-hover:text-emerald-600 flex items-center pointer-events-none ml-2">
            <FinanceIcon name="calendar" size={17} />
          </span>
        )}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              zIndex: 99999,
              visibility: coords.ready ? 'visible' : 'hidden',
            }}
            className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-max"
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

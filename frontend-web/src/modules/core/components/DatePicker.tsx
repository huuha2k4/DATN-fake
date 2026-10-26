import { useRef } from 'react';
import { formatDate } from '../utils/dateUtils';
import { FinanceIcon } from './FinanceIcon';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
}

/**
 * A beautiful date picker input component that displays date formatted as dd/mm/yyyy
 * while allowing clicking anywhere or the calendar icon to open the native date picker.
 */
export function DatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  required = false,
  min,
  max,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if (typeof (inputRef.current as any).showPicker === 'function') {
        (inputRef.current as any).showPicker();
      } else {
        inputRef.current.focus();
      }
    }
  };

  const formattedDisplay = value ? formatDate(value) : '';

  return (
    <div
      onClick={handleOpenPicker}
      className={`relative flex items-center justify-between cursor-pointer transition select-none ${className}`}
    >
      <span className={formattedDisplay ? 'text-[#14261e] text-sm font-semibold tracking-wide' : 'text-gray-400 text-sm font-medium'}>
        {formattedDisplay || placeholder}
      </span>

      <span className="text-gray-400 hover:text-[#07543f] flex items-center justify-center pointer-events-none">
        <FinanceIcon name="calendar" size={17} />
      </span>

      {/* Hidden native date input that opens native browser picker */}
      <input
        ref={inputRef}
        type="date"
        value={value || ''}
        required={required}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full cursor-pointer -z-10"
        tabIndex={-1}
      />
    </div>
  );
}

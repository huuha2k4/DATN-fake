import React from 'react';
import { DatePicker, type WebDatePickerProps } from './DatePicker';

export interface BirthDatePickerWebProps extends Omit<WebDatePickerProps, 'maxDate'> {}

/**
 * Component chuyên dụng cho Ngày sinh trên Web (BirthDatePicker):
 * - Không cho phép chọn ngày trong tương lai (maxDate = new Date()).
 * - Dropdown chọn nhanh năm/tháng.
 */
export const BirthDatePicker: React.FC<BirthDatePickerWebProps> = (props) => {
  return (
    <DatePicker
      {...props}
      placeholder={props.placeholder || 'dd/mm/yyyy'}
      maxDate={new Date()}
      captionLayout="dropdown"
    />
  );
};

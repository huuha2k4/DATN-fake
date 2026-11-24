import React from 'react';
import { AppDatePicker, AppDatePickerProps } from './AppDatePicker';

export interface BirthDatePickerProps extends Omit<AppDatePickerProps, 'maxDate'> {
  // Có thể truyền thêm năm sinh tối đa (mặc định là hôm nay)
}

/**
 * Component chuyên dụng cho Ngày sinh (BirthDatePicker):
 * - Ràng buộc: Ngày sinh KHÔNG được lớn hơn ngày hiện tại (maxDate = new Date()).
 * - Format chuẩn dd/MM/yyyy.
 */
export const BirthDatePicker: React.FC<BirthDatePickerProps> = (props) => {
  return (
    <AppDatePicker
      {...props}
      label={props.label ?? 'Ngày sinh'}
      placeholder={props.placeholder ?? 'DD/MM/YYYY'}
      maxDate={new Date()}
    />
  );
};

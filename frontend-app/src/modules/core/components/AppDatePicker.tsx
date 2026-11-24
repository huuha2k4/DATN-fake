import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { FinanceIcon } from './FinanceIcon';
import { formatDisplayDate, toApiDateString, parseLocalDate } from '../utils/datePickerUtils';

export interface AppDatePickerProps {
  /** Giá trị ngày: Date object hoặc chuỗi 'YYYY-MM-DD' / 'DD/MM/YYYY' */
  value?: Date | string | null;
  /** Callback khi người dùng chọn ngày. Trả về cả Date object và chuỗi API 'YYYY-MM-DD' */
  onChange: (date: Date, apiString: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  isDark?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  error?: string;
  required?: boolean;
}

/**
 * Component DatePicker chuẩn cho mobile (iOS + Android)
 * Tận dụng native DateTimePicker với theme màu Finora chuẩn.
 */
export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Chọn ngày (dd/mm/yyyy)',
  minDate,
  maxDate,
  isDark = false,
  disabled = false,
  style,
  error,
  required = false,
}) => {
  const currentDate = value ? (value instanceof Date ? value : parseLocalDate(value)) : new Date();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(currentDate);

  const displayString = value ? formatDisplayDate(value) : '';

  const handleOpen = () => {
    if (disabled) return;
    setTempDate(value ? (value instanceof Date ? value : parseLocalDate(value)) : new Date());
    setShowPicker(true);
  };

  const handleChangeAndroid = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate, toApiDateString(selectedDate));
    }
  };

  const handleConfirmIOS = () => {
    setShowPicker(false);
    onChange(tempDate, toApiDateString(tempDate));
  };

  const handleCancelIOS = () => {
    setShowPicker(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, isDark && styles.labelDark]}>
            {label} {required && <Text style={styles.requiredStar}>*</Text>}
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOpen}
        disabled={disabled}
        style={[
          styles.inputBox,
          isDark && styles.inputBoxDark,
          error ? styles.inputBoxError : null,
          disabled && styles.inputBoxDisabled,
        ]}
      >
        <Text
          style={[
            styles.inputText,
            isDark && styles.inputTextDark,
            !displayString && styles.placeholderText,
          ]}
        >
          {displayString || placeholder}
        </Text>
        <FinanceIcon
          name="calendar"
          size={18}
          color={isDark ? '#34D399' : '#007B58'}
        />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Android: Native dialog */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={handleChangeAndroid}
        />
      )}

      {/* iOS: Modal bottom-sheet sheet picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={handleCancelIOS}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.iosModalContent, isDark && styles.iosModalContentDark]}>
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={handleCancelIOS} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.iosCancelText, isDark && styles.iosCancelTextDark]}>Hủy</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitleText, isDark && styles.iosTitleTextDark]}>
                  {label || 'Chọn ngày'}
                </Text>
                <TouchableOpacity onPress={handleConfirmIOS} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.iosDoneText}>Xong</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                locale="vi-VN"
                minimumDate={minDate}
                maximumDate={maxDate}
                textColor={isDark ? '#FFFFFF' : '#0F172A'}
                accentColor={isDark ? '#34D399' : '#007B58'}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
                style={styles.iosPickerStyle}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  labelDark: {
    color: '#94A3B8',
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  inputBoxError: {
    borderColor: '#EF4444',
  },
  inputBoxDisabled: {
    opacity: 0.6,
  },
  inputText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#0F172A',
  },
  inputTextDark: {
    color: '#FFFFFF',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  errorText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  iosModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  iosModalContentDark: {
    backgroundColor: '#1E293B',
  },
  iosModalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  iosCancelText: {
    fontSize: 15,
    color: '#64748B',
  },
  iosCancelTextDark: {
    color: '#94A3B8',
  },
  iosTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  iosTitleTextDark: {
    color: '#FFFFFF',
  },
  iosDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007B58',
  },
  iosPickerStyle: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
});

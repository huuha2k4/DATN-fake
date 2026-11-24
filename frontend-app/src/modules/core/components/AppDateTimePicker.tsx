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
import { formatDisplayDate, formatDisplayTime, parseLocalDate } from '../utils/datePickerUtils';

export interface AppDateTimePickerProps {
  value?: Date | string | null;
  /** Trả về cả Date object, chuỗi ngày 'YYYY-MM-DD', chuỗi giờ 'HH:mm', và chuỗi ISO */
  onChange: (date: Date, dateStr: string, timeStr: string, isoStr: string) => void;
  label?: string;
  isDark?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Component chọn cả Ngày và Giờ (cho giao dịch, nhắc nhở, nợ...)
 */
export const AppDateTimePicker: React.FC<AppDateTimePickerProps> = ({
  value,
  onChange,
  label = 'Thời gian giao dịch',
  isDark = false,
  disabled = false,
  style,
}) => {
  const currentDate = value ? (value instanceof Date ? value : parseLocalDate(value)) : new Date();

  // Mode: 'date' | 'time'
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(currentDate);

  const displayDate = formatDisplayDate(selectedDateTime);
  const displayTime = formatDisplayTime(selectedDateTime);

  const openPicker = (mode: 'date' | 'time') => {
    if (disabled) return;
    setPickerMode(mode);
    setShowPicker(true);
  };

  const notifyChange = (newDate: Date) => {
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const timeStr = `${String(newDate.getHours()).padStart(2, '0')}:${String(newDate.getMinutes()).padStart(2, '0')}`;
    onChange(newDate, dateStr, timeStr, newDate.toISOString());
  };

  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && date) {
      const merged = new Date(selectedDateTime);
      if (pickerMode === 'date') {
        merged.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      } else {
        merged.setHours(date.getHours(), date.getMinutes());
      }
      setSelectedDateTime(merged);
      notifyChange(merged);
    }
  };

  const handleConfirmIOS = () => {
    setShowPicker(false);
    notifyChange(selectedDateTime);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
      ) : null}

      <View style={styles.row}>
        {/* Date Selector Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openPicker('date')}
          disabled={disabled}
          style={[styles.box, styles.dateBox, isDark && styles.boxDark]}
        >
          <View style={styles.iconWrap}>
            <FinanceIcon name="calendar" size={17} color={isDark ? '#34D399' : '#007B58'} />
          </View>
          <View>
            <Text style={[styles.subLabel, isDark && styles.subLabelDark]}>Ngày</Text>
            <Text style={[styles.valueText, isDark && styles.valueTextDark]}>{displayDate}</Text>
          </View>
        </TouchableOpacity>

        {/* Time Selector Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openPicker('time')}
          disabled={disabled}
          style={[styles.box, styles.timeBox, isDark && styles.boxDark]}
        >
          <View style={styles.iconWrap}>
            <FinanceIcon name="clock" size={17} color={isDark ? '#34D399' : '#007B58'} />
          </View>
          <View>
            <Text style={[styles.subLabel, isDark && styles.subLabelDark]}>Giờ</Text>
            <Text style={[styles.valueText, isDark && styles.valueTextDark]}>{displayTime}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Android Picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={selectedDateTime}
          mode={pickerMode}
          is24Hour={true}
          display="default"
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.iosModalContent, isDark && styles.iosModalContentDark]}>
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.iosCancelText, isDark && styles.iosCancelTextDark]}>Hủy</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitleText, isDark && styles.iosTitleTextDark]}>
                  {pickerMode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
                </Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={styles.iosDoneText}>Xong</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={selectedDateTime}
                mode={pickerMode}
                is24Hour={true}
                display={pickerMode === 'date' ? 'inline' : 'spinner'}
                locale="vi-VN"
                textColor={isDark ? '#FFFFFF' : '#0F172A'}
                accentColor={isDark ? '#34D399' : '#007B58'}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_, d) => {
                  if (d) setSelectedDateTime(d);
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  labelDark: {
    color: '#94A3B8',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  box: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  boxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  dateBox: {
    flex: 1.3,
  },
  timeBox: {
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 123, 88, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  subLabelDark: {
    color: '#94A3B8',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  valueTextDark: {
    color: '#FFFFFF',
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

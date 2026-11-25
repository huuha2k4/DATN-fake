import React, { useEffect, useState } from 'react';
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
import { useAppTheme } from '../../../context/ThemeContext';

export interface DateRangePickerProps {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  onChange: (start: Date, end: Date, startStr: string, endStr: string) => void;
  label?: string;
  isDark?: boolean;
  style?: ViewStyle;
}

/**
 * Component chọn khoảng ngày (DateRangePicker) cho báo cáo, lọc lịch sử giao dịch...
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  label = 'Khoảng thời gian',
  isDark: propIsDark,
  style,
}) => {
  const { isDark: themeIsDark } = useAppTheme();
  const isDark = propIsDark ?? themeIsDark;
  const currentStart = startDate ? (startDate instanceof Date ? startDate : parseLocalDate(startDate)) : new Date();
  const currentEnd = endDate ? (endDate instanceof Date ? endDate : parseLocalDate(endDate)) : new Date();

  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const [tempStart, setTempStart] = useState<Date>(currentStart);
  const [tempEnd, setTempEnd] = useState<Date>(currentEnd);

  useEffect(() => {
    if (startDate) {
      setTempStart(startDate instanceof Date ? startDate : parseLocalDate(startDate));
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      setTempEnd(endDate instanceof Date ? endDate : parseLocalDate(endDate));
    }
  }, [endDate]);

  const displayStart = startDate ? formatDisplayDate(startDate) : 'Từ ngày';
  const displayEnd = endDate ? formatDisplayDate(endDate) : 'Đến ngày';

  const handleOpen = (type: 'start' | 'end') => {
    setActivePicker(type);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const type = activePicker;
    setActivePicker(null);
    if (event.type === 'set' && selectedDate) {
      if (type === 'start') {
        const newStart = selectedDate;
        const validEnd = newStart > tempEnd ? newStart : tempEnd;
        setTempStart(newStart);
        setTempEnd(validEnd);
        onChange(newStart, validEnd, toApiDateString(newStart), toApiDateString(validEnd));
      } else {
        const newEnd = selectedDate;
        const validStart = newEnd < tempStart ? newEnd : tempStart;
        setTempStart(validStart);
        setTempEnd(newEnd);
        onChange(validStart, newEnd, toApiDateString(validStart), toApiDateString(newEnd));
      }
    }
  };

  const handleConfirmIOS = () => {
    setActivePicker(null);
    onChange(tempStart, tempEnd, toApiDateString(tempStart), toApiDateString(tempEnd));
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text> : null}

      <View style={styles.rangeRow}>
        {/* Start Date */}
        <TouchableOpacity
          style={[styles.dateBox, isDark && styles.dateBoxDark]}
          onPress={() => handleOpen('start')}
          activeOpacity={0.7}
        >
          <FinanceIcon name="calendar" size={16} color={isDark ? '#34D399' : '#007B58'} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.microLabel, isDark && styles.microLabelDark]}>Từ ngày</Text>
            <Text style={[styles.valueText, isDark && styles.valueTextDark]}>{displayStart}</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.separator, isDark && styles.separatorDark]}>→</Text>

        {/* End Date */}
        <TouchableOpacity
          style={[styles.dateBox, isDark && styles.dateBoxDark]}
          onPress={() => handleOpen('end')}
          activeOpacity={0.7}
        >
          <FinanceIcon name="calendar" size={16} color={isDark ? '#34D399' : '#007B58'} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.microLabel, isDark && styles.microLabelDark]}>Đến ngày</Text>
            <Text style={[styles.valueText, isDark && styles.valueTextDark]}>{displayEnd}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Android Picker */}
      {Platform.OS === 'android' && activePicker && (
        <DateTimePicker
          value={activePicker === 'start' ? tempStart : tempEnd}
          mode="date"
          display="default"
          minimumDate={activePicker === 'end' ? tempStart : undefined}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={activePicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.iosModalContent, isDark && styles.iosModalContentDark]}>
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={() => setActivePicker(null)}>
                  <Text style={[styles.iosCancelText, isDark && styles.iosCancelTextDark]}>Hủy</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitleText, isDark && styles.iosTitleTextDark]}>
                  {activePicker === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                </Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={styles.iosDoneText}>Xong</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={activePicker === 'start' ? tempStart : tempEnd}
                mode="date"
                display="spinner"
                minimumDate={activePicker === 'end' ? tempStart : undefined}
                textColor={isDark ? '#FFFFFF' : '#0F172A'}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_, d) => {
                  if (d) {
                    if (activePicker === 'start') setTempStart(d);
                    else setTempEnd(d);
                  }
                }}
                style={{ height: 215 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  labelDark: { color: '#94A3B8' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBox: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  dateBoxDark: { backgroundColor: '#0F172A', borderColor: '#1E293B' },
  microLabel: { fontSize: 10.5, color: '#64748B', fontWeight: '500' },
  microLabelDark: { color: '#94A3B8' },
  valueText: { fontSize: 13.5, fontWeight: '600', color: '#0F172A' },
  valueTextDark: { color: '#FFFFFF' },
  separator: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  separatorDark: { color: '#64748B' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  iosModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 },
  iosModalContentDark: { backgroundColor: '#1E293B' },
  iosModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  iosCancelText: { fontSize: 15, color: '#64748B' },
  iosCancelTextDark: { color: '#94A3B8' },
  iosTitleText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  iosTitleTextDark: { color: '#FFFFFF' },
  iosDoneText: { fontSize: 15, fontWeight: '700', color: '#007B58' },
});

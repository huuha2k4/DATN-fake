import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { goalsApi } from '../api/goalsApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const GOAL_TYPES = [
  {
    label: 'Mua sắm lớn',
    value: 'PURCHASE',
    iconKey: 'shopping',
    image: require('../../../assets/icons/goal_cat_shopping_3d.png'),
    desc: 'Mua xe, điện thoại, máy tính, sắm đồ gia dụng...',
  },
  {
    label: 'Du lịch',
    value: 'VACATION',
    iconKey: 'travel',
    image: require('../../../assets/icons/goal_cat_travel_3d.png'),
    desc: 'Nghỉ dưỡng, khám phá, vé máy bay, tour...',
  },
  {
    label: 'Học tập',
    value: 'EDUCATION',
    iconKey: 'education',
    image: require('../../../assets/icons/goal_cat_education_3d.png'),
    desc: 'Học phí, chứng chỉ ngoại ngữ, sách vở, laptop học...',
  },
  {
    label: 'Đầu tư',
    value: 'INVESTMENT',
    iconKey: 'investment',
    image: require('../../../assets/icons/goal_cat_investment_3d.png'),
    desc: 'Chứng khoán, vàng, bất động sản, sinh lời...',
  },
  {
    label: 'Thanh toán nợ',
    value: 'DEBT_PAYOFF',
    iconKey: 'debt',
    image: require('../../../assets/icons/goal_cat_debt_3d.png'),
    desc: 'Tất toán thẻ tín dụng, nợ ngân hàng, nợ người thân...',
  },
  {
    label: 'Gia đình',
    value: 'EMERGENCY_FUND',
    iconKey: 'family',
    image: require('../../../assets/icons/goal_cat_family_3d.png'),
    desc: 'Chăm sóc ba mẹ, con cái, sửa sang nhà cửa...',
  },
  {
    label: 'Mục tiêu khác',
    value: 'OTHER',
    iconKey: 'other',
    image: require('../../../assets/icons/goal_cat_other_3d.png'),
    desc: 'Các kế hoạch tài chính và ước mơ khác...',
  },
];

// Định dạng hiển thị số tiền có dấu chấm phân cách hàng nghìn (1.000.000)
function formatCurrencyInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
}

// Định dạng tự động khi gõ: dd/mm/yyyy
function formatInputDDMMYYYY(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Chuyển dd/mm/yyyy sang yyyy-mm-dd để gửi lên API backend
function parseDDMMYYYYtoIso(val?: string): string {
  if (!val) return '2027-12-31';
  const cleaned = val.trim();
  const match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return val;
}

export function CreateGoalModal({ visible, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState('PURCHASE');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('31/12/2027');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const selectedTypeObj = GOAL_TYPES.find((t) => t.value === goalType) || GOAL_TYPES[0];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên mục tiêu');
      return;
    }
    const target = parseFloat(targetAmount.replace(/[^0-9]/g, ''));
    if (!target || target <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền mục tiêu hợp lệ (> 0)');
      return;
    }
    const current = currentAmount ? parseFloat(currentAmount.replace(/[^0-9]/g, '')) : 0;
    const isoDate = parseDDMMYYYYtoIso(targetDateInput);

    setIsSubmitting(true);
    try {
      const res = await goalsApi.createGoal({
        name: name.trim(),
        goalType,
        icon: selectedTypeObj.iconKey,
        targetAmount: target,
        currentAmount: current,
        targetDate: isoDate,
        description: description.trim() || undefined,
      });

      if (res.ok) {
        Alert.alert('Thành công', 'Đã tạo mục tiêu tài chính mới!');
        setName('');
        setTargetAmount('');
        setCurrentAmount('');
        setDescription('');
        setTargetDateInput('31/12/2027');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Lỗi tạo mục tiêu', res.message || 'Không thể tạo mục tiêu, vui lòng thử lại.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra khi tạo mục tiêu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thêm mục tiêu mới</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Tên mục tiêu */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên mục tiêu *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Mua MacBook Pro, Du lịch Nhật Bản..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Loại mục tiêu (Dropdown phong cách quản lý nợ) */}
            <View style={styles.field}>
              <Text style={styles.label}>Loại mục tiêu</Text>
              <Pressable
                onPress={() => setShowCategoryPicker(true)}
                style={styles.dropdownBtn}
              >
                <View style={styles.dropdownLeft}>
                  <Image source={selectedTypeObj.image} style={styles.dropdownIconImg} resizeMode="contain" />
                  <Text style={styles.dropdownText}>{selectedTypeObj.label}</Text>
                </View>
                <FinanceIcon name="chevron-down" size={18} color="#006747" />
              </Pressable>
            </View>

            {/* Số tiền mục tiêu */}
            <View style={styles.field}>
              <Text style={styles.label}>Số tiền mục tiêu (đ) *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 20.000.000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={(val) => setTargetAmount(formatCurrencyInput(val))}
              />
            </View>

            {/* Đã có sẵn */}
            <View style={styles.field}>
              <Text style={styles.label}>Số tiền đã có sẵn (đ)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={currentAmount}
                onChangeText={(val) => setCurrentAmount(formatCurrencyInput(val))}
              />
            </View>

            {/* Thời hạn */}
            <View style={styles.field}>
              <Text style={styles.label}>Thời hạn hoàn thành</Text>
              <TextInput
                style={styles.input}
                placeholder="31/12/2027"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={targetDateInput}
                onChangeText={(t) => setTargetDateInput(formatInputDDMMYYYY(t))}
              />
            </View>

            {/* Mô tả */}
            <View style={styles.field}>
              <Text style={styles.label}>Mô tả ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập ghi chú cho mục tiêu..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Tạo mục tiêu</Text>
              )}
            </Pressable>
          </ScrollView>

          {/* OVERLAY PICKER MODAL CHỌN LOẠI MỤC TIÊU */}
          {showCategoryPicker && (
            <View style={styles.pickerBackdrop}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCategoryPicker(false)} />
              <View style={styles.pickerBox}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn loại mục tiêu</Text>
                  <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={10}>
                    <FinanceIcon name="close" size={18} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {GOAL_TYPES.map((t) => {
                    const isSel = goalType === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => {
                          setGoalType(t.value);
                          setShowCategoryPicker(false);
                        }}
                        style={[styles.pickerRow, isSel && styles.pickerRowActive]}
                      >
                        <Image source={t.image} style={styles.pickerItemImg} resizeMode="contain" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.pickerRowTitle, isSel && styles.pickerRowTitleActive]}>
                            {t.label}
                          </Text>
                          <Text style={styles.pickerRowDesc}>{t.desc}</Text>
                        </View>
                        {isSel && <FinanceIcon name="check" size={18} color="#006747" />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '90%',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  scroll: {
    paddingBottom: 40,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownIconImg: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#006747',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#006747',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Picker modal styling
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  pickerBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pickerRowActive: {
    backgroundColor: '#F0FDF4',
  },
  pickerItemImg: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  pickerRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerRowTitleActive: {
    color: '#006747',
    fontWeight: '700',
  },
  pickerRowDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
});

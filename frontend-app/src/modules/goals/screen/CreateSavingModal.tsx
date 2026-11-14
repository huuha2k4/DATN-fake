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

const SAVING_TYPES = [
  {
    label: 'Quỹ dự phòng khẩn cấp',
    value: 'Quỹ dự phòng khẩn cấp',
    iconKey: 'saving_emergency',
    image: require('../../../assets/icons/saving_cat_emergency_3d.png'),
    desc: 'Dành cho các tình huống khẩn cấp, y tế, bất khả kháng...',
  },
  {
    label: 'Tiết kiệm tự do',
    value: 'Tiết kiệm tự do',
    iconKey: 'saving_free',
    image: require('../../../assets/icons/saving_cat_free_3d.png'),
    desc: 'Tích lũy linh hoạt, không gò bó mục đích hay thời hạn...',
  },
  {
    label: 'Tiết kiệm có kỳ hạn',
    value: 'Tiết kiệm có kỳ hạn',
    iconKey: 'saving_term',
    image: require('../../../assets/icons/saving_cat_term_3d.png'),
    desc: 'Gửi định kỳ hàng tuần, hàng tháng có lãi suất...',
  },
  {
    label: 'Tiết kiệm dài hạn',
    value: 'Tiết kiệm dài hạn',
    iconKey: 'saving_longterm',
    image: require('../../../assets/icons/saving_cat_longterm_3d.png'),
    desc: 'Kế hoạch hưu trí, mua nhà, tương lai lâu dài...',
  },
  {
    label: 'Khác',
    value: 'Khác',
    iconKey: 'saving_other',
    image: require('../../../assets/icons/saving_cat_other_3d.png'),
    desc: 'Các quỹ và mục đích tiết kiệm linh hoạt khác...',
  },
];

// Định dạng hiển thị số tiền có dấu chấm phân cách hàng nghìn (1.000.000)
function formatCurrencyInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
}

export function CreateSavingModal({ visible, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tiết kiệm tự do');
  const [currentAmount, setCurrentAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const selectedTypeObj = SAVING_TYPES.find((t) => t.value === category) || SAVING_TYPES[1];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên khoản tiết kiệm');
      return;
    }
    const current = currentAmount ? parseFloat(currentAmount.replace(/[^0-9]/g, '')) : 0;

    setIsSubmitting(true);
    try {
      const res = await goalsApi.createSaving({
        name: name.trim(),
        category,
        currentAmount: current,
        description: description.trim() || undefined,
        icon: selectedTypeObj.iconKey,
      });

      if (res.ok) {
        Alert.alert('Thành công', 'Đã tạo khoản tiết kiệm mới!');
        setName('');
        setCurrentAmount('');
        setDescription('');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Lỗi tạo khoản tiết kiệm', res.message || 'Không thể tạo khoản tiết kiệm, vui lòng thử lại.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra khi tạo khoản tiết kiệm.');
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
            <Text style={styles.headerTitle}>Thêm khoản tiết kiệm mới</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Tên khoản tiết kiệm */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên khoản tiết kiệm *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Tiết kiệm tự do, Quỹ dự phòng cá nhân..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Loại tiết kiệm (Dropdown phong cách quản lý nợ) */}
            <View style={styles.field}>
              <Text style={styles.label}>Loại tiết kiệm</Text>
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

            {/* Số tiền ban đầu */}
            <View style={styles.field}>
              <Text style={styles.label}>Số tiền ban đầu (đ)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={currentAmount}
                onChangeText={(val) => setCurrentAmount(formatCurrencyInput(val))}
              />
            </View>

            {/* Mô tả */}
            <View style={styles.field}>
              <Text style={styles.label}>Mô tả ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập ghi chú cho khoản tiết kiệm..."
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
                <Text style={styles.submitBtnText}>Tạo khoản tiết kiệm</Text>
              )}
            </Pressable>
          </ScrollView>

          {/* OVERLAY PICKER MODAL CHỌN LOẠI TIẾT KIỆM */}
          {showCategoryPicker && (
            <View style={styles.pickerBackdrop}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCategoryPicker(false)} />
              <View style={styles.pickerBox}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn loại tiết kiệm</Text>
                  <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={10}>
                    <FinanceIcon name="close" size={18} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {SAVING_TYPES.map((t) => {
                    const isSel = category === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => {
                          setCategory(t.value);
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

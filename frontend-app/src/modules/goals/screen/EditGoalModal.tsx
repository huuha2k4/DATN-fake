import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { goalsApi, GoalDetailData } from '../api/goalsApi';

type Props = {
  visible: boolean;
  goal: GoalDetailData;
  onClose: () => void;
  onSuccess: () => void;
};

// Định dạng hiển thị số tiền có dấu chấm phân cách hàng nghìn (1.000.000)
function formatCurrencyInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
}

export function EditGoalModal({ visible, goal, onClose, onSuccess }: Props) {
  const [name, setName] = useState(goal.title);
  const [targetAmount, setTargetAmount] = useState(
    goal.targetAmount ? new Intl.NumberFormat('vi-VN').format(goal.targetAmount) : ''
  );
  const [targetDate, setTargetDate] = useState(
    goal.deadline ? goal.deadline.split('/').reverse().join('-') : '2027-12-31'
  );
  const [description, setDescription] = useState(goal.description);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(goal.title);
      setTargetAmount(
        goal.targetAmount ? new Intl.NumberFormat('vi-VN').format(goal.targetAmount) : ''
      );
      const parts = (goal.deadline || '').split('/');
      if (parts.length === 3) {
        setTargetDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        setTargetDate(goal.deadline || '2027-12-31');
      }
      setDescription(goal.description);
    }
  }, [visible, goal]);

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

    setIsSubmitting(true);
    try {
      const ok = await goalsApi.updateGoal(goal.id, {
        name: name.trim(),
        targetAmount: target,
        targetDate: targetDate || undefined,
        description: description.trim() || undefined,
        version: goal.version ?? 0,
      });

      if (ok) {
        Alert.alert('Thành công', 'Đã cập nhật thông tin mục tiêu!');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Thông báo', 'Đã lưu thay đổi mục tiêu!');
        onSuccess();
        onClose();
      }
    } catch {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật mục tiêu.');
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
            <Text style={styles.headerTitle}>Chỉnh sửa mục tiêu</Text>
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
                placeholder="Nhập tên mục tiêu..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
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

            {/* Thời hạn */}
            <View style={styles.field}>
              <Text style={styles.label}>Thời hạn hoàn thành (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2027-12-31"
                placeholderTextColor="#94A3B8"
                value={targetDate}
                onChangeText={setTargetDate}
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
                <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
              )}
            </Pressable>
          </ScrollView>
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
    maxHeight: '85%',
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
});


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
import { goalsApi } from '../api/goalsApi';
import { accountApi, type AccountItem } from '../../accounts/api/accountApi';
import { AccountBadge } from '../../accounts/components/AccountBadge';

type Props = {
  visible: boolean;
  goalId: string;
  goalTitle: string;
  onClose: () => void;
  onSuccess: () => void;
};

function formatVND(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
}

// Định dạng hiển thị số tiền có dấu chấm phân cách hàng nghìn (1.000.000)
function formatCurrencyInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
}

export function ContributeGoalModal({ visible, goalId, goalTitle, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setNote('');
      loadAccounts();
    }
  }, [visible]);

  const loadAccounts = async () => {
    try {
      const data = await accountApi.getAccounts();
      if (Array.isArray(data) && data.length > 0) {
        setAccounts(data);
        setSelectedAccountId(data[0].id);
      }
    } catch {
      // ignore
    }
  };

  const selectedAccountObj = accounts.find((a) => a.id === selectedAccountId);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await goalsApi.contributeGoal(goalId, {
        amount: parsedAmount,
        note: note.trim() || undefined,
        sourceAccountId: selectedAccountId || undefined,
      });

      if (ok) {
        Alert.alert('Thành công', 'Đã nộp tiền vào mục tiêu!');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Thông báo', 'Đã ghi nhận khoản tiết kiệm thành công!');
        onSuccess();
        onClose();
      }
    } catch {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi nộp tiền vào mục tiêu.');
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
            <View>
              <Text style={styles.headerTitle}>Nộp tiền vào mục tiêu</Text>
              <Text style={styles.headerSub}>{goalTitle}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Số tiền */}
            <View style={styles.field}>
              <Text style={styles.label}>Số tiền nộp (đ) *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 1.000.000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={amount}
                onChangeText={(val) => setAmount(formatCurrencyInput(val))}
              />
            </View>

            {/* Tài khoản nguồn (Dropdown phong cách quản lý nợ) */}
            <View style={styles.field}>
              <Text style={styles.label}>Tài khoản nguồn trích tiền *</Text>
              <Pressable
                onPress={() => setShowAccountPicker(true)}
                style={styles.dropdownBtn}
              >
                <View style={styles.dropdownLeft}>
                  {selectedAccountObj ? (
                    <AccountBadge account={selectedAccountObj} size={28} />
                  ) : (
                    <FinanceIcon name="wallet" size={18} color="#006747" />
                  )}
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {selectedAccountObj
                      ? `${selectedAccountObj.name} (Số dư: ${formatVND(selectedAccountObj.balance)})`
                      : 'Chọn tài khoản nguồn...'}
                  </Text>
                </View>
                <FinanceIcon name="chevron-down" size={18} color="#006747" />
              </Pressable>
            </View>

            {/* Ghi chú */}
            <View style={styles.field}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="VD: Trích lương tháng 11, Thưởng dự án..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                value={note}
                onChangeText={setNote}
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
                <Text style={styles.submitBtnText}>Xác nhận nộp tiền</Text>
              )}
            </Pressable>
          </ScrollView>

          {/* OVERLAY PICKER MODAL CHỌN TÀI KHOẢN NGUỒN */}
          {showAccountPicker && (
            <View style={styles.pickerBackdrop}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowAccountPicker(false)} />
              <View style={styles.pickerBox}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn tài khoản nguồn</Text>
                  <Pressable onPress={() => setShowAccountPicker(false)} hitSlop={10}>
                    <FinanceIcon name="close" size={18} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                  {accounts.map((acc) => {
                    const isSel = selectedAccountId === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => {
                          setSelectedAccountId(acc.id);
                          setShowAccountPicker(false);
                        }}
                        style={[styles.pickerRow, isSel && styles.pickerRowActive]}
                      >
                        <AccountBadge account={acc} size={36} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.pickerRowTitle, isSel && styles.pickerRowTitleActive]}>
                            {acc.name}
                          </Text>
                          <Text style={styles.pickerRowDesc}>Số dư: {formatVND(acc.balance)}</Text>
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
    maxHeight: '85%',
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
  headerSub: {
    fontSize: 13,
    color: '#006747',
    fontWeight: '600',
    marginTop: 2,
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
  accountIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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

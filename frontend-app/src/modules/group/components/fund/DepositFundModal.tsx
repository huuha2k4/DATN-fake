import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import type { AccountItem } from '../../../add-transaction/api/transactionApi';

export interface DepositFundModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountItem[];
  groupName?: string;
  currentFundAmount?: number;
  onSubmit: (data: { sourceAccountId: string; amount: number; note?: string }) => Promise<void>;
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

function formatVND(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
}

export const DepositFundModal: React.FC<DepositFundModalProps> = ({
  visible,
  onClose,
  accounts,
  groupName = 'Nhóm',
  currentFundAmount = 0,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleSubmit = async () => {
    const amountNum = parseInt(amount.replace(/\D/g, '') || '0', 10);
    if (amountNum <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền muốn nộp vào quỹ');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Thông báo', 'Vui lòng chọn ví/tài khoản nguồn trích tiền');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        sourceAccountId: selectedAccountId,
        amount: amountNum,
        note: note.trim() || undefined,
      });
      setAmount('');
      setNote('');
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể nộp quỹ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectQuickAmount = (val: number) => {
    setAmount(formatVND(val));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Thanh gạch nhỏ kéo modal */}
          <View style={styles.dragBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nộp quỹ nhóm</Text>
              <Text style={styles.subtitle}>
                Góp thêm tiền vào quỹ chung {groupName}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Banner tóm tắt số dư hiện tại */}
            <View style={styles.currentFundBox}>
              <View style={styles.currentFundIconWrap}>
                <FinanceIcon name="piggy-bank" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentFundLabel}>Quỹ hiện tại của nhóm</Text>
                <Text style={styles.currentFundVal}>{formatVND(currentFundAmount)} đ</Text>
              </View>
            </View>

            {/* Ô nhập số tiền lớn hiện đại */}
            <View style={styles.amountInputCard}>
              <Text style={styles.amountInputLabel}>SỐ TIỀN MUỐN NỘP</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  value={
                    amount
                      ? formatVND(parseInt(amount.replace(/\D/g, '') || '0', 10))
                      : ''
                  }
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="numeric"
                  style={styles.amountTextInput}
                  autoFocus
                />
                <Text style={styles.amountCurrency}>đ</Text>
              </View>

              {/* Các nút chọn nhanh mức tiền */}
              <View style={styles.quickAmountRow}>
                {QUICK_AMOUNTS.map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => handleSelectQuickAmount(val)}
                    style={styles.quickAmountBtn}
                  >
                    <Text style={styles.quickAmountBtnText}>+{formatVND(val / 1000)}k</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Chọn nguồn trích tiền */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>Nguồn tiền trích</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              >
                {accounts.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => setSelectedAccountId(acc.id)}
                      style={[
                        styles.accountCard,
                        isSelected && styles.accountCardSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.accountIconBox,
                          isSelected && { backgroundColor: '#10B981' },
                        ]}
                      >
                        <FinanceIcon
                          name="wallet"
                          size={16}
                          color={isSelected ? '#FFFFFF' : '#059669'}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.accountName,
                            isSelected && styles.accountNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {acc.name}
                        </Text>
                        <Text style={styles.accountBal}>
                          {formatVND(acc.balance || 0)} đ
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Ghi chú */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>Ghi chú nộp tiền</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="VD: Đóng quỹ tháng này, Tiền ăn chung..."
                placeholderTextColor="#94A3B8"
                style={styles.noteInput}
              />
            </View>

            {/* Nút nộp quỹ chính */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85 },
                submitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <FinanceIcon name="wallet" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Xác nhận nộp quỹ</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentFundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  currentFundIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentFundLabel: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  currentFundVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 1,
  },
  amountInputCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    alignItems: 'center',
  },
  amountInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountTextInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669',
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
  },
  amountCurrency: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 4,
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  quickAmountBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAmountBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  accountCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 120,
  },
  accountNameSelected: {
    color: '#059669',
  },
  accountBal: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13.5,
    color: '#0F172A',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default DepositFundModal;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { AppAlert as Alert } from '../../../context/DialogContext';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { goalsApi } from '../api/goalsApi';
import { accountApi, type AccountItem } from '../../accounts/api/accountApi';
import { authStorage } from '../../auth/api/authApi';
import { groupApi } from '../../group/api/groupApi';
import { AccountBadge } from '../../accounts/components/AccountBadge';
import { useAppTheme } from '../../../context/ThemeContext';

type Props = {
  visible: boolean;
  goalId: string;
  goalTitle: string;
  maxAmount: number;
  onClose: () => void;
  onSuccess: () => void;
};

function formatVND(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
}

function formatCurrencyInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(parseInt(digits, 10));
}

export function WithdrawGoalModal({
  visible,
  goalId,
  goalTitle,
  maxAmount,
  onClose,
  onSuccess,
}: Props) {
  const { isDark, colors: themeColors } = useAppTheme();
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

  const user = authStorage.getUser();
  const isChildAccount = Boolean(user?.childAccount && user?.childWalletGroupId);

  const loadAccounts = async () => {
    if (isChildAccount && user?.childWalletId && user?.childWalletGroupId) {
      let currentBal = 0;
      try {
        const walletData = await groupApi.getChildWallet(user.childWalletGroupId, user.childWalletId);
        if (walletData && walletData.balance !== undefined) {
          currentBal = Number(walletData.balance);
        }
      } catch {
        // ignore
      }
      const childAcc: AccountItem = {
        id: user.childWalletId,
        name: user.childWalletName || 'Ví của em',
        accountType: 'CASH',
        currencyCode: 'VND',
        balance: currentBal,
      };
      setAccounts([childAcc]);
      setSelectedAccountId(user.childWalletId);
      return;
    }
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
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền rút hợp lệ (> 0)');
      return;
    }

    if (parsedAmount > maxAmount) {
      Alert.alert('Lỗi', `Số tiền rút vượt quá số dư hiện có (${formatVND(maxAmount)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await goalsApi.withdrawGoal(goalId, {
        amount: parsedAmount,
        note: note.trim() || undefined,
        targetAccountId: selectedAccountId || undefined,
      });

      if (res.ok) {
        Alert.alert('Thành công', 'Đã rút tiền về tài khoản thành công!');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Lỗi rút tiền', res.message || 'Không thể rút tiền, vui lòng thử lại.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra khi rút tiền.');
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
        <View
          style={[
            styles.sheet,
            isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, isDark && { borderBottomColor: themeColors.cardBorder }]}>
            <View>
              <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>
                Rút tiền tích lũy
              </Text>
              <Text style={[styles.headerSub, isDark && { color: '#F87171' }]}>{goalTitle}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
            >
              <FinanceIcon name="close" size={20} color={isDark ? themeColors.textSecondary : '#64748B'} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Hộp thông tin số dư hiện có */}
            <View
              style={[
                styles.balanceInfoCard,
                isDark && { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.25)' },
              ]}
            >
              <Text style={[styles.balanceInfoLabel, isDark && { color: '#FCA5A5' }]}>
                Số dư khả dụng để rút
              </Text>
              <Text style={[styles.balanceInfoValue, isDark && { color: '#F87171' }]}>{formatVND(maxAmount)}</Text>
            </View>

            {/* Số tiền cần rút */}
            <View style={styles.field}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.label, isDark && { color: themeColors.textSecondary }]}>
                  Số tiền rút (đ) *
                </Text>
                <Pressable onPress={() => setAmount(formatCurrencyInput(String(Math.floor(maxAmount))))}>
                  <Text style={[styles.quickAllText, isDark && { color: '#34D399' }]}>Rút tất cả</Text>
                </Pressable>
              </View>
              <TextInput
                style={[
                  styles.input,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="VD: 500.000"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="numeric"
                value={amount}
                onChangeText={(val) => setAmount(formatCurrencyInput(val))}
              />
            </View>

            {/* Tài khoản nhận tiền (Dropdown - Khóa khi là ví của bé) */}
            <View style={styles.field}>
              <Text style={[styles.label, isDark && { color: themeColors.textSecondary }]}>
                Tài khoản nhận tiền *
              </Text>
              {isChildAccount ? (
                <View
                  style={[
                    styles.dropdownBtn,
                    {
                      backgroundColor: isDark ? themeColors.surfaceSubtle : '#F8FAFC',
                      borderColor: isDark ? themeColors.cardBorder : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.dropdownLeft}>
                    <FinanceIcon name="wallet" size={18} color="#059669" />
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: isDark ? themeColors.textPrimary : '#0F172A', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {user?.childWalletName || 'Ví của em'}{' '}
                      {selectedAccountObj ? `(Số dư: ${formatVND(selectedAccountObj.balance)})` : ''}
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowAccountPicker(true)}
                  style={[
                    styles.dropdownBtn,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.dropdownLeft}>
                    {selectedAccountObj ? (
                      <AccountBadge account={selectedAccountObj} size={28} />
                    ) : (
                      <FinanceIcon name="wallet" size={18} color={isDark ? '#34D399' : '#006747'} />
                    )}
                    <Text
                      style={[styles.dropdownText, isDark && { color: themeColors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {selectedAccountObj
                        ? `${selectedAccountObj.name} (Số dư: ${formatVND(selectedAccountObj.balance)})`
                        : 'Chọn tài khoản nhận tiền...'}
                    </Text>
                  </View>
                  <FinanceIcon name="chevron-down" size={18} color={isDark ? '#34D399' : '#006747'} />
                </Pressable>
              )}
            </View>

            {/* Ghi chú */}
            <View style={styles.field}>
              <Text style={[styles.label, isDark && { color: themeColors.textSecondary }]}>Lý do / Ghi chú</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="VD: Rút tiền chi tiêu khẩn cấp, mua sắm..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={2}
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={[
                styles.submitBtn,
                isDark && { backgroundColor: '#DC2626', shadowColor: '#DC2626' },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Xác nhận rút tiền</Text>
              )}
            </Pressable>
          </ScrollView>

          {/* OVERLAY PICKER MODAL CHỌN TÀI KHOẢN NHẬN TIỀN */}
          {showAccountPicker && (
            <View style={styles.pickerBackdrop}>
              <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowAccountPicker(false)} />
              <View
                style={[
                  styles.pickerBox,
                  isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
                ]}
              >
                <View style={[styles.pickerHeader, isDark && { borderBottomColor: themeColors.cardBorder }]}>
                  <Text style={[styles.pickerTitle, isDark && { color: themeColors.textPrimary }]}>
                    Chọn tài khoản nhận tiền
                  </Text>
                  <Pressable onPress={() => setShowAccountPicker(false)} hitSlop={10}>
                    <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : '#64748B'} />
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
                        style={[
                          styles.pickerRow,
                          isSel && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerRowActive),
                        ]}
                      >
                        <AccountBadge account={acc} size={36} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text
                            style={[
                              styles.pickerRowTitle,
                              isDark && { color: themeColors.textPrimary },
                              isSel && (isDark ? { color: '#34D399', fontWeight: '700' } : styles.pickerRowTitleActive),
                            ]}
                          >
                            {acc.name}
                          </Text>
                          <Text style={[styles.pickerRowDesc, isDark && { color: themeColors.textSecondary }]}>
                            Số dư: {formatVND(acc.balance)}
                          </Text>
                        </View>
                        {isSel && <FinanceIcon name="check" size={18} color={isDark ? '#34D399' : '#006747'} />}
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
    marginBottom: 14,
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
    color: '#DC2626',
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
  balanceInfoCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfoLabel: {
    fontSize: 12.5,
    color: '#991B1B',
    fontWeight: '600',
  },
  balanceInfoValue: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  quickAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#006747',
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
    minHeight: 65,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#DC2626',
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


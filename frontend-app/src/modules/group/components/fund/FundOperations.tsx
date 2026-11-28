import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppAlert as Alert } from '../../../../context/DialogContext';
import { useAppTheme } from '../../../../context/ThemeContext';
import {
  groupApi,
  type GroupFundContributionResponse,
  type FundReimbursementResponse,
  type ReimbursementPayment,
} from '../../api/groupApi';

type Props = {
  groupId: string;
  userId?: string;
  targetId?: string;
  canManage: boolean;
  balance: number;
  contributions: GroupFundContributionResponse[];
  reimbursements: FundReimbursementResponse[];
  accounts: { id: string; name: string }[];
  memberName: (id: string) => string;
  expenseName: (id: string) => string;
  refresh: () => Promise<void>;
};

const money = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

const REIMB_LABEL = {
  PENDING: 'Chờ hoàn trả',
  PARTIAL: 'Hoàn một phần',
  COMPLETED: 'Đã hoàn đủ',
  CANCELLED: 'Đã hủy',
};

export function FundOperations(props: Props) {
  const { colors, isDark } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const paymentAttempt = useRef<{ signature: string; key: string } | null>(null);
  const [history, setHistory] = useState<Record<string, ReimbursementPayment[]>>({});
  const [payment, setPayment] = useState<{ id: string; amount: string; wallet: boolean } | null>(null);

  const reimbursements = [...props.reimbursements].sort(
    (a, b) => Number(b.id === props.targetId) - Number(a.id === props.targetId)
  );

  const submit = async (action: () => Promise<unknown>, refetch = true) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      if (refetch) await props.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const pay = async (item: FundReimbursementResponse) => {
    if (!payment || payment.id !== item.id) return;
    const amount = Number(payment.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > Math.min(props.balance, item.remainingAmount)) {
      setError('Kiểm tra số tiền, nghĩa vụ còn lại và số dư quỹ.');
      return;
    }
    const signature = JSON.stringify(payment);
    const key =
      paymentAttempt.current?.signature === signature
        ? paymentAttempt.current.key
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    paymentAttempt.current = { signature, key };
    await submit(async () => {
      await groupApi.payReimbursement(props.groupId, item.id, { amount, useAuthorizedWallet: payment.wallet }, key);
      paymentAttempt.current = null;
      setPayment(null);
      setHistory((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    });
  };

  const toggleHistory = (id: string) => {
    if (history[id]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    void submit(async () => {
      const rows = await groupApi.getReimbursementHistory(props.groupId, id);
      setHistory((current) => ({ ...current, [id]: rows }));
    }, false);
  };

  const badgePalette = (status: string) => {
    if (status === 'COMPLETED') return { bg: isDark ? '#064E3B' : '#ECFDF5', text: isDark ? '#6EE7B7' : '#007F53' };
    if (status === 'PENDING') return { bg: isDark ? '#451A03' : '#FEF3C7', text: isDark ? '#FCD34D' : '#B45309' };
    if (status === 'PARTIAL') return { bg: isDark ? '#0C4A6E' : '#E0F2FE', text: isDark ? '#7DD3FC' : '#0369A1' };
    return { bg: isDark ? '#1E293B' : '#F1F5F9', text: colors.textSecondary };
  };

  const inputStyle = [
    styles.input,
    { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
  ];

  return (
    <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Hoàn trả tiền ứng</Text>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }]}>
          <Text accessibilityRole="alert" style={{ color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: 12, fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      )}

      <View style={{ gap: 10 }}>
        {reimbursements.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có khoản ứng cần theo dõi.</Text>
        ) : (
          reimbursements.map((item) => {
            const pal = badgePalette(item.status);
            const pct = item.totalAmount > 0 ? Math.min(100, Math.round((item.reimbursedAmount / item.totalAmount) * 100)) : 0;
            const isOpen = item.remainingAmount > 0 && item.status !== 'CANCELLED';

            return (
              <View
                key={item.id}
                style={[styles.itemCard, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#111827' : '#F8FAFC' }]}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13.5 }}>
                      {props.expenseName(item.expenseId)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11.5, marginTop: 2 }}>
                      Người ứng: {props.memberName(item.beneficiaryUserId)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: pal.bg }]}>
                    <Text style={{ color: pal.text, fontSize: 10.5, fontWeight: '700' }}>{REIMB_LABEL[item.status]}</Text>
                  </View>
                </View>

                <View style={[styles.statRow, { backgroundColor: colors.surface }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đã ứng</Text>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>{money(item.totalAmount)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Đã hoàn</Text>
                    <Text style={[styles.statVal, { color: '#007F53' }]}>{money(item.reimbursedAmount)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Còn lại</Text>
                    <Text style={[styles.statVal, { color: '#D97706' }]}>{money(item.remainingAmount)}</Text>
                  </View>
                </View>

                <View style={[styles.track, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <View style={[styles.fill, { width: `${pct}%` }]} />
                </View>

                {item.beneficiaryUserId === props.userId && isOpen && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontWeight: '600' }}>
                      Chọn ví nhận hoàn trả:
                    </Text>
                    <View style={styles.chipWrap}>
                      {props.accounts.map((account) => {
                        const picked = account.id === item.authorizedAccountId;
                        return (
                          <Pressable
                            key={account.id}
                            disabled={busy}
                            onPress={() =>
                              Alert.alert('Đồng ý nhận hoàn trả', `Cho phép hoàn tiền vào ${account.name}?`, [
                                { text: 'Hủy', style: 'cancel' },
                                {
                                  text: 'Đồng ý',
                                  onPress: () => void submit(() => groupApi.setReimbursementWallet(props.groupId, item.id, account.id)),
                                },
                              ])
                            }
                            style={[
                              styles.chip,
                              {
                                borderColor: picked ? '#007F53' : colors.cardBorder,
                                backgroundColor: picked ? (isDark ? '#064E3B' : '#ECFDF5') : 'transparent',
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: picked ? '#007F53' : colors.textPrimary }}>
                              {picked ? '✓ ' : ''}
                              {account.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {item.walletAuthorized && (
                        <Pressable
                          disabled={busy}
                          onPress={() => void submit(() => groupApi.setReimbursementWallet(props.groupId, item.id, null))}
                          style={[styles.chip, { borderColor: isDark ? '#991B1B' : '#FECACA' }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>Thu hồi ví</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.btnRow}>
                  {props.canManage && isOpen && (
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        setPayment(
                          payment?.id === item.id
                            ? null
                            : { id: item.id, amount: String(item.remainingAmount), wallet: Boolean(item.walletAuthorized) }
                        )
                      }
                      style={[styles.primaryBtn, { flex: 1 }]}
                    >
                      <Text style={styles.primaryBtnText}>Ghi nhận hoàn trả</Text>
                    </Pressable>
                  )}
                  <Pressable
                    disabled={busy}
                    onPress={() => toggleHistory(item.id)}
                    style={[styles.outlineBtn, { borderColor: colors.cardBorder }]}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {history[item.id] ? 'Ẩn lịch sử' : 'Lịch sử'}
                    </Text>
                  </Pressable>
                </View>

                {payment?.id === item.id && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <TextInput
                      accessibilityLabel="Số tiền hoàn trả"
                      style={inputStyle}
                      keyboardType="number-pad"
                      value={payment.amount}
                      onChangeText={(amount) => setPayment({ ...payment, amount: amount.replace(/\D/g, '') })}
                    />
                    {item.walletAuthorized && (
                      <View style={styles.chipWrap}>
                        <Pressable
                          onPress={() => setPayment({ ...payment, wallet: true })}
                          style={[styles.chip, { borderColor: payment.wallet ? '#007F53' : colors.cardBorder }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: payment.wallet ? '#007F53' : colors.textSecondary }}>
                            Vào ví người nhận
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setPayment({ ...payment, wallet: false })}
                          style={[styles.chip, { borderColor: !payment.wallet ? '#007F53' : colors.cardBorder }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: !payment.wallet ? '#007F53' : colors.textSecondary }}>
                            Hoàn trực tiếp
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    <View style={styles.btnRow}>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          Alert.alert('Hoàn trả tiền ứng', `Xác nhận hoàn ${money(Number(payment.amount))} từ quỹ?`, [
                            { text: 'Hủy', style: 'cancel' },
                            { text: 'Xác nhận', onPress: () => void pay(item) },
                          ])
                        }
                        style={[styles.primaryBtn, { flex: 1 }]}
                      >
                        <Text style={styles.primaryBtnText}>Xác nhận hoàn</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => setPayment(null)}
                        style={[styles.outlineBtn, { borderColor: colors.cardBorder }]}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Hủy</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {history[item.id] && (
                  <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 8 }}>
                    {history[item.id].length === 0 ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Chưa có lần hoàn trả.</Text>
                    ) : (
                      history[item.id].map((row) => (
                        <Text key={row.id} style={{ color: colors.textSecondary, fontSize: 12 }}>
                          • <Text style={{ color: '#007F53', fontWeight: '700' }}>{money(row.amount)}</Text> ·{' '}
                          {row.wallet ? 'Ví Finora' : 'Trực tiếp'} · {new Date(row.paidAt).toLocaleDateString('vi-VN')}{' '}
                          {row.note}
                        </Text>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 15.5, fontWeight: '800' },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 10 },
  emptyText: { fontSize: 12.5, textAlign: 'center', paddingVertical: 14 },
  itemCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statRow: { flexDirection: 'row', borderRadius: 10, padding: 8, gap: 6 },
  statLabel: { fontSize: 10.5 },
  statVal: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#007F53' },
  btnRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { minHeight: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#007F53', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  outlineBtn: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 34, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
});

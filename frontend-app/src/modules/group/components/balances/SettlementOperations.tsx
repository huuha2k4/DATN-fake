import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../../../../context/ThemeContext';
import { AppAlert as Alert } from '../../../../context/DialogContext';
import { groupApi, type SettlementResponse } from '../../api/groupApi';

export type DebtTarget = { toUserId: string; toUserName: string; amount: number };
type Props = {
  groupId: string;
  userId?: string;
  targetId?: string;
  accounts: { id: string; name: string }[];
  target: DebtTarget | null;
  memberName: (id: string) => string;
  clearTarget: () => void;
  refreshBalances: () => Promise<void>;
};

const STATUSES = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã hoàn tất',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy',
};

export function SettlementOperations({
  groupId,
  userId,
  targetId,
  accounts,
  target,
  memberName,
  clearTarget,
  refreshBalances,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const [rows, setRows] = useState<SettlementResponse[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [review, setReview] = useState<{ id: string; mode: 'reject' | 'confirm'; value: string } | null>(null);

  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xử lý thanh toán.');
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  const load = async () => {
    const records = await groupApi.getSettlements(groupId);
    setRows(
      records.sort(
        (a, b) =>
          Number(b.id === targetId) - Number(a.id === targetId) ||
          Number(b.status === 'PENDING') - Number(a.status === 'PENDING')
      )
    );
  };

  useEffect(() => {
    void run(load);
  }, [groupId, targetId]);

  useEffect(() => {
    setAmount(target ? String(target.amount) : '');
    setAccountId('');
  }, [target]);

  const send = () => {
    const value = Number(amount);
    if (!target || !accountId || !Number.isSafeInteger(value) || value <= 0 || value > target.amount) {
      setError('Chọn ví nguồn và nhập số tiền trong giới hạn công nợ.');
      return;
    }
    const data = { payeeId: target.toUserId, sourceAccountId: accountId, amount: value };
    const signature = JSON.stringify(data);
    const key =
      attempt.current?.signature === signature
        ? attempt.current.key
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    attempt.current = { signature, key };
    Alert.alert('Gửi yêu cầu thanh toán', `Thanh toán ${value.toLocaleString('vi-VN')} đ cho ${target.toUserName}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gửi',
        onPress: () =>
          void run(async () => {
            await groupApi.createSettlement(groupId, data, key);
            attempt.current = null;
            clearTarget();
            await load();
          }),
      },
    ]);
  };

  const refresh = async () => {
    await Promise.all([load(), refreshBalances()]);
  };

  const badgeStyle = (status: SettlementResponse['status']) => {
    if (status === 'CONFIRMED') return { bg: isDark ? '#064E3B' : '#ECFDF5', text: isDark ? '#6EE7B7' : '#007F53' };
    if (status === 'PENDING') return { bg: isDark ? '#451A03' : '#FEF3C7', text: isDark ? '#FCD34D' : '#B45309' };
    if (status === 'REJECTED') return { bg: isDark ? '#450A0A' : '#FEE2E2', text: isDark ? '#FCA5A5' : '#B91C1C' };
    return { bg: isDark ? '#1E293B' : '#F1F5F9', text: colors.textSecondary };
  };

  const renderWalletChips = (selected: string, select: (id: string) => void) => (
    <View style={styles.chipWrap}>
      {accounts.map((account) => {
        const picked = selected === account.id;
        return (
          <Pressable
            key={account.id}
            disabled={busy}
            onPress={() => select(account.id)}
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
    </View>
  );

  const inputStyle = [
    styles.input,
    { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
  ];

  return (
    <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }]}>
          <Text accessibilityRole="alert" style={{ color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: 12, fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      )}

      {target && (
        <View style={[styles.subPanel, { borderColor: isDark ? '#047857' : '#A7F3D0', backgroundColor: isDark ? '#064E3B25' : '#ECFDF580' }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Thanh toán cho {target.toUserName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Tối đa {target.amount.toLocaleString('vi-VN')} đ
          </Text>
          <TextInput
            accessibilityLabel="Số tiền thanh toán"
            style={inputStyle}
            keyboardType="number-pad"
            value={amount}
            onChangeText={(value) => setAmount(value.replace(/\D/g, ''))}
          />
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Chọn ví nguồn</Text>
          {renderWalletChips(accountId, setAccountId)}
          <View style={styles.btnRow}>
            <Pressable
              disabled={busy || !accountId}
              onPress={send}
              style={[styles.primaryBtn, { flex: 1, opacity: busy || !accountId ? 0.5 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>Gửi yêu cầu</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={clearTarget} style={[styles.outlineBtn, { borderColor: colors.cardBorder }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12.5, fontWeight: '600' }}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Các lượt thanh toán bù trừ</Text>
        <Pressable
          disabled={busy}
          onPress={() => void run(refresh)}
          style={[styles.miniBtn, { borderColor: colors.cardBorder }]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontWeight: '600' }}>Làm mới</Text>
        </Pressable>
      </View>

      {rows === null && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{busy ? 'Đang tải…' : 'Chưa tải được yêu cầu.'}</Text>}
      {rows?.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có yêu cầu thanh toán nào.</Text>}

      {rows?.map((row) => {
        const pal = badgeStyle(row.status);
        const isPending = row.status === 'PENDING';
        return (
          <View
            key={row.id}
            style={[
              styles.itemCard,
              {
                borderColor: isPending ? (isDark ? '#92400E' : '#FDE68A') : colors.cardBorder,
                backgroundColor: isDark ? '#111827' : '#F8FAFC',
              },
            ]}
          >
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13.5 }}>
                  {memberName(row.fromUserId)} → {memberName(row.toUserId)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11.5, marginTop: 2 }}>{row.settlementDate}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: '#007F53', fontWeight: '800', fontSize: 14 }}>
                  {row.amount.toLocaleString('vi-VN')} đ
                </Text>
                <View style={[styles.badge, { backgroundColor: pal.bg }]}>
                  <Text style={{ color: pal.text, fontSize: 10.5, fontWeight: '700' }}>{STATUSES[row.status]}</Text>
                </View>
              </View>
            </View>

            {!!row.rejectionReason && (
              <Text style={{ color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: 12 }}>
                Lý do từ chối: {row.rejectionReason}
              </Text>
            )}

            {isPending && row.fromUserId === userId && (
              <Pressable
                disabled={busy}
                onPress={() =>
                  Alert.alert('Hủy yêu cầu?', 'Yêu cầu thanh toán này sẽ bị hủy.', [
                    { text: 'Giữ lại', style: 'cancel' },
                    {
                      text: 'Hủy yêu cầu',
                      style: 'destructive',
                      onPress: () =>
                        void run(async () => {
                          await groupApi.reviewSettlement(groupId, row.id, 'cancel');
                          await refresh();
                        }),
                    },
                  ])
                }
                style={[styles.outlineBtn, { borderColor: colors.cardBorder, alignSelf: 'flex-start' }]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Hủy yêu cầu</Text>
              </Pressable>
            )}

            {isPending && row.toUserId === userId && (
              <View style={{ gap: 8, marginTop: 2 }}>
                <View style={styles.btnRow}>
                  <Pressable
                    disabled={busy}
                    onPress={() => setReview(review?.id === row.id && review.mode === 'confirm' ? null : { id: row.id, mode: 'confirm', value: '' })}
                    style={[styles.primaryBtn, { flex: 1 }]}
                  >
                    <Text style={styles.primaryBtnText}>Xác nhận nhận tiền</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() => setReview(review?.id === row.id && review.mode === 'reject' ? null : { id: row.id, mode: 'reject', value: '' })}
                    style={[styles.dangerOutlineBtn, { borderColor: isDark ? '#991B1B' : '#FECACA' }]}
                  >
                    <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontSize: 12.5, fontWeight: '700' }}>
                      Từ chối
                    </Text>
                  </Pressable>
                </View>

                {review?.id === row.id && review.mode === 'confirm' && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Chọn ví nhận tiền:</Text>
                    {renderWalletChips(review.value, (value) => setReview({ ...review, value }))}
                    <Pressable
                      disabled={busy || !review.value}
                      onPress={() =>
                        Alert.alert('Xác nhận thanh toán', `Ghi nhận ${row.amount.toLocaleString('vi-VN')} đ vào ví đã chọn?`, [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Xác nhận',
                            onPress: () =>
                              void run(async () => {
                                await groupApi.confirmSettlement(groupId, row.id, review.value);
                                setReview(null);
                                await refresh();
                              }),
                          },
                        ])
                      }
                      style={[styles.primaryBtn, { opacity: busy || !review.value ? 0.5 : 1 }]}
                    >
                      <Text style={styles.primaryBtnText}>Hoàn tất xác nhận</Text>
                    </Pressable>
                  </View>
                )}

                {review?.id === row.id && review.mode === 'reject' && (
                  <View style={{ gap: 6 }}>
                    <TextInput
                      accessibilityLabel="Lý do từ chối thanh toán"
                      placeholder="Nhập lý do từ chối..."
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                      value={review.value}
                      onChangeText={(value) => setReview({ ...review, value })}
                      maxLength={300}
                    />
                    <Pressable
                      disabled={busy || !review.value.trim()}
                      onPress={() =>
                        void run(async () => {
                          await groupApi.reviewSettlement(groupId, row.id, 'reject', review.value.trim());
                          setReview(null);
                          await refresh();
                        })
                      }
                      style={[styles.dangerBtn, { opacity: busy || !review.value.trim() ? 0.5 : 1 }]}
                    >
                      <Text style={styles.primaryBtnText}>Gửi từ chối</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: '800' },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 10 },
  emptyText: { fontSize: 12.5, textAlign: 'center', paddingVertical: 12 },
  subPanel: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  itemCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  btnRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { minHeight: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#007F53', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  dangerBtn: { minHeight: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  dangerOutlineBtn: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 34, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
});

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppAlert as Alert } from '../../../../context/DialogContext';
import { useAppTheme } from '../../../../context/ThemeContext';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import {
  groupApi,
  type ContributionPeriodResponse,
  type ContributionPeriodPreview,
  type GroupMemberResponse,
} from '../../api/groupApi';

type Props = {
  groupId: string;
  targetId?: string;
  members: GroupMemberResponse[];
  active: ContributionPeriodResponse | null;
  manager: boolean;
  refresh: () => Promise<void>;
  children?: React.ReactNode;
};

const METHODS = { EQUAL: 'Chia đều', EXACT: 'Số tiền riêng', PERCENTAGE: 'Phần trăm', VOLUNTARY: 'Tự nguyện' };
const FREQUENCIES = { ONCE: 'Một lần', WEEKLY: 'Hàng tuần', MONTHLY: 'Hàng tháng', QUARTERLY: 'Hàng quý' };

export function ContributionPeriods({ groupId, targetId, members, active, manager, refresh, children }: Props) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [start, setStart] = useState(new Date().toLocaleDateString('sv-SE'));
  const [due, setDue] = useState('');
  const [target, setTarget] = useState('');
  const [allocationMethod, setMethod] = useState<keyof typeof METHODS>('EQUAL');
  const [frequency, setFrequency] = useState<keyof typeof FREQUENCIES>('ONCE');
  const [values, setValues] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<string[]>([]);
  const [exempt, setExempt] = useState<string[]>([]);
  const [history, setHistory] = useState<ContributionPeriodResponse[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState<{ userId: string; amount: string; reason: string; exempt: boolean } | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ signature: string; data: ContributionPeriodPreview } | null>(null);

  useEffect(() => {
    if (!targetId || targetId === active?.id) return;
    let current = true;
    groupApi
      .getContributionPeriod(groupId, targetId)
      .then((period) => {
        if (!current) return;
        setHistory([period]);
        setSelected(period.id);
      })
      .catch(() => {
        if (current) setError('Không thể tải kỳ từ thông báo.');
      });
    return () => {
      current = false;
    };
  }, [groupId, targetId, active?.id]);

  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu kỳ đóng quỹ.');
    } finally {
      setBusy(false);
    }
  };

  const previewMembers = members
    .filter((member) => !excluded.includes(member.userId))
    .map((member) => {
      const isExempt = exempt.includes(member.userId) || member.childProfile || member.role === 'CHILD';
      const value = Number((values[member.userId] ?? '').replace(',', '.'));
      return {
        userId: member.userId,
        exempt: isExempt,
        exemptionReason: isExempt ? 'Miễn đóng khi lập kỳ' : undefined,
        amount: !isExempt && allocationMethod === 'EXACT' ? value : 0,
        percentage: !isExempt && allocationMethod === 'PERCENTAGE' ? value : undefined,
      };
    });

  const liable = previewMembers.filter((row) => !row.exempt);
  const previewTotal =
    allocationMethod === 'EXACT'
      ? liable.reduce((sum, row) => sum + row.amount, 0)
      : allocationMethod === 'VOLUNTARY'
      ? 0
      : Number(target);

  const payload = {
    name: name.trim(),
    startDate: start,
    dueDate: due,
    allocationMethod,
    frequency,
    fundraisingTarget: allocationMethod === 'EQUAL' || allocationMethod === 'PERCENTAGE' ? Number(target) : undefined,
    members: previewMembers,
  };
  const signature = JSON.stringify(payload);

  const create = (previewOnly = false) =>
    run(async () => {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (
        !name.trim() ||
        !datePattern.test(start) ||
        !datePattern.test(due) ||
        due < start ||
        !previewMembers.length ||
        (allocationMethod !== 'VOLUNTARY' && (!Number.isSafeInteger(previewTotal) || previewTotal <= 0 || !liable.length))
      ) {
        throw new Error('Kiểm tra tên kỳ, ngày bắt đầu, hạn đóng, tổng tiền và thành viên.');
      }
      if (previewOnly) {
        setPreview({ signature, data: await groupApi.previewContributionPeriod(groupId, payload) });
        return;
      }
      await groupApi.createContributionPeriod(groupId, payload);
      setOpen(false);
      setHistory(null);
      await refresh();
    });

  const inputStyle = [
    styles.input,
    {
      color: colors.textPrimary,
      borderColor: colors.cardBorder,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    },
  ];

  const renderChipGroup = <T extends string>(
    options: Record<T, string>,
    current: T,
    onChange: (value: T) => void
  ) => (
    <View style={styles.chipWrap}>
      {(Object.keys(options) as T[]).map((key) => {
        const selectedChip = key === current;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedChip }}
            onPress={() => onChange(key)}
            style={[
              styles.chip,
              {
                borderColor: selectedChip ? '#007F53' : colors.cardBorder,
                backgroundColor: selectedChip ? (isDark ? '#064E3B' : '#ECFDF5') : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedChip ? (isDark ? '#6EE7B7' : '#007F53') : colors.textSecondary },
              ]}
            >
              {options[key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Quản lý kỳ đóng quỹ</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {active
              ? 'Xử lý các khoản chờ xác nhận trước khi kết thúc kỳ hiện tại.'
              : 'Chưa có kỳ hoạt động. Tạo kỳ mới để phân bổ hạn mức đóng quỹ.'}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: active ? (isDark ? '#064E3B' : '#ECFDF5') : isDark ? '#1E293B' : '#F1F5F9' },
          ]}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: active ? (isDark ? '#6EE7B7' : '#007F53') : colors.textSecondary,
            }}
          >
            {active ? 'Đang mở' : 'Chưa mở'}
          </Text>
        </View>
      </View>

      {!!error && (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' },
          ]}
        >
          <Text accessibilityRole="alert" style={{ color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: 12, fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      )}

      {/* Primary Action Toolbar — 4 compact vertical tiles in 1 row */}
      {manager && active ? (
        <View style={styles.fourCol}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await groupApi.remindContributionPeriod(groupId, active.id);
                Alert.alert('Nhắc đóng quỹ', 'Đã gửi lời nhắc cho thành viên còn thiếu.');
              })
            }
            style={[
              styles.tileActionBtn,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
              },
            ]}
          >
            <FinanceIcon name="bell" size={17} color={isDark ? '#6EE7B7' : '#007F53'} />
            <Text numberOfLines={1} style={[styles.tileBtnText, { color: isDark ? '#6EE7B7' : '#007F53' }]}>
              Nhắc đóng
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setAdjusting(true);
              setAdjustment(null);
            }}
            style={[
              styles.tileActionBtn,
              {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.14)' : '#EFF6FF',
                borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
              },
            ]}
          >
            <FinanceIcon name="edit" size={17} color={isDark ? '#93C5FD' : '#2563EB'} />
            <Text numberOfLines={1} style={[styles.tileBtnText, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
              Điều chỉnh
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void run(async () => setHistory(await groupApi.getContributionPeriods(groupId)));
            }}
            style={[
              styles.tileActionBtn,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <FinanceIcon name="history" size={17} color={colors.textSecondary} />
            <Text numberOfLines={1} style={[styles.tileBtnText, { color: colors.textSecondary }]}>
              Lịch sử kỳ
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              Alert.alert('Kết thúc kỳ', 'Khoản còn thiếu được giữ trong lịch sử và không chuyển sang kỳ tiếp theo.', [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Kết thúc',
                  style: 'destructive',
                  onPress: () =>
                    void run(async () => {
                      await groupApi.closeContributionPeriod(groupId, active.id);
                      setHistory(null);
                      await refresh();
                    }),
                },
              ])
            }
            style={[
              styles.tileActionBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
              },
            ]}
          >
            <FinanceIcon name="lock" size={17} color={isDark ? '#FCA5A5' : '#DC2626'} />
            <Text numberOfLines={1} style={[styles.tileBtnText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
              Kết thúc kỳ
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.twoCol}>
          {manager && !active && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setOpen(true)}
              style={[styles.primaryBtn, { flex: 1, flexDirection: 'row', gap: 6, opacity: busy ? 0.5 : 1 }]}
            >
              <FinanceIcon name="plus" size={15} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Tạo kỳ đóng quỹ</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void run(async () => setHistory(await groupApi.getContributionPeriods(groupId)));
            }}
            style={[styles.gridActionBtn, { borderColor: colors.cardBorder }]}
          >
            <FinanceIcon name="history" size={15} color={colors.textSecondary} />
            <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Lịch sử kỳ</Text>
          </Pressable>
        </View>
      )}

      {children ? (
        <View
          style={{
            marginTop: 4,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
          }}
        >
          {children}
        </View>
      ) : null}

      {/* Modal: Điều chỉnh hạn mức thành viên */}
      <Modal visible={Boolean(manager && active && adjusting)} transparent animationType="slide" onRequestClose={() => setAdjusting(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAdjusting(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.dragBar, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Điều chỉnh hạn mức</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Chọn thành viên để đổi số tiền hoặc đánh dấu miễn đóng kỳ này
                </Text>
              </View>
              <Pressable onPress={() => setAdjusting(false)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <FinanceIcon name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Chọn thành viên cần điều chỉnh</Text>
              <View style={styles.chipWrap}>
                {members.map((member) => {
                  const memberLabel = member.user?.fullName || member.fullName || member.nickname || 'Thành viên';
                  const isPicked = adjustment?.userId === member.userId;
                  return (
                    <Pressable
                      key={member.userId}
                      onPress={() => {
                        const row = active?.members.find((item) => item.userId === member.userId);
                        setAdjustment({
                          userId: member.userId,
                          amount: String(row?.requiredAmount ?? ''),
                          reason: '',
                          exempt: row?.exempt ?? Boolean(member.childProfile),
                        });
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: isPicked ? '#007F53' : colors.cardBorder,
                          backgroundColor: isPicked ? (isDark ? '#064E3B' : '#ECFDF5') : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: isPicked ? '#007F53' : colors.textPrimary }]}>
                        {memberLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {adjustment && active && (
                <View style={{ gap: 10, marginTop: 4 }}>
                  <Pressable
                    onPress={() => setAdjustment({ ...adjustment, exempt: !adjustment.exempt })}
                    style={[
                      styles.chip,
                      {
                        alignSelf: 'flex-start',
                        borderColor: adjustment.exempt ? '#007F53' : colors.cardBorder,
                        backgroundColor: adjustment.exempt ? (isDark ? '#064E3B' : '#ECFDF5') : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: adjustment.exempt ? '#007F53' : colors.textPrimary }]}>
                      {adjustment.exempt ? '✓ Miễn đóng kỳ này' : 'Đánh dấu miễn đóng'}
                    </Text>
                  </Pressable>
                  {!adjustment.exempt && (
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mức đóng mới (đ)</Text>
                      <TextInput
                        style={inputStyle}
                        accessibilityLabel="Mức đóng mới"
                        keyboardType="number-pad"
                        value={adjustment.amount ? Number(adjustment.amount).toLocaleString('vi-VN') : ''}
                        onChangeText={(amount) => setAdjustment({ ...adjustment, amount: amount.replace(/\D/g, '') })}
                      />
                    </View>
                  )}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Lý do điều chỉnh</Text>
                    <TextInput
                      style={inputStyle}
                      accessibilityLabel="Lý do điều chỉnh"
                      maxLength={300}
                      placeholder="VD: Miễn đóng do đi công tác..."
                      placeholderTextColor={colors.textSecondary}
                      value={adjustment.reason}
                      onChangeText={(reason) => setAdjustment({ ...adjustment, reason })}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        const amount = Number(adjustment.amount);
                        if (!adjustment.reason.trim() || (!adjustment.exempt && (!adjustment.amount || !Number.isSafeInteger(amount)))) {
                          throw new Error('Nhập lý do và mức đóng hợp lệ.');
                        }
                        await groupApi.adjustContributionObligation(groupId, active.id, adjustment.userId, {
                          amount,
                          exempt: adjustment.exempt,
                          reason: adjustment.reason.trim(),
                        });
                        setAdjusting(false);
                        setAdjustment(null);
                        await refresh();
                      })
                    }
                    style={[styles.primaryBtn, { opacity: busy ? 0.5 : 1 }]}
                  >
                    <Text style={styles.primaryBtnText}>Lưu điều chỉnh</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Tạo kỳ đóng quỹ mới */}
      <Modal visible={Boolean(open && !active)} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.dragBar, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Tạo kỳ đóng quỹ mới</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Phân bổ hạn mức đóng quỹ cho các thành viên trong nhóm
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <FinanceIcon name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tên kỳ đóng quỹ</Text>
                <TextInput
                  accessibilityLabel="Tên kỳ"
                  style={inputStyle}
                  maxLength={160}
                  placeholder="VD: Quỹ sinh hoạt tháng 12"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bắt đầu (YYYY-MM-DD)</Text>
                  <TextInput accessibilityLabel="Ngày bắt đầu" style={inputStyle} value={start} onChangeText={setStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Hạn đóng (YYYY-MM-DD)</Text>
                  <TextInput
                    accessibilityLabel="Hạn đóng"
                    style={inputStyle}
                    placeholder="2026-12-31"
                    placeholderTextColor={colors.textSecondary}
                    value={due}
                    onChangeText={setDue}
                  />
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Tần suất</Text>
              {renderChipGroup<keyof typeof FREQUENCIES>(FREQUENCIES, frequency, setFrequency)}

              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Cách phân bổ</Text>
              {renderChipGroup<keyof typeof METHODS>(METHODS, allocationMethod, setMethod)}

              {(allocationMethod === 'EQUAL' || allocationMethod === 'PERCENTAGE') && (
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tổng mục tiêu (đ)</Text>
                  <TextInput
                    accessibilityLabel="Tổng mục tiêu"
                    style={inputStyle}
                    keyboardType="number-pad"
                    placeholder="VD: 3.000.000"
                    placeholderTextColor={colors.textSecondary}
                    value={target ? Number(target).toLocaleString('vi-VN') : ''}
                    onChangeText={(value) => setTarget(value.replace(/\D/g, ''))}
                  />
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Thành viên tham gia</Text>
              {members.map((member) => {
                const memberName = member.user?.fullName || member.fullName || member.nickname || 'Thành viên';
                const included = !excluded.includes(member.userId);
                const isChild = Boolean(member.childProfile || member.role === 'CHILD');
                const isExempt = exempt.includes(member.userId) || isChild;
                return (
                  <View
                    key={member.userId}
                    style={[styles.memberRow, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                  >
                    <View style={styles.memberTopRow}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13, flex: 1 }}>
                        {memberName}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setExcluded((ids) => (included ? [...ids, member.userId] : ids.filter((id) => id !== member.userId)))
                        }
                        style={[
                          styles.miniBadgeBtn,
                          {
                            backgroundColor: included ? (isDark ? '#064E3B' : '#ECFDF5') : isDark ? '#1E293B' : '#F1F5F9',
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: included ? '#007F53' : colors.textSecondary }}>
                          {included ? 'Tham gia' : 'Bỏ qua'}
                        </Text>
                      </Pressable>
                      {included && !isChild && (
                        <Pressable
                          onPress={() =>
                            setExempt((ids) => (isExempt ? ids.filter((id) => id !== member.userId) : [...ids, member.userId]))
                          }
                          style={[
                            styles.miniBadgeBtn,
                            { backgroundColor: isExempt ? (isDark ? '#451A03' : '#FEF3C7') : isDark ? '#1E293B' : '#F1F5F9' },
                          ]}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isExempt ? '#B45309' : colors.textSecondary }}>
                            {isExempt ? 'Miễn đóng' : 'Có đóng'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    {included && !isExempt && (allocationMethod === 'EXACT' || allocationMethod === 'PERCENTAGE') && (
                      <TextInput
                        accessibilityLabel={`Mức đóng của ${memberName}`}
                        style={[inputStyle, { marginTop: 6 }]}
                        keyboardType="decimal-pad"
                        placeholder={allocationMethod === 'EXACT' ? 'Số tiền (đ)' : 'Tỷ lệ (%)'}
                        placeholderTextColor={colors.textSecondary}
                        value={values[member.userId] ?? ''}
                        onChangeText={(value) => setValues((current) => ({ ...current, [member.userId]: value }))}
                      />
                    )}
                  </View>
                );
              })}

              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Dự kiến {liable.length} thành viên ·{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {Number.isFinite(previewTotal) ? previewTotal.toLocaleString('vi-VN') : '—'} đ
                </Text>
              </Text>

              {preview?.signature === signature && (
                <View
                  style={[
                    styles.previewBox,
                    { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: isDark ? '#047857' : '#A7F3D0' },
                  ]}
                >
                  <Text style={{ color: isDark ? '#6EE7B7' : '#004D3B', fontWeight: '800', fontSize: 12.5 }}>
                    Tổng nghĩa vụ: {preview.data.requiredTotal.toLocaleString('vi-VN')} đ
                  </Text>
                  {members
                    .filter((member) => member.userId in preview.data.amounts)
                    .map((member) => (
                      <View key={member.userId} style={styles.previewRow}>
                        <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
                          {member.user?.fullName || member.fullName || member.nickname || 'Thành viên'}
                        </Text>
                        <Text style={{ color: '#007F53', fontWeight: '700', fontSize: 12 }}>
                          {preview.data.amounts[member.userId].toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              <View style={styles.formActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void create(true)}
                  style={[styles.outlineBtn, { borderColor: colors.cardBorder, flex: 1 }]}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.textPrimary }]}>Xem trước</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void create()}
                  style={[styles.primaryBtn, { flex: 1, opacity: busy ? 0.5 : 1 }]}
                >
                  <Text style={styles.primaryBtnText}>{busy ? 'Đang xử lý…' : 'Bắt đầu kỳ'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Lịch sử các kỳ đóng quỹ */}
      <Modal visible={history !== null} transparent animationType="slide" onRequestClose={() => setHistory(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setHistory(null)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.dragBar, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Lịch sử các kỳ ({history?.length ?? 0})</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Chạm vào từng kỳ để xem chi tiết đóng góp của các thành viên
                </Text>
              </View>
              <Pressable onPress={() => setHistory(null)} hitSlop={10} style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <FinanceIcon name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {(history?.length ?? 0) === 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 12.5, textAlign: 'center', paddingVertical: 20 }}>
                  Chưa có kỳ đóng quỹ nào được lưu.
                </Text>
              )}
              {(history ?? []).map((period) => {
                const expanded = selected === period.id;
                return (
                  <View
                    key={period.id}
                    style={[styles.historyItem, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSelected(expanded ? null : period.id)}
                      style={styles.historyHeader}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{period.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                          Hạn {period.dueDate}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor:
                              period.status === 'ACTIVE'
                                ? isDark
                                  ? '#064E3B'
                                  : '#ECFDF5'
                                : isDark
                                ? '#1E293B'
                                : '#F1F5F9',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '700',
                            color: period.status === 'ACTIVE' ? '#007F53' : colors.textSecondary,
                          }}
                        >
                          {period.status === 'ACTIVE' ? 'Đang mở' : 'Đã kết thúc'}
                        </Text>
                      </View>
                    </Pressable>
                    {expanded && (
                      <View style={{ marginTop: 8, gap: 6, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 8 }}>
                        {period.members.map((member) => (
                          <View key={member.userId} style={styles.previewRow}>
                            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>{member.fullName}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11.5 }}>
                              Đóng {member.confirmedAmount.toLocaleString('vi-VN')} đ · Thiếu{' '}
                              {member.outstandingAmount.toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 15.5, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 10 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridActionBtn: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#007F53',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  softGreenBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softGreenBtnText: { fontSize: 12.5, fontWeight: '700' },
  outlineBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 12.5, fontWeight: '600' },
  dangerOutlineBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPanel: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  sectionLabel: { fontSize: 12.5, fontWeight: '700' },
  fieldLabel: { fontSize: 11.5, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  twoCol: { flexDirection: 'row', gap: 8 },
  fourCol: { flexDirection: 'row', gap: 7 },
  tileActionBtn: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tileBtnText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '600' },
  memberRow: { borderWidth: 1, borderRadius: 12, padding: 10 },
  memberTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBadgeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  previewBox: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  historyItem: { borderWidth: 1, borderRadius: 12, padding: 10 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.48)' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '86%',
  },
  dragBar: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

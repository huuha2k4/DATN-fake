import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '../../../../context/ThemeContext';
import { groupApi, type GroupFinanceConfigResponse } from '../../api/groupApi';

const FIELD_META = {
  useSharedFund: {
    label: 'Quỹ chung nhóm',
    desc: 'Cho phép thành viên đóng góp và chi tiêu từ quỹ chung.',
    indent: false,
  },
  useContributionPeriods: {
    label: 'Kỳ đóng quỹ định kỳ',
    desc: 'Lập đợt thu quỹ theo chu kỳ và theo dõi tiến độ từng người.',
    indent: true,
  },
  allowFundReimbursements: {
    label: 'Hoàn trả tiền ứng trước',
    desc: 'Theo dõi và hoàn tiền từ quỹ cho người ứng tiền chi hộ.',
    indent: true,
  },
  allowMemberSplits: {
    label: 'Chia tiền thành viên',
    desc: 'Ghi nhận khoản chi chia đều, theo số tiền hoặc tỷ lệ.',
    indent: false,
  },
  allowDebtSimplification: {
    label: 'Cân đối bù trừ tự động',
    desc: 'Tối ưu số lượt chuyển tiền để xóa công nợ chéo nhanh hơn.',
    indent: true,
  },
} as const;

type Key = keyof typeof FIELD_META;
type Config = GroupFinanceConfigResponse;
type Props = { config: Config; canManage: boolean; onSaved: (config: Config) => void };

function extractValues(config: Config): Record<Key, boolean> {
  return {
    useSharedFund: config.useSharedFund,
    useContributionPeriods: config.useContributionPeriods,
    allowMemberSplits: config.allowMemberSplits,
    allowDebtSimplification: config.allowDebtSimplification,
    allowFundReimbursements: config.allowFundReimbursements,
  };
}

export function FinanceSettings({ config, canManage, onSaved }: Props) {
  const { colors, isDark } = useAppTheme();
  const [draft, setDraft] = useState(() => extractValues(config));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const baseline = extractValues(config);
  const hasChanges = (Object.keys(FIELD_META) as Key[]).some((k) => draft[k] !== baseline[k]);

  const toggle = (key: Key, checked: boolean) => {
    setSavedNotice(false);
    setDraft((current) => ({
      ...current,
      [key]: checked,
      ...(key === 'useSharedFund' && !checked ? { useContributionPeriods: false, allowFundReimbursements: false } : {}),
      ...(key === 'allowMemberSplits' && !checked ? { allowDebtSimplification: false } : {}),
    }));
  };

  const disabled = (key: Key) =>
    busy ||
    !canManage ||
    (!draft.useSharedFund && (key === 'useContributionPeriods' || key === 'allowFundReimbursements')) ||
    (!draft.allowMemberSplits && key === 'allowDebtSimplification');

  const save = async () => {
    if (busy || !canManage) return;
    setError('');
    setSavedNotice(false);
    setBusy(true);
    try {
      const saved = await groupApi.updateFinanceConfig(config.groupId, draft);
      setDraft(extractValues(saved));
      onSaved(saved);
      setSavedNotice(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu cấu hình tài chính.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Cấu hình tài chính nhóm</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Bật hoặc tắt các tính năng quỹ chung và cân đối công nợ
          </Text>
        </View>
        {savedNotice && (
          <View style={[styles.savedBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <Text style={[styles.savedBadgeText, { color: colors.accentGreen }]}>Đã lưu</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 8 }}>
        {(Object.keys(FIELD_META) as Key[]).map((key, idx) => {
          const meta = FIELD_META[key];
          const isRowDisabled = disabled(key);
          return (
            <View
              key={key}
              style={[
                styles.row,
                meta.indent && { paddingLeft: 14 },
                idx > 0 && { borderTopWidth: 1, borderTopColor: colors.cardBorder },
                isRowDisabled && canManage && { opacity: 0.5 },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{meta.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{meta.desc}</Text>
              </View>
              <Switch
                accessibilityLabel={meta.label}
                value={draft[key]}
                disabled={isRowDisabled}
                trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#007F53' }}
                thumbColor="#FFFFFF"
                onValueChange={(checked) => toggle(key, checked)}
              />
            </View>
          );
        })}
      </View>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }]}>
          <Text accessibilityRole="alert" style={{ color: isDark ? '#FCA5A5' : '#B91C1C', fontSize: 12, fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      )}

      {canManage && (
        <View style={styles.footerRow}>
          {hasChanges && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setDraft(baseline);
                setError('');
              }}
              style={[styles.secondaryBtn, { borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Hoàn tác</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy || !hasChanges}
            onPress={() => void save()}
            style={[styles.primaryBtn, { opacity: busy || !hasChanges ? 0.5 : 1 }]}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  savedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  savedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  rowDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  errorBox: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  footerRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryBtn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#007F53',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

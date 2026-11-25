import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

type Props = { label: string; value: string; detail: string; accent: string };

export function StatCard({ label, value, detail, accent }: Props) {
  const { colors: themeColors } = useAppTheme();
  return (
    <View style={[styles.card, { borderTopColor: accent, backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 }]}>
      <Text style={[styles.label, { color: themeColors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: themeColors.textPrimary }]}>{value}</Text>
      <Text style={[styles.detail, { color: themeColors.textMuted }]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 112, borderTopWidth: 4, borderRadius: radius.md, padding: spacing.md, justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 19, fontWeight: '800' },
  detail: { fontSize: 11 },
});

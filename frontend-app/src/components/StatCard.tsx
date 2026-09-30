import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = { label: string; value: string; detail: string; accent: string };

export function StatCard({ label, value, detail, accent }: Props) {
  return (
    <View style={[styles.card, { borderTopColor: accent }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 112, borderTopWidth: 4, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, justifyContent: 'space-between' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 11 },
});

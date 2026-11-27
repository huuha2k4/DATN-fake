import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FinAiClarification, FinAiSelection } from '../api/finAiAgentApi';
import { useAppTheme } from '../../../context/ThemeContext';

export function FinAiChoices({ clarification, disabled, onSelect }: {
  clarification: FinAiClarification;
  disabled: boolean;
  onSelect: (label: string, selection: FinAiSelection) => void;
}) {
  const { isDark } = useAppTheme();
  const expiresAt = Date.parse(clarification.expiresAt);
  const [expired, setExpired] = useState(() => !(expiresAt > Date.now()));
  useEffect(() => {
    if (expired) return;
    const timeout = setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [expired, expiresAt]);
  if (!clarification.options?.length) return null;

  const unavailable = disabled || expired;
  return (
    <View style={styles.options}>
      {clarification.options.map(({ id, label }) => (
        <Pressable key={id} disabled={unavailable} accessibilityRole="button"
          accessibilityState={{ disabled: unavailable }}
          onPress={() => {
            if (Date.now() < expiresAt) onSelect(label, { draftId: clarification.draftId, optionId: id });
          }}
          style={({ pressed }) => [styles.option, isDark && styles.optionDark,
            (unavailable || pressed) && styles.dimmed]}>
          <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
        </Pressable>
      ))}
      {expired && <Text style={[styles.label, isDark && styles.labelDark]}>Lựa chọn đã hết hạn.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  option: { borderWidth: 1, borderColor: '#34a180', borderRadius: 8, minHeight: 42, maxWidth: '100%',
    justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#ecfdf5' },
  optionDark: { backgroundColor: '#143b32' },
  label: { color: '#065f46', fontSize: 14 },
  labelDark: { color: '#a7f3d0' },
  dimmed: { opacity: .65 },
});

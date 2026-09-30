import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../../../theme';
import { transactionAccounts, transactionCategories } from '../api';

type Props = { onBack: () => void; onSaved: () => void };

export function AddTransactionScreen({ onBack, onSaved }: Props) {
  const [transactionType, setTransactionType] = React.useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = React.useState('250.000 đ');
  const [categoryIndex, setCategoryIndex] = React.useState(0);
  const [accountIndex, setAccountIndex] = React.useState(0);
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState('11/09/2025');

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Quay lại"><Text style={styles.backIcon}>‹</Text></Pressable>
      <Text style={styles.headerTitle}>Thêm giao dịch</Text><View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.segmented} accessibilityRole="tablist">
        <Pressable onPress={() => setTransactionType('expense')} style={[styles.segment, transactionType === 'expense' && styles.segmentActive]} accessibilityRole="tab" accessibilityState={{ selected: transactionType === 'expense' }}><Text style={[styles.segmentText, transactionType === 'expense' && styles.segmentTextActive]}>Chi tiêu</Text></Pressable>
        <Pressable onPress={() => setTransactionType('income')} style={[styles.segment, transactionType === 'income' && styles.segmentActive]} accessibilityRole="tab" accessibilityState={{ selected: transactionType === 'income' }}><Text style={[styles.segmentText, transactionType === 'income' && styles.segmentTextActive]}>Thu nhập</Text></Pressable>
      </View>
      <FieldLabel text="Số tiền" />
      <TextInput value={amount} onChangeText={setAmount} style={styles.input} keyboardType="numeric" accessibilityLabel="Số tiền" />
      <FieldLabel text="Danh mục" />
      <Pressable style={styles.select} onPress={() => setCategoryIndex((index) => (index + 1) % transactionCategories.length)} accessibilityRole="button" accessibilityLabel={`Danh mục: ${transactionCategories[categoryIndex]}`}><View style={styles.categoryIcon}><Text>◈</Text></View><Text style={styles.selectText}>{transactionCategories[categoryIndex]}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
      <FieldLabel text="Tài khoản" />
      <Pressable style={styles.select} onPress={() => setAccountIndex((index) => (index + 1) % transactionAccounts.length)} accessibilityRole="button" accessibilityLabel={`Tài khoản: ${transactionAccounts[accountIndex]}`}><View style={[styles.categoryIcon, styles.momoIcon]}><Text style={styles.momoText}>mo{`\n`}mo</Text></View><Text style={styles.selectText}>{transactionAccounts[accountIndex]}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
      <FieldLabel text="Mô tả" />
      <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.description]} placeholder="Nhập nội dung (tùy chọn)" placeholderTextColor={colors.muted} multiline />
      <FieldLabel text="Ngày giao dịch" />
      <View style={styles.dateRow}><Text style={styles.dateIcon}>□</Text><TextInput value={date} onChangeText={setDate} style={styles.dateInput} placeholder="11/09/2025" placeholderTextColor={colors.muted} /><Text style={styles.calendarIcon}>▣</Text></View>
      <Pressable onPress={onSaved} style={styles.saveButton} accessibilityRole="button" accessibilityLabel="Lưu giao dịch"><Text style={styles.saveText}>Lưu giao dịch</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function FieldLabel({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EAF4FF' }, header: { height: 76, paddingHorizontal: spacing.md, backgroundColor: '#004D40', flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 14, justifyContent: 'space-between' }, backButton: { width: 32, height: 32, justifyContent: 'center' }, backIcon: { color: colors.surface, fontSize: 34, lineHeight: 32, fontWeight: '300' }, headerTitle: { color: colors.surface, fontSize: 20, fontWeight: '700' }, headerSpacer: { width: 32 }, content: { padding: spacing.md, paddingBottom: spacing.xl }, segmented: { flexDirection: 'row', padding: 4, backgroundColor: '#E2E8F0CC', borderRadius: radius.sm, marginBottom: spacing.lg }, segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 }, segmentActive: { backgroundColor: '#004D40' }, segmentText: { color: '#475569', fontSize: 14, fontWeight: '700' }, segmentTextActive: { color: colors.surface }, label: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 12 }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.ink, fontSize: 16, fontWeight: '700' }, select: { minHeight: 58, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center' }, categoryIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4D6' }, momoIcon: { backgroundColor: '#A50064', borderRadius: 8 }, momoText: { color: colors.surface, fontSize: 10, lineHeight: 10, fontWeight: '800', textAlign: 'center' }, selectText: { flex: 1, marginLeft: spacing.md, color: colors.ink, fontSize: 14, fontWeight: '700' }, chevron: { color: colors.muted, fontSize: 20 }, description: { minHeight: 64, textAlignVertical: 'top', fontSize: 14, fontWeight: '400' }, dateRow: { minHeight: 54, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center' }, dateIcon: { color: colors.forest, fontSize: 20 }, dateInput: { flex: 1, marginLeft: spacing.sm, color: colors.ink, fontSize: 14 }, calendarIcon: { color: colors.forest, fontSize: 19 }, saveButton: { backgroundColor: '#004D40', borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center', marginTop: spacing.xl, shadowColor: '#004D40', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, saveText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
});
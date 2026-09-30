import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { financialGoals } from '../api/financialGoals';
import { colors, radius, spacing } from '../../../theme';

type Props = { onBack: () => void };

export function GoalsScreen({ onBack }: Props) {
  return <View style={styles.screen}>
    <View style={styles.header}><Pressable onPress={onBack} style={{ position: 'absolute', left: spacing.md, bottom: 12, width: 32, height: 32, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Quay lại"><Text style={{ color: colors.surface, fontSize: 34, lineHeight: 32, fontWeight: '300' }}>‹</Text></Pressable><Text style={styles.headerTitle}>Mục tiêu tài chính</Text></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {financialGoals.map((goal) => <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalTop}>
          <View style={styles.goalIdentity}><View style={[styles.goalIcon, { backgroundColor: goal.iconBackground }]}><Text style={styles.goalIconText}>{goal.icon}</Text></View><View><Text style={styles.goalTitle}>{goal.title}</Text><Text style={styles.goalAmount}><Text style={styles.currentAmount}>{goal.current}</Text> / {goal.target}</Text></View></View>
          <Text style={styles.percentage}>{goal.percentage}%</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${goal.percentage}%` }]} /></View>
        <View style={styles.deadline}><Text style={styles.calendarIcon}>□</Text><Text style={styles.deadlineText}>Dự kiến: {goal.date}</Text></View>
      </View>)}
      <Pressable onPress={() => Alert.alert('Thêm mục tiêu', 'Tính năng tạo mục tiêu mới đang được hoàn thiện.')} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Thêm mục tiêu tài chính"><Text style={styles.addIcon}>+</Text><Text style={styles.addText}>Thêm mục tiêu</Text></Pressable>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EAF4FF' }, header: { height: 76, backgroundColor: '#004D40', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 14 }, headerTitle: { color: colors.surface, fontSize: 20, fontWeight: '700' }, content: { padding: spacing.md, paddingBottom: spacing.xl }, goalCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, goalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }, goalIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 }, goalIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }, goalIconText: { color: colors.forest, fontSize: 22, fontWeight: '700' }, goalTitle: { color: '#1E293B', fontSize: 15, fontWeight: '800', marginBottom: 5 }, goalAmount: { color: '#94A3B8', fontSize: 12 }, currentAmount: { color: '#334155', fontWeight: '700' }, percentage: { color: '#64748B', fontSize: 13, fontWeight: '800' }, progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#10B981' }, deadline: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }, calendarIcon: { color: '#94A3B8', fontSize: 16, marginRight: 6 }, deadlineText: { color: '#94A3B8', fontSize: 11 }, addButton: { height: 52, borderRadius: radius.sm, backgroundColor: '#005A49', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs, shadowColor: '#022C22', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, addIcon: { color: colors.surface, fontSize: 24, marginRight: 8 }, addText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
});

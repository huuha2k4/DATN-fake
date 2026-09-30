import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { accountItems, assetItems, AccountItem, AssetItem } from '../api';
import { colors, radius, spacing } from '../../../theme';

type Props = { onBack: () => void };

function AccountIcon({ kind }: { kind: AccountItem['kind'] | AssetItem['kind'] }) {
  const label = kind === 'bank' ? 'VCB' : kind === 'wallet' ? 'mo\nmo' : kind === 'cash' ? '₫' : kind === 'motorbike' ? '⌁' : '▣';
  const backgroundColor = kind === 'bank' ? '#10B981' : kind === 'wallet' ? '#A50064' : '#ECFDF5';
  return <View style={[styles.itemIcon, { backgroundColor }]}><Text style={[styles.itemIconText, kind === 'wallet' || kind === 'bank' ? styles.lightIcon : undefined]}>{label}</Text></View>;
}

function ListRow({ item }: { item: AccountItem | AssetItem }) {
  return <View style={styles.listRow}><View style={styles.rowInfo}><AccountIcon kind={item.kind} /><View style={styles.rowCopy}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowDescription}>{item.description}</Text></View></View><Text style={styles.rowAmount}>{item.amount}</Text></View>;
}

export function AccountsScreen({ onBack }: Props) {
  return <View style={styles.screen}>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Quay lại"><Text style={styles.backIcon}>‹</Text></Pressable><Text style={styles.headerTitle}>Tài khoản & tài sản</Text><View style={styles.headerSpacer} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.totalCard}><View style={styles.totalIcon}><Text style={styles.totalIconText}>◈</Text></View><View><Text style={styles.totalLabel}>TỔNG TÀI SẢN</Text><Text style={styles.totalAmount}>125.600.000 đ</Text></View></View>
      <Text style={styles.sectionTitle}>Tài khoản</Text>
      {accountItems.map((item) => <ListRow key={item.name} item={item} />)}
      <Text style={[styles.sectionTitle, styles.assetHeading]}>Tài sản</Text>
      {assetItems.map((item) => <ListRow key={item.name} item={item} />)}
      <Pressable onPress={() => Alert.alert('Thêm tài khoản & tài sản', 'Tính năng thêm tài khoản đang được hoàn thiện.')} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Thêm tài khoản và tài sản"><Text style={styles.addText}>Thêm tài khoản & tài sản</Text></Pressable>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EAF4FF' }, header: { height: 76, backgroundColor: '#004D40', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 14 }, backButton: { position: 'absolute', left: spacing.md, bottom: 12, width: 32, height: 32, justifyContent: 'center' }, backIcon: { color: colors.surface, fontSize: 34, lineHeight: 32, fontWeight: '300' }, headerTitle: { color: colors.surface, fontSize: 20, fontWeight: '700' }, headerSpacer: { width: 32 }, content: { padding: spacing.md, paddingBottom: spacing.xl }, totalCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2, marginBottom: spacing.lg }, totalIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5' }, totalIconText: { color: colors.forest, fontSize: 22, fontWeight: '700' }, totalLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 }, totalAmount: { color: '#0F172A', fontSize: 21, fontWeight: '800', marginTop: 3, marginLeft: spacing.sm }, sectionTitle: { color: '#334155', fontSize: 14, fontWeight: '700', marginHorizontal: 4, marginBottom: spacing.sm }, assetHeading: { marginTop: spacing.lg }, listRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginBottom: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, rowInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 }, itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, itemIconText: { color: colors.forest, fontSize: 16, fontWeight: '800', textAlign: 'center', lineHeight: 16 }, lightIcon: { color: colors.surface, fontSize: 11 }, rowCopy: { marginLeft: spacing.md }, rowTitle: { color: '#1E293B', fontSize: 14, fontWeight: '700' }, rowDescription: { color: '#94A3B8', fontSize: 11, marginTop: 3 }, rowAmount: { color: '#0F172A', fontSize: 14, fontWeight: '800' }, addButton: { height: 52, marginTop: spacing.md, borderRadius: radius.sm, backgroundColor: '#005A49', alignItems: 'center', justifyContent: 'center', shadowColor: '#022C22', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, addText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
});
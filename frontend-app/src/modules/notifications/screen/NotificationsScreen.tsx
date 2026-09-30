import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { notifications as initialNotifications, NotificationItem } from '../api';
import { colors, radius, spacing } from '../../../theme';

const iconFor = (kind: NotificationItem['kind']) => ({ budget: '!', reminder: '◷', goal: '★', security: '⌁' })[kind];
const colorFor = (kind: NotificationItem['kind']) => ({ budget: '#FEF3C7', reminder: '#DBEAFE', goal: '#D1FAE5', security: '#F1F5F9' })[kind];

export function NotificationsScreen() {
  const [items, setItems] = React.useState(initialNotifications);
  const unreadCount = items.filter((item) => item.unread).length;

  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, unread: false })));
  const toggleRead = (id: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item));

  return <View style={styles.screen}>
    <View style={styles.header}><View style={styles.titleRow}><Text style={styles.headerTitle}>Thông báo</Text>{unreadCount > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{unreadCount}</Text></View>}</View></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.toolbar}><Text style={styles.sectionTitle}>Mới nhất</Text><Pressable onPress={markAllRead} accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả đã đọc"><Text style={styles.readAll}>Đánh dấu đã đọc</Text></Pressable></View>
      {items.map((item) => <Pressable key={item.id} onPress={() => toggleRead(item.id)} style={[styles.notificationCard, item.unread && styles.unreadCard]} accessibilityRole="button" accessibilityLabel={`${item.title}: ${item.message}`}><View style={[styles.notificationIcon, { backgroundColor: colorFor(item.kind) }]}><Text style={styles.notificationIconText}>{iconFor(item.kind)}</Text></View><View style={styles.notificationCopy}><View style={styles.notificationTitleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{item.unread && <View style={styles.unreadDot} />}</View><Text style={styles.message}>{item.message}</Text><Text style={styles.time}>{item.time}</Text></View></Pressable>)}
      {items.length === 0 && <Text style={styles.empty}>Bạn chưa có thông báo nào.</Text>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EAF4FF' }, header: { height: 76, backgroundColor: '#004D40', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 14 }, backButton: { position: 'absolute', left: spacing.md, bottom: 12, width: 32, height: 32, justifyContent: 'center' }, backIcon: { color: colors.surface, fontSize: 34, lineHeight: 32, fontWeight: '300' }, titleRow: { flexDirection: 'row', alignItems: 'center' }, headerTitle: { color: colors.surface, fontSize: 20, fontWeight: '700' }, countBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#F43F5E', alignItems: 'center', justifyContent: 'center', marginLeft: 7 }, countText: { color: colors.surface, fontSize: 11, fontWeight: '800' }, headerSpacer: { width: 32 }, content: { padding: spacing.md, paddingBottom: spacing.xl }, toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }, sectionTitle: { color: '#334155', fontSize: 15, fontWeight: '800' }, readAll: { color: colors.forest, fontSize: 11, fontWeight: '700' }, notificationCard: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, unreadCard: { borderColor: '#A7F3D0', backgroundColor: '#F7FFFB' }, notificationIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, notificationIconText: { color: colors.forest, fontSize: 20, fontWeight: '800' }, notificationCopy: { flex: 1, marginLeft: spacing.md }, notificationTitleRow: { flexDirection: 'row', alignItems: 'center' }, notificationTitle: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '800' }, unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginLeft: 7 }, message: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4 }, time: { color: '#94A3B8', fontSize: 10, marginTop: 5 }, empty: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.xl },
});
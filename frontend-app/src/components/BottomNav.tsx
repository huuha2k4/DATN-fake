import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export type TabKey = 'home' | 'transactions' | 'budget' | 'goals';

type Props = { activeTab: TabKey; onChange: (tab: TabKey) => void; onScanInvoice: () => void; onNotifications: () => void; onProfile: () => void; isNotificationsActive?: boolean; isProfileActive?: boolean };

type NavItem = {
  key: TabKey | null;
  icon: string;
  activeIcon: string;
  label: string;
  isScan?: boolean;
};

const items: NavItem[] = [
  { key: 'home',  icon: '⌂',  activeIcon: '⌂',  label: 'Trang chủ' },
  { key: 'budget', icon: '▦', activeIcon: '▦',  label: 'Ngân sách' },
  { key: null,    icon: '▣',  activeIcon: '▣',  label: 'Quét hóa đơn', isScan: true },
  { key: null,    icon: '✦',  activeIcon: '✦',  label: 'Thông báo' },
  { key: null,    icon: '♙',  activeIcon: '♙',  label: 'Cá nhân' },
];

const TAB_ORDER: Array<TabKey | null> = items.map((i) => i.key);

export function BottomNav({ activeTab, onChange, onScanInvoice, onNotifications, onProfile, isNotificationsActive = false, isProfileActive = false }: Props) {
  const activeIndex = TAB_ORDER.indexOf(activeTab);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {items.map((item, index) => {
        const active = item.label === 'Thông báo'
          ? isNotificationsActive
          : item.label === 'Cá nhân'
            ? isProfileActive
            : !isNotificationsActive && !isProfileActive && index === activeIndex;

        return (
          <Pressable
            key={item.label}
            onPress={() => {
              if (item.key) {
                onChange(item.key);
              } else if (item.isScan) {
                onScanInvoice();
              } else if (item.label === 'Thông báo') {
                onNotifications();
              } else if (item.label === 'Cá nhân') {
                onProfile();
              } else {
                Alert.alert(item.label, 'Tính năng đang được hoàn thiện.');
              }
            }}
            style={[styles.tab, item.isScan && styles.scanTab]}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
          >
            {item.isScan ? (
              /* ── Scan button — raised circle ── */
              <View style={styles.scanCircle}>
                <Text style={styles.scanIcon}>{item.icon}</Text>
              </View>
            ) : (
              /* ── Regular tab icon ── */
              <View style={[styles.iconWrapper, active && styles.iconWrapperActive]}>
                <Text style={[styles.icon, active && styles.iconActive]}>
                  {active ? item.activeIcon : item.icon}
                </Text>
              </View>
            )}

            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                item.isScan && styles.scanLabel,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },

  // ── Regular tab ──
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
    gap: 3,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#ECFDF5',
  },
  icon: {
    fontSize: 20,
    color: '#94A3B8',
    lineHeight: 22,
  },
  iconActive: {
    color: '#004D40',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
    color: '#004D40',
  },

  // ── Scan (center) tab ──
  scanTab: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  scanCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    shadowColor: '#059669',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  scanIcon: {
    fontSize: 22,
    color: colors.surface,
    fontWeight: '700',
  },
  scanLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
});

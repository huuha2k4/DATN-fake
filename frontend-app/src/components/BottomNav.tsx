import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ArrowLeftRight, ScanLine, Users, User } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

export type TabKey = 'home' | 'transactions' | 'budget' | 'goals' | 'group';

type Props = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  onScanInvoice: () => void;
  onProfile: () => void;
  isProfileActive?: boolean;
};

type TabType = 'home' | 'transactions' | 'scan' | 'group' | 'profile';

export function BottomNav({
  activeTab,
  onChange,
  onScanInvoice,
  onProfile,
  isProfileActive = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: themeColors } = useAppTheme();

  const currentTab: TabType = isProfileActive
    ? 'profile'
    : activeTab === 'home'
    ? 'home'
    : activeTab === 'transactions'
    ? 'transactions'
    : activeTab === 'group'
    ? 'group'
    : 'home';

  const bottomPadding = Math.max(insets.bottom, 12);
  const activeColor = isDark ? '#34D399' : '#00A86B';
  const inactiveColor = isDark ? '#64748B' : '#475569';
  const activePillBg = isDark ? 'rgba(52, 211, 153, 0.16)' : '#E8F8F0';

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: bottomPadding,
          backgroundColor: themeColors.bottomNavBg,
          borderTopColor: themeColors.bottomNavBorder,
        },
      ]}
    >
      <View style={styles.barContainer}>
        {/* 1. Trang chủ */}
        <Pressable
          onPress={() => onChange('home')}
          style={styles.tabItem}
          accessibilityRole="tab"
          accessibilityLabel="Trang chủ"
        >
          <View
            style={[
              styles.iconPill,
              currentTab === 'home' && { backgroundColor: activePillBg },
            ]}
          >
            <Home
              size={22}
              color={currentTab === 'home' ? activeColor : inactiveColor}
              strokeWidth={currentTab === 'home' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: inactiveColor },
              currentTab === 'home' && { color: activeColor, fontWeight: '800' },
            ]}
          >
            Trang chủ
          </Text>
        </Pressable>

        {/* 2. Sổ giao dịch */}
        <Pressable
          onPress={() => onChange('transactions')}
          style={styles.tabItem}
          accessibilityRole="tab"
          accessibilityLabel="Sổ giao dịch"
        >
          <View
            style={[
              styles.iconPill,
              currentTab === 'transactions' && { backgroundColor: activePillBg },
            ]}
          >
            <ArrowLeftRight
              size={22}
              color={currentTab === 'transactions' ? activeColor : inactiveColor}
              strokeWidth={currentTab === 'transactions' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: inactiveColor },
              currentTab === 'transactions' && { color: activeColor, fontWeight: '800' },
            ]}
          >
            Giao dịch
          </Text>
        </Pressable>

        {/* 3. Nút Quét hóa đơn AI ở chính giữa */}
        <View style={styles.centerButtonWrap}>
          <Pressable
            onPress={onScanInvoice}
            style={({ pressed }) => [
              styles.scanButton,
              isDark && { borderColor: themeColors.surface },
              pressed && styles.scanButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Quét hóa đơn AI"
          >
            <ScanLine size={24} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>

        {/* 4. Nhóm */}
        <Pressable
          onPress={() => onChange('group')}
          style={styles.tabItem}
          accessibilityRole="tab"
          accessibilityLabel="Nhóm"
        >
          <View
            style={[
              styles.iconPill,
              currentTab === 'group' && { backgroundColor: activePillBg },
            ]}
          >
            <Users
              size={22}
              color={currentTab === 'group' ? activeColor : inactiveColor}
              strokeWidth={currentTab === 'group' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: inactiveColor },
              currentTab === 'group' && { color: activeColor, fontWeight: '800' },
            ]}
          >
            Nhóm
          </Text>
        </Pressable>

        {/* 5. Cá nhân */}
        <Pressable
          onPress={onProfile}
          style={styles.tabItem}
          accessibilityRole="tab"
          accessibilityLabel="Cá nhân"
        >
          <View
            style={[
              styles.iconPill,
              currentTab === 'profile' && { backgroundColor: activePillBg },
            ]}
          >
            <User
              size={22}
              color={currentTab === 'profile' ? activeColor : inactiveColor}
              strokeWidth={currentTab === 'profile' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: inactiveColor },
              currentTab === 'profile' && { color: activeColor, fontWeight: '800' },
            ]}
          >
            Cá nhân
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 1,
  },
  centerButtonWrap: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    shadowColor: '#00A86B',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  scanButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ArrowLeftRight, ScanLine, Users, User } from 'lucide-react-native';

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

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
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
              currentTab === 'home' && styles.iconPillActive,
            ]}
          >
            <Home
              size={22}
              color={currentTab === 'home' ? '#00A86B' : '#475569'}
              strokeWidth={currentTab === 'home' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'home' && styles.tabLabelActive,
            ]}
          >
            Trang chủ
          </Text>
        </Pressable>

        {/* 2. Giao dịch */}
        <Pressable
          onPress={() => onChange('transactions')}
          style={styles.tabItem}
          accessibilityRole="tab"
          accessibilityLabel="Giao dịch"
        >
          <View
            style={[
              styles.iconPill,
              currentTab === 'transactions' && styles.iconPillActive,
            ]}
          >
            <ArrowLeftRight
              size={22}
              color={currentTab === 'transactions' ? '#00A86B' : '#475569'}
              strokeWidth={currentTab === 'transactions' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'transactions' && styles.tabLabelActive,
            ]}
          >
            Giao dịch
          </Text>
        </Pressable>

        {/* 3. Nút tròn xanh quét hóa đơn ở giữa (Raised Floating Button) */}
        <View style={styles.centerButtonWrap}>
          <Pressable
            onPress={onScanInvoice}
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Quét hóa đơn"
          >
            <ScanLine size={30} color="#FFFFFF" strokeWidth={2.4} />
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
              currentTab === 'group' && styles.iconPillActive,
            ]}
          >
            <Users
              size={22}
              color={currentTab === 'group' ? '#00A86B' : '#475569'}
              strokeWidth={currentTab === 'group' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'group' && styles.tabLabelActive,
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
              currentTab === 'profile' && styles.iconPillActive,
            ]}
          >
            <User
              size={22}
              color={currentTab === 'profile' ? '#00A86B' : '#475569'}
              strokeWidth={currentTab === 'profile' ? 2.4 : 2}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'profile' && styles.tabLabelActive,
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
  iconPillActive: {
    backgroundColor: '#E8F8F0',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 1,
  },
  tabLabelActive: {
    color: '#00A86B',
    fontWeight: '800',
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

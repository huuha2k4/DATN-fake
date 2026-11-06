import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

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
            {/* Icon ngôi nhà vector phẳng */}
            <Svg width={22} height={22} viewBox="0 0 24 24" fill={currentTab === 'home' ? '#00A86B' : 'none'} stroke={currentTab === 'home' ? '#00A86B' : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <Path d="M9 22V12h6v10" />
            </Svg>
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
            {/* Icon 2 mũi tên đối xứng qua lại vector */}
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={currentTab === 'transactions' ? '#00A86B' : '#475569'} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 7H4m0 0l4-4M4 7l4 4M4 17h16m0 0l-4-4m4 4l-4 4" />
            </Svg>
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
            {/* Icon Quét hóa đơn (Khung scan + Tờ hóa đơn có răng cưa) */}
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {/* 4 góc khung ngắm máy quét */}
              <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              {/* Tờ hóa đơn ở giữa */}
              <Path d="M7 8h10v8l-2-1-3 1-3-1-2 1V8z" />
              <Path d="M10 11h4" />
              <Path d="M10 14h2" />
            </Svg>
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
            {/* Icon 3 người nhóm vector */}
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={currentTab === 'group' ? '#00A86B' : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <Circle cx="9" cy="7" r="4" />
              <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </Svg>
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
            {/* Icon người cá nhân vector */}
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={currentTab === 'profile' ? '#00A86B' : '#475569'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <Circle cx="12" cy="7" r="4" />
            </Svg>
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

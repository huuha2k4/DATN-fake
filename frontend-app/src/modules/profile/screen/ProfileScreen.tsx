import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';
import { userProfileApi, type UserProfileResponse } from '../api/userProfileApi';
import { PricingModal } from '../components/PricingModal';
import { AccountInfoModal } from '../components/AccountInfoModal';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { SecurityScreen } from './SecurityScreen';
import { HelpCenterScreen } from './HelpCenterScreen';
import { AboutFinoraScreen } from './AboutFinoraScreen';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { SystemSettingsScreen } from './SystemSettingsScreen';

interface ProfileScreenProps {
  onLogout?: () => void;
  onNotifications?: () => void;
  onOpenAiAssistant?: () => void;
  onSubPageChange?: (isSubPageOpen: boolean) => void;
}

export function ProfileScreen({
  onLogout,
  onNotifications,
  onOpenAiAssistant,
  onSubPageChange,
}: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [totalTxCount, setTotalTxCount] = useState<number>(0);
  const [monthsUsedText, setMonthsUsedText] = useState<string>('1 tháng');
  const [savingRateText, setSavingRateText] = useState<string>('0%');
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showAccountInfoModal, setShowAccountInfoModal] = useState<boolean>(false);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState<boolean>(false);
  const [currentSubPage, setCurrentSubPage] = useState<'MAIN' | 'SECURITY' | 'HELP_CENTER' | 'ABOUT' | 'NOTIFICATION_SETTINGS' | 'SYSTEM_SETTINGS'>('MAIN');

  useEffect(() => {
    onSubPageChange?.(currentSubPage !== 'MAIN');
  }, [currentSubPage, onSubPageChange]);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const currentUser = authStorage.getUser();

  useEffect(() => {
    userProfileApi.getProfile().then((data) => {
      if (data) {
        setProfile(data);

        // Tính số tháng đã sử dụng thực tế từ createdAt
        if (data.createdAt) {
          const createdDate = new Date(data.createdAt);
          const now = new Date();
          const diffMonths =
            (now.getFullYear() - createdDate.getFullYear()) * 12 +
            (now.getMonth() - createdDate.getMonth());
          const months = Math.max(diffMonths, 1);
          setMonthsUsedText(`${months} tháng`);
        }
      }
    });

    // Lấy giao dịch thực tế từ API để tính toán số giao dịch & tỷ lệ tiết kiệm
    const token = authStorage.getToken();
    if (token) {
      fetch(`${API_BASE_URL}/transactions?pageSize=100`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((resData) => {
          const txList: any[] = resData?.transactions || resData?.data?.transactions || (Array.isArray(resData) ? resData : []);
          const count =
            resData?.pagination?.totalItems ??
            resData?.summary?.transactionCount ??
            resData?.totalElements ??
            resData?.data?.totalElements ??
            txList.length;

          setTotalTxCount(Number(count) || 0);

          // Tính tỷ lệ tiết kiệm = (Tổng Thu - Tổng Chi) / Tổng Thu * 100
          const summary = resData?.summary || resData?.data?.summary;
          let totalIncome = Number(summary?.totalIncome || 0);
          let totalExpense = Number(summary?.totalExpense || 0);

          if (!summary && txList.length > 0) {
            txList.forEach((tx) => {
              const amount = Number(tx.amount || 0);
              const type = (tx.transactionType || tx.type || '').toUpperCase();
              if (type === 'INCOME') totalIncome += amount;
              else if (type === 'EXPENSE') totalExpense += amount;
            });
          }

          if (totalIncome > 0) {
            const netSavings = totalIncome - totalExpense;
            const rate = (netSavings / totalIncome) * 100;
            setSavingRateText(`${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`);
          } else {
            setSavingRateText('0%');
          }
        })
        .catch(() => {});
    }
  }, []);

  const displayName = profile?.fullName || currentUser?.fullName || 'Nguyễn Văn A';
  const displayEmail = profile?.email || currentUser?.email || 'a.nguyenvan@gmail.com';
  const rawAvatar = profile?.avatarUrl || currentUser?.avatarUrl;
  const avatarUri = userProfileApi.formatAvatarUrl(rawAvatar);

  // Đọc chính xác tier gói: FREE | STANDARD | PREMIUM | VIP
  const rawTier = (profile?.subscriptionTier || currentUser?.subscriptionTier || 'FREE').toUpperCase();
  const isPremiumUser = rawTier === 'PREMIUM' || rawTier === 'VIP';

  const tierInfo = isPremiumUser
    ? { label: 'Thành viên Premium', color: '#92400E', bg: '#FEF3C7', icon: 'crown' }
    : rawTier === 'STANDARD'
    ? { label: 'Thành viên Standard', color: '#0369A1', bg: '#E0F2FE', icon: 'spark' }
    : { label: 'Thành viên Cơ bản', color: '#047857', bg: '#ECFDF5', icon: 'leaf' };

  const handleLogout = () => {
    if (isLoggingOut) return;
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            if (onLogout) {
              await onLogout();
            }
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (currentSubPage === 'SECURITY') {
    return (
      <SecurityScreen
        onBack={() => setCurrentSubPage('MAIN')}
        userEmail={displayEmail}
        onLogoutRequested={handleLogout}
      />
    );
  }

  if (currentSubPage === 'HELP_CENTER') {
    return (
      <HelpCenterScreen
        onBack={() => setCurrentSubPage('MAIN')}
        onOpenAiAssistant={onOpenAiAssistant}
      />
    );
  }

  if (currentSubPage === 'ABOUT') {
    return (
      <AboutFinoraScreen
        onBack={() => setCurrentSubPage('MAIN')}
      />
    );
  }

  if (currentSubPage === 'NOTIFICATION_SETTINGS') {
    return (
      <NotificationSettingsScreen
        onBack={() => setCurrentSubPage('MAIN')}
        onViewNotificationsHistory={onNotifications}
      />
    );
  }

  if (currentSubPage === 'SYSTEM_SETTINGS') {
    return (
      <SystemSettingsScreen
        onBack={() => setCurrentSubPage('MAIN')}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── BACKGROUND LƯỢN SÓNG XANH CHỈ Ở PHẦN ĐẦU (Header & User Info) ── */}
      <ImageBackground
        source={require('../../../assets/profile-bg-wave.jpg')}
        style={styles.bgWaveTop}
        resizeMode="cover"
      />

      {/* ── 1. TOP HEADER (Tiêu đề, Bell, Setting) ── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 14) + 4 }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Cá nhân</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={onNotifications}
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <FinanceIcon name="bell" size={19} color="#047857" />
            <View style={styles.bellBadge} />
          </Pressable>
          <Pressable
            onPress={() => setCurrentSubPage('SYSTEM_SETTINGS')}
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <FinanceIcon name="settings" size={19} color="#047857" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 70 },
        ]}
        showsVerticalScrollIndicator={false}
      >
          {/* ── 2. THẺ USER INFO (AVATAR, NAME, TÍCH XANH, BADGE) ── */}
          <View style={styles.userCardRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <Image
                    source={require('../../../assets/default-avatar.png')}
                    style={styles.avatarImg}
                  />
                )}
              </View>
              <Pressable
                onPress={() => setShowAvatarPickerModal(true)}
                style={styles.cameraBtn}
                hitSlop={8}
              >
                <FinanceIcon name="camera" size={13} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.userInfoWrap}>
              <View style={styles.userNameRow}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
                {/* Tích xanh verified */}
                <View style={styles.verifiedBadge}>
                  <FinanceIcon name="check" size={11} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.userEmailText} numberOfLines={1}>
                {displayEmail}
              </Text>

              <View style={[styles.premiumBadgePill, { backgroundColor: tierInfo.bg }]}>
                <FinanceIcon name={tierInfo.icon as any} size={13} color={tierInfo.color} />
                <Text style={[styles.premiumBadgeText, { color: tierInfo.color }]}>
                  {tierInfo.label}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowAccountInfoModal(true)}
              hitSlop={12}
            >
              <FinanceIcon name="chevron-right" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* ── 3. BANNER FINORA PREMIUM (NỀN SÓNG TIA SÁNG CHUẨN + VƯƠNG MIỆN VÀNG 3D) ── */}
          <View style={styles.premiumBannerWrapper}>
            <ImageBackground
              source={require('../../../assets/icons/finora_premium_banner_bg.png')}
              style={styles.premiumBannerCard}
              imageStyle={styles.premiumBannerBgImage}
              resizeMode="cover"
            >
              <View style={styles.premiumBannerContent}>
                <View style={styles.premiumTitleRow}>
                  <FinanceIcon name="crown" size={16} color="#FDE047" />
                  <Text style={styles.premiumBannerTitle}>Finora Premium</Text>
                </View>
                <Text style={styles.premiumBannerSub}>
                  {isPremiumUser
                    ? 'Bạn đang sở hữu đặc quyền AI không giới hạn, phân tích tài chính thông minh.'
                    : 'Mở khoá toàn bộ tính năng AI, phân tích nâng cao và nhiều ưu đãi khác.'}
                </Text>
                <Pressable
                  onPress={() => setShowPricingModal(true)}
                  style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.upgradeBtnText}>
                    {isPremiumUser ? 'Quản lý gói' : 'Nâng cấp ngay'}
                  </Text>
                  <FinanceIcon name="arrow-right" size={14} color="#064E3B" strokeWidth={2.5} />
                </Pressable>
              </View>

              {/* Illustration Vương miện vàng 3D trên bục ngọc (finora_premium_crown_podium.png) */}
              <View style={styles.crownPodiumWrap}>
                <Image
                  source={require('../../../assets/icons/finora_premium_crown_podium.png')}
                  style={styles.crownPodiumImage}
                  resizeMode="contain"
                />
              </View>
            </ImageBackground>
          </View>

          {/* ── 4. 3 THẺ CHỈ SỐ THỐNG KÊ (STATS CARD - TÍNH TOÁN DỮ LIỆU THẬT) ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <FinanceIcon name="chart" size={17} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{totalTxCount}</Text>
              <Text style={styles.statLabel}>Giao dịch</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <FinanceIcon name="calendar" size={17} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{monthsUsedText}</Text>
              <Text style={styles.statLabel}>Đã sử dụng</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <FinanceIcon name="leaf" size={17} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{savingRateText}</Text>
              <Text style={styles.statLabel}>Tỷ lệ tích luỹ</Text>
            </View>
          </View>

          {/* ── 5. NHÓM TÍNH NĂNG 1: TÀI KHOẢN & BẢO MẬT ── */}
          <View style={styles.menuGroupCard}>
            <Pressable
              onPress={() => setShowAccountInfoModal(true)}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#E8F8F0' }]}>
                <FinanceIcon name="user" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Thông tin tài khoản</Text>
                <Text style={styles.menuItemSub}>Xem và cập nhật thông tin</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => setCurrentSubPage('SECURITY')}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#E8F8F0' }]}>
                <FinanceIcon name="shield" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Bảo mật & Đăng nhập</Text>
                <Text style={styles.menuItemSub}>Mật khẩu, xác thực 2 bước (2FA)</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => setShowPricingModal(true)}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                <FinanceIcon name="crown" size={18} color="#D97706" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Gói thành viên</Text>
                <Text style={styles.menuItemSub}>Quản lý gói và quyền lợi Premium</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* ── 6. NHÓM TÍNH NĂNG 2: THIẾT LẬP & TRỢ GIÚP ── */}
          <View style={styles.menuGroupCard}>
            <Pressable
              onPress={() => setCurrentSubPage('NOTIFICATION_SETTINGS')}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#E8F8F0' }]}>
                <FinanceIcon name="bell" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Cài đặt thông báo</Text>
                <Text style={styles.menuItemSub}>Tùy chỉnh thông báo, lịch nhắc & cảnh báo</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => setCurrentSubPage('HELP_CENTER')}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#E8F8F0' }]}>
                <FinanceIcon name="help-circle" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Trung tâm trợ giúp</Text>
                <Text style={styles.menuItemSub}>Hướng dẫn, câu hỏi thường gặp & gửi phản hồi</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => setCurrentSubPage('SYSTEM_SETTINGS')}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#E8F8F0' }]}>
                <FinanceIcon name="settings" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Cài đặt hệ thống</Text>
                <Text style={styles.menuItemSub}>Giao diện, ngôn ngữ, tiền tệ & bảo mật app</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => setCurrentSubPage('ABOUT')}
              style={styles.menuItemRow}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#E8F8F0' }]}>
                <FinanceIcon name="info" size={18} color="#059669" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Giới thiệu Finora</Text>
                <Text style={styles.menuItemSub}>Phiên bản, đội ngũ phát triển & điều khoản</Text>
              </View>
              <FinanceIcon name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* ── 7. NÚT ĐĂNG XUẤT NỀN ĐỎ NHẸ CAO CẤP ── */}
          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={({ pressed }) => [
              styles.logoutBtnCard,
              (pressed || isLoggingOut) && styles.pressed,
              isLoggingOut && { opacity: 0.6 },
            ]}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <FinanceIcon name="logout" size={17} color="#EF4444" />
                <Text style={styles.logoutBtnText}>Đăng xuất</Text>
              </>
            )}
          </Pressable>
        </ScrollView>

      {/* ── MODAL GIỚI THIỆU GÓI & BẢNG GIÁ FINORA (CHUẨN WEB) ── */}
      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentTier={rawTier}
        onSelectPlan={(planId) => {
          userProfileApi.getProfile().then((data) => {
            if (data) setProfile(data);
          });
        }}
      />

      {/* ── MODAL CẬP NHẬT THÔNG TIN TÀI KHOẢN ── */}
      <AccountInfoModal
        visible={showAccountInfoModal}
        onClose={() => setShowAccountInfoModal(false)}
        profile={profile}
        onUpdated={(updated) => {
          setProfile(updated);
        }}
      />

      {/* ── MODAL CHỌN & ĐỔI ẢNH ĐẠI DIỆN ── */}
      <AvatarPickerModal
        visible={showAvatarPickerModal}
        onClose={() => setShowAvatarPickerModal(false)}
        currentAvatarUrl={profile?.avatarUrl}
        onAvatarUpdated={(newAvatarUrl) => {
          if (profile) {
            setProfile({ ...profile, avatarUrl: newAvatarUrl });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  bgWaveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  /* ── USER INFO ── */
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: '#059669',
    overflow: 'hidden',
    backgroundColor: '#E8F8F0',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfoWrap: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedBadge: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmailText: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  premiumBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  userChevron: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 6,
  },

  /* ── BANNER FINORA PREMIUM ── */
  premiumBannerWrapper: {
    marginBottom: 16,
    overflow: 'visible',
  },
  premiumBannerCard: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 116,
    overflow: 'visible',
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumBannerBgImage: {
    borderRadius: 22,
  },
  premiumBannerContent: {
    maxWidth: '60%',
    paddingRight: 6,
    zIndex: 2,
  },
  premiumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  premiumBannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  premiumBannerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 15,
    marginBottom: 8,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6.5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 5,
  },
  upgradeBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46',
  },
  upgradeBtnArrow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  crownPodiumWrap: {
    position: 'absolute',
    right: -4,
    bottom: -14,
    width: 150,
    height: 146,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  crownPodiumImage: {
    width: '100%',
    height: '100%',
  },

  /* ── STATS ROW ── */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* ── MENU GROUPS ── */
  menuGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 22,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 50,
  },

  /* ── LOGOUT BUTTON ── */
  logoutBtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 18,
    paddingVertical: 13,
    gap: 8,
    marginTop: 6,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

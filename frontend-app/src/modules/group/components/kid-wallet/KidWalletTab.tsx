import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ImageBackground } from 'react-native';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import { ChildWalletResponse } from '../../api/groupApi';
import { resolveKidAvatarSource } from './kidAvatarPresets';

export interface KidWalletTabProps {
  childWallets: ChildWalletResponse[];
  onAddWalletPress: () => void;
  onWalletItemPress: (wallet: ChildWalletResponse) => void;
  onGoalPress: () => void;
}

const KID_BANNER_BG = require('../../../../assets/icons/groups/family_banner_bg_seamless.png');
const KID_BANNER_MASCOT = require('../../../../assets/icons/groups/kid_banner_mascot.png');

function formatVND(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
}

function formatChildAge(wallet: ChildWalletResponse): string {
  if (wallet.age && wallet.age > 0) {
    return `${wallet.age} tuổi`;
  }
  if (wallet.dateOfBirth) {
    const parts = wallet.dateOfBirth.split('-');
    const birthYear = parseInt(parts[0], 10);
    if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
      const calcAge = new Date().getFullYear() - birthYear;
      return `${calcAge > 0 ? calcAge : 1} tuổi`;
    }
  }
  return 'Bé yêu';
}

export const KidWalletTab: React.FC<KidWalletTabProps> = ({
  childWallets,
  onAddWalletPress,
  onWalletItemPress,
  onGoalPress,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. HERO BANNER MÀU XANH: "Quản lý tài chính cho con" (Đồng bộ kiểu dáng chuẩn như banner Quỹ nhóm ở trang Tổng quan, icon đặt phía trước) */}
      <ImageBackground
        source={KID_BANNER_BG}
        style={styles.heroBanner}
        imageStyle={styles.heroBannerBgImage}
        resizeMode="cover"
      >
        <Image
          source={KID_BANNER_MASCOT}
          style={styles.heroBoyImage}
          resizeMode="contain"
        />

        <View style={styles.heroTextCol}>
          <Text style={styles.heroTitle}>Quản lý tài chính cho con</Text>
          <Text style={styles.heroSub}>
            Giúp con hình thành thói quen chi tiêu và tiết kiệm thông minh.
          </Text>
        </View>
      </ImageBackground>

      {/* 2. CARD: DANH SÁCH VÍ TRẺ EM */}
      <View style={styles.cardContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Danh sách ví trẻ em ({childWallets.length})
          </Text>
          <Pressable
            onPress={onAddWalletPress}
            style={({ pressed }) => [styles.addWalletBtn, pressed && { opacity: 0.8 }]}
          >
            <FinanceIcon name="plus" size={14} color="#059669" />
            <Text style={styles.addWalletBtnText}>Thêm ví</Text>
          </Pressable>
        </View>

        {/* Danh sách các ví con */}
        <View style={styles.walletList}>
          {childWallets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 30, marginBottom: 6 }}>👛</Text>
              <Text style={styles.emptyTitle}>Chưa có ví trẻ em nào</Text>
              <Text style={styles.emptySub}>
                Bấm "+ Thêm ví" ở góc trên để tạo tài khoản ví cho bé yêu của bạn.
              </Text>
            </View>
          ) : (
            childWallets.map((wallet, index) => {
              const avatarKey = wallet.avatarKey || wallet.avatarUrl;
              const isGirl = avatarKey === 'kid_girl' || avatarKey?.includes('girl') || index % 2 === 1;
              const avatarSource = resolveKidAvatarSource(avatarKey, isGirl);

              return (
                <Pressable
                  key={wallet.id || index}
                  onPress={() => onWalletItemPress(wallet)}
                  style={({ pressed }) => [
                    styles.walletRow,
                    index < childWallets.length - 1 && styles.walletRowBorder,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  {/* Avatar bé tròn đúng ảnh đại diện bé trai hoặc bé gái */}
                  <View
                    style={[
                      styles.avatarCircle,
                      isGirl
                        ? { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8' }
                        : { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                    ]}
                  >
                    <Image source={avatarSource} style={styles.avatarImg} resizeMode="cover" />
                  </View>

                  {/* Thông tin bé */}
                  <View style={styles.infoCol}>
                    <Text style={styles.childName} numberOfLines={1}>
                      {wallet.childName}
                    </Text>
                    <Text style={styles.childGrade}>
                      {formatChildAge(wallet)}
                    </Text>
                  </View>

                  {/* Số dư ví + Mũi tên */}
                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceText}>{formatVND(wallet.balance)} đ</Text>
                    <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* 3. CARD: THIẾT LẬP MỤC TIÊU CÙNG CON */}
      <Pressable
        onPress={onGoalPress}
        style={({ pressed }) => [styles.goalCard, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.goalIconBox}>
          {/* Biểu tượng 3 cột tăng trưởng xanh lá chuẩn ảnh */}
          <View style={styles.barChartVector}>
            <View style={[styles.barItem, { height: 9 }]} />
            <View style={[styles.barItem, { height: 15 }]} />
            <View style={[styles.barItem, { height: 22 }]} />
          </View>
        </View>

        <View style={styles.goalInfoCol}>
          <Text style={styles.goalTitle}>Thiết lập mục tiêu cùng con</Text>
          <Text style={styles.goalSub}>
            Ví dụ: Tiết kiệm mua sách, đồ chơi, học phí...
          </Text>
        </View>

        <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 28,
  },
  /* 1. HERO BANNER - CHUẨN FORM NHƯ FUND BANNER TRANG TỔNG QUAN NHƯNG ICON BÉ Ở TRƯỚC */
  heroBanner: {
    backgroundColor: '#0E964E',
    borderRadius: 22,
    paddingTop: 10,
    paddingBottom: 0,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'flex-end', // Căn chỉnh chạm đáy banner
    height: 98,
    overflow: 'visible', // Cho phép phần đầu icon nhô lên phía trên
    shadowColor: '#0E964E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 22,
  },
  heroBannerBgImage: {
    borderRadius: 22,
  },
  heroBoyImage: {
    width: 128,
    height: 114,
    marginLeft: -8,
    marginRight: 8,
    marginBottom: 1, // Đặt ở mức 1px (ngay giữa -2px và 4px) sát khít hoàn hảo viền cạnh đáy
    zIndex: 2,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 4,
    paddingBottom: 21,
    justifyContent: 'center',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#D1FAE5',
    lineHeight: 16.5,
    fontWeight: '500',
  },
  /* 2. CARD CONTAINER */
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  addWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addWalletBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  walletList: {
    flexDirection: 'column',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  walletRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
  },
  childName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  childGrade: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  balanceCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#059669',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  /* 3. GOAL CARD */
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  goalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barChartVector: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3.5,
    height: 22,
  },
  barItem: {
    width: 4.5,
    borderRadius: 2,
    backgroundColor: '#059669',
  },
  goalInfoCol: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  goalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});

export default KidWalletTab;

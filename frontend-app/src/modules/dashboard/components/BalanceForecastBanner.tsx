import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { themeTokens } from '../themeTokens';

type Props = {
  onPress: () => void;
  predictedBalance?: number;
};

// Mascot 3D robot AI kèm bảng số liệu dự báo sắc nét không nền
const forecastRobotImage = require('../../../assets/icons/ai_balance_forecast_full_mascot.png');
// Ảnh nền cong lượn sóng ngọc bích sang trọng do người dùng tải lên
const bannerBgImage = require('../../../assets/icons/ai_forecast_banner_bg.png');

export function BalanceForecastBanner({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bannerCard, pressed && styles.pressed]}
      accessibilityLabel="AI Dự đoán số dư"
    >
      {/* Ảnh nền sóng ngọc bích bo góc mượt mà */}
      <Image
        source={bannerBgImage}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Khung nội dung đặt trên nền */}
      <View style={styles.contentContainer}>
        {/* 1. Bên trái: Robot 3D AI kèm bảng số liệu hiển thị tràn sang gần chữ */}
        <View style={styles.mascotContainer}>
          <Image
            source={forecastRobotImage}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        {/* 2. Ở giữa: Nội dung căn thẳng hàng */}
        <View style={styles.contentWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.headingTitle}>AI Dự đoán số dư</Text>
          </View>
          <Text style={styles.descriptionText} numberOfLines={2}>
            Dự báo số dư cuối kỳ dựa trên thu chi và thói quen của bạn.
          </Text>
        </View>

        {/* 3. Bên phải: Nút tròn mũi tên xanh ngọc sắc nét trên nền trắng */}
        <View style={styles.arrowCircle}>
          <ChevronRight size={19} color="#007F53" strokeWidth={2.6} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerCard: {
    marginHorizontal: themeTokens.spacing.lg,
    marginTop: 14,
    borderRadius: 24,
    height: 104, // Khóa cứng chiều cao đúng 104px
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden', // Bo tròn ảnh nền mượt mà không bị lẹm góc
    position: 'relative',
    shadowColor: '#07543F',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 8,
    paddingRight: 14,
    zIndex: 2,
  },
  mascotContainer: {
    width: 124,
    height: 78,
    marginLeft: -4,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: {
    width: 124,
    height: 76,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  titleRow: {
    marginBottom: 4,
  },
  headingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#073B2E',
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: 11.5,
    color: '#135846',
    lineHeight: 15.5,
    fontWeight: '600',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  arrowIcon: {
    fontSize: 22,
    color: '#00A86B',
    fontWeight: '900',
    marginTop: -3,
    marginLeft: 1,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});

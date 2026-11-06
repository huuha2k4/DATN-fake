import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { themeTokens } from '../themeTokens';

type Props = {
  onPress: () => void;
};

// Mascot FinAI 3D gốc chất lượng cao
const mascotImage = require('../../../assets/icons/icon_finai_assistant.png');

export function FinAIBanner({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bannerCard, pressed && styles.pressed]}
      accessibilityLabel="Trợ lý FinAI"
    >
      {/* Robot mascot 3D to tràn nhẹ viền card như ảnh thiết kế gốc */}
      <View style={styles.mascotContainer}>
        <Image source={mascotImage} style={styles.mascotImage} resizeMode="contain" />
      </View>

      {/* Nội dung thông điệp */}
      <View style={styles.contentWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.headingTitle}>Trợ lý FinAI</Text>
        </View>
        <Text style={styles.descriptionText} numberOfLines={2}>
          Phân tích chi tiêu, gợi ý tiết kiệm và xây dựng kế hoạch tài chính.
        </Text>
      </View>

      {/* Nút tròn mũi tên xanh lá đặc trưng */}
      <View style={styles.arrowCircle}>
        <Text style={styles.arrowIcon}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerCard: {
    marginHorizontal: themeTokens.spacing.lg,
    marginTop: themeTokens.spacing.lg + 10,
    backgroundColor: '#E8F8F0',
    borderRadius: 24,
    paddingTop: 12,
    paddingBottom: 14,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C2EBD6',
    shadowColor: '#07543F',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mascotContainer: {
    width: 92,
    height: 92,
    marginTop: -22,
    marginBottom: -10,
    marginLeft: -4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: {
    width: 104,
    height: 104,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  titleRow: {
    marginBottom: 4,
  },
  headingTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#073B2E',
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: 12,
    color: '#285848',
    lineHeight: 16.5,
    fontWeight: '500',
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00A86B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A86B',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  arrowIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: -3,
    marginLeft: 1,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});

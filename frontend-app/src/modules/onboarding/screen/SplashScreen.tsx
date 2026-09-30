import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { colors, radius, spacing } from '../../../theme';

const carouselSlides = [
  {
    title: 'Làm chủ tài chính',
    subtitle: 'cùng Trợ lý AI',
    description: 'Theo dõi chi tiêu tự động bằng OCR, phân tích thói quen và nhận dự báo tài chính thông minh mỗi ngày.',
  },
  {
    title: 'Hiểu rõ dòng tiền',
    subtitle: 'tối ưu từng khoản chi',
    description: 'Phân tích thói quen chi tiêu và tìm ra cơ hội tiết kiệm hiệu quả hơn mỗi ngày.',
  },
  {
    title: 'Kiến tạo tương lai',
    subtitle: 'vững vàng cùng AI',
    description: 'Nhận dự báo tài chính thông minh để chủ động lên kế hoạch cho những mục tiêu dài hạn.',
  },
];

type Props = { onStart: () => void };

export function SplashScreen({ onStart }: Props) {
  const [activeSlide, setActiveSlide] = React.useState(0);
  const currentSlide = carouselSlides[activeSlide];
  const illustrationUri = Image.resolveAssetSource(require('../assets/financial-ai-assistant.svg')).uri;

  return <View style={styles.screen}>
    <View style={styles.glowTop} />
    <View style={styles.glowBottom} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statusBar}><Text style={styles.time}>9:41</Text><Text style={styles.statusIcons}>▮ ▮ ◉</Text></View>
      <View style={styles.brandBlock}>
        <View style={styles.badge}><View style={styles.badgeDot} /><Text style={styles.badgeText}>CÙNG AI THÔNG MINH HƠN</Text></View>
        <Text style={styles.brandTitle}>HỆ THỐNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN</Text>
        <Text style={styles.brandSubtitle}>Quản lý chi tiêu · Kiến tạo tương lai</Text>
      </View>
      <View style={styles.illustrationOuter}>
        <View style={styles.illustration}>
          <SvgUri uri={illustrationUri} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" accessibilityLabel="Minh họa Trợ lý AI Tài chính" />
        </View>
      </View>
      <View style={styles.copyBlock}>
        <Text style={styles.slideTitle}>{currentSlide.title}</Text>
        <Text style={styles.slideSubtitle}>{currentSlide.subtitle}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
        <View style={styles.dots} accessibilityRole="tablist" accessibilityLabel="Các nội dung giới thiệu">
          {carouselSlides.map((slide, index) => <Pressable key={slide.title} onPress={() => setActiveSlide(index)} accessibilityRole="tab" accessibilityLabel={`Chuyển đến nội dung ${index + 1}`} style={[styles.dot, activeSlide === index ? styles.activeDot : styles.inactiveDot]} />)}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Bắt đầu sử dụng hệ thống quản lý tài chính">
          <Text style={styles.startText}>Bắt đầu ngay</Text><Text style={styles.startArrow}>→</Text>
        </Pressable>
        <View style={styles.loginRow}><Text style={styles.loginPrompt}>Đã có tài khoản?</Text><Pressable onPress={() => Alert.alert('Đăng nhập', 'Tính năng đăng nhập sẽ sớm được ra mắt.')} accessibilityRole="button"><Text style={styles.loginLink}>Đăng nhập</Text></Pressable></View>
      </View>
      <View style={styles.footer}><Text style={styles.quote}>“QUẢN LÝ TÀI CHÍNH HÔM NAY - TỰ DO TÀI CHÍNH NGÀY MAI”</Text><View style={styles.homeIndicator} /></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  glowTop: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#D1FAE5', opacity: 0.62, top: -90, right: -85 },
  glowBottom: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#ECFDF5', opacity: 0.9, top: 170, left: -110 },
  statusBar: { paddingTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  statusIcons: { color: colors.ink, fontSize: 12, letterSpacing: 2 },
  brandBlock: { alignItems: 'center', marginTop: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#D1FAE5CC', borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0E6' },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  badgeText: { color: '#004D40', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  brandTitle: { color: '#047857', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textAlign: 'center', marginTop: 10 },
  brandSubtitle: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  illustrationOuter: { padding: spacing.md, marginTop: spacing.lg, borderRadius: 30, borderWidth: 1, borderColor: '#D1FAE5E6', backgroundColor: '#ECFDF5B3', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  illustration: { height: 250, borderRadius: 20, backgroundColor: colors.surface, overflow: 'hidden', shadowColor: '#004D40', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  copyBlock: { alignItems: 'center', marginTop: spacing.lg },
  slideTitle: { color: colors.forest, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  slideSubtitle: { color: colors.ink, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  description: { color: '#53635B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm, maxWidth: 330 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  dot: { height: 8, borderRadius: 4 },
  activeDot: { width: 24, backgroundColor: colors.forest },
  inactiveDot: { width: 8, backgroundColor: '#D5DDD8' },
  actions: { marginTop: spacing.lg },
  startButton: { minHeight: 54, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: '#004D40', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  startText: { color: colors.surface, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  startArrow: { color: colors.surface, fontSize: 19, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: spacing.sm },
  loginPrompt: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  loginLink: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  footer: { alignItems: 'center', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#E2E8F099' },
  quote: { color: '#64726B', fontSize: 10, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  homeIndicator: { width: 128, height: 4, borderRadius: 2, backgroundColor: '#CBD5D1', marginTop: spacing.md },
});

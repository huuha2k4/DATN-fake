import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Rect,
  Path,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingWaveBackgroundProps {
  height?: number;
  waveHeight?: number;
  width?: number;
  children?: React.ReactNode;
}

/**
 * Nền Gradient sóng Finora - Sóng lượn nhiều tầng đan xen nghệ thuật (Multi-layer Organic Waves)
 * Y hệt ảnh mẫu thiết kế:
 * - Dải sóng có nhiều nếp uốn lượn phong phú, dập dềnh tự nhiên
 * - Các lớp sóng đè lấn lên chân icon
 * - Nền chính: #003F32 -> #005541 -> #007B58 -> #009B69
 * - Glow radial gradient xanh ngọc nhẹ phía sau icon tạo chiều sâu
 */
export function OnboardingWaveBackground({
  height = 420,
  waveHeight = 140,
  width = SCREEN_WIDTH,
  children,
}: OnboardingWaveBackgroundProps) {
  const glowY = height * 0.44;

  return (
    <View style={[styles.container, { height, width }]}>
      {/* 1. Nền Gradient chính xanh rừng đậm */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="finoraGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#003F32" />
              <Stop offset="35%" stopColor="#005541" />
              <Stop offset="70%" stopColor="#007B58" />
              <Stop offset="100%" stopColor="#009B69" />
            </SvgLinearGradient>

            <SvgRadialGradient
              id="emeraldGlow"
              cx="50%"
              cy={glowY}
              r={width * 0.55}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
              <Stop offset="50%" stopColor="#059669" stopOpacity="0.14" />
              <Stop offset="100%" stopColor="#003F32" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>

          <Rect x="0" y="0" width={width} height={height} fill="url(#finoraGrad)" />
          <Rect x="0" y="0" width={width} height={height} fill="url(#emeraldGlow)" />
        </Svg>
      </View>

      {/* 2. Dải sóng nhiều nếp uốn lượn nghệ thuật đan xen (viewBox 375 x 140) */}
      <View style={[styles.waveContainer, { height: waveHeight, bottom: 0 }]}>
        <Svg
          width={width}
          height={waveHeight}
          viewBox="0 0 375 140"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {/* Sóng tầng 1 - Xanh ngọc sâu #047857 -> #10B981 */}
            <SvgLinearGradient id="waveL1" x1="0%" y1="0%" x2="100%" y2="50%">
              <Stop offset="0%" stopColor="#047857" stopOpacity="0.45" />
              <Stop offset="50%" stopColor="#10B981" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#00B87A" stopOpacity="0.5" />
            </SvgLinearGradient>

            {/* Sóng tầng 2 - Xanh tươi #00B87A -> #34D399 */}
            <SvgLinearGradient id="waveL2" x1="100%" y1="0%" x2="0%" y2="80%">
              <Stop offset="0%" stopColor="#00B87A" stopOpacity="0.65" />
              <Stop offset="50%" stopColor="#34D399" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
            </SvgLinearGradient>

            {/* Sóng tầng 3 - Lớp xanh bạc hà sáng #6EE7B7 -> #A7F3D0 */}
            <SvgLinearGradient id="waveL3" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#34D399" stopOpacity="0.8" />
              <Stop offset="60%" stopColor="#6EE7B7" stopOpacity="0.65" />
              <Stop offset="100%" stopColor="#10B981" stopOpacity="0.75" />
            </SvgLinearGradient>

            {/* Sóng tầng 4 - Viền ngọc nhạt */}
            <SvgLinearGradient id="waveL4" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.75" />
            </SvgLinearGradient>
          </Defs>

          {/* Sóng tầng 1 - Lớp xanh ngọc vươn cao lên trên (y=15), đan chéo mạnh mẽ */}
          <Path
            d="M 0 18 C 50 50, 110 12, 170 42 C 230 72, 290 20, 375 32 L 375 140 L 0 140 Z"
            fill="url(#waveL1)"
          />

          {/* Sóng tầng 2 - Lớp chéo đối lập đâm ngược từ phải qua trái, vươn cao 2 bên hông */}
          <Path
            d="M 0 42 C 45 15, 105 65, 165 28 C 230 -2, 295 55, 375 32 L 375 140 L 0 140 Z"
            fill="url(#waveL2)"
          />

          {/* Sóng tầng 3 - Lớp sóng cuộn đan chéo rộng */}
          <Path
            d="M 0 38 C 60 78, 120 30, 190 62 C 255 95, 320 32, 375 50 L 375 140 L 0 140 Z"
            fill="url(#waveL3)"
          />

          {/* Sóng tầng 4 - Dải viền ngọc uốn lượn đan chéo mở rộng */}
          <Path
            d="M 0 68 C 55 38, 125 88, 205 58 C 270 30, 330 80, 375 65 L 375 140 L 0 140 Z"
            fill="url(#waveL4)"
          />

          {/* Sóng tầng 5 - Lớp chuyển tiếp mờ trải rộng xuống dưới */}
          <Path
            d="M 0 88 C 70 115, 135 68, 215 102 C 285 125, 335 78, 375 92 L 375 140 L 0 140 Z"
            fill="#A7F3D0"
            fillOpacity={0.6}
          />

          {/* Sóng cuối (#FFFFFF): Đường cong đan chéo gợn sóng, trải dài mềm mại xuống đáy */}
          <Path
            d="M 0 102 C 65 76, 130 118, 200 95 C 270 72, 335 112, 375 98 L 375 140 L 0 140 Z"
            fill="#FFFFFF"
          />
        </Svg>
      </View>

      {/* 3. Lớp Children: Top Navbar + Mascot 3D */}
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#003F32',
  },
  waveContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
});

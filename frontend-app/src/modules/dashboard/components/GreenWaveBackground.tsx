import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useAppTheme } from '../../../context/ThemeContext';

type Variant = 'header' | 'banner';

type Props = {
  variant?: Variant;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

function GreenWaveBackgroundComponent({
  variant = 'header',
  width = 380,
  height = 128,
  style,
}: Props) {
  const { isDark } = useAppTheme();

  if (variant === 'banner') {
    if (isDark) {
      return (
        <View
          style={[
            styles.absoluteFill,
            { width, height },
            style,
          ]}
          pointerEvents="none"
        >
          {/* Nền Gradient Tối màu ngọc thẫm sang trọng (#0A1A14 -> #102A20 -> #15382B) */}
          <LinearGradient
            colors={['#081711', '#0E241B', '#133527']}
            locations={[0, 0.56, 1]}
            start={{ x: 0, y: 0.15 }}
            end={{ x: 1, y: 0.95 }}
            style={{ width, height }}
          />

          {/* 3 Lớp sóng SVG huyền ảo màu ngọc lục bảo mờ */}
          <Svg
            width={width}
            height={height}
            viewBox="0 0 380 108"
            preserveAspectRatio="none"
            style={styles.svgOverlay}
          >
            <Defs>
              <SvgLinearGradient id="bannerWaveDark1" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#10B981" stopOpacity="0.2" />
                <Stop offset="1" stopColor="#047857" stopOpacity="0.08" />
              </SvgLinearGradient>
              <SvgLinearGradient id="bannerWaveDark2" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#34D399" stopOpacity="0.25" />
                <Stop offset="1" stopColor="#059669" stopOpacity="0.12" />
              </SvgLinearGradient>
              <SvgLinearGradient id="bannerWaveDark3" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#6EE7B7" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#10B981" stopOpacity="0.15" />
              </SvgLinearGradient>
            </Defs>

            <Path
              d="M 210,0 C 258,28 228,72 150,108 L 380,108 L 380,0 Z"
              fill="url(#bannerWaveDark1)"
            />
            <Path
              d="M 186,108 C 226,74 290,58 380,78 L 380,108 Z"
              fill="url(#bannerWaveDark2)"
            />
            <Path
              d="M 228,108 C 264,80 316,72 380,90 L 380,108 Z"
              fill="url(#bannerWaveDark3)"
            />
          </Svg>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.absoluteFill,
          { width, height },
          style,
        ]}
        pointerEvents="none"
      >
        {/* Nền Gradient Xanh Emerald Dịu Mắt (#0B6E4F -> #149668 -> #2EBE84) */}
        <LinearGradient
          colors={['#0B6E4F', '#149668', '#2EBE84']}
          locations={[0, 0.56, 1]}
          start={{ x: 0, y: 0.15 }}
          end={{ x: 1, y: 0.95 }}
          style={{ width, height }}
        />

        {/* 3 Lớp sóng SVG uốn lượn mềm mại ở góc phải & góc dưới */}
        <Svg
          width={width}
          height={height}
          viewBox="0 0 380 108"
          preserveAspectRatio="none"
          style={styles.svgOverlay}
        >
          <Defs>
            <SvgLinearGradient id="bannerWave1" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#35D08B" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#149668" stopOpacity="0.24" />
            </SvgLinearGradient>
            <SvgLinearGradient id="bannerWave2" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#58E29E" stopOpacity="0.52" />
              <Stop offset="1" stopColor="#26BA7C" stopOpacity="0.35" />
            </SvgLinearGradient>
            <SvgLinearGradient id="bannerWave3" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#86F2B8" stopOpacity="0.72" />
              <Stop offset="1" stopColor="#4ADE80" stopOpacity="0.45" />
            </SvgLinearGradient>
          </Defs>

          {/* Lớp sóng 1: Vòm lượn chéo từ đỉnh giữa sang đáy phải */}
          <Path
            d="M 210,0 C 258,28 228,72 150,108 L 380,108 L 380,0 Z"
            fill="url(#bannerWave1)"
          />

          {/* Lớp sóng 2: Đồi sóng uốn cong góc dưới phải */}
          <Path
            d="M 186,108 C 226,74 290,58 380,78 L 380,108 Z"
            fill="url(#bannerWave2)"
          />

          {/* Lớp sóng 3: Sóng xanh sáng nổi bật ở mép dưới phải */}
          <Path
            d="M 228,108 C 264,80 316,72 380,90 L 380,108 Z"
            fill="url(#bannerWave3)"
          />
        </Svg>
      </View>
    );
  }

  // Header Wave
  if (isDark) {
    return (
      <View
        style={[
          styles.absoluteFill,
          { width, height },
          style,
        ]}
        pointerEvents="none"
      >
        {/* Nền Header tối sang trọng: Đen ngọc sâu dần tan mờ vào nền trang chủ #0B1310 */}
        <LinearGradient
          colors={[
            '#05110C',
            '#091D15',
            '#0E291E',
            '#113124',
            '#0D241B',
            '#0B1812',
            '#0B1310',
          ]}
          locations={[0, 0.22, 0.44, 0.64, 0.8, 0.92, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.65, y: 1 }}
          style={{ width, height }}
        />

        <Svg
          width={width}
          height={height}
          viewBox="0 0 400 420"
          preserveAspectRatio="none"
          style={styles.svgOverlay}
        >
          <Defs>
            <SvgLinearGradient id="hdrDarkTopLeft" x1="0" y1="0" x2="0.9" y2="1">
              <Stop offset="0" stopColor="#041F16" stopOpacity="0.95" />
              <Stop offset="0.65" stopColor="#082A1E" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#0D3526" stopOpacity="0.65" />
            </SvgLinearGradient>

            <SvgLinearGradient id="hdrDarkDiagonal" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#093827" stopOpacity="0.75" />
              <Stop offset="0.6" stopColor="#0E4A34" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#10B981" stopOpacity="0.2" />
            </SvgLinearGradient>

            <SvgLinearGradient id="hdrDarkRightHill" x1="0.2" y1="0" x2="0.8" y2="1">
              <Stop offset="0" stopColor="#059669" stopOpacity="0.4" />
              <Stop offset="0.55" stopColor="#047857" stopOpacity="0.25" />
              <Stop offset="1" stopColor="#064E3B" stopOpacity="0.05" />
            </SvgLinearGradient>

            <SvgLinearGradient id="hdrDarkTopRightGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#047857" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#059669" stopOpacity="0.4" />
            </SvgLinearGradient>
          </Defs>

          <Path
            d="M 235,0 L 400,0 L 400,195 C 330,175 270,130 235,0 Z"
            fill="url(#hdrDarkTopRightGlow)"
          />

          <Path
            d="M 0,0 L 295,0 C 265,92 205,168 105,204 C 55,222 20,232 0,236 Z"
            fill="url(#hdrDarkDiagonal)"
          />

          <Path
            d="M 0,0 L 252,0 C 228,74 176,136 86,168 C 44,183 16,192 0,196 Z"
            fill="url(#hdrDarkTopLeft)"
          />

          <Path
            d="M 168,225 C 218,148 316,134 400,184 L 400,335 L 70,335 C 110,295 140,262 168,225 Z"
            fill="url(#hdrDarkRightHill)"
          />
        </Svg>

        <LinearGradient
          colors={[
            'rgba(11, 19, 16, 0)',
            'rgba(11, 19, 16, 0.1)',
            'rgba(11, 19, 16, 0.5)',
            'rgba(11, 19, 16, 0.9)',
            '#0B1310',
          ]}
          locations={[0, 0.45, 0.68, 0.86, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomFadeOverlay}
        />
      </View>
    );
  }

  // Header Light Wave
  return (
    <View
      style={[
        styles.absoluteFill,
        { width, height },
        style,
      ]}
      pointerEvents="none"
    >
      {/* 1. Lớp nền cơ sở: Xanh đậm ở trên, chuyển dần sang xanh tươi rồi tan mờ hoàn toàn sang trắng ở dưới */}
      <LinearGradient
        colors={[
          '#00523D',
          '#00774F',
          '#009E60',
          '#5FD393',
          '#CCF3DC',
          '#EAF9F0',
          '#F4F8F5',
        ]}
        locations={[0, 0.24, 0.44, 0.64, 0.8, 0.91, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={{ width, height }}
      />

      {/* 2. Các lớp sóng SVG uốn lượn chuẩn theo ảnh tham chiếu */}
      <Svg
        width={width}
        height={height}
        viewBox="0 0 400 420"
        preserveAspectRatio="none"
        style={styles.svgOverlay}
      >
        <Defs>
          {/* Mảng xanh đậm góc trái trên (nơi có giờ 09:53, Avatar và Chào buổi sáng) */}
          <SvgLinearGradient id="hdrTopLeftDeep" x1="0" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor="#004D3B" stopOpacity="0.98" />
            <Stop offset="0.65" stopColor="#006646" stopOpacity="0.94" />
            <Stop offset="1" stopColor="#007F53" stopOpacity="0.85" />
          </SvgLinearGradient>

          {/* Sóng trung gian xanh lá đậm vừa chạy chéo qua chữ Nguyễn Hữu Hà */}
          <SvgLinearGradient id="hdrDiagonalRibbon" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#008E58" stopOpacity="0.85" />
            <Stop offset="0.6" stopColor="#00A663" stopOpacity="0.72" />
            <Stop offset="1" stopColor="#26C478" stopOpacity="0.45" />
          </SvgLinearGradient>

          {/* Đồi sóng xanh lá tươi (#2CD47D -> #6CEB96) nổi lên bên phải dưới nút Cài đặt */}
          <SvgLinearGradient id="hdrRightBrightHill" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#35D882" stopOpacity="0.88" />
            <Stop offset="0.55" stopColor="#16B869" stopOpacity="0.72" />
            <Stop offset="1" stopColor="#8EF0B2" stopOpacity="0.2" />
          </SvgLinearGradient>

          {/* Vầng sáng xanh lục nhạt góc phải trên (chỗ biểu tượng sóng/wifi/pin) */}
          <SvgLinearGradient id="hdrTopRightGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#00995C" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#2AD17B" stopOpacity="0.82" />
          </SvgLinearGradient>
        </Defs>

        {/* Góc phải trên xanh tươi sáng (khu vực cột sóng + pin) */}
        <Path
          d="M 235,0 L 400,0 L 400,195 C 330,175 270,130 235,0 Z"
          fill="url(#hdrTopRightGlow)"
        />

        {/* Dải sóng trung gian uốn chéo mềm mại từ góc phải trên (x=295,y=0) xuống mép trái (x=0,y=236) */}
        <Path
          d="M 0,0 L 295,0 C 265,92 205,168 105,204 C 55,222 20,232 0,236 Z"
          fill="url(#hdrDiagonalRibbon)"
        />

        {/* Vòm xanh đậm chủ đạo góc trái trên ôm trọn Avatar & lời chào */}
        <Path
          d="M 0,0 L 252,0 C 228,74 176,136 86,168 C 44,183 16,192 0,196 Z"
          fill="url(#hdrTopLeftDeep)"
        />

        {/* Đồi sóng xanh lá tươi cong vòm lên ở bên phải (ngay dưới nút Cài đặt) và thoải dần sang trái */}
        <Path
          d="M 168,225 C 218,148 316,134 400,184 L 400,335 L 70,335 C 110,295 140,262 168,225 Z"
          fill="url(#hdrRightBrightHill)"
        />
      </Svg>

      {/* 3. Lớp phủ Gradient tan mờ dần từ trong suốt sang màu nền trang chủ */}
      <LinearGradient
        colors={[
          'rgba(244, 248, 245, 0)',
          'rgba(244, 248, 245, 0.06)',
          'rgba(244, 248, 245, 0.42)',
          'rgba(244, 248, 245, 0.85)',
          '#F4F8F5',
        ]}
        locations={[0, 0.45, 0.68, 0.86, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFadeOverlay}
      />
    </View>
  );
}

export const GreenWaveBackground = React.memo(GreenWaveBackgroundComponent);

const styles = StyleSheet.create({
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bottomFadeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
});

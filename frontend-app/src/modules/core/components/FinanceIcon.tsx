import React from 'react';
import Svg, {
  Path,
  Rect,
  Circle,
  Polyline,
  Line,
  Polygon,
} from 'react-native-svg';

export type IconName =
  | 'grid' | 'arrows' | 'wallet' | 'chart' | 'spark' | 'bank' | 'settings'
  | 'search' | 'plus' | 'receipt' | 'bell' | 'calendar' | 'refresh' | 'download'
  | 'trend' | 'income' | 'expense' | 'coffee' | 'bolt' | 'more' | 'arrow' | 'shield' | 'clock' | 'user' | 'logout' | 'key' | 'lock'
  | 'edit' | 'delete' | 'shopping-bag' | 'car' | 'home' | 'heart' | 'zap' | 'book' | 'film' | 'map' | 'piggy-bank' | 'credit-card' | 'help-circle' | 'briefcase' | 'gift' | 'trending-up' | 'store' | 'plus-circle' | 'eye'
  | 'sun' | 'moon' | 'borrowing' | 'lending' | 'hand-coins' | 'menu' | 'close'
  | 'burger' | 'pill' | 'users' | 'group' | 'file-text' | 'utensils' | 'banknote';

export function FinanceIcon({
  name,
  size = 18,
  color = '#00A86B',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const renderShape = () => {
    switch (name) {
      case 'grid':
        return (
          <>
            <Rect x="3" y="3" width="7" height="7" rx="1.5" />
            <Rect x="14" y="3" width="7" height="7" rx="1.5" />
            <Rect x="3" y="14" width="7" height="7" rx="1.5" />
            <Rect x="14" y="14" width="7" height="7" rx="1.5" />
          </>
        );
      case 'arrows':
        return (
          <>
            <Path d="M4 8h13m0 0l-3.5-3.5M17 8l-3.5 3.5" />
            <Path d="M20 16H7m0 0l3.5-3.5M7 16l3.5 3.5" />
          </>
        );
      case 'wallet':
        return (
          <>
            <Rect x="3" y="5" width="18" height="15" rx="2.5" />
            <Path d="M3 9h18M16 14h2" />
            <Path d="M6 5V4a1 1 0 0 1 1-1h12" />
          </>
        );
      case 'chart':
        return (
          <>
            <Path d="M3 3v18h18" />
            <Path d="m7 14 4-4 4 3 6-7" />
          </>
        );
      case 'bank':
        return <Path d="m3 9 9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M2 18h20" />;
      case 'plus':
        return <Path d="M12 5v14M5 12h14" />;
      case 'receipt':
        return (
          <>
            <Path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
            <Path d="M9 8h6m-6 4h6" />
          </>
        );
      case 'bell':
        return <Path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" />;
      case 'calendar':
        return (
          <>
            <Rect x="3" y="5" width="18" height="16" rx="2" />
            <Path d="M16 3v4M8 3v4M3 10h18" />
          </>
        );
      case 'income':
        return <Path d="M12 19V5m-6 6 6-6 6 6" />;
      case 'expense':
        return <Path d="M12 5v14m6-6-6 6-6-6" />;
      case 'coffee':
        return (
          <>
            <Path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 2h2a2 2 0 1 1 0 4h-2M8 3v2m4-2v2" />
          </>
        );
      case 'bolt':
        return <Path d="m13 2-3 9h7L9 22l2-9H4l9-11Z" />;
      case 'shopping-bag':
        return (
          <>
            <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <Line x1="3" y1="6" x2="21" y2="6" />
            <Path d="M16 10a4 4 0 0 1-8 0" />
          </>
        );
      case 'car':
        return (
          <>
            <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <Circle cx="7" cy="17" r="2" />
            <Path d="M9 17h6" />
            <Circle cx="17" cy="17" r="2" />
          </>
        );
      case 'home':
        return (
          <>
            <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
          </>
        );
      case 'heart':
        return (
          <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        );
      case 'book':
        return (
          <>
            <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <Path d="M6 2v20" />
          </>
        );
      case 'film':
        return (
          <>
            <Rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18" />
            <Line x1="7" x2="7" y1="2" y2="22" />
            <Line x1="17" x2="17" y1="2" y2="22" />
            <Line x1="2" x2="22" y1="12" y2="12" />
          </>
        );
      case 'piggy-bank':
        return (
          <>
            <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
            <Path d="M16 9h.01" />
          </>
        );
      case 'credit-card':
        return (
          <>
            <Rect width="20" height="14" x="2" y="5" rx="2" />
            <Line x1="2" x2="22" y1="10" y2="10" />
          </>
        );
      case 'briefcase':
        return (
          <>
            <Rect width="20" height="14" x="2" y="7" rx="3" />
            <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <Circle cx="12" cy="14" r="1.5" />
          </>
        );
      case 'gift':
        return (
          <>
            <Polyline points="20 12 20 22 4 22 4 12" />
            <Rect width="20" height="5" x="2" y="7" rx="1" />
            <Line x1="12" x2="12" y1="22" y2="7" />
          </>
        );
      case 'trending-up':
      case 'trend':
        return (
          <>
            <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <Polyline points="16 7 22 7 22 13" />
          </>
        );
      case 'store':
        return (
          <>
            <Path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <Path d="M2 7h20" />
          </>
        );
      case 'utensils':
      case 'burger':
        return (
          <>
            <Path d="M18 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            <Path d="M4 2v6a3 3 0 0 0 6 0V2M7 2v20" />
          </>
        );
      case 'users':
      case 'group':
        return (
          <>
            <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <Circle cx="9" cy="7" r="4" />
            <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          </>
        );
      default:
        return <Circle cx="12" cy="12" r="8" />;
    }
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderShape()}
    </Svg>
  );
}

/**
 * Hàm phân giải tên Icon đồng bộ 100% chuẩn web
 */
export function resolveCategoryIconName(
  iconOrEmoji?: string,
  fallbackKind: 'INCOME' | 'EXPENSE' = 'EXPENSE',
  categoryName?: string
): IconName {
  const str = `${iconOrEmoji || ''} ${categoryName || ''}`.toLowerCase();

  // 1. Ăn uống / Nhà hàng / Cafe / Ẩm thực
  if (
    str.includes('☕') ||
    str.includes('cà phê') ||
    str.includes('cafe') ||
    str.includes('coffee') ||
    str.includes('đồ uống') ||
    str.includes('trà sữa')
  ) {
    return 'coffee';
  }

  if (
    str.includes('🍜') ||
    str.includes('🍔') ||
    str.includes('🍕') ||
    str.includes('ăn uống') ||
    str.includes('ẩm thực') ||
    str.includes('nhà hàng') ||
    str.includes('cơm') ||
    str.includes('quán ăn') ||
    str.includes('đi chợ') ||
    str.includes('thực phẩm')
  ) {
    return 'utensils';
  }

  // 2. Đi lại / Xe cộ
  if (
    str.includes('🚗') ||
    str.includes('di chuyển') ||
    str.includes('đi lại') ||
    str.includes('xăng xe') ||
    str.includes('xăng') ||
    str.includes('ô tô') ||
    str.includes('xe máy') ||
    str.includes('xe cộ') ||
    str.includes('giao thông')
  ) {
    return 'car';
  }

  // 3. Sức khỏe / Y tế
  if (
    str.includes('💊') ||
    str.includes('sức khỏe') ||
    str.includes('y tế') ||
    str.includes('thuốc') ||
    str.includes('bệnh viện') ||
    str.includes('khám')
  ) {
    return 'heart';
  }

  // 4. Mua sắm
  if (
    str.includes('🛍️') ||
    str.includes('🛒') ||
    str.includes('mua sắm') ||
    str.includes('shopping') ||
    str.includes('siêu thị') ||
    str.includes('tạp hóa')
  ) {
    return 'shopping-bag';
  }

  // 5. Học tập
  if (
    str.includes('📚') ||
    str.includes('học tập') ||
    str.includes('giáo dục') ||
    str.includes('học phí') ||
    str.includes('sách') ||
    str.includes('khóa học')
  ) {
    return 'book';
  }

  // 6. Hóa đơn / Điện nước
  if (
    str.includes('⚡') ||
    str.includes('tiền điện') ||
    str.includes('điện nước') ||
    str.includes('tiện ích') ||
    str.includes('hóa đơn') ||
    str.includes('thuế') ||
    str.includes('chi phí khác')
  ) {
    return 'receipt';
  }

  // 7. Nhà ở
  if (str.includes('🏠') || str.includes('nhà ở') || str.includes('tiền nhà') || str.includes('thuê nhà')) {
    return 'home';
  }

  // 8. Gia đình
  if (str.includes('gia đình') || str.includes('con cái') || str.includes('bố mẹ')) {
    return 'users';
  }

  // 9. Lương / Thu nhập chính
  if (str.includes('lương') || str.includes('thù lao') || str.includes('thu nhập chính')) {
    return 'briefcase';
  }

  // 10. Thưởng / Quà tặng
  if (str.includes('🎁') || str.includes('quà') || str.includes('thưởng')) {
    return 'gift';
  }

  // 11. Đầu tư / Chứng khoán
  if (str.includes('đầu tư') || str.includes('chứng khoán') || str.includes('cổ phiếu')) {
    return 'trending-up';
  }

  // 12. Kinh doanh
  if (str.includes('kinh doanh') || str.includes('bán hàng')) {
    return 'store';
  }

  return fallbackKind === 'INCOME' ? 'income' : 'expense';
}


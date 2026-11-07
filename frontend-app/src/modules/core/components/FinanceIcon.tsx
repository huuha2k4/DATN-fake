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
  | 'burger' | 'pill' | 'users' | 'group' | 'file-text' | 'utensils' | 'banknote' | 'check' | 'message-square'
  | 'crown' | 'camera' | 'cloud' | 'info' | 'leaf' | 'gamepad' | 'palmtree' | 'droplet' | 'shopping-cart' | 'thumbs-up' | 'reply' | 'trash' | 'paperclip' | 'send' | 'smile' | 'file-excel' | 'checks' | 'image' | 'alert-circle' | 'seen-eye';

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
      case 'droplet':
        return <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />;
      case 'shopping-cart':
        return (
          <>
            <Circle cx="8" cy="21" r="1" />
            <Circle cx="19" cy="21" r="1" />
            <Path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </>
        );
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
      case 'edit':
        return (
          <>
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </>
        );
      case 'more':
        return (
          <>
            <Circle cx="12" cy="12" r="1.5" />
            <Circle cx="19" cy="12" r="1.5" />
            <Circle cx="5" cy="12" r="1.5" />
          </>
        );
      case 'delete':
        return (
          <>
            <Path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <Line x1="10" y1="11" x2="10" y2="17" />
            <Line x1="14" y1="11" x2="14" y2="17" />
          </>
        );
      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="9" />
            <Polyline points="12 7 12 12 15 14" />
          </>
        );
      case 'spark':
        return (
          <>
            <Path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
          </>
        );
      case 'check':
        return <Polyline points="20 6 9 17 4 12" />;
      case 'message-square':
        return <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
      case 'search':
        return (
          <>
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
          </>
        );
      case 'user':
        return (
          <>
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
          </>
        );
      case 'settings':
        return (
          <>
            <Circle cx="12" cy="12" r="3" />
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        );
      case 'gamepad':
        return (
          <>
            <Line x1="6" y1="12" x2="10" y2="12" />
            <Line x1="8" y1="10" x2="8" y2="14" />
            <Line x1="15" y1="13" x2="15.01" y2="13" />
            <Line x1="18" y1="11" x2="18.01" y2="11" />
            <Rect x="2" y="6" width="20" height="12" rx="6" />
          </>
        );
      case 'palmtree':
        return (
          <>
            <Path d="M13 8c.5-2 2.5-4 5-4 0 3-1.5 5.5-3.5 6.5" />
            <Path d="M13 7.5c-.5-2-2.5-3.5-5-3.5 0 3 1.5 5 3.5 6" />
            <Path d="M13 10V22" />
            <Path d="M12 22s-3-2-3-4c0-2 1-3.5 3-4" />
            <Path d="M14 14c2 .5 3 2 3 4 0 2-3 4-3 4" />
          </>
        );
      case 'crown':
        return (
          <Path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5z" />
        );
      case 'camera':
        return (
          <>
            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <Circle cx="12" cy="13" r="4" />
          </>
        );
      case 'cloud':
        return (
          <Path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        );
      case 'help-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <Line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );
      case 'info':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="16" x2="12" y2="12" />
            <Line x1="12" y1="8" x2="12.01" y2="8" />
          </>
        );
      case 'leaf':
        return (
          <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6" />
        );
      case 'shield':
        return (
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        );
      case 'logout':
        return (
          <>
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16 17 21 12 16 7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
          </>
        );
      case 'thumbs-up':
        return (
          <>
            <Path d="M7 10v12" />
            <Path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3" />
          </>
        );
      case 'reply':
        return (
          <>
            <Polyline points="9 17 4 12 9 7" />
            <Path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </>
        );
      case 'download':
        return (
          <>
            <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <Polyline points="7 10 12 15 17 10" />
            <Line x1="12" y1="15" x2="12" y2="3" />
          </>
        );
      case 'trash':
        return (
          <>
            <Polyline points="3 6 5 6 21 6" />
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </>
        );
      case 'paperclip':
        return (
          <Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.9-7.9" />
        );
      case 'send':
        return (
          <>
            <Line x1="22" y1="2" x2="11" y2="13" />
            <Polygon points="22 2 15 22 11 13 2 9 22 2" />
          </>
        );
      case 'smile':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <Line x1="9" y1="9" x2="9.01" y2="9" />
            <Line x1="15" y1="9" x2="15.01" y2="9" />
          </>
        );
      case 'file-excel':
        return (
          <>
            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <Polyline points="14 2 14 8 20 8" />
            <Path d="M8 13l4 4m0-4l-4 4" />
          </>
        );
      case 'checks':
        return (
          <>
            <Polyline points="18 6 9 15 5 11" />
            <Polyline points="22 10 13 19 11 17" />
          </>
        );
      case 'close':
        return (
          <>
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case 'image':
        return (
          <>
            <Rect x="3" y="3" width="18" height="18" rx="2" />
            <Circle cx="8.5" cy="8.5" r="1.5" />
            <Polyline points="21 15 16 10 5 21" />
          </>
        );
      case 'alert-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Line x1="12" y1="8" x2="12" y2="12" />
            <Line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        );
      case 'seen-eye':
      case 'eye':
        return (
          <>
            <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <Circle cx="12" cy="12" r="3" />
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

  // 4. Mua sắm / Đồ dùng
  if (
    str.includes('🛍️') ||
    str.includes('🛒') ||
    str.includes('mua sắm') ||
    str.includes('shopping') ||
    str.includes('siêu thị') ||
    str.includes('tạp hóa') ||
    str.includes('đi chợ') ||
    str.includes('đồ dùng')
  ) {
    return 'shopping-cart';
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

  // 6. Điện nước / Hóa đơn
  if (str.includes('⚡') || str.includes('tiền điện') || str.includes('điện')) {
    return 'bolt';
  }
  if (str.includes('💧') || str.includes('tiền nước') || str.includes('nước')) {
    return 'droplet';
  }
  if (
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


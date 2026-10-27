import type { ReactNode } from 'react'

export type IconName =
  | 'grid' | 'arrows' | 'wallet' | 'chart' | 'spark' | 'bank' | 'settings'
  | 'search' | 'plus' | 'receipt' | 'bell' | 'calendar' | 'refresh' | 'download'
  | 'trend' | 'income' | 'expense' | 'coffee' | 'bolt' | 'more' | 'arrow' | 'shield' | 'clock' | 'user' | 'logout' | 'key' | 'lock'
  | 'edit' | 'delete' | 'shopping-bag' | 'car' | 'home' | 'heart' | 'zap' | 'book' | 'film' | 'map' | 'piggy-bank' | 'credit-card' | 'help-circle' | 'briefcase' | 'gift' | 'trending-up' | 'store' | 'plus-circle' | 'eye'
  | 'sun' | 'moon' | 'borrowing' | 'lending' | 'hand-coins' | 'menu' | 'close'
  | 'burger' | 'pill' | 'users' | 'file-text' | 'utensils' | 'banknote'

export function FinanceIcon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const drawings: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    arrows: <><path d="M4 8h13m0 0l-3.5-3.5M17 8l-3.5 3.5" /><path d="M20 16H7m0 0l3.5-3.5M7 16l3.5 3.5" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2.5" /><path d="M3 9h18M16 14h2" /><path d="M6 5V4a1 1 0 0 1 1-1h12" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    bank: <path d="m3 9 9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M2 18h20" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" transform="translate(-1 -1)" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" /><path d="M9 8h6m-6 4h6" /></>,
    bell: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2" /></>,
    download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5m-5 5V3" />,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    income: <path d="M12 19V5m-6 6 6-6 6 6" />,
    expense: <path d="M12 5v14m6-6-6 6-6-6" />,
    coffee: <path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 2h2a2 2 0 1 1 0 4h-2M8 3v2m4-2v2" />,
    bolt: <path d="m13 2-3 9h7L9 22l2-9H4l9-11Z" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m11 12 7-7m-3 0 3 3m-2-1 2 2" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="16" r="1.2" fill="currentColor" /></>,
    edit: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    delete: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
    'shopping-bag': <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
    car: <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    book: <><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M6 2v20" /></>,
    film: <><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18" /><line x1="7" x2="7" y1="2" y2="22" /><line x1="17" x2="17" y1="2" y2="22" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="2" x2="7" y1="7" y2="7" /><line x1="2" x2="7" y1="17" y2="17" /><line x1="17" x2="22" y1="17" y2="17" /><line x1="17" x2="22" y1="7" y2="7" /></>,
    map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" x2="9" y1="3" y2="18" /><line x1="15" x2="15" y1="6" y2="21" /></>,
    'piggy-bank': <><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" /><path d="M16 9h.01" /></>,
    'credit-card': <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></>,
    'help-circle': <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" x2="12.01" y1="17" y2="17" /></>,
    briefcase: <><rect width="20" height="14" x="2" y="7" rx="3" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><circle cx="12" cy="14" r="1.5" /><path d="M8 14h2.5m3 0H16" /></>,
    gift: <><polyline points="20 12 20 22 4 22 4 12" /><rect width="20" height="5" x="2" y="7" rx="1" /><line x1="12" x2="12" y1="22" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
    'trending-up': <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
    store: <><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" /></>,
    'plus-circle': <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="16" /><line x1="8" x2="16" y1="12" y2="12" /></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
    borrowing: <><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" /><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.6 2.6-1.5l2.2-4.1a2 2 0 0 0-.8-2.7l-2.5-1.4a2 2 0 0 0-2.3.2L11 11" /><circle cx="17" cy="5" r="3" /><path d="M17 12V8" /></>,
    lending: <><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /><circle cx="18" cy="4" r="2" /></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    'hand-coins': <><circle cx="8" cy="8" r="5" /><circle cx="16" cy="6" r="3" /><path d="M3 17a3 3 0 0 0 3 3h7c.8 0 1.5-.4 1.9-1l3.1-4.7a2 2 0 0 0-2-3h-4" /></>,
    burger: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></>,
    utensils: <><path d="M18 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /></>,
    pill: <><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
    banknote: <><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>,
  }

  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{drawings[name] || drawings.grid}</svg>
}

/**
 * Đồng bộ toàn bộ icon danh mục về hệ thống SVG Line Icon hiện đại, sang trọng:
 * Tự động chuyển đổi emoji (🍔, 🚗, 💊, 👨‍👩‍👧, 📄...) hoặc các tên icon cũ về đúng IconName chuẩn.
 */
export function resolveCategoryIconName(iconOrEmoji?: string, fallbackKind?: string, categoryName?: string): IconName {
  if (!iconOrEmoji && !categoryName) {
    return fallbackKind === 'INCOME' ? 'income' : 'expense';
  }

  const str = `${iconOrEmoji || ''} ${categoryName || ''}`.toLowerCase();

  // 1. Ăn uống / Nhà hàng / Cafe
  if (str.includes('🍔') || str.includes('🍕') || str.includes('🍜') || str.includes('ăn uống') || str.includes('ẩm thực') || str.includes('nhà hàng') || str.includes('utensils')) {
    return 'utensils';
  }
  if (str.includes('☕') || str.includes('cafe') || str.includes('cà phê') || str.includes('đồ uống') || str.includes('coffee')) {
    return 'coffee';
  }
  if (str.includes('burger')) {
    return 'burger';
  }

  // 2. Đi lại / Di chuyển / Xe cộ
  if (str.includes('🚗') || str.includes('di chuyển') || str.includes('đi lại') || str.includes('xăng xe') || str.includes('ô tô') || str.includes('car')) {
    return 'car';
  }

  // 3. Sức khỏe / Y tế / Thuốc
  if (str.includes('💊') || str.includes('sức khỏe') || str.includes('y tế') || str.includes('thuốc') || str.includes('bệnh viện') || str.includes('khám') || str.includes('pill')) {
    return 'pill';
  }

  // 4. Mua sắm / Shopping / Tạp hóa / Tiêu dùng
  if (str.includes('🛍️') || str.includes('🛒') || str.includes('mua sắm') || str.includes('shopping') || str.includes('siêu thị') || str.includes('tạp hóa') || str.includes('shopping-bag')) {
    return 'shopping-bag';
  }

  // 5. Hóa đơn / Điện nước / Tiện ích / Chi phí khác
  if (str.includes('📄') || str.includes('hóa đơn') || str.includes('tiện ích') || str.includes('chi phí khác') || str.includes('điện nước') || str.includes('file-text')) {
    return 'file-text';
  }
  if (str.includes('🧾') || str.includes('receipt') || str.includes('thuế') || str.includes('phí')) {
    return 'receipt';
  }

  // 6. Nhà ở / Tiền phòng / Thuê nhà
  if (str.includes('🏠') || str.includes('nhà ở') || str.includes('tiền nhà') || str.includes('thuê nhà') || str.includes('home')) {
    return 'home';
  }

  // 7. Gia đình & Con cái
  if (str.includes('👨‍👩‍👧') || str.includes('👪') || str.includes('gia đình') || str.includes('con cái') || str.includes('bố mẹ') || str.includes('users')) {
    return 'users';
  }

  // 8. Giáo dục / Học tập / Sách vở
  if (str.includes('📚') || str.includes('học tập') || str.includes('giáo dục') || str.includes('học phí') || str.includes('sách') || str.includes('book')) {
    return 'book';
  }

  // 9. Giải trí / Phim ảnh / Du lịch
  if (str.includes('🎬') || str.includes('phim') || str.includes('giải trí') || str.includes('film')) {
    return 'film';
  }
  if (str.includes('✈️') || str.includes('du lịch') || str.includes('map')) {
    return 'map';
  }

  // 10. Trả nợ / Cho vay
  if (str.includes('trả nợ') || str.includes('borrowing')) {
    return 'borrowing';
  }
  if (str.includes('thu nợ') || str.includes('cho vay') || str.includes('lending')) {
    return 'lending';
  }

  // 11. Tiết kiệm / Đầu tư
  if (str.includes('tiết kiệm') || str.includes('đầu tư') || str.includes('heo đất') || str.includes('piggy-bank')) {
    return 'piggy-bank';
  }
  if (str.includes('chứng khoán') || str.includes('cổ phiếu') || str.includes('trend') || str.includes('trending-up')) {
    return 'trending-up';
  }

  // 12. Quà tặng / Thưởng
  if (str.includes('🎁') || str.includes('quà') || str.includes('thưởng') || str.includes('gift')) {
    return 'gift';
  }

  // 13. Lương / Thu nhập
  if (str.includes('lương') || str.includes('thù lao') || str.includes('briefcase')) {
    return 'briefcase';
  }

  // Nếu icon truyền vào là một IconName hợp lệ
  const validIconNames = [
    'grid', 'arrows', 'wallet', 'chart', 'spark', 'bank', 'settings',
    'search', 'plus', 'receipt', 'bell', 'calendar', 'refresh', 'download',
    'trend', 'income', 'expense', 'coffee', 'bolt', 'more', 'arrow', 'shield', 'clock', 'user', 'logout', 'key', 'lock',
    'edit', 'delete', 'shopping-bag', 'car', 'home', 'heart', 'zap', 'book', 'film', 'map', 'piggy-bank', 'credit-card', 'help-circle', 'briefcase', 'gift', 'trending-up', 'store', 'plus-circle', 'eye',
    'sun', 'moon', 'borrowing', 'lending', 'hand-coins', 'menu', 'close', 'burger', 'pill', 'users', 'file-text', 'utensils', 'banknote'
  ];

  if (iconOrEmoji && validIconNames.includes(iconOrEmoji)) {
    return iconOrEmoji as IconName;
  }

  return fallbackKind === 'INCOME' ? 'income' : 'expense';
}

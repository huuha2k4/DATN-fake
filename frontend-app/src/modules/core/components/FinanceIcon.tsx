import React from 'react';
import {
  LayoutGrid,
  ArrowLeftRight,
  Wallet,
  LineChart,
  BarChart3,
  PieChart,
  Sparkles,
  Landmark,
  Settings,
  Search,
  Plus,
  Receipt,
  Bell,
  Calendar,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Coffee,
  Zap,
  MoreHorizontal,
  MoreVertical,
  ShieldCheck,
  Clock,
  User,
  UserPlus,
  LogOut,
  Key,
  Lock,
  Pencil,
  Trash2,
  ShoppingBag,
  Car,
  Home,
  Heart,
  BookOpen,
  Film,
  Map,
  PiggyBank,
  Coins,
  CreditCard,
  CircleHelp,
  Briefcase,
  Gift,
  Store,
  PlusCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  HandCoins,
  Handshake,
  Menu,
  X,
  Scale,
  Utensils,
  UtensilsCrossed,
  Pill,
  Users,
  FileText,
  Banknote,
  Check,
  CheckCheck,
  CheckCircle2,
  MessageSquare,
  Crown,
  Camera,
  Cloud,
  Info,
  Leaf,
  Gamepad2,
  Palmtree,
  Droplet,
  ShoppingCart,
  ThumbsUp,
  Reply,
  Paperclip,
  Send,
  Smile,
  FileSpreadsheet,
  Image as LucideImage,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Phone,
  Video,
  Target,
  Megaphone,
  Laptop,
  Tag,
  Layers,
  RotateCcw,
  Share2,
  Folder,
  Filter,
  Copy,
  QrCode,
  ScanLine,
  ScanText,
  Building2,
  Globe,
  Mail,
  Smartphone,
  Award,
  Flame,
  Star,
  Bookmark,
  ExternalLink,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react-native';

export type IconName =
  | 'grid' | 'arrows' | 'wallet' | 'chart' | 'spark' | 'bank' | 'settings'
  | 'search' | 'plus' | 'receipt' | 'bell' | 'calendar' | 'refresh' | 'download'
  | 'trend' | 'income' | 'expense' | 'coffee' | 'bolt' | 'more' | 'arrow' | 'shield' | 'clock' | 'user' | 'user-plus' | 'logout' | 'key' | 'lock'
  | 'edit' | 'delete' | 'shopping-bag' | 'car' | 'home' | 'heart' | 'zap' | 'book' | 'film' | 'map' | 'piggy-bank' | 'coin-stack' | 'credit-card' | 'help-circle' | 'briefcase' | 'gift' | 'trending-up' | 'store' | 'plus-circle' | 'eye' | 'eye-off'
  | 'sun' | 'moon' | 'borrowing' | 'lending' | 'hand-coins' | 'menu' | 'close' | 'scale'
  | 'burger' | 'pill' | 'users' | 'group' | 'file-text' | 'utensils' | 'banknote' | 'check' | 'message-square'
  | 'crown' | 'camera' | 'cloud' | 'info' | 'leaf' | 'gamepad' | 'palmtree' | 'droplet' | 'shopping-cart' | 'thumbs-up' | 'reply' | 'trash' | 'paperclip' | 'send' | 'smile' | 'file-excel' | 'checks' | 'image' | 'alert-circle' | 'seen-eye' | 'chevron-down' | 'chevron-up' | 'chevron-right' | 'chevron-left' | 'more-horizontal' | 'phone' | 'video' | 'target'
  | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'megaphone' | 'laptop' | 'tag' | 'layers' | 'rotate-ccw' | 'share-2'
  | 'analytics' | 'savings' | 'folder' | 'filter' | 'copy' | 'qr-code' | 'scan' | 'check-circle' | 'x' | 'landmark' | 'building'
  | (string & {});

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  // Core navigation & actions
  grid: LayoutGrid,
  'layout-grid': LayoutGrid,
  arrows: ArrowLeftRight,
  'arrow-left-right': ArrowLeftRight,
  wallet: Wallet,
  chart: LineChart,
  'line-chart': LineChart,
  analytics: BarChart3,
  'bar-chart': BarChart3,
  'bar-chart-3': BarChart3,
  'pie-chart': PieChart,
  spark: Sparkles,
  sparkles: Sparkles,
  bank: Landmark,
  landmark: Landmark,
  building: Building2,
  settings: Settings,
  search: Search,
  plus: Plus,
  receipt: Receipt,
  bell: Bell,
  calendar: Calendar,
  refresh: RefreshCw,
  'refresh-cw': RefreshCw,
  download: Download,
  trend: TrendingUp,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  income: ArrowUp,
  expense: ArrowDown,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'arrow-down-left': ArrowDownLeft,
  arrow: ArrowRight,
  coffee: Coffee,
  bolt: Zap,
  zap: Zap,
  more: MoreHorizontal,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  shield: ShieldCheck,
  'shield-check': ShieldCheck,
  clock: Clock,
  user: User,
  'user-plus': UserPlus,
  logout: LogOut,
  'log-out': LogOut,
  key: Key,
  lock: Lock,
  edit: Pencil,
  pencil: Pencil,
  delete: Trash2,
  trash: Trash2,
  'trash-2': Trash2,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  car: Car,
  home: Home,
  heart: Heart,
  book: BookOpen,
  'book-open': BookOpen,
  film: Film,
  map: Map,
  'piggy-bank': PiggyBank,
  savings: PiggyBank,
  'coin-stack': Coins,
  coins: Coins,
  'credit-card': CreditCard,
  'help-circle': CircleHelp,
  'circle-help': CircleHelp,
  briefcase: Briefcase,
  gift: Gift,
  store: Store,
  'plus-circle': PlusCircle,
  eye: Eye,
  'seen-eye': Eye,
  'eye-off': EyeOff,
  sun: Sun,
  moon: Moon,
  borrowing: HandCoins,
  'hand-coins': HandCoins,
  lending: Handshake,
  handshake: Handshake,
  menu: Menu,
  close: X,
  x: X,
  scale: Scale,
  burger: UtensilsCrossed,
  utensils: Utensils,
  pill: Pill,
  users: Users,
  group: Users,
  'file-text': FileText,
  banknote: Banknote,
  check: Check,
  checks: CheckCheck,
  'check-check': CheckCheck,
  'check-circle': CheckCircle2,
  'message-square': MessageSquare,
  crown: Crown,
  camera: Camera,
  cloud: Cloud,
  info: Info,
  leaf: Leaf,
  gamepad: Gamepad2,
  'gamepad-2': Gamepad2,
  palmtree: Palmtree,
  droplet: Droplet,
  'thumbs-up': ThumbsUp,
  reply: Reply,
  paperclip: Paperclip,
  send: Send,
  smile: Smile,
  'file-excel': FileSpreadsheet,
  'file-spreadsheet': FileSpreadsheet,
  image: LucideImage,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  phone: Phone,
  video: Video,
  target: Target,
  megaphone: Megaphone,
  laptop: Laptop,
  tag: Tag,
  layers: Layers,
  'rotate-ccw': RotateCcw,
  'share-2': Share2,
  folder: Folder,
  filter: Filter,
  copy: Copy,
  'qr-code': QrCode,
  scan: ScanText,
  'scan-text': ScanText,
  'scan-line': ScanLine,
  ocr: ScanText,
  globe: Globe,
  mail: Mail,
  smartphone: Smartphone,
  award: Award,
  flame: Flame,
  star: Star,
  bookmark: Bookmark,
  'external-link': ExternalLink,
  sliders: SlidersHorizontal,
};

export function FinanceIcon({
  name,
  size = 18,
  color = '#00A86B',
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const normalizedKey = String(name || 'grid').trim().toLowerCase();
  const IconComponent = LUCIDE_ICON_MAP[normalizedKey] || LayoutGrid;

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}

/**
 * Hàm phân giải tên Icon đồng bộ 100% chuẩn web (Lucide Icons)
 */
export function resolveCategoryIconName(
  iconOrEmoji?: string,
  fallbackKind: 'INCOME' | 'EXPENSE' | (string & {}) = 'EXPENSE',
  categoryName?: string
): IconName {
  if (!iconOrEmoji && !categoryName) {
    return fallbackKind === 'INCOME' ? 'income' : 'expense';
  }

  const str = `${iconOrEmoji || ''} ${categoryName || ''}`.toLowerCase();

  // 1. Trả nợ / Vay nợ / Thẻ tín dụng
  if (
    str.includes('trả nợ') ||
    str.includes('thanh toán nợ') ||
    str.includes('trả vay') ||
    str.includes('tiền nợ') ||
    str.includes('khoản nợ') ||
    str.includes('nợ') ||
    str.includes('thẻ tín dụng') ||
    str.includes('thẻ ngân hàng') ||
    str.includes('credit-card') ||
    str.includes('visa') ||
    str.includes('mastercard') ||
    iconOrEmoji === 'credit-card' ||
    iconOrEmoji === 'borrowing' ||
    iconOrEmoji === 'hand-coins'
  ) {
    return 'credit-card';
  }
  if (str.includes('thu nợ') || str.includes('cho vay') || str.includes('đòi nợ') || iconOrEmoji === 'lending') {
    return 'lending';
  }

  // 2. Ăn uống / Nhà hàng / Cafe / Ẩm thực
  if (
    str.includes('🍔') ||
    str.includes('🍕') ||
    str.includes('🍜') ||
    str.includes('ăn uống') ||
    str.includes('ẩm thực') ||
    str.includes('nhà hàng') ||
    str.includes('cà phê') ||
    str.includes('cafe') ||
    str.includes('coffee') ||
    str.includes('đồ uống') ||
    str.includes('cơm') ||
    str.includes('quán ăn') ||
    str.includes('đi chợ') ||
    str.includes('thực phẩm') ||
    str.includes('burger') ||
    iconOrEmoji === 'utensils' ||
    iconOrEmoji === 'coffee' ||
    iconOrEmoji === 'burger'
  ) {
    return 'utensils';
  }

  // 3. Đi lại / Di chuyển / Xe cộ
  if (
    str.includes('🚗') ||
    str.includes('di chuyển') ||
    str.includes('đi lại') ||
    str.includes('xăng xe') ||
    str.includes('xăng') ||
    str.includes('ô tô') ||
    str.includes('xe máy') ||
    str.includes('xe cộ') ||
    str.includes('giao thông') ||
    iconOrEmoji === 'car' ||
    /\bcar\b/i.test(iconOrEmoji || '')
  ) {
    return 'car';
  }

  // 4. Sức khỏe / Y tế / Khám bệnh
  if (
    str.includes('💊') ||
    str.includes('sức khỏe') ||
    str.includes('y tế') ||
    str.includes('thuốc') ||
    str.includes('bệnh viện') ||
    str.includes('khám') ||
    iconOrEmoji === 'heart' ||
    iconOrEmoji === 'pill'
  ) {
    return 'heart';
  }

  // 5. Mua sắm / Shopping / Tạp hóa / Tiêu dùng
  if (
    str.includes('🛍️') ||
    str.includes('🛒') ||
    str.includes('mua sắm') ||
    str.includes('shopping') ||
    str.includes('siêu thị') ||
    str.includes('tạp hóa') ||
    iconOrEmoji === 'shopping-bag' ||
    iconOrEmoji === 'shopping-cart'
  ) {
    return 'shopping-bag';
  }

  // 6. Giáo dục / Học tập / Sách vở
  if (
    str.includes('📚') ||
    str.includes('học tập') ||
    str.includes('giáo dục') ||
    str.includes('học phí') ||
    str.includes('sách') ||
    str.includes('khóa học') ||
    iconOrEmoji === 'book'
  ) {
    return 'book';
  }

  // 7. Hóa đơn / Điện nước / Tiện ích / Chi phí khác
  if (
    str.includes('⚡') ||
    str.includes('tiền điện') ||
    str.includes('điện nước') ||
    str.includes('tiện ích') ||
    str.includes('📄') ||
    str.includes('🧾') ||
    str.includes('hóa đơn') ||
    str.includes('thuế') ||
    str.includes('chi phí khác') ||
    iconOrEmoji === 'receipt' ||
    iconOrEmoji === 'file-text' ||
    iconOrEmoji === 'zap'
  ) {
    return 'receipt';
  }

  // 8. Nhà ở / Tiền phòng / Thuê nhà
  if (
    str.includes('🏠') ||
    str.includes('nhà ở') ||
    str.includes('tiền nhà') ||
    str.includes('thuê nhà') ||
    str.includes('sinh hoạt') ||
    iconOrEmoji === 'home'
  ) {
    return 'home';
  }

  // 9. Gia đình & Con cái
  if (
    str.includes('👨‍👩‍👧') ||
    str.includes('👪') ||
    str.includes('gia đình') ||
    str.includes('con cái') ||
    str.includes('bố mẹ') ||
    iconOrEmoji === 'users'
  ) {
    return 'users';
  }

  // 10. Giải trí / Phim ảnh
  if (
    str.includes('🎬') ||
    str.includes('phim') ||
    str.includes('giải trí') ||
    str.includes('game') ||
    iconOrEmoji === 'film'
  ) {
    return 'film';
  }

  // 11. Du lịch / Nghỉ dưỡng
  if (
    str.includes('✈️') ||
    str.includes('du lịch') ||
    str.includes('nghỉ dưỡng') ||
    str.includes('vé máy bay') ||
    iconOrEmoji === 'map'
  ) {
    return 'map';
  }

  // 12. Tiết kiệm / Heo đất
  if (str.includes('tiết kiệm') || str.includes('heo đất') || iconOrEmoji === 'piggy-bank') {
    return 'piggy-bank';
  }

  // 13. Đầu tư / Chứng khoán
  if (
    str.includes('đầu tư') ||
    str.includes('chứng khoán') ||
    str.includes('cổ phiếu') ||
    iconOrEmoji === 'trending-up' ||
    iconOrEmoji === 'trend'
  ) {
    return 'trending-up';
  }

  // 14. Bảo hiểm
  if (str.includes('bảo hiểm') || iconOrEmoji === 'shield') {
    return 'shield';
  }

  // 15. Quà tặng / Thưởng
  if (
    str.includes('🎁') ||
    str.includes('quà') ||
    str.includes('thưởng') ||
    iconOrEmoji === 'gift'
  ) {
    return 'gift';
  }

  // 16. Lương / Thu nhập chính
  if (str.includes('lương') || str.includes('thù lao') || iconOrEmoji === 'briefcase') {
    return 'briefcase';
  }

  // 17. Kinh doanh
  if (str.includes('kinh doanh') || iconOrEmoji === 'store') {
    return 'store';
  }

  // 18. Cho đi / Từ thiện / Giúp đỡ
  if (
    str.includes('cho đi') ||
    str.includes('từ thiện') ||
    str.includes('quyên góp') ||
    str.includes('giúp đỡ')
  ) {
    return 'heart';
  }

  if (iconOrEmoji && LUCIDE_ICON_MAP[iconOrEmoji.trim().toLowerCase()]) {
    return iconOrEmoji.trim().toLowerCase() as IconName;
  }

  return fallbackKind === 'INCOME' ? 'income' : 'expense';
}

export default FinanceIcon;

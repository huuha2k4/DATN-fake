export interface ChoreIconOption {
  key: string;
  name: string;
  source: any;
}

export const CHORE_ICONS: ChoreIconOption[] = [
  {
    key: 'clipboard',
    name: 'Bảng việc',
    source: require('../../../assets/icons/chore_icon_clipboard_medal.png'),
  },
  {
    key: 'trophy',
    name: 'Cúp vàng',
    source: require('../../../assets/icons/chore_icon_trophy.png'),
  },
  {
    key: 'calendar',
    name: 'Lịch sao',
    source: require('../../../assets/icons/chore_icon_calendar_coin.png'),
  },
  {
    key: 'notebook',
    name: 'Sổ tay',
    source: require('../../../assets/icons/chore_icon_notebook_pencil.png'),
  },
  {
    key: 'star',
    name: 'Huy hiệu',
    source: require('../../../assets/icons/chore_icon_star_medal.png'),
  },
  {
    key: 'checklist',
    name: 'Đồng xu',
    source: require('../../../assets/icons/chore_icon_checklist_coin.png'),
  },
];

/**
 * Lấy icon nhiệm vụ: nếu chore có icon hợp lệ thì trả về icon đó,
 * nếu không thì tự động hash ổn định theo id hoặc title để random 1 trong 6 icon.
 */
export function resolveChoreIconSource(iconKey?: string | null, seed?: string | number): any {
  if (iconKey) {
    const found = CHORE_ICONS.find((item) => item.key === iconKey);
    if (found) return found.source;
  }

  // Tự động random theo seed
  const str = String(seed || 'chore-default');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CHORE_ICONS.length;
  return CHORE_ICONS[index].source;
}

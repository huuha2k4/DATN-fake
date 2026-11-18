export interface ChoreIconOption {
  key: string;
  name: string;
  url: string;
}

export const CHORE_ICONS: ChoreIconOption[] = [
  {
    key: 'clipboard',
    name: 'Bảng việc',
    url: '/chore_icon_clipboard_medal.png',
  },
  {
    key: 'trophy',
    name: 'Cúp vàng',
    url: '/chore_icon_trophy.png',
  },
  {
    key: 'calendar',
    name: 'Lịch sao',
    url: '/chore_icon_calendar_coin.png',
  },
  {
    key: 'notebook',
    name: 'Sổ tay',
    url: '/chore_icon_notebook_pencil.png',
  },
  {
    key: 'star',
    name: 'Huy hiệu',
    url: '/chore_icon_star_medal.png',
  },
  {
    key: 'checklist',
    name: 'Đồng xu',
    url: '/chore_icon_checklist_coin.png',
  },
];

export function resolveChoreIconUrl(iconKey?: string | null, seed?: string | number): string {
  if (iconKey) {
    const found = CHORE_ICONS.find((item) => item.key === iconKey);
    if (found) return found.url;
  }

  const str = String(seed || 'chore-default');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CHORE_ICONS.length;
  return CHORE_ICONS[index].url;
}

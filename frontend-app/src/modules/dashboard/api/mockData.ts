export type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  tone: 'green' | 'coral' | 'amber';
};

export const transactions: Transaction[] = [
  { id: '1', title: 'Lương tháng 09', category: 'Thu nhập', amount: 28000000, date: 'Hôm nay', tone: 'green' },
  { id: '2', title: 'WinMart+', category: 'Ăn uống', amount: -245000, date: 'Hôm nay', tone: 'coral' },
  { id: '3', title: 'Grab đi làm', category: 'Di chuyển', amount: -68000, date: 'Hôm qua', tone: 'amber' },
  { id: '4', title: 'Netflix', category: 'Giải trí', amount: -180000, date: '28 Thg 09', tone: 'coral' },
];

export const formatCurrency = (amount: number) =>
  `${amount < 0 ? '-' : ''}${Math.abs(amount).toLocaleString('vi-VN')} đ`;

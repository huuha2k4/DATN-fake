export type ReminderCategory = 'Thanh toán' | 'Tiết kiệm';

export type Reminder = {
  id: number;
  title: string;
  date: string;
  amount: string;
  category: ReminderCategory;
  icon: string;
  iconBackground: string;
};

export const reminderCategories = ['Tất cả', 'Thanh toán', 'Tiết kiệm'] as const;

export const reminders: Reminder[] = [
  { id: 1, title: 'Tiền điện', date: '12/09/2025', amount: '300.000 đ', category: 'Thanh toán', icon: 'ϟ', iconBackground: '#FFFBEB' },
  { id: 2, title: 'Tiền nước', date: '15/09/2025', amount: '150.000 đ', category: 'Thanh toán', icon: '◒', iconBackground: '#EFF6FF' },
  { id: 3, title: 'Trả nợ thẻ tín dụng', date: '16/09/2025', amount: '2.000.000 đ', category: 'Thanh toán', icon: '▣', iconBackground: '#FFF1F2' },
  { id: 4, title: 'Học phí', date: '25/09/2025', amount: '5.000.000 đ', category: 'Thanh toán', icon: '▤', iconBackground: '#F5F3FF' },
  { id: 5, title: 'Gửi tiết kiệm', date: '20/09/2025', amount: '1.000.000 đ', category: 'Tiết kiệm', icon: '↗', iconBackground: '#ECFDF5' },
  { id: 6, title: 'Thanh toán Netflix', date: '05/10/2025', amount: '180.000 đ', category: 'Thanh toán', icon: 'N', iconBackground: '#FEF2F2' },
];
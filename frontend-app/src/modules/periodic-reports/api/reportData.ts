export type ReportTab = 'Thu - Chi' | 'Danh mục' | 'So sánh';

export const reportTabs: ReportTab[] = ['Thu - Chi', 'Danh mục', 'So sánh'];
export const reportMonths = ['Tháng 9/2025', 'Tháng 8/2025', 'Tháng 7/2025'];

export const monthlyBars = [
  { label: 'T1', income: 32, expense: 52 }, { label: 'T2', income: 48, expense: 28 }, { label: 'T3', income: 24, expense: 40 },
  { label: 'T4', income: 68, expense: 36 }, { label: 'T5', income: 44, expense: 24 }, { label: 'T6', income: 72, expense: 40 },
  { label: 'T7', income: 32, expense: 60 }, { label: 'T8', income: 76, expense: 48 }, { label: 'T9', income: 40, expense: 32 },
];

export const spendingCategories = [
  { label: 'Ăn uống', value: '37%', color: '#F97316' }, { label: 'Di chuyển', value: '15%', color: '#3B82F6' },
  { label: 'Mua sắm', value: '22%', color: '#EF4444' }, { label: 'Giải trí', value: '12%', color: '#8B5CF6' }, { label: 'Khác', value: '14%', color: '#94A3B8' },
];
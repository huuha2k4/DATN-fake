export type ForecastTab = 'Số dư cuối tháng' | 'Chi tiêu danh mục';

export const forecastTabs: ForecastTab[] = ['Số dư cuối tháng', 'Chi tiêu danh mục'];
export const forecastPoints = [76, 52, 34, 44, 65, 74, 58, 70, 48];
export const forecastCategories = [
  { name: 'Ăn uống', amount: '2.1 Tr', percent: 75, color: '#F97316' },
  { name: 'Di chuyển', amount: '1.2 Tr', percent: 48, color: '#3B82F6' },
  { name: 'Mua sắm', amount: '1.2 Tr', percent: 45, color: '#F43F5E' },
  { name: 'Giải trí', amount: '0.6 Tr', percent: 25, color: '#8B5CF6' },
  { name: 'Khác', amount: '0.4 Tr', percent: 18, color: '#14B8A6' },
];
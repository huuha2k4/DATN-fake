export type TransactionFilter = 'all' | 'income' | 'expense';

export type TransactionItem = {
  id: string;
  name: string;
  category: string;
  amount: number;
  time: string;
  icon: string;
  iconBackground: string;
};

export type TransactionGroup = { date: string; transactions: TransactionItem[] };

export const transactionMonths = ['Tháng 9/2025', 'Tháng 10/2025', 'Tháng 11/2025'];

export const transactionGroups: TransactionGroup[] = [
  { date: 'HÔM NAY (11/09/2025)', transactions: [
    { id: 'evn', name: 'Điện lực EVN', category: 'Điện, nước, internet', amount: -250000, time: '16:20', icon: 'ϟ', iconBackground: '#F0F9FF' },
    { id: 'salary', name: 'Lương tháng 9', category: 'Thu nhập', amount: 12000000, time: '09:15', icon: '↗', iconBackground: '#ECFDF5' },
  ] },
  { date: '10/09/2025', transactions: [
    { id: 'coffee', name: 'Highlands Coffee', category: 'Ăn uống', amount: -85000, time: '18:42', icon: '☕', iconBackground: '#FEF2F2' },
    { id: 'grab', name: 'Grab', category: 'Di chuyển', amount: -120000, time: '14:30', icon: '↗', iconBackground: '#ECFDF5' },
  ] },
  { date: '09/09/2025', transactions: [
    { id: 'shopee', name: 'Shopee', category: 'Mua sắm', amount: -320000, time: '20:15', icon: '◇', iconBackground: '#FFF7ED' },
    { id: 'bank', name: 'Vietcombank', category: 'Chuyển khoản', amount: 500000, time: '10:12', icon: '▣', iconBackground: '#ECFDF5' },
  ] },
];
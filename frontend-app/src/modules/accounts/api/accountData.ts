export type AccountItem = { name: string; description: string; amount: string; kind: 'cash' | 'bank' | 'wallet' };
export type AssetItem = { name: string; description: string; amount: string; kind: 'motorbike' | 'laptop' };

export const accountItems: AccountItem[] = [
  { name: 'Thẻ tiền mặt', description: 'Tiền mặt sẵn có', amount: '2.500.000 đ', kind: 'cash' },
  { name: 'Vietcombank', description: 'Ngân hàng', amount: '53.000.000 đ', kind: 'bank' },
  { name: 'Ví MoMo', description: 'Ví điện tử', amount: '8.600.000 đ', kind: 'wallet' },
];

export const assetItems: AssetItem[] = [
  { name: 'Xe máy', description: 'Phương tiện', amount: '45.000.000 đ', kind: 'motorbike' },
  { name: 'Laptop', description: 'Thiết bị điện tử', amount: '16.500.000 đ', kind: 'laptop' },
];
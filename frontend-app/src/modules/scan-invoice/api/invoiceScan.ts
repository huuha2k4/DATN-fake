export type ScannedInvoice = {
  merchant: string;
  total: string;
  category: string;
  accuracy: string;
};

export const sampleScannedInvoice: ScannedInvoice = {
  merchant: 'WinMart+',
  total: '245.000 đ',
  category: 'Ăn uống',
  accuracy: '96%',
};

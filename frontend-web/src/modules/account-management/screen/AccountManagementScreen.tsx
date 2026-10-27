import { useState, useEffect } from 'react';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import { 
  accountApi, 
  type AccountItem, 
  type AccountTypeCode,
  type CreateAccountPayload 
} from '../api/accountApi';
import { transactionApi, type TransactionItem } from '../../cash-flow-management/api/transactionApi';
import { 
  POPULAR_BANKS_AND_WALLETS, 
  findBankOrWalletPreset, 
  type BankOrWalletPreset 
} from '../constants/banksData';
import './AccountManagementScreen.css';

type Props = { 
  onNotify: (message: string) => void;
  onAccountsChange?: (count: number) => void;
};

export function AccountManagementScreen({ onNotify, onAccountsChange }: Props) {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [netWorthChangeRate, setNetWorthChangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialBalanceInput, setInitialBalanceInput] = useState<string>('0');
  const [creditLimitInput, setCreditLimitInput] = useState<string>('0');

  // Modal Xem chi tiết tài khoản & Lịch sử thanh toán
  const [selectedAccountDetail, setSelectedAccountDetail] = useState<AccountItem | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingAccountTx, setIsLoadingAccountTx] = useState(false);

  // Bank & Wallet selection state
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<BankOrWalletPreset | null>(null);
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  // UI selection type: Tiền mặt, Tài khoản ngân hàng, Ví điện tử, Thẻ ghi nợ, Thẻ tín dụng, Ví tiền mã hóa, Khác
  const [modalAccountCategory, setModalAccountCategory] = useState<'CASH' | 'BANK_ACCOUNT' | 'E_WALLET' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'CRYPTO' | 'OTHER'>('CASH');

  // Form State for creating account
  const [formData, setFormData] = useState<CreateAccountPayload>({
    name: 'Tiền mặt',
    accountType: 'CASH',
    currencyCode: 'VND',
    initialBalance: 0,
    phoneNumber: '',
    accountNumber: '',
    cardNumberLast4: '',
    creditLimit: 0,
    billingCycleDay: 20,
    paymentDueDay: 15,
    description: '',
    isIncludedInTotal: true,
  });

  // Mở modal chi tiết tài khoản và tải lịch sử giao dịch thực tế của tài khoản này
  const handleOpenAccountDetail = async (account: AccountItem) => {
    setSelectedAccountDetail(account);
    setAccountTransactions([]);
    setIsLoadingAccountTx(true);
    try {
      const res = await transactionApi.getTransactions({
        accountId: account.id,
        pageSize: 50,
      });
      const list = res.transactions || (res as any)?.data?.transactions || [];
      setAccountTransactions(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Lỗi tải giao dịch của tài khoản:', e);
      setAccountTransactions([]);
    } finally {
      setIsLoadingAccountTx(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, summaryRes] = await Promise.all([
        accountApi.getAccounts({ includeInactive: true }).catch(() => []),
        accountApi.getSummary().catch(() => null)
      ]);

      const safeAccs = Array.isArray(accountsRes) ? accountsRes : [];
      setAccounts(safeAccs);
      onAccountsChange?.(safeAccs.length);

      // Calculate dynamic net worth trend if available from backend
      if (summaryRes?.netWorthTrend30Days && summaryRes.netWorthTrend30Days.length >= 2) {
        const history = summaryRes.netWorthTrend30Days;
        const oldestNet = Number(history[0].netWorth);
        const latestNet = Number(history[history.length - 1].netWorth);
        if (oldestNet > 0) {
          const rate = ((latestNet - oldestNet) / oldestNet) * 100;
          setNetWorthChangeRate(Math.round(rate * 10) / 10);
        } else {
          setNetWorthChangeRate(null);
        }
      } else {
        setNetWorthChangeRate(null);
      }
    } catch {
      onNotify('Không thể tải danh sách tài khoản từ máy chủ');
      setAccounts([]);
      onAccountsChange?.(0);
      setNetWorthChangeRate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    onAccountsChange?.(accounts.length);
  }, [accounts.length, onAccountsChange]);

  const totalAssets = accounts
    .filter(a => a.isActive !== false && a.accountType !== 'CREDIT_CARD')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const totalLiabilities = accounts
    .filter(a => a.isActive !== false && a.accountType === 'CREDIT_CARD')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const netWorth = totalAssets - totalLiabilities;

  const filteredAccounts = selectedTypeFilter === 'ALL'
    ? accounts
    : selectedTypeFilter === 'DEBIT_CARD'
    ? accounts.filter(a => a.accountType === 'BANK_ACCOUNT' && (Boolean(a.cardNumberLast4) || a.name.toLowerCase().includes('thẻ ghi nợ') || a.name.toLowerCase().includes('thẻ atm')))
    : selectedTypeFilter === 'BANK_ACCOUNT'
    ? accounts.filter(a => a.accountType === 'BANK_ACCOUNT' && !a.cardNumberLast4 && !a.name.toLowerCase().includes('thẻ ghi nợ') && !a.name.toLowerCase().includes('thẻ atm'))
    : accounts.filter(a => a.accountType === selectedTypeFilter);

  const handleSelectPreset = (preset: BankOrWalletPreset) => {
    setSelectedPreset(preset);
    setIsBankPickerOpen(false);
    let autoName = '';
    if (preset.kind === 'BANK') {
      if (modalAccountCategory === 'DEBIT_CARD') {
        autoName = `Thẻ ghi nợ ${preset.shortName}`;
      } else if (modalAccountCategory === 'CREDIT_CARD') {
        autoName = `Thẻ tín dụng ${preset.shortName}`;
      } else {
        autoName = `Ngân hàng ${preset.shortName}`;
      }
    } else {
      autoName = `Ví ${preset.shortName}`;
    }
    setFormData((prev) => ({
      ...prev,
      name: autoName,
    }));
  };

  type ModalCategory = 'CASH' | 'BANK_ACCOUNT' | 'E_WALLET' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'CRYPTO' | 'OTHER';

  const handleCategoryChange = (category: ModalCategory) => {
    setSelectedPreset(null);
    setBankSearchQuery('');
    setIsBankPickerOpen(false);
    setModalAccountCategory(category);

    let defaultName = '';
    if (category === 'CASH') {
      defaultName = 'Tiền mặt';
    }

    // Map UI category to Backend AccountType
    const backendAccountType: AccountTypeCode = 
      category === 'DEBIT_CARD' ? 'BANK_ACCOUNT' : (category as AccountTypeCode);

    setFormData((prev) => ({
      ...prev,
      accountType: backendAccountType,
      name: defaultName,
    }));
  };

  const handleOpenAdd = (defaultCategory: ModalCategory = 'CASH') => {
    setSelectedPreset(null);
    setBankSearchQuery('');
    setIsBankPickerOpen(false);
    setModalAccountCategory(defaultCategory);

    let initialName = '';
    if (defaultCategory === 'CASH') {
      initialName = 'Tiền mặt';
    }

    const backendType: AccountTypeCode = defaultCategory === 'DEBIT_CARD' ? 'BANK_ACCOUNT' : (defaultCategory as AccountTypeCode);

    setFormData({
      name: initialName,
      accountType: backendType,
      currencyCode: 'VND',
      initialBalance: 0,
      phoneNumber: '',
      accountNumber: '',
      cardNumberLast4: '',
      creditLimit: 0,
      billingCycleDay: 20,
      paymentDueDay: 15,
      description: '',
      isIncludedInTotal: true,
    });
    setInitialBalanceInput('0');
    setCreditLimitInput('0');
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onNotify('Vui lòng nhập tên ví / tài khoản');
      return;
    }

    const cleanedBalance = parseFloat(initialBalanceInput.replace(/\./g, '').replace(/[^0-9-]/g, '')) || 0;
    const cleanedLimit = parseFloat(creditLimitInput.replace(/\./g, '').replace(/[^0-9-]/g, '')) || 0;

    const payload: CreateAccountPayload = {
      name: formData.name.trim(),
      accountType: formData.accountType,
      currencyCode: formData.currencyCode || 'VND',
      initialBalance: cleanedBalance,
      isIncludedInTotal: formData.isIncludedInTotal ?? true,
    };

    if (formData.accountType === 'CREDIT_CARD') {
      payload.creditLimit = cleanedLimit;
      payload.billingCycleDay = Number(formData.billingCycleDay) || 20;
      payload.paymentDueDay = Number(formData.paymentDueDay) || 15;
      if (formData.cardNumberLast4?.trim()) {
        payload.cardNumberLast4 = formData.cardNumberLast4.trim();
      }
    }

    if (formData.accountType === 'BANK_ACCOUNT') {
      if (formData.accountNumber?.trim()) {
        payload.accountNumber = formData.accountNumber.trim();
      }
      if (formData.cardNumberLast4?.trim()) {
        payload.cardNumberLast4 = formData.cardNumberLast4.trim();
      }
    }

    if (formData.accountType === 'E_WALLET' && formData.phoneNumber?.trim()) {
      payload.phoneNumber = formData.phoneNumber.trim();
    }

    if (formData.description?.trim()) {
      payload.description = formData.description.trim();
    }

    try {
      await accountApi.createAccount(payload);
      onNotify(`Đã tạo "${formData.name}" thành công vào hệ thống!`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi tạo ví vào hệ thống';
      onNotify(msg);
    }
  };

  // Active dropdown menu for 3-dots
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<AccountItem | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState('0');
  const [editFormData, setEditFormData] = useState<{
    name: string;
    description: string;
    isActive: boolean;
    creditLimit: number;
    billingCycleDay: number;
    paymentDueDay: number;
    isIncludedInTotal: boolean;
  }>({
    name: '',
    description: '',
    isActive: true,
    creditLimit: 0,
    billingCycleDay: 20,
    paymentDueDay: 15,
    isIncludedInTotal: true,
  });

  const handleOpenEdit = (account: AccountItem) => {
    setSelectedAccountForEdit(account);
    setEditFormData({
      name: account.name,
      description: account.description || '',
      isActive: account.isActive ?? true,
      creditLimit: account.creditLimit || 0,
      billingCycleDay: account.billingCycleDay || 20,
      paymentDueDay: account.paymentDueDay || 15,
      isIncludedInTotal: account.isIncludedInTotal ?? true,
    });
    setEditBalanceInput(formatNumberWithDots(account.balance ?? 0));
    setCreditLimitInput(formatNumberWithDots(account.creditLimit || 0));
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForEdit) return;
    if (!editFormData.name.trim()) {
      onNotify('Tên ví / tài khoản không được để trống');
      return;
    }

    try {
      const newCleanedBalance = parseFloat(editBalanceInput.replace(/\./g, '').replace(/[^0-9-]/g, '')) || 0;
      const isBalanceChanged = Math.abs(newCleanedBalance - (selectedAccountForEdit.balance ?? 0)) > 0.001;

      const payload: any = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        isIncludedInTotal: editFormData.isIncludedInTotal,
        isActive: editFormData.isActive,
      };

      if (isBalanceChanged) {
        payload.balance = newCleanedBalance;
      }

      if (selectedAccountForEdit.accountType === 'CREDIT_CARD') {
        const cleanedLimit = parseFloat(creditLimitInput.replace(/\./g, '').replace(/[^0-9-]/g, '')) || 0;
        payload.creditLimit = cleanedLimit;
        payload.billingCycleDay = editFormData.billingCycleDay;
        payload.paymentDueDay = editFormData.paymentDueDay;
      }

      await accountApi.updateAccount(selectedAccountForEdit.id, payload);

      // Nếu có điều chỉnh số dư, gửi thêm adjustBalance để ghi nhận log nếu backend hỗ trợ
      if (isBalanceChanged) {
        try {
          await accountApi.adjustBalance(selectedAccountForEdit.id, {
            newBalance: newCleanedBalance,
            adjustmentDate: new Date().toISOString().split('T')[0],
            reason: 'Cập nhật lại số dư từ quản lý ví',
            createAdjustmentTransaction: false,
          });
        } catch (adjustErr) {
          console.warn('adjustBalance log skipped:', adjustErr);
        }
      }

      onNotify(`Đã lưu thay đổi "${editFormData.name}" thành công!`);
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi cập nhật tài khoản';
      onNotify(msg);
    }
  };



  // Delete Confirmation Modal State
  const [accountToDelete, setAccountToDelete] = useState<AccountItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      setIsDeleting(true);
      await accountApi.deleteAccount(accountToDelete.id, accountToDelete.version || 0);
      onNotify(`Đã xóa "${accountToDelete.name}" thành công!`);
      setAccountToDelete(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi xóa tài khoản';
      onNotify(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (account: AccountItem) => {
    setAccountToDelete(account);
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  // Hàm định dạng số có dấu chấm ngăn cách hàng nghìn khi người dùng gõ phím (ví dụ: 1314211 -> 1.314.211)
  const formatNumberWithDots = (val: string | number) => {
    if (val == null || val === '') return '';
    const cleanStr = String(val).replace(/\D/g, '');
    if (!cleanStr) return '';
    return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getAccountTypeMeta = (type: AccountTypeCode, item?: AccountItem) => {
    switch (type) {
      case 'E_WALLET':
        return {
          label: 'Ví điện tử',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: 'is-e-wallet',
          icon: 'wallet' as IconName,
          accentColor: '#10b981',
          defaultGradient: 'linear-gradient(135deg, #0d5f42 0%, #06402d 60%, #032b1e 100%)',
        };
      case 'BANK_ACCOUNT': {
        const isDebit = Boolean(item?.cardNumberLast4 || item?.name?.toLowerCase().includes('thẻ ghi nợ') || item?.name?.toLowerCase().includes('thẻ atm'));
        if (isDebit) {
          return {
            label: 'Thẻ ghi nợ',
            badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
            cardClass: 'is-bank',
            icon: 'bank' as IconName,
            accentColor: '#0891b2',
            defaultGradient: 'linear-gradient(135deg, #0e5b7e 0%, #0b3d56 60%, #062332 100%)',
          };
        }
        return {
          label: 'Tài khoản ngân hàng',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: 'is-bank',
          icon: 'bank' as IconName,
          accentColor: '#2563eb',
          defaultGradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 60%, #0f172a 100%)',
        };
      }
      case 'CASH':
        return {
          label: 'Tiền mặt',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: 'is-cash',
          icon: 'wallet' as IconName,
          accentColor: '#d97706',
          defaultGradient: 'linear-gradient(135deg, #3d3112 0%, #261e0b 60%, #171206 100%)',
        };
      case 'CREDIT_CARD':
        return {
          label: 'Thẻ tín dụng',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: 'is-credit-card',
          icon: 'receipt' as IconName,
          accentColor: '#f43f5e',
          defaultGradient: 'linear-gradient(135deg, #4c0519 0%, #29020d 60%, #120106 100%)',
        };
      case 'SAVINGS':
        return {
          label: 'Sổ tiết kiệm',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: 'is-savings',
          icon: 'trend' as IconName,
          accentColor: '#0d9488',
          defaultGradient: 'linear-gradient(135deg, #115e59 0%, #042f2e 60%, #021a1a 100%)',
        };
      case 'INVESTMENT':
        return {
          label: 'Đầu tư',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: 'is-investment',
          icon: 'chart' as IconName,
          accentColor: '#6366f1',
          defaultGradient: 'linear-gradient(135deg, #4338ca 0%, #312e81 60%, #1e1b4b 100%)',
        };
      default:
        return {
          label: 'Khác',
          badgeClass: 'bg-white/20 text-white border-white/30 backdrop-blur-sm',
          cardClass: '',
          icon: 'wallet' as IconName,
          accentColor: '#64748b',
          defaultGradient: 'linear-gradient(135deg, #334155 0%, #1e293b 60%, #0f172a 100%)',
        };
    }
  };

  const getBrandCardGradient = (brandCode?: string, defaultGrad?: string) => {
    switch (brandCode) {
      case 'MOMO':
        return 'linear-gradient(135deg, #b0006d 0%, #7d004e 60%, #4a002e 100%)';
      case 'ZALOPAY':
        return 'linear-gradient(135deg, #0077ff 0%, #0052b3 60%, #002c66 100%)';
      case 'VNPAY':
        return 'linear-gradient(135deg, #005baa 0%, #003d73 60%, #002342 100%)';
      case 'SHOPEEPAY':
        return 'linear-gradient(135deg, #ea4c2a 0%, #b83315 60%, #6e1a07 100%)';
      case 'VIETTELMONEY':
        return 'linear-gradient(135deg, #d3161e 0%, #990e14 60%, #590408 100%)';
      case 'VCB':
        return 'linear-gradient(135deg, #005f27 0%, #003d19 60%, #001f0c 100%)';
      case 'MB':
        return 'linear-gradient(135deg, #0a3d91 0%, #06265e 60%, #021233 100%)';
      case 'TCB':
        return 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 60%, #450a0a 100%)';
      case 'VPB':
        return 'linear-gradient(135deg, #007b3d 0%, #004d26 60%, #002613 100%)';
      case 'BIDV':
        return 'linear-gradient(135deg, #0a6b47 0%, #064a31 60%, #022a1b 100%)';
      case 'ICB':
        return 'linear-gradient(135deg, #004b87 0%, #003057 60%, #001a30 100%)';
      case 'ACB':
        return 'linear-gradient(135deg, #0066b2 0%, #004477 60%, #00223d 100%)';
      case 'TPB':
        return 'linear-gradient(135deg, #6c2382 0%, #461456 60%, #260730 100%)';
      case 'STB':
        return 'linear-gradient(135deg, #0054a6 0%, #00366b 60%, #001c38 100%)';
      case 'VIB':
        return 'linear-gradient(135deg, #004990 0%, #002f5e 60%, #001933 100%)';
      case 'VBA':
        return 'linear-gradient(135deg, #8b1820 0%, #5e0e13 60%, #360609 100%)';
      default:
        return defaultGrad || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
    }
  };

  return (
    <main className="wallet-management-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#f6f8f6] px-4 pb-24 pt-6 text-[#14251f] sm:px-6 lg:px-8 lg:pb-12" aria-label="Quản lý các loại ví tài chính">
      {/* 1. Stunning High-End Metrics Ribbon */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Total Assets Available */}
        <div 
          className="wallet-stat-card is-assets"
          style={{ '--stat-accent': '#10b981' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-[#07543f] uppercase flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#10b981]" />
              TỔNG TÀI SẢN KHẢ DỤNG
            </span>
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-[#07543f] border border-emerald-100 shadow-sm">
              <FinanceIcon name="wallet" size={19} />
            </span>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight text-[#07543f] sm:text-4xl">
              {formatVND(totalAssets)}
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#ebf3ed] pt-2.5 text-[11px] text-[#6b7f73]">
              <span>Tiền mặt &amp; Tài khoản</span>
              <span className="font-semibold text-[#07543f]">
                {accounts.filter(a => a.isActive !== false && a.accountType !== 'CREDIT_CARD').length} ví hoạt động
              </span>
            </div>
          </div>
        </div>

        {/* 2. Credit Card / Debts */}
        <div 
          className="wallet-stat-card is-debts"
          style={{ '--stat-accent': '#f43f5e' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-[#e11d48] uppercase flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#f43f5e]" />
              DƯ NỢ THẺ &amp; KHOẢN NỢ
            </span>
            <span className="grid size-10 place-items-center rounded-2xl bg-rose-50 text-[#e11d48] border border-rose-100 shadow-sm">
              <FinanceIcon name="receipt" size={19} />
            </span>
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight text-[#e11d48] sm:text-4xl">
              {formatVND(totalLiabilities)}
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#fcebec] pt-2.5 text-[11px] text-[#8c6769]">
              <span>Cần trả kỳ sao kê</span>
              <span className="font-semibold text-[#e11d48]">
                {totalLiabilities === 0 ? 'Không có nợ tồn' : 'Cần thanh toán'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Net Worth Hero Card (trong cùng bên phải) */}
        <div className="net-worth-hero-card p-6 text-white sm:col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-[#a8ebca] uppercase">
              TỔNG GIÁ TRỊ RÒNG (NET WORTH)
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/15 text-[#a8ebca] backdrop-blur-md">
              <FinanceIcon name="spark" size={18} />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {formatVND(netWorth)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#cbf4df]">
              <span>Tài sản thực tế sau nghĩa vụ nợ</span>
              {netWorthChangeRate !== null ? (
                <span className={`font-semibold ${netWorthChangeRate >= 0 ? 'text-[#8bf7c5]' : 'text-red-300'}`}>
                  {netWorthChangeRate >= 0 ? `+${netWorthChangeRate}%` : `${netWorthChangeRate}%`} tháng này
                </span>
              ) : (
                <span className="text-[#a8ebca]/80">
                  {accounts.length > 0 ? 'Tổng hợp theo các nguồn' : 'Chưa có dữ liệu'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Navigation & Fast Creation Shortcuts */}
      <section className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[#e3eae5] bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-[#62776c]">Nhóm:</span>
          {[
            { key: 'ALL', label: 'Tất cả nguồn tiền' },
            { key: 'CASH', label: 'Tiền mặt' },
            { key: 'BANK_ACCOUNT', label: 'Tài khoản ngân hàng' },
            { key: 'E_WALLET', label: 'Ví điện tử' },
            { key: 'DEBIT_CARD', label: 'Thẻ ghi nợ' },
            { key: 'CREDIT_CARD', label: 'Thẻ tín dụng' },
            { key: 'CRYPTO', label: 'Ví mã hóa' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTypeFilter(tab.key)}
              className={`filter-tab-pill ${selectedTypeFilter === tab.key ? 'is-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => handleOpenAdd('CASH')}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#07543f] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#09694e]"
          >
            Thêm ví mới
          </button>
        </div>
      </section>

      {/* 4. Privacy & Manual Entry Banner */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-[#cbe4d5] bg-gradient-to-r from-[#edf8f2] to-[#e4f5ec] p-4 text-[#1d3d2e] shadow-sm">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#07543f] text-[#cbf4df] shadow-sm">
          <FinanceIcon name="shield" size={17} />
        </span>
        <div className="text-xs leading-relaxed">
          <strong className="block text-sm font-bold text-[#07543f]">
            Quản lý độc lập, riêng tư &amp; Tuyệt đối an toàn
          </strong>
          Finora cho phép bạn ghi nhận và kiểm soát dòng tiền tự động qua OCR hoặc cập nhật số dư tay linh hoạt. Toàn bộ thông tin ví cá nhân không yêu cầu kết nối Open Banking trực tiếp hay tiết lộ mật khẩu ngân hàng.
        </div>
      </div>

      {/* 5. Wallet Cards Grid */}
      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#d5dfd8] bg-white p-8 text-center text-xs text-[#718078]">
          <FinanceIcon name="refresh" size={22} className="animate-spin text-[#07543f]" />
          <span className="ml-2.5 font-semibold">Đang nạp danh sách ví...</span>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#ccd6cf] bg-white py-14 text-center shadow-sm">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#e3f4e9] text-[#07543f]">
            <FinanceIcon name="wallet" size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#17261f]">Chưa có ví nào trong danh mục này</h3>
          <p className="mt-1 max-w-sm text-xs text-[#718078]">
            Bạn có thể tạo ví tiền mặt, ví điện tử MoMo / ZaloPay hoặc thẻ ngân hàng để bắt đầu theo dõi.
          </p>
          <button
            type="button"
            onClick={() => handleOpenAdd(selectedTypeFilter === 'ALL' ? 'CASH' : selectedTypeFilter as any)}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#07543f] px-4 text-xs font-semibold text-white shadow hover:bg-[#087557]"
          >
            <FinanceIcon name="plus" size={14} />
            Tạo ví mới ngay
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => {
            const meta = getAccountTypeMeta(account.accountType, account);
            const brandPreset = findBankOrWalletPreset(account.name);
            const isCredit = account.accountType === 'CREDIT_CARD';
            const isDebitCard = account.accountType === 'BANK_ACCOUNT' && Boolean(account.cardNumberLast4 || account.name.toLowerCase().includes('thẻ ghi nợ') || account.name.toLowerCase().includes('thẻ atm'));
            const isAccountActive = account.isActive !== false;

            const cardGradient = getBrandCardGradient(brandPreset?.code, meta.defaultGradient);

            return (
              <article
                key={account.id}
                onClick={() => handleOpenAccountDetail(account)}
                className={`wallet-item-card ${meta.cardClass} ${!isAccountActive ? 'is-inactive' : ''} group cursor-pointer hover:shadow-xl transition-all`}
                style={{
                  '--card-bg-gradient': cardGradient,
                  '--brand-color': brandPreset ? brandPreset.brandColor : meta.accentColor
                } as React.CSSProperties}
              >
                {/* 1. Card Top: Logo, Name & 3-dots */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {brandPreset ? (
                        <span 
                          className="brand-logo-badge size-10 overflow-hidden bg-white/95 p-1 shadow-md ring-1 ring-white/20"
                          title={brandPreset.name}
                        >
                          {brandPreset.logoUrl ? (
                            <img
                              src={brandPreset.logoUrl}
                              alt={brandPreset.shortName}
                              className="size-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.style.backgroundColor = brandPreset.bgColor;
                                  e.currentTarget.parentElement.style.color = brandPreset.textColor;
                                  e.currentTarget.parentElement.innerText = brandPreset.shortName.slice(0, 3);
                                }
                              }}
                            />
                          ) : (
                            <span
                              className="flex size-full items-center justify-center font-bold text-xs"
                              style={{ backgroundColor: brandPreset.bgColor, color: brandPreset.textColor }}
                            >
                              {brandPreset.shortName.slice(0, 3)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-sm">
                          <FinanceIcon name={meta.icon} size={18} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 
                          className="truncate text-sm font-bold text-white drop-shadow-sm"
                          title={account.name}
                        >
                          {account.name}
                        </h3>
                        {!isCredit && !isDebitCard && (
                          <div className="text-[11px] text-white/75 tracking-tight flex items-center gap-1.5">
                            {account.accountNumberMasked ? (
                              <span className="card-number-emboss font-medium text-white/90">
                                STK: {account.accountNumberMasked}
                              </span>
                            ) : account.phoneNumber ? (
                              <span>{account.phoneNumber}</span>
                            ) : (
                              <span>{meta.label}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-semibold ${meta.badgeClass}`}>
                        {meta.label}
                      </span>

                      {/* 3-dots Menu Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === account.id ? null : account.id);
                          }}
                          className="grid size-7 place-items-center rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition"
                          title="Tùy chọn ví"
                        >
                          <FinanceIcon name="more" size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === account.id && (
                          <>
                            <div className="absolute right-0 top-full mt-1.5 w-48 z-30 rounded-xl border border-gray-100 bg-white p-1.5 shadow-2xl animate-fadeIn text-[#14261e]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleOpenAccountDetail(account);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#14261e] hover:bg-[#f0f7f3] hover:text-[#07543f] transition whitespace-nowrap"
                              >
                                <FinanceIcon name="eye" size={14} className="text-[#07543f] shrink-0" />
                                <span>Xem chi tiết &amp; Lịch sử</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleOpenEdit(account);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#14261e] hover:bg-[#f0f7f3] hover:text-[#07543f] transition whitespace-nowrap"
                              >
                                <FinanceIcon name="edit" size={14} className="text-[#07543f] shrink-0" />
                                <span>Sửa thông tin</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleDelete(account);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#dc2626] hover:bg-[#fee2e2] transition whitespace-nowrap"
                              >
                                <FinanceIcon name="delete" size={14} className="text-[#dc2626] shrink-0" />
                                <span>Xóa ví</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Card Number & EMV Chip row for Debit & Credit Cards */}
                  {(isDebitCard || isCredit) && (
                    <div className="mt-3.5 flex items-center justify-between">
                      <div className="card-number-emboss text-sm font-semibold tracking-widest text-white/95 drop-shadow-sm">
                        {account.cardNumberLast4 ? (
                          <span>•••• •••• •••• {account.cardNumberLast4}</span>
                        ) : account.accountNumberMasked ? (
                          <span>STK: {account.accountNumberMasked}</span>
                        ) : (
                          <span>•••• •••• •••• 8888</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <svg className="contactless-wave text-white/70" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                          <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                          <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                        </svg>
                        <div className="credit-chip shrink-0" title="Chip EMV" />
                      </div>
                    </div>
                  )}

                  {/* 2. Middle: Balance Display */}
                  <div className={`card-balance-section ${(isDebitCard || isCredit) ? 'mt-3' : 'mt-5'}`}>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70">
                      <span>{isCredit ? 'DƯ NỢ HIỆN TẠI' : 'SỐ DƯ KHẢ DỤNG'}</span>
                      <span className="text-[10px] font-semibold text-white/60">{account.currencyCode || 'VND'}</span>
                    </div>

                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-[27px] font-black tracking-tight leading-none text-white drop-shadow-sm">
                        {formatVND(account.balance)}
                      </span>
                    </div>

                    {isCredit && account.creditLimit && account.creditLimit > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/15 text-[11px] text-white/80">
                        <div className="flex justify-between text-[10.5px]">
                          <span>Hạn mức: {formatVND(account.creditLimit)}</span>
                          <span className="font-semibold text-emerald-300">
                            Còn: {formatVND(Math.max(0, account.creditLimit - account.balance))}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-rose-400" 
                            style={{ width: `${Math.min(100, Math.round((account.balance / account.creditLimit) * 100))}%` }} 
                          />
                        </div>
                        {(account.billingCycleDay || account.paymentDueDay) && (
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
                            <span>Sao kê: Ngày {account.billingCycleDay || 20}</span>
                            <span className="font-semibold text-rose-300">Hạn trả: Ngày {account.paymentDueDay || 15}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Footer: Status & Note Pill */}
                <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium shrink-0">
                    <span className={`size-2 rounded-full ${account.isActive !== false ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]'}`} />
                    <span className={account.isActive !== false ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                      {account.isActive !== false ? 'Đang hoạt động' : 'Đang tắt hoạt động'}
                    </span>
                  </span>

                  {account.description ? (
                    <span 
                      className="ml-2 truncate max-w-[50%] rounded-md bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-right text-[10.5px] text-white font-medium border border-white/10"
                      title={account.description}
                    >
                      {account.description}
                    </span>
                  ) : account.isActive === false ? (
                    <span className="rounded-md bg-rose-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-rose-200 border border-rose-400/30">
                      Tạm khóa
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm ví mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-[460px] rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf2ee] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-[#e3f4e9] text-[#07543f]">
                  <FinanceIcon name="wallet" size={16} />
                </span>
                <h2 className="text-sm font-bold text-[#14261e]">Thêm ví / Nguồn tiền mới</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-3 grid gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#34463b]">Loại tài khoản / ví</label>
                <select
                  value={modalAccountCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as any)}
                  className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] bg-white px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK_ACCOUNT">Tài khoản ngân hàng</option>
                  <option value="E_WALLET">Ví điện tử</option>
                  <option value="DEBIT_CARD">Thẻ ghi nợ</option>
                  <option value="CREDIT_CARD">Thẻ tín dụng</option>
                  <option value="CRYPTO">Ví mã hóa</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              {/* Searchable Picker for Bank & E-Wallet */}
              {(formData.accountType === 'BANK_ACCOUNT' || formData.accountType === 'CREDIT_CARD' || formData.accountType === 'E_WALLET') && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-[#34463b]">
                      {formData.accountType === 'E_WALLET' ? 'Chọn ví điện tử *' : 'Chọn ngân hàng *'}
                    </label>
                    <span className="text-[10px] text-[#6b7280]">
                      {selectedPreset ? 'Nhấn để đổi' : 'Gõ tên hoặc mã'}
                    </span>
                  </div>

                  <div className="relative mt-1">
                    {selectedPreset ? (
                      /* Display Selected Bank Card with Change Button */
                      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-[#a7dfbc] bg-[#f2f9f5] px-3 py-1.5 shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white p-0.5 shadow-sm border border-[#e3eae5]">
                            {selectedPreset.logoUrl ? (
                              <img
                                src={selectedPreset.logoUrl}
                                alt={selectedPreset.shortName}
                                className="size-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.style.backgroundColor = selectedPreset.bgColor;
                                    e.currentTarget.parentElement.style.color = selectedPreset.textColor;
                                    e.currentTarget.parentElement.innerText = selectedPreset.shortName.slice(0, 3);
                                  }
                                }}
                              />
                            ) : (
                              <span 
                                className="flex size-full items-center justify-center font-bold text-[10px]"
                                style={{ backgroundColor: selectedPreset.bgColor, color: selectedPreset.textColor }}
                              >
                                {selectedPreset.shortName.slice(0, 3)}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-bold text-[#14261e]">
                                {selectedPreset.shortName}
                              </strong>
                              <span className="rounded bg-[#e1efe6] px-1 py-0.2 text-[9px] font-bold text-[#07543f]">
                                {selectedPreset.code}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-[#526a5c]">
                              {selectedPreset.name}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPreset(null);
                            setBankSearchQuery('');
                            setIsBankPickerOpen(true);
                          }}
                          className="shrink-0 rounded-lg border border-[#c3dcce] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#07543f] hover:bg-[#eaf4ee]"
                        >
                          Đổi
                        </button>
                      </div>
                    ) : (
                      /* Search Input when no bank is selected */
                      <div className="flex items-center gap-2 rounded-xl border border-[#d5ded8] bg-white px-3 py-1.5 focus-within:border-[#07543f] focus-within:ring-1 focus-within:ring-[#07543f] shadow-sm">
                        <FinanceIcon name="search" size={14} className="text-[#86968e] shrink-0" />
                        <input
                          type="text"
                          placeholder={
                            formData.accountType === 'E_WALLET'
                              ? 'Tìm ví: MoMo, ZaloPay, ShopeePay, Viettel...'
                              : 'Tìm ngân hàng: VCB, Vietcombank, Techcombank, MB, BIDV...'
                          }
                          value={bankSearchQuery}
                          onChange={(e) => {
                            setBankSearchQuery(e.target.value);
                            setIsBankPickerOpen(true);
                          }}
                          onFocus={() => setIsBankPickerOpen(true)}
                          className="w-full text-xs outline-none bg-transparent"
                        />
                        {bankSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setBankSearchQuery('')}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {/* Filtered list of banks/wallets dropdown */}
                    {isBankPickerOpen && !selectedPreset && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-[#d5ded8] bg-white p-1 shadow-2xl">
                        {(() => {
                          const targetKind = formData.accountType === 'E_WALLET' ? 'E_WALLET' : 'BANK';
                          const filtered = POPULAR_BANKS_AND_WALLETS.filter((item) => {
                            if (item.kind !== targetKind) return false;
                            if (!bankSearchQuery.trim()) return true;
                            const q = bankSearchQuery.toLowerCase();
                            return (
                              item.code.toLowerCase().includes(q) ||
                              item.shortName.toLowerCase().includes(q) ||
                              item.name.toLowerCase().includes(q)
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-2.5 text-center text-xs text-[#718078]">
                                Không tìm thấy {formData.accountType === 'E_WALLET' ? 'ví' : 'ngân hàng'} phù hợp
                              </div>
                            );
                          }

                          return (
                            <div className="grid gap-0.5">
                              {filtered.map((item) => {
                                return (
                                  <button
                                    key={item.code}
                                    type="button"
                                    onClick={() => handleSelectPreset(item)}
                                    className="bank-option-btn py-1.5"
                                  >
                                    <span 
                                      className="brand-logo-badge size-7 shrink-0 overflow-hidden bg-white p-0.5"
                                      style={{
                                        border: `1px solid ${item.brandColor}33`,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      {item.logoUrl ? (
                                        <img
                                          src={item.logoUrl}
                                          alt={item.shortName}
                                          className="size-full object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                            if (e.currentTarget.parentElement) {
                                              e.currentTarget.parentElement.style.backgroundColor = item.bgColor;
                                              e.currentTarget.parentElement.style.color = item.textColor;
                                              e.currentTarget.parentElement.innerText = item.shortName.slice(0, 3);
                                            }
                                          }}
                                        />
                                      ) : (
                                        <span 
                                          className="flex size-full items-center justify-center text-[9px] font-bold"
                                          style={{
                                            backgroundColor: item.bgColor,
                                            color: item.textColor
                                          }}
                                        >
                                          {item.shortName.slice(0, 3)}
                                        </span>
                                      )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-[#14261e] leading-snug text-xs">
                                        {item.shortName}
                                      </div>
                                      <div className="truncate text-[10px] text-[#718078]">
                                        {item.name}
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-[#86968e]">
                                      {item.code}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tên ví / Tài khoản */}
              {formData.accountType === 'CASH' ? (
                <div className="rounded-xl border border-[#d6edd9] bg-[#f2f9f4] p-2.5 text-xs text-[#1e5836]">
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-md bg-[#07543f] text-white text-[10px] font-bold">
                      ✓
                    </span>
                    <div>
                      <span className="font-semibold text-xs">Tên ví mặc định: </span>
                      <strong className="text-xs font-extrabold text-[#07543f]">Tiền mặt</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-[#34463b]">Tên hiển thị ví / Tài khoản *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Techcombank chi tiêu, MB Bank lương, MoMo..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#34463b]">Số dư ban đầu (VND) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={initialBalanceInput}
                    onChange={(e) => setInitialBalanceInput(formatNumberWithDots(e.target.value))}
                    className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs font-bold text-[#07543f] outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#34463b]">Đơn vị tiền tệ</label>
                  <input
                    type="text"
                    value={formData.currencyCode}
                    onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                    className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                  />
                </div>
              </div>

              {formData.accountType === 'E_WALLET' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#34463b]">Số điện thoại đăng ký ví</label>
                  <input
                    type="text"
                    placeholder="0987654321"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                  />
                </div>
              )}

              {formData.accountType === 'BANK_ACCOUNT' && (
                modalAccountCategory === 'DEBIT_CARD' ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">4 số cuối thẻ ATM/Debit *</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Ví dụ: 9021"
                        value={formData.cardNumberLast4}
                        onChange={(e) => setFormData({ ...formData, cardNumberLast4: e.target.value })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">Số TK liên kết (tùy chọn)</label>
                      <input
                        type="text"
                        placeholder="10123456789"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#34463b]">Số tài khoản ngân hàng</label>
                    <input
                      type="text"
                      placeholder="10123456789"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                    />
                  </div>
                )
              )}

              {formData.accountType === 'CREDIT_CARD' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">Hạn mức thẻ (VND) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={creditLimitInput}
                        onChange={(e) => setCreditLimitInput(formatNumberWithDots(e.target.value))}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">4 số cuối thẻ</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="8821"
                        value={formData.cardNumberLast4}
                        onChange={(e) => setFormData({ ...formData, cardNumberLast4: e.target.value })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">Ngày chốt sao kê (hàng tháng)</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        placeholder="20"
                        value={formData.billingCycleDay || ''}
                        onChange={(e) => setFormData({ ...formData, billingCycleDay: parseInt(e.target.value) || 20 })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">Ngày đến hạn thanh toán</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        placeholder="15"
                        value={formData.paymentDueDay || ''}
                        onChange={(e) => setFormData({ ...formData, paymentDueDay: parseInt(e.target.value) || 15 })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#34463b]">Ghi chú / Mô tả</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ví tiêu vặt, Shopee Mall, cà phê cuối tuần..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t border-[#edf2ee] pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-8.5 rounded-xl border border-[#d5ded8] bg-white px-3.5 text-xs font-semibold text-[#495b50] hover:bg-[#f1f5f2]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-8.5 rounded-xl bg-[#07543f] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#087557]"
                >
                  Tạo ví ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* MODAL: Sửa thông tin ví / tài khoản */}
      {isEditModalOpen && selectedAccountForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-[460px] rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf2ee] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-[#e3f4e9] text-[#07543f]">
                  <FinanceIcon name="edit" size={16} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#14261e]">Sửa thông tin ví / tài khoản</h2>
                  <p className="text-[11px] text-[#718078]">{selectedAccountForEdit.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-3 grid gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#34463b]">Tên hiển thị ví / Tài khoản *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                />
              </div>

              {/* Số dư hiện tại (hoặc dư nợ đối với thẻ tín dụng) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#34463b]">
                  {selectedAccountForEdit.accountType === 'CREDIT_CARD' ? 'Dư nợ hiện tại (VND) *' : 'Số dư hiện tại (VND) *'}
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={editBalanceInput}
                  onChange={(e) => setEditBalanceInput(formatNumberWithDots(e.target.value))}
                  className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs font-bold text-[#07543f] outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                  placeholder="0"
                />
                <span className="mt-1 block text-[10px] text-[#718078]">
                  Hệ thống sẽ tự động cập nhật số dư mới vào lịch sử ví.
                </span>
              </div>

              {selectedAccountForEdit.accountType === 'CREDIT_CARD' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#34463b]">Hạn mức tín dụng *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={creditLimitInput}
                      onChange={(e) => setCreditLimitInput(formatNumberWithDots(e.target.value))}
                      className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">Ngày chốt sao kê</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={editFormData.billingCycleDay}
                        onChange={(e) => setEditFormData({ ...editFormData, billingCycleDay: parseInt(e.target.value) || 20 })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#34463b]">Ngày đến hạn thanh toán</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={editFormData.paymentDueDay}
                        onChange={(e) => setEditFormData({ ...editFormData, paymentDueDay: parseInt(e.target.value) || 15 })}
                        className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Trạng thái hoạt động - Toggle switch Bật / Tắt */}
              <div className="flex items-center justify-between rounded-xl border border-[#e5ebe7] bg-[#f8faf8] p-3">
                <div>
                  <span className="block text-xs font-bold text-[#14261e]">Trạng thái hoạt động</span>
                  <span className="text-[11px] text-[#718078]">
                    {editFormData.isActive ? 'Đang hoạt động bình thường' : 'Đang tạm dừng theo dõi'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editFormData.isActive}
                  onClick={() => setEditFormData({ ...editFormData, isActive: !editFormData.isActive })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editFormData.isActive ? 'bg-[#07543f]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editFormData.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#34463b]">Ghi chú / Mô tả</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ví tiêu dùng cá nhân, chi trả hóa đơn..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="mt-1 h-8.5 w-full rounded-xl border border-[#d5ded8] px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsIncludedInTotal"
                  checked={editFormData.isIncludedInTotal}
                  onChange={(e) => setEditFormData({ ...editFormData, isIncludedInTotal: e.target.checked })}
                  className="size-4 rounded border-gray-300 text-[#07543f] focus:ring-[#07543f]"
                />
                <label htmlFor="editIsIncludedInTotal" className="text-xs text-[#34463b]">
                  Tính vào tổng tài sản chung
                </label>
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t border-[#edf2ee] pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-8.5 rounded-xl border border-[#d5ded8] bg-white px-3.5 text-xs font-semibold text-[#495b50] hover:bg-[#f1f5f2]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-8.5 rounded-xl bg-[#07543f] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#087557]"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Custom Delete Confirmation Modal */}
      {accountToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeleting && setAccountToDelete(null)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <FinanceIcon name="delete" size={22} />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#14261e]">Xác nhận xóa ví?</h3>
                <p className="text-xs text-[#718579] mt-0.5">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#fafbfa] p-3.5 border border-[#edf2ee]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#718579]">Tên ví / thẻ:</span>
                <span className="font-bold text-[#14261e]">{accountToDelete.name}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-[#718579]">Số dư hiện tại:</span>
                <span className="font-bold text-[#07543f]">{formatVND(accountToDelete.balance)}</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-[#52665a] leading-relaxed">
              Bạn có chắc chắn muốn xóa ví <strong className="text-[#14261e]">"{accountToDelete.name}"</strong> khỏi danh sách quản lý tài chính không?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAccountToDelete(null)}
                className="h-9 rounded-xl border border-[#d5ded8] bg-white px-4 text-xs font-semibold text-[#495b50] hover:bg-[#f1f5f2] transition disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteAccount}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <FinanceIcon name="refresh" size={14} className="animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <FinanceIcon name="delete" size={14} />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal Chi tiết ví & Lịch sử thanh toán */}
      {selectedAccountDetail && (() => {
        const isCredit = selectedAccountDetail.accountType === 'CREDIT_CARD';
        const brandPreset = findBankOrWalletPreset(selectedAccountDetail.bank?.id || selectedAccountDetail.name);
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedAccountDetail(null)}
          >
            <div 
              className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {brandPreset?.logoUrl ? (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-gray-100 shadow-sm">
                      <img src={brandPreset.logoUrl} alt={brandPreset.shortName} className="size-full object-contain" />
                    </span>
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e3f4e9] text-[#07543f]">
                      <FinanceIcon name="wallet" size={20} />
                    </span>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-[#14261e]">{selectedAccountDetail.name}</h3>
                    <p className="text-xs text-[#718579]">
                      {selectedAccountDetail.accountNumberMasked ? `STK: ${selectedAccountDetail.accountNumberMasked}` : (selectedAccountDetail.phoneNumber || 'Chi tiết nguồn tiền')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAccountDetail(null)}
                  className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Thông tin số dư & Hạn mức */}
              <div className="mt-4 rounded-xl bg-[#f8faf8] p-4 border border-[#e5ebe7] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#718579] font-medium">{isCredit ? 'Dư nợ hiện tại:' : 'Số dư khả dụng:'}</span>
                  <span className={`text-base font-black ${isCredit ? 'text-[#e11d48]' : 'text-[#07543f]'}`}>
                    {formatVND(selectedAccountDetail.balance)}
                  </span>
                </div>

                {isCredit && selectedAccountDetail.creditLimit && selectedAccountDetail.creditLimit > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[#718579]">Hạn mức thẻ:</span>
                      <strong className="text-[#14261e]">{formatVND(selectedAccountDetail.creditLimit)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#718579]">Hạn mức còn lại:</span>
                      <strong className="text-emerald-600">
                        {formatVND(Math.max(0, selectedAccountDetail.creditLimit - selectedAccountDetail.balance))}
                      </strong>
                    </div>
                    {(selectedAccountDetail.billingCycleDay || selectedAccountDetail.paymentDueDay) && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px] text-[#718579]">
                        <span>Chốt sao kê: Ngày {selectedAccountDetail.billingCycleDay || 20}</span>
                        <span className="font-semibold text-rose-600">Hạn thanh toán: Ngày {selectedAccountDetail.paymentDueDay || 15}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                  <span className="text-[#718579]">Trạng thái:</span>
                  <span className={`font-bold ${selectedAccountDetail.isActive !== false ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {selectedAccountDetail.isActive !== false ? 'Đang hoạt động ✓' : 'Đang tạm dừng'}
                  </span>
                </div>
              </div>

              {/* Lịch sử thanh toán và nạp tiền của ví này */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#14261e]">
                    Lịch sử thanh toán và nạp tiền
                  </h4>
                  <span className="text-[10px] text-[#718579]">Giao dịch gần đây</span>
                </div>

                {isLoadingAccountTx ? (
                  <div className="py-4 text-center text-xs text-gray-400">Đang tải lịch sử thanh toán...</div>
                ) : accountTransactions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-3 text-center">Chưa có giao dịch thu/chi nào trên ví này</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 pr-1">
                    {accountTransactions.map((tx) => {
                      const isIncome = tx.transactionType === 'INCOME';
                      return (
                        <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-[#14261e] truncate">{tx.description || tx.category?.name || 'Giao dịch'}</p>
                            <span className="text-[10.5px] text-gray-500">
                              {tx.transactionDate} {tx.category?.name ? `· ${tx.category.name}` : ''}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold ${isIncome ? 'text-[#10b981]' : 'text-[#dc2626]'}`}>
                              {isIncome ? '+' : '-'}{Number(tx.amount || 0).toLocaleString('vi-VN')} đ
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-semibold">Đã ghi nhận ✓</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="mt-5 flex gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const acc = selectedAccountDetail;
                    setSelectedAccountDetail(null);
                    handleOpenEdit(acc);
                  }}
                  className="flex-1 rounded-xl border border-[#07543f] bg-[#07543f]/5 py-2.5 text-xs font-semibold text-[#07543f] hover:bg-[#07543f]/10 transition flex items-center justify-center gap-1.5"
                >
                  <FinanceIcon name="edit" size={14} />
                  Sửa ví
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAccountDetail(null)}
                  className="flex-1 rounded-xl bg-[#07543f] py-2.5 text-xs font-semibold text-white hover:bg-[#064232] transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

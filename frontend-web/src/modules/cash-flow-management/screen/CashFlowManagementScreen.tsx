import { useEffect, useMemo, useRef, useState } from 'react';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import { 
  transactionApi, 
  type TransactionItem, 
  type TransactionSummaryData, 
  type CategoryItem 
} from '../api/transactionApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import './CashFlowManagementScreen.css';

type Props = { 
  onNotify: (message: string) => void; 
  onAddTransaction: () => void;
};

export function CashFlowManagementScreen({ onNotify, onAddTransaction }: Props) {
  // Data states
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<TransactionSummaryData>({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    transactionCount: 0,
  });
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [activeTab, setActiveTab] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10'); // default Tháng 10/2026
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Custom Dropdown Open States
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryKindTab, setCategoryKindTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);



  // Delete transaction modal state
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionItem | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  // Detail transaction modal state
  const [selectedTxDetail, setSelectedTxDetail] = useState<TransactionItem | null>(null);

  // Load Categories & Accounts
  const loadMetadata = async () => {
    try {
      const [catsRes, accsRes] = await Promise.all([
        transactionApi.getCategories().catch(() => []),
        accountApi.getAccounts().catch(() => []),
      ]);
      setCategories(catsRes);
      setAccounts(accsRes);
    } catch {
      // ignore
    }
  };

  // Exporting state
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search query so users don't have to manually press Enter or wait
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Transactions with active filters
  const loadTransactions = async () => {
    try {
      setLoading(true);
      let fromDate: string | undefined = undefined;
      let toDate: string | undefined = undefined;

      if (selectedMonth !== 'ALL') {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        fromDate = `${selectedMonth}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        toDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      }

      const res = await transactionApi.getTransactions({
        page: currentPage,
        pageSize: 15,
        search: debouncedSearch || undefined,
        transactionType: activeTab === 'ALL' ? undefined : activeTab,
        categoryId: selectedCategory === 'ALL' ? undefined : selectedCategory,
        accountId: selectedAccount === 'ALL' ? undefined : selectedAccount,
        fromDate,
        toDate,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      });

      if (res && res.transactions) {
        setTransactions(res.transactions);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalItems(Number(res.pagination.totalItems) || res.transactions.length);
        }
      }
    } catch {
      onNotify('Không thể tải danh sách giao dịch từ máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [activeTab, selectedCategory, selectedAccount, selectedMonth, currentPage, debouncedSearch]);

  // Tự động tải lại giao dịch khi quay trở lại tab hoặc trang web (sau khi thêm giao dịch)
  useEffect(() => {
    const handleFocus = () => {
      loadTransactions();
      loadMetadata();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadTransactions();
      }
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab, selectedCategory, selectedAccount, selectedMonth, currentPage, debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setDebouncedSearch(searchQuery.trim());
  };

  // Xuất file Báo cáo Excel chuẩn đẹp theo đúng bộ lọc và yêu cầu thiết kế
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      onNotify('Đang chuẩn bị dữ liệu xuất báo cáo...');

      let fromDate: string | undefined = undefined;
      let toDate: string | undefined = undefined;

      if (selectedMonth !== 'ALL') {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        fromDate = `${selectedMonth}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        toDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      }

      // Lấy toàn bộ giao dịch khớp với bộ lọc (tối đa 2000 bản ghi)
      const res = await transactionApi.getTransactions({
        page: 1,
        pageSize: 2000,
        search: debouncedSearch || undefined,
        transactionType: activeTab === 'ALL' ? undefined : activeTab,
        categoryId: selectedCategory === 'ALL' ? undefined : selectedCategory,
        accountId: selectedAccount === 'ALL' ? undefined : selectedAccount,
        fromDate,
        toDate,
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      });

      const exportList = res?.transactions || [];
      if (exportList.length === 0) {
        onNotify('Không có giao dịch nào phù hợp với bộ lọc để xuất báo cáo');
        setIsExporting(false);
        return;
      }

      // Xác định tiêu đề báo cáo linh hoạt theo bộ lọc
      let baseTitle = 'BÁO CÁO THU CHI';
      let filePrefix = 'Bao_cao_thu_chi';
      if (activeTab === 'INCOME') {
        baseTitle = 'BÁO CÁO KHOẢN THU';
        filePrefix = 'Bao_cao_khoan_thu';
      } else if (activeTab === 'EXPENSE') {
        baseTitle = 'BÁO CÁO KHOẢN CHI';
        filePrefix = 'Bao_cao_khoan_chi';
      } else if (activeTab === 'TRANSFER') {
        baseTitle = 'BÁO CÁO CHUYỂN VÍ';
        filePrefix = 'Bao_cao_chuyen_vi';
      }

      let monthLabel = '';
      if (selectedMonth !== 'ALL') {
        const parts = selectedMonth.split('-');
        monthLabel = ` - THÁNG ${parts[1]}/${parts[0]}`;
      }
      const title = `${baseTitle}${monthLabel}`;

      // Tính toán tổng thu, tổng chi và thặng dư riêng biệt
      const totalIncome = exportList
        .filter((tx) => tx.transactionType === 'INCOME')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const totalExpense = exportList
        .filter((tx) => tx.transactionType === 'EXPENSE')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const totalTransfer = exportList
        .filter((tx) => tx.transactionType === 'TRANSFER')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const netBalance = totalIncome - totalExpense;
      const exportTime = new Date().toLocaleString('vi-VN');

      // Xây dựng phần tfoot chi tiết theo bộ lọc
      let footerRows = '';
      if (activeTab === 'INCOME') {
        footerRows = `
        <tr class="total-row" style="background-color: #f0fdf4;">
          <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
          <td style="text-align: right; padding-right: 8px; font-weight: bold; border: 1px solid #94a3b8; color: #166534; height: 30px; white-space: nowrap; background-color: #f0fdf4;">TỔNG KHOẢN THU:</td>
          <td class="td-amount" style="border: 1px solid #94a3b8; font-size: 11pt; color: #16a34a; font-weight: bold; background-color: #f0fdf4;">+${totalIncome}</td>
        </tr>`;
      } else if (activeTab === 'EXPENSE') {
        footerRows = `
        <tr class="total-row" style="background-color: #fef2f2;">
          <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
          <td style="text-align: right; padding-right: 8px; font-weight: bold; border: 1px solid #94a3b8; color: #991b1b; height: 30px; white-space: nowrap; background-color: #fef2f2;">TỔNG KHOẢN CHI:</td>
          <td class="td-amount" style="border: 1px solid #94a3b8; font-size: 11pt; color: #dc2626; font-weight: bold; background-color: #fef2f2;">-${totalExpense}</td>
        </tr>`;
      } else if (activeTab === 'TRANSFER') {
        footerRows = `
        <tr class="total-row" style="background-color: #f0f9ff;">
          <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
          <td style="text-align: right; padding-right: 8px; font-weight: bold; border: 1px solid #94a3b8; color: #075985; height: 30px; white-space: nowrap; background-color: #f0f9ff;">TỔNG TIỀN CHUYỂN VÍ:</td>
          <td class="td-amount" style="border: 1px solid #94a3b8; font-size: 11pt; color: #0284c7; font-weight: bold; background-color: #f0f9ff;">${totalTransfer}</td>
        </tr>`;
      } else {
        // Cả thu và chi: Cột 1-4 để trống có viền, cột 5 là Nhãn, cột 6 là Số tiền
        footerRows = `
        <tr class="total-row" style="background-color: #f8fafc;">
          <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
          <td style="text-align: right; padding-right: 8px; font-weight: bold; border: 1px solid #cbd5e1; color: #166534; height: 30px; white-space: nowrap; background-color: #f0fdf4;">TỔNG THU:</td>
          <td class="td-amount" style="border: 1px solid #cbd5e1; font-size: 11pt; color: #16a34a; font-weight: bold; background-color: #f0fdf4;">+${totalIncome}</td>
        </tr>
        <tr class="total-row" style="background-color: #f8fafc;">
          <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
          <td style="text-align: right; padding-right: 8px; font-weight: bold; border: 1px solid #cbd5e1; color: #991b1b; height: 30px; white-space: nowrap; background-color: #fef2f2;">TỔNG CHI:</td>
          <td class="td-amount" style="border: 1px solid #cbd5e1; font-size: 11pt; color: #dc2626; font-weight: bold; background-color: #fef2f2;">-${totalExpense}</td>
        </tr>
        <tr class="total-row" style="background-color: #f1f5f9;">
          <td colspan="4" style="border: 1px solid #94a3b8; background-color: #f1f5f9;"></td>
          <td style="text-align: right; padding-right: 8px; font-weight: bold; border: 1px solid #94a3b8; color: #1e3a8a; height: 32px; white-space: nowrap; background-color: #e2e8f0;">THẶNG DƯ RÒNG (THU - CHI):</td>
          <td class="td-amount" style="border: 1px solid #94a3b8; font-size: 11pt; color: ${netBalance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; background-color: #e2e8f0;">${netBalance >= 0 ? '+' : ''}${netBalance}</td>
        </tr>`;
      }

      // Tạo nội dung bảng HTML Excel với header màu xanh dương sang trọng, border rõ nét và độ rộng tối ưu
      const excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>BaoCaoChiTieu</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
    .title { font-size: 18pt; font-weight: bold; color: #1e3a8a; text-align: center; height: 40px; vertical-align: middle; }
    .subtitle { font-size: 10pt; color: #475569; text-align: center; height: 25px; }
    .th-blue { background-color: #1d4ed8; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #1e40af; height: 35px; vertical-align: middle; font-size: 11pt; }
    .td-stt { text-align: center; border: 1px solid #cbd5e1; height: 28px; vertical-align: middle; }
    .td-text { text-align: left; border: 1px solid #cbd5e1; height: 28px; vertical-align: middle; padding-left: 8px; }
    .td-center { text-align: center; border: 1px solid #cbd5e1; height: 28px; vertical-align: middle; }
    .td-amount { text-align: right; border: 1px solid #cbd5e1; height: 28px; vertical-align: middle; padding-right: 8px; font-weight: bold; mso-number-format:"\\#,##0"; }
    .total-row { background-color: #f8fafc; font-weight: bold; height: 30px; vertical-align: middle; }
  </style>
</head>
<body>
  <table>
    <!-- Hàng 1 & 2: Tiêu đề Báo cáo -->
    <tr>
      <td colspan="6" class="title">${title}</td>
    </tr>
    <tr>
      <td colspan="6" class="subtitle">Ứng dụng quản lý tài chính Finora | Ngày xuất: ${exportTime}</td>
    </tr>
    <tr><td colspan="6" style="height: 14px;"></td></tr>

    <!-- Hàng Tiêu đề Cột: Bôi màu xanh dương (#1d4ed8) nổi bật theo yêu cầu -->
    <thead>
      <tr>
        <th class="th-blue" style="width: 50px;">STT</th>
        <th class="th-blue" style="width: 280px;">GIAO DỊCH &amp; HẠNG MỤC</th>
        <th class="th-blue" style="width: 220px;">TÀI KHOẢN / NGUỒN TIỀN</th>
        <th class="th-blue" style="width: 150px;">THỜI GIAN</th>
        <th class="th-blue" style="width: 140px;">PHÂN LOẠI</th>
        <th class="th-blue" style="width: 180px;">SỐ TIỀN (VND)</th>
      </tr>
    </thead>
    <tbody>
      ${exportList.map((tx, index) => {
        const typeLabel = tx.transactionType === 'INCOME' 
          ? 'Thu nhập' 
          : tx.transactionType === 'EXPENSE' 
            ? 'Chi tiêu' 
            : 'Chuyển ví';
        const formattedAmount = tx.amount || 0;
        const desc = tx.description || (tx.transactionType === 'INCOME' ? 'Khoản thu' : tx.transactionType === 'TRANSFER' ? 'Chuyển ví' : 'Khoản chi');
        const catName = tx.category?.name ? ` (${tx.category.name})` : '';
        const accInfo = tx.accountName ? (tx.transactionType === 'TRANSFER' && tx.toAccountName ? `${tx.accountName} → ${tx.toAccountName}` : `${tx.accountName} - ${getAccountTypeLabel(tx.accountId)}`) : 'Tài khoản chính';
        const dt = formatTxDateTime(tx.transactionDate, tx.transactionTime);
        const timeDisplay = dt.time ? `${dt.date} ${dt.time}` : dt.date;

        return `
        <tr>
          <td class="td-stt">${index + 1}</td>
          <td class="td-text">${desc}${catName}</td>
          <td class="td-text">${accInfo}</td>
          <td class="td-center">${timeDisplay}</td>
          <td class="td-center">${typeLabel}</td>
          <td class="td-amount" style="color: ${tx.transactionType === 'INCOME' ? '#16a34a' : tx.transactionType === 'EXPENSE' ? '#dc2626' : '#0284c7'};">${formattedAmount}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
    <tfoot>
      ${footerRows}
    </tfoot>
  </table>
</body>
</html>
      `;

      const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timeStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `${filePrefix}_${selectedMonth !== 'ALL' ? selectedMonth : 'Tat_ca'}_${timeStamp}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onNotify(`Đã xuất thành công ${exportList.length} giao dịch ra file Báo cáo Excel!`);
    } catch {
      onNotify('Lỗi trong quá trình xuất báo cáo');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      onNotify('Vui lòng nhập tên danh mục');
      return;
    }
    try {
      setIsCreatingCat(true);
      await transactionApi.createCategory({
        name: newCatName.trim(),
        kind: categoryKindTab,
        icon: categoryKindTab === 'EXPENSE' ? '🛒' : '💰',
        color: categoryKindTab === 'EXPENSE' ? '#f43f5e' : '#10b981',
      });
      onNotify(`Đã tạo danh mục "${newCatName.trim()}" thành công!`);
      setNewCatName('');
      const updated = await transactionApi.getCategories();
      setCategories(updated);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi tạo danh mục';
      onNotify(msg);
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (cat.isSystem) {
      onNotify('Không thể xóa danh mục mặc định của hệ thống');
      return;
    }
    try {
      await transactionApi.deleteCategory(cat.id);
      onNotify(`Đã xóa danh mục "${cat.name}"`);
      const updated = await transactionApi.getCategories();
      setCategories(updated);
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Lỗi khi xóa danh mục');
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    try {
      setIsDeletingTx(true);
      await transactionApi.deleteTransaction(transactionToDelete.id, transactionToDelete.version);
      onNotify('Đã xóa giao dịch thành công!');
      setTransactionToDelete(null);
      loadTransactions();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Lỗi khi xóa giao dịch');
    } finally {
      setIsDeletingTx(false);
    }
  };

  const formatVND = (val?: number) => {
    return new Intl.NumberFormat('vi-VN').format(val || 0) + ' ₫';
  };

  const formatTxDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return { date: '--/--/----', time: '' };
    // dateStr is typically YYYY-MM-DD
    const parts = dateStr.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
    
    let formattedTime = '';
    if (timeStr) {
      const timeParts = timeStr.slice(0, 5).split(':');
      if (timeParts.length === 2) {
        const hour = parseInt(timeParts[0], 10);
        const minute = timeParts[1];
        const period = hour < 12 ? 'Sáng' : hour < 18 ? 'Chiều' : 'Tối';
        formattedTime = `${timeParts[0]}:${minute} ${period}`;
      } else {
        formattedTime = timeStr.slice(0, 5);
      }
    }
    return { date: formattedDate, time: formattedTime };
  };

  // Lấy tên loại tài khoản rõ ràng (Tiền mặt, Tài khoản ngân hàng, Ví điện tử, v.v.)
  const getAccountTypeLabel = (accId?: string, fallback = 'Ví / Nguồn tiền') => {
    if (!accId) return fallback;
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return fallback;
    switch (acc.accountType) {
      case 'CASH':
        return 'Tiền mặt';
      case 'BANK_ACCOUNT':
        return 'Tài khoản ngân hàng';
      case 'CREDIT_CARD':
        return 'Thẻ tín dụng';
      case 'E_WALLET':
        return 'Ví điện tử';
      case 'SAVINGS':
        return 'Sổ tiết kiệm';
      case 'INVESTMENT':
        return 'Tài khoản đầu tư';
      case 'CRYPTO':
        return 'Tiền điện tử';
      default:
        return 'Tài khoản tài chính';
    }
  };

  // Render icon thẻ vuông/ví điện tử bo góc mềm mại viền sắc nét theo đúng ảnh mẫu
  const renderAccountBadgeIcon = (accountName?: string, accId?: string) => {
    const acc = accounts.find((a) => a.id === accId);
    const nameLower = `${accountName || ''} ${acc?.name || ''}`.toLowerCase();
    const type = acc?.accountType;

    // Ví điện tử MoMo / ShopeePay / ZaloPay
    if (nameLower.includes('momo') || nameLower.includes('shopee') || nameLower.includes('zalo') || type === 'E_WALLET') {
      return (
        <span className="grid size-7.5 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] shadow-2xs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <rect x="7" y="8" width="5" height="4" rx="1" fill="#2563eb" fillOpacity="0.2" />
            <circle cx="15.5" cy="14" r="1.5" fill="currentColor" />
          </svg>
        </span>
      );
    }

    // Tiền mặt
    if (nameLower.includes('tiền mặt') || type === 'CASH') {
      return (
        <span className="grid size-7.5 shrink-0 place-items-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] shadow-2xs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <line x1="6" y1="12" x2="6.01" y2="12" />
            <line x1="18" y1="12" x2="18.01" y2="12" />
          </svg>
        </span>
      );
    }

    // Mặc định hoặc thẻ ngân hàng (Techcombank, Vietcombank, MB, v.v.)
    return (
      <span className="grid size-7.5 shrink-0 place-items-center rounded-lg bg-[#f0f9ff] text-[#0284c7] border border-[#e0f2fe] shadow-2xs">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2.5" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <rect x="5" y="14" width="3.5" height="2" rx="0.5" fill="#0284c7" fillOpacity="0.3" />
        </svg>
      </span>
    );
  };

  // Generate past 12 months for date filter
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push({
        key: `${y}-${m}`,
        label: `Tháng ${m}/${y}`,
      });
    }
    return list;
  }, []);

  // Deduplicate categories by normalized name & kind to prevent duplicate seeded data (e.g. 2 'Ăn uống')
  const uniqueCategories = useMemo(() => {
    return categories.filter((cat, index, self) => {
      const key = `${cat.kind}_${cat.name.trim().toLowerCase()}`;
      return index === self.findIndex((c) => `${c.kind}_${c.name.trim().toLowerCase()}` === key);
    });
  }, [categories]);

  // Only show categories matching the currently selected tab (or both if ALL)
  const availableCategories = useMemo(() => {
    if (activeTab === 'INCOME') {
      return uniqueCategories.filter((c) => c.kind === 'INCOME');
    }
    if (activeTab === 'EXPENSE') {
      return uniqueCategories.filter((c) => c.kind === 'EXPENSE');
    }
    if (activeTab === 'TRANSFER') {
      return [];
    }
    return uniqueCategories;
  }, [uniqueCategories, activeTab]);

  const filteredCategoriesForTab = useMemo(() => {
    return uniqueCategories.filter((c) => c.kind === categoryKindTab);
  }, [uniqueCategories, categoryKindTab]);

  const renderCategoryIcon = (iconName?: string, kind?: string, size = 16, categoryName?: string) => {
    const resolved = resolveCategoryIconName(iconName, kind, categoryName);
    return <FinanceIcon name={resolved} size={size} />;
  };

  return (
    <main 
      className="cashflow-management-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#f6f8f6] px-4 pb-24 pt-6 text-[#14251f] sm:px-6 lg:px-8 lg:pb-12"
      aria-label="Quản lý Thu & Chi"
    >
      {/* 2. Top Summary Ribbon */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tổng thu */}
        <div 
          className="cashflow-metric-card is-income" 
          style={{ '--card-accent': '#10b981' } as React.CSSProperties}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100">
                <FinanceIcon name="income" size={20} />
              </span>
              <div>
                <span className="text-xs font-semibold text-[#718579]">TỔNG THU NHẬP</span>
                <h3 className="text-xl font-black text-emerald-700 sm:text-2xl mt-0.5">
                  +{formatVND(summary.totalIncome)}
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              Dòng tiền vào
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#f0f4f1] pt-3 text-[11px] text-[#718579]">
            <span>Đã ghi nhận trong kỳ</span>
            <span className="font-semibold text-[#14261e]">{summary.transactionCount} giao dịch</span>
          </div>
        </div>

        {/* Tổng chi */}
        <div 
          className="cashflow-metric-card is-expense" 
          style={{ '--card-accent': '#f43f5e' } as React.CSSProperties}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm border border-rose-100">
                <FinanceIcon name="expense" size={20} />
              </span>
              <div>
                <span className="text-xs font-semibold text-[#718579]">TỔNG CHI TIÊU</span>
                <h3 className="text-xl font-black text-rose-600 sm:text-2xl mt-0.5">
                  -{formatVND(summary.totalExpense)}
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 border border-rose-200">
              Dòng tiền ra
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#f0f4f1] pt-3 text-[11px] text-[#718579]">
            <span>Tỷ lệ chi / thu</span>
            <span className="font-semibold text-rose-600">
              {summary.totalIncome > 0 ? Math.round((summary.totalExpense / summary.totalIncome) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Thặng dư ròng */}
        <div className="cashflow-metric-hero sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                THẶNG DƯ RÒNG (NET CASHFLOW)
              </span>
              <h3 className="text-2xl font-black text-white sm:text-3xl mt-1 drop-shadow-sm">
                {summary.netCashFlow >= 0 ? `+${formatVND(summary.netCashFlow)}` : `-${formatVND(Math.abs(summary.netCashFlow))}`}
              </h3>
            </div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md border border-white/20">
              {summary.netCashFlow >= 0 ? 'Thặng dư tích lũy' : 'Thâm hụt dòng tiền'}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-[11px] text-emerald-100">
            <span>Trạng thái tài chính:</span>
            <span className="font-bold text-white">
              {summary.netCashFlow >= 0 ? 'Dương tiền an toàn' : 'Cần thắt chặt chi tiêu'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Filters & Search Section */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3.5">
          {/* Hàng 1: Tabs phân loại màu xanh ngọc bên trái + Ô tìm kiếm kéo dài sát cạnh Chuyển ví tới hết */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Tab Pills - Các nút đều mang màu xanh đặc trưng như ban đầu */}
            <div className="inline-flex items-center rounded-xl bg-[#f0f5f2] p-0.5 gap-0.5 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setActiveTab('ALL'); setSelectedCategory('ALL'); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-[#07543f] text-white shadow-xs'
                    : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                }`}
              >
                <span>Tất cả</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('INCOME'); setSelectedCategory('ALL'); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'INCOME'
                    ? 'bg-[#07543f] text-white shadow-xs'
                    : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                }`}
              >
                <span>Khoản thu</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('EXPENSE'); setSelectedCategory('ALL'); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'EXPENSE'
                    ? 'bg-[#07543f] text-white shadow-xs'
                    : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                }`}
              >
                <span>Khoản chi</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('TRANSFER'); setSelectedCategory('ALL'); setCurrentPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition flex items-center justify-center whitespace-nowrap ${
                  activeTab === 'TRANSFER'
                    ? 'bg-[#07543f] text-white shadow-xs'
                    : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                }`}
              >
                <span>Chuyển ví</span>
              </button>
            </div>

            {/* Ô tìm kiếm kéo dài ngay sát sau tab Chuyển ví tới hết hàng */}
            <form 
              onSubmit={handleSearchSubmit} 
              className="relative flex-1 min-w-[180px]"
            >
              <input
                type="text"
                placeholder="Tìm theo đối tác, hạng mục, số tiền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-full rounded-xl border border-[#d5ded8] bg-[#f8faf8] pl-8 pr-14 text-[11px] font-medium text-[#14261e] placeholder:text-[#8a9e93] outline-none focus:border-[#07543f] focus:bg-white focus:ring-2 focus:ring-[#07543f]/10 transition"
              />
              <span className="absolute left-2.5 top-2.5 text-[#8a9e93]">
                <FinanceIcon name="search" size={13} />
              </span>

              <div className="absolute right-1.5 top-1 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearch('');
                      setCurrentPage(1);
                    }}
                    title="Xóa tìm kiếm"
                    className="flex size-6 items-center justify-center rounded-lg text-[#8a9e93] hover:bg-slate-200/60 hover:text-slate-700 transition"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  title="Tìm kiếm"
                  className="flex size-7 items-center justify-center rounded-lg text-[#64748b] hover:text-[#07543f] hover:bg-slate-100 transition"
                >
                  <FinanceIcon name="search" size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* Hàng 2: Các ô thả xuống chữ nhỏ gọn 10.5px, kéo dài giãn ra tới 2 nút chức năng màu xanh */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#edf2ee] lg:flex-row lg:items-center lg:justify-between">
            {/* Cụm 3 ô dropdown kéo dài chiếm đều không gian */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              {/* 1. Lọc danh mục */}
              {activeTab !== 'TRANSFER' ? (
                <div className="relative w-full" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryDropdownOpen((prev) => !prev);
                      setIsAccountDropdownOpen(false);
                      setIsMonthDropdownOpen(false);
                    }}
                    className={`flex h-7.5 w-full items-center justify-between rounded-xl border px-2.5 text-[10.5px] font-semibold transition ${
                      isCategoryDropdownOpen || selectedCategory !== 'ALL'
                        ? 'border-[#07543f] bg-[#eef7f2] text-[#07543f]'
                        : 'border-[#d5ded8] bg-[#f8faf8] text-[#475569] hover:bg-[#f1f5f9] hover:border-[#b0c2b7]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FinanceIcon name="grid" size={11} className="text-[#07543f] shrink-0" />
                      <span className="truncate">
                        Danh mục: {selectedCategory === 'ALL'
                          ? 'Tất cả'
                          : availableCategories.find((c) => c.id === selectedCategory)?.name || 'Tất cả'}
                      </span>
                    </div>
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-[#8a9e93] shrink-0 transition-transform ${isCategoryDropdownOpen ? 'rotate-180 text-[#07543f]' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Menu thả xuống */}
                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-40 w-full min-w-[190px] max-h-52 overflow-y-auto rounded-xl border border-[#d5ded8] bg-white p-1 shadow-xl animate-fadeIn">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('ALL');
                          setIsCategoryDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10.5px] transition ${
                          selectedCategory === 'ALL'
                            ? 'bg-emerald-50 font-bold text-[#07543f]'
                            : 'text-[#1e293b] hover:bg-[#f8fafc]'
                        }`}
                      >
                        <span>Tất cả danh mục</span>
                        {selectedCategory === 'ALL' && <span className="text-[#07543f]">✓</span>}
                      </button>

                      <div className="my-1 border-t border-[#edf2ee]" />

                      {availableCategories.length === 0 ? (
                        <div className="px-2.5 py-1.5 text-center text-[10.5px] text-[#94a3b8]">
                          Không có danh mục nào
                        </div>
                      ) : (
                        availableCategories.map((c) => {
                          const isSelected = selectedCategory === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(c.id);
                                setIsCategoryDropdownOpen(false);
                                setCurrentPage(1);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10.5px] transition ${
                                isSelected
                                  ? 'bg-emerald-50 font-bold text-[#07543f]'
                                  : 'text-[#1e293b] hover:bg-[#f8fafc]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="size-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: c.color || (c.kind === 'INCOME' ? '#10b981' : '#f43f5e') }}
                                />
                                <span className="truncate">{c.name}</span>
                              </div>
                              {isSelected && <span className="text-[#07543f] ml-1 shrink-0">✓</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : <div />}

              {/* 2. Lọc nguồn tiền */}
              <div className="relative w-full" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountDropdownOpen((prev) => !prev);
                    setIsCategoryDropdownOpen(false);
                    setIsMonthDropdownOpen(false);
                  }}
                  className={`flex h-7.5 w-full items-center justify-between rounded-xl border px-2.5 text-[10.5px] font-semibold transition ${
                    isAccountDropdownOpen || selectedAccount !== 'ALL'
                      ? 'border-[#07543f] bg-[#eef7f2] text-[#07543f]'
                      : 'border-[#d5ded8] bg-[#f8faf8] text-[#475569] hover:bg-[#f1f5f9] hover:border-[#b0c2b7]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FinanceIcon name="credit-card" size={11} className="text-[#07543f] shrink-0" />
                    <span className="truncate">
                      Nguồn tiền: {selectedAccount === 'ALL'
                        ? 'Tất cả'
                        : accounts.find((a) => a.id === selectedAccount)?.name || 'Tất cả'}
                    </span>
                  </div>
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-[#8a9e93] shrink-0 transition-transform ${isAccountDropdownOpen ? 'rotate-180 text-[#07543f]' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Menu thả xuống */}
                {isAccountDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 z-40 w-full min-w-[190px] max-h-52 overflow-y-auto rounded-xl border border-[#d5ded8] bg-white p-1 shadow-xl animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccount('ALL');
                        setIsAccountDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10.5px] transition ${
                        selectedAccount === 'ALL'
                          ? 'bg-emerald-50 font-bold text-[#07543f]'
                          : 'text-[#1e293b] hover:bg-[#f8fafc]'
                      }`}
                    >
                      <span>Tất cả tài khoản / Ví</span>
                      {selectedAccount === 'ALL' && <span className="text-[#07543f]">✓</span>}
                    </button>

                    <div className="my-1 border-t border-[#edf2ee]" />

                    {accounts.length === 0 ? (
                      <div className="px-2.5 py-1.5 text-center text-[10.5px] text-[#94a3b8]">
                        Không có tài khoản nào
                      </div>
                    ) : (
                      accounts.map((acc) => {
                        const isSelected = selectedAccount === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccount(acc.id);
                              setIsAccountDropdownOpen(false);
                              setCurrentPage(1);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10.5px] transition ${
                              isSelected
                                ? 'bg-emerald-50 font-bold text-[#07543f]'
                                : 'text-[#1e293b] hover:bg-[#f8fafc]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <FinanceIcon name="wallet" size={11} className="text-[#64748b] shrink-0" />
                              <span className="truncate">{acc.name}</span>
                            </div>
                            {isSelected && <span className="text-[#07543f] ml-1 shrink-0">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 3. Lọc thời gian */}
              <div className="relative w-full" ref={monthDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthDropdownOpen((prev) => !prev);
                    setIsCategoryDropdownOpen(false);
                    setIsAccountDropdownOpen(false);
                  }}
                  className={`flex h-7.5 w-full items-center justify-between rounded-xl border px-2.5 text-[10.5px] font-semibold transition ${
                    isMonthDropdownOpen || selectedMonth !== 'ALL'
                      ? 'border-[#07543f] bg-[#eef7f2] text-[#07543f]'
                      : 'border-[#d5ded8] bg-[#f8faf8] text-[#475569] hover:bg-[#f1f5f9] hover:border-[#b0c2b7]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FinanceIcon name="calendar" size={11} className="text-[#07543f] shrink-0" />
                    <span className="truncate">
                      Thời gian: {selectedMonth === 'ALL'
                        ? 'Tất cả'
                        : availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth}
                    </span>
                  </div>
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-[#8a9e93] shrink-0 transition-transform ${isMonthDropdownOpen ? 'rotate-180 text-[#07543f]' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Menu thả xuống */}
                {isMonthDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 z-40 w-full min-w-[170px] max-h-52 overflow-y-auto rounded-xl border border-[#d5ded8] bg-white p-1 shadow-xl animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth('ALL');
                        setIsMonthDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10.5px] transition ${
                        selectedMonth === 'ALL'
                          ? 'bg-emerald-50 font-bold text-[#07543f]'
                          : 'text-[#1e293b] hover:bg-[#f8fafc]'
                      }`}
                    >
                      <span>Tất cả thời gian</span>
                      {selectedMonth === 'ALL' && <span className="text-[#07543f]">✓</span>}
                    </button>

                    <div className="my-1 border-t border-[#edf2ee]" />

                    {availableMonths.map((m) => {
                      const isSelected = selectedMonth === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(m.key);
                            setIsMonthDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[10.5px] transition ${
                            isSelected
                              ? 'bg-emerald-50 font-bold text-[#07543f]'
                              : 'text-[#1e293b] hover:bg-[#f8fafc]'
                          }`}
                        >
                          <span>{m.label}</span>
                          {isSelected && <span className="text-[#07543f]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 2 Nút chức năng bên phải: đều mang màu xanh đồng bộ, chữ gọn 10.5px */}
            <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-auto">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex h-7.5 items-center gap-1.5 rounded-xl bg-[#07543f] px-2.5 text-[10.5px] font-semibold text-white shadow-xs hover:bg-[#0b6c52] transition"
              >
                <FinanceIcon name="receipt" size={12} />
                <span>Danh mục thu chi</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportExcel}
                className="inline-flex h-7.5 items-center gap-1.5 rounded-xl bg-[#07543f] px-2.5 text-[10.5px] font-semibold text-white shadow-xs hover:bg-[#0b6c52] transition disabled:opacity-60"
              >
                <FinanceIcon name={isExporting ? 'refresh' : 'download'} size={12} className={isExporting ? 'animate-spin' : ''} />
                <span>{isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Transactions Table */}
      <section className="cashflow-table-container">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center p-8 text-center text-xs text-[#718579]">
            <FinanceIcon name="refresh" size={24} className="animate-spin text-[#07543f]" />
            <span className="ml-3 font-semibold text-sm">Đang tải lịch sử thu chi...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-[#e3f4e9] text-[#07543f]">
              <FinanceIcon name="receipt" size={28} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#14261e]">Không tìm thấy giao dịch nào</h3>
            <p className="mt-1 text-xs text-[#718579] max-w-sm">
              Bạn chưa có giao dịch nào phù hợp với bộ lọc hiện tại hoặc chưa ghi chép chi tiêu.
            </p>
            <button
              type="button"
              onClick={onAddTransaction}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#07543f] px-4 text-xs font-bold text-white shadow hover:bg-[#09694e]"
            >
              <FinanceIcon name="plus" size={14} />
              Ghi chép giao dịch ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cashflow-table w-full min-w-[960px] table-fixed text-left">
              <thead className="bg-[#f8fafc] text-[11px] font-bold tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                <tr>
                  <th className="w-[26%] px-4 py-3.5">GIAO DỊCH &amp; HẠNG MỤC</th>
                  <th className="w-[20%] px-3 py-3.5">TÀI KHOẢN / NGUỒN TIỀN</th>
                  <th className="w-[14%] px-3 py-3.5">THỜI GIAN</th>
                  <th className="w-[18%] px-3 py-3.5 text-center">PHÂN LOẠI</th>
                  <th className="w-[16%] px-4 py-3.5 text-right">SỐ TIỀN</th>
                  <th className="w-[6%] px-2 py-3.5 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-xs">
                {transactions.map((tx) => {
                  const isIncome = tx.transactionType === 'INCOME';
                  const isTransfer = tx.transactionType === 'TRANSFER';
                  const dt = formatTxDateTime(tx.transactionDate, tx.transactionTime);

                  // Colors for icon box
                  const iconBg = tx.category?.color 
                    ? `${tx.category.color}20` 
                    : isIncome 
                    ? '#dcfce7' 
                    : isTransfer 
                    ? '#e0f2fe' 
                    : '#fee2e2';
                  const iconColor = tx.category?.color 
                    ? tx.category.color 
                    : isIncome 
                    ? '#15803d' 
                    : isTransfer 
                    ? '#0369a1' 
                    : '#dc2626';

                  return (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedTxDetail(tx)}
                      className="transition-colors hover:bg-[#f6faf7] cursor-pointer group"
                    >
                      {/* 1. GIAO DỊCH & HẠNG MỤC */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span 
                            className="grid size-10 shrink-0 place-items-center rounded-2xl shadow-xs transition-transform group-hover:scale-105"
                            style={{ backgroundColor: iconBg, color: iconColor }}
                          >
                            {tx.category ? (
                              renderCategoryIcon(tx.category.icon, tx.transactionType, 18, tx.category.name)
                            ) : (
                              <FinanceIcon 
                                name={isIncome ? 'income' : isTransfer ? 'arrows' : 'expense'} 
                                size={18} 
                              />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-[#0f172a] text-[13px] group-hover:text-[#07543f] transition-colors" title={tx.description || 'Giao dịch'}>
                              {tx.description || (isIncome ? 'Khoản thu' : isTransfer ? 'Chuyển tiền' : 'Khoản chi')}
                            </p>
                            <p className="text-[11px] text-[#64748b] truncate mt-0.5">
                              {tx.category?.name 
                                ? (tx.merchant?.name ? `${tx.category.name} • ${tx.merchant.name}` : tx.category.name)
                                : isIncome ? 'Thu nhập' : isTransfer ? 'Chuyển quỹ' : 'Chi tiêu'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. TÀI KHOẢN / NGUỒN TIỀN: Sát lại cột trước, hiển thị icon thẻ/ví cố định như ảnh mẫu */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {renderAccountBadgeIcon(tx.accountName, tx.accountId)}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#0f172a] text-[12.5px] truncate" title={tx.accountName}>
                              {tx.accountName}
                            </p>
                            <p className="text-[10.5px] text-[#718579] font-medium truncate mt-0.5" title={isTransfer && tx.toAccountName ? `Chuyển sang: ${tx.toAccountName}` : getAccountTypeLabel(tx.accountId)}>
                              {isTransfer && tx.toAccountName 
                                ? `→ ${tx.toAccountName}` 
                                : getAccountTypeLabel(tx.accountId)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. THỜI GIAN */}
                      <td className="px-3 py-3.5">
                        <p className="font-bold text-[#0f172a] text-[12px] leading-tight">{dt.date}</p>
                        {dt.time && (
                          <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">{dt.time}</p>
                        )}
                      </td>

                      {/* 4. PHÂN LOẠI BADGE: Không bị cắt ngắn, hiển thị rõ ràng */}
                      <td className="px-3 py-3.5 text-center">
                        {isIncome ? (
                          <span className="inline-flex max-w-full items-center justify-center gap-1 rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-bold text-[#15803d] border border-emerald-200/60 shadow-2xs">
                            <span className="text-[12px] shrink-0">↓</span>
                            <span className="truncate">Thu nhập</span>
                          </span>
                        ) : isTransfer ? (
                          <span className="inline-flex max-w-full items-center justify-center gap-1 rounded-full bg-[#e0f2fe] px-3 py-1 text-[11px] font-bold text-[#0284c7] border border-sky-200/60 shadow-2xs">
                            <span className="text-[11px] shrink-0">⇄</span>
                            <span className="truncate">Chuyển ví</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex max-w-full items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold border shadow-2xs"
                            style={{
                              backgroundColor: tx.category?.color ? `${tx.category.color}15` : '#fee2e2',
                              borderColor: tx.category?.color ? `${tx.category.color}40` : '#fca5a5',
                              color: tx.category?.color || '#dc2626'
                            }}
                            title={tx.category?.name || 'Chi tiêu'}
                          >
                            <span className="text-[12px] shrink-0">↑</span>
                            <span className="truncate">{tx.category?.name || 'Chi tiêu'}</span>
                          </span>
                        )}
                      </td>

                      {/* 5. SỐ TIỀN */}
                      <td className="px-4 py-3.5 text-right font-black text-sm">
                        <span 
                          className={`text-[14px] font-extrabold tracking-tight ${
                            isIncome 
                              ? 'text-[#16a34a]' 
                              : isTransfer 
                              ? 'text-[#0284c7]' 
                              : 'text-[#dc2626]'
                          }`}
                        >
                          {isIncome ? '+' : isTransfer ? '' : '-'}{formatVND(tx.amount)}
                        </span>
                        <p className="text-[10px] font-medium text-[#94a3b8] mt-0.5">Hoàn tất</p>
                      </td>

                      {/* 6. HÀNH ĐỘNG: Xem chi tiết & Xóa */}
                      <td className="px-2 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedTxDetail(tx)}
                            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-[#07543f] transition"
                            title="Xem chi tiết giao dịch"
                          >
                            <FinanceIcon name="eye" size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransactionToDelete(tx)}
                            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Xóa giao dịch"
                          >
                            <FinanceIcon name="delete" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <footer className="flex flex-col items-center justify-between gap-3 border-t border-[#edf2ee] bg-[#fafcfb] px-5 py-3 text-xs text-[#718579] sm:flex-row">
              <span>
                Hiển thị <strong className="text-[#14261e]">{transactions.length}</strong> trong tổng số{' '}
                <strong className="text-[#14261e]">{totalItems}</strong> giao dịch
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 rounded-lg border border-[#d5ded8] bg-white px-2.5 text-xs font-semibold text-[#495b50] hover:bg-[#f1f5f2] disabled:opacity-40"
                  >
                    ‹ Trước
                  </button>
                  <span className="px-2 font-bold text-[#14261e]">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 rounded-lg border border-[#d5ded8] bg-white px-2.5 text-xs font-semibold text-[#495b50] hover:bg-[#f1f5f2] disabled:opacity-40"
                  >
                    Sau ›
                  </button>
                </div>
              )}
            </footer>
          </div>
        )}
      </section>

      {/* 5. Custom Category Management Drawer/Modal */}
      {isCategoryModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div 
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-[#e2eae4] max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#edf2ee] pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-[#07543f] border border-emerald-100 shadow-xs">
                  <FinanceIcon name="receipt" size={20} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#14261e]">Danh mục Thu &amp; Chi</h2>
                  <p className="text-xs text-[#718579]">Tùy biến và quản lý các danh mục phân loại giao dịch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Segmented Tabs: Chi tiêu / Thu nhập */}
            <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[#f1f5f2] p-1">
              <button
                type="button"
                onClick={() => setCategoryKindTab('EXPENSE')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                  categoryKindTab === 'EXPENSE'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-[#63756b] hover:text-[#14261e]'
                }`}
              >
                <span className="size-2 rounded-full bg-rose-500" />
                <span>Khoản chi ({categories.filter((c) => c.kind === 'EXPENSE').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryKindTab('INCOME')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                  categoryKindTab === 'INCOME'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-[#63756b] hover:text-[#14261e]'
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Khoản thu ({categories.filter((c) => c.kind === 'INCOME').length})</span>
              </button>
            </div>

            {/* Create new category form */}
            <form onSubmit={handleCreateCategory} className="mt-4 rounded-2xl bg-[#f8faf8] p-3.5 border border-[#e5ede7]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#14261e]">
                  Tạo danh mục {categoryKindTab === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'} mới
                </span>
                <span className="text-[10px] text-[#718579]">
                  {categoryKindTab === 'EXPENSE' ? '🛒 Icon mặc định' : '💰 Icon mặc định'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    categoryKindTab === 'EXPENSE'
                      ? 'Ví dụ: Nuôi thú cưng, Quỹ hiếu hỷ...'
                      : 'Ví dụ: Cổ tức chứng khoán, Thuê nhà...'
                  }
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="h-9 flex-1 rounded-xl border border-[#d5ded8] bg-white px-3 text-xs outline-none focus:border-[#07543f] focus:ring-1 focus:ring-[#07543f] transition"
                />
                <button
                  type="submit"
                  disabled={isCreatingCat}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#07543f] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#0b6c52] disabled:opacity-50 transition"
                >
                  <FinanceIcon name="plus" size={13} />
                  <span>{isCreatingCat ? 'Đang tạo...' : 'Thêm'}</span>
                </button>
              </div>
            </form>

            {/* Category list */}
            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#718579]">
                  Danh sách ({filteredCategoriesForTab.length})
                </span>
                <span className="text-[10px] text-[#8fa296]">
                  * Danh mục hệ thống không thể xóa
                </span>
              </div>

              {filteredCategoriesForTab.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Chưa có danh mục nào trong mục này.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredCategoriesForTab.map((cat) => (
                    <div
                      key={cat.id}
                      className="group flex items-center justify-between rounded-xl border border-[#e5ece7] bg-white px-3 py-2.5 shadow-2xs hover:border-[#b8cfc1] hover:bg-[#fafcfa] transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="grid size-8 place-items-center rounded-xl shrink-0"
                          style={{
                            backgroundColor: cat.color ? `${cat.color}15` : '#f0f5f2',
                            color: cat.color || (cat.kind === 'INCOME' ? '#10b981' : '#f43f5e'),
                            border: `1px solid ${cat.color ? `${cat.color}35` : '#d9e4dd'}`,
                          }}
                        >
                          {renderCategoryIcon(cat.icon, cat.kind, 16, cat.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#14261e]" title={cat.name}>
                            {cat.name}
                          </p>
                          <span className="text-[9.5px] text-[#86978e]">
                            {cat.isSystem ? 'Hệ thống' : 'Người dùng'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {cat.isSystem ? (
                          <span className="rounded-md bg-[#edf4f0] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#52665a]">
                            Mặc định
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="grid size-6.5 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Xóa danh mục này"
                          >
                            <FinanceIcon name="delete" size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-end border-t border-[#edf2ee] pt-3.5">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="h-9 rounded-xl bg-gray-100 px-5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Delete Transaction Modal */}
      {transactionToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeletingTx && setTransactionToDelete(null)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <FinanceIcon name="delete" size={22} />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#14261e]">Xóa giao dịch này?</h3>
                <p className="text-xs text-[#718579] mt-0.5">Số dư tài khoản liên quan sẽ được tự động hoàn lại</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#fafbfa] p-3.5 border border-[#edf2ee]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#718579]">Mô tả:</span>
                <span className="font-bold text-[#14261e] truncate max-w-[180px]">
                  {transactionToDelete.description || 'Giao dịch'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-[#718579]">Số tiền:</span>
                <span className="font-bold text-rose-600">{formatVND(transactionToDelete.amount)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-[#718579]">Tài khoản:</span>
                <span className="font-semibold text-[#14261e]">{transactionToDelete.accountName}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingTx}
                onClick={() => setTransactionToDelete(null)}
                className="h-9 rounded-xl border border-[#d5ded8] bg-white px-4 text-xs font-semibold text-[#495b50] hover:bg-[#f1f5f2] disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingTx}
                onClick={confirmDeleteTransaction}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingTx ? (
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

      {/* 7. Custom Transaction Detail Modal (Xem chi tiết giao dịch) */}
      {selectedTxDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedTxDetail(null)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#e2eae4] max-h-[90vh] flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#edf2ee] pb-4">
              <div className="flex items-center gap-3">
                <span 
                  className="grid size-12 shrink-0 place-items-center rounded-2xl shadow-xs"
                  style={{
                    backgroundColor: selectedTxDetail.category?.color 
                      ? `${selectedTxDetail.category.color}20` 
                      : selectedTxDetail.transactionType === 'INCOME' 
                      ? '#dcfce7' 
                      : selectedTxDetail.transactionType === 'TRANSFER' 
                      ? '#e0f2fe' 
                      : '#fee2e2',
                    color: selectedTxDetail.category?.color 
                      ? selectedTxDetail.category.color 
                      : selectedTxDetail.transactionType === 'INCOME' 
                      ? '#15803d' 
                      : selectedTxDetail.transactionType === 'TRANSFER' 
                      ? '#0369a1' 
                      : '#dc2626'
                  }}
                >
                  {selectedTxDetail.category ? (
                    renderCategoryIcon(selectedTxDetail.category.icon, selectedTxDetail.transactionType, 22, selectedTxDetail.category.name)
                  ) : (
                    <FinanceIcon 
                      name={selectedTxDetail.transactionType === 'INCOME' ? 'income' : selectedTxDetail.transactionType === 'TRANSFER' ? 'arrows' : 'expense'} 
                      size={22} 
                    />
                  )}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#14261e]">Chi tiết giao dịch</h3>
                  <p className="text-xs text-[#718579]">
                    Mã GD: <span className="font-mono text-[#475569]">{selectedTxDetail.id.slice(0, 13)}...</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxDetail(null)}
                className="grid size-8 place-items-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Số tiền nổi bật */}
            <div className="my-5 rounded-2xl bg-[#fafcfa] border border-[#e5eee8] p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#718579]">Số tiền giao dịch</span>
              <div 
                className={`mt-1 text-3xl font-black tracking-tight ${
                  selectedTxDetail.transactionType === 'INCOME' 
                    ? 'text-emerald-700' 
                    : selectedTxDetail.transactionType === 'TRANSFER' 
                    ? 'text-sky-600' 
                    : 'text-rose-600'
                }`}
              >
                {selectedTxDetail.transactionType === 'INCOME' ? '+' : selectedTxDetail.transactionType === 'TRANSFER' ? '' : '-'}
                {formatVND(selectedTxDetail.amount)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold bg-white border border-[#dce6e0] text-[#14261e]">
                  {selectedTxDetail.transactionType === 'INCOME' 
                    ? 'Thu nhập' 
                    : selectedTxDetail.transactionType === 'TRANSFER' 
                    ? 'Chuyển ví' 
                    : 'Chi tiêu'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  ✓ Đã ghi sổ
                </span>
              </div>
            </div>

            {/* Bảng thông tin chi tiết */}
            <div className="divide-y divide-[#edf2ee] text-xs">
              {/* Mô tả / Tiêu đề */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#718579] font-medium">Mô tả / Đối tác:</span>
                <span className="font-bold text-[#14261e] text-right max-w-[260px] break-words">
                  {selectedTxDetail.description || 'Giao dịch thông thường'}
                </span>
              </div>

              {/* Hạng mục */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#718579] font-medium">Hạng mục:</span>
                <span className="font-semibold text-[#14261e] flex items-center gap-1.5">
                  {selectedTxDetail.category ? (
                    <>
                      <span className="size-2 rounded-full" style={{ backgroundColor: selectedTxDetail.category.color || '#07543f' }} />
                      <span>{selectedTxDetail.category.name}</span>
                    </>
                  ) : (
                    <span>Chung / Không phân loại</span>
                  )}
                </span>
              </div>

              {/* Tài khoản nguồn */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#718579] font-medium">Tài khoản / Ví trích tiền:</span>
                <div className="text-right">
                  <p className="font-bold text-[#14261e]">{selectedTxDetail.accountName}</p>
                  <p className="text-[11px] text-[#718579] font-medium">{getAccountTypeLabel(selectedTxDetail.accountId)}</p>
                </div>
              </div>

              {/* Tài khoản đích nếu là Chuyển ví */}
              {selectedTxDetail.transactionType === 'TRANSFER' && selectedTxDetail.toAccountName && (
                <div className="py-2.5 flex items-center justify-between bg-sky-50/50 px-2 rounded-lg">
                  <span className="text-sky-800 font-medium">Tài khoản đích nhận:</span>
                  <div className="text-right">
                    <p className="font-bold text-sky-900">{selectedTxDetail.toAccountName}</p>
                    <p className="text-[11px] text-sky-700">{getAccountTypeLabel(selectedTxDetail.toAccountId)}</p>
                  </div>
                </div>
              )}

              {/* Thời gian giao dịch */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#718579] font-medium">Thời gian thực hiện:</span>
                <span className="font-bold text-[#14261e]">
                  {formatTxDateTime(selectedTxDetail.transactionDate, selectedTxDetail.transactionTime).date}
                  {selectedTxDetail.transactionTime ? ` • ${selectedTxDetail.transactionTime}` : ''}
                </span>
              </div>

              {/* Ghi chú nếu có */}
              {selectedTxDetail.note && (
                <div className="py-2.5 flex flex-col gap-1">
                  <span className="text-[#718579] font-medium">Ghi chú bổ sung:</span>
                  <p className="p-2.5 rounded-xl bg-[#fafafa] border border-[#f0f0f0] text-[#334155] whitespace-pre-wrap">
                    {selectedTxDetail.note}
                  </p>
                </div>
              )}
            </div>

            {/* Nút tác vụ dưới cùng */}
            <div className="mt-6 flex items-center justify-between pt-3 border-t border-[#edf2ee]">
              <button
                type="button"
                onClick={() => {
                  const tx = selectedTxDetail;
                  setSelectedTxDetail(null);
                  setTransactionToDelete(tx);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                <FinanceIcon name="delete" size={14} />
                <span>Xóa giao dịch</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTxDetail(null)}
                className="h-9 rounded-xl bg-[#07543f] px-5 text-xs font-bold text-white hover:bg-[#0b6c52] transition shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

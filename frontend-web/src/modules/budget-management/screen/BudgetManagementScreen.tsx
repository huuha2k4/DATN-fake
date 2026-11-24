import { useEffect, useState, useMemo } from 'react';
import { FinanceIcon, resolveCategoryIconName, type IconName } from '../../core/components/FinanceIcon';
import { ConfirmDeleteModal } from '../../core/components/ConfirmDeleteModal';
import { subscribeFinAiActionCompleted } from '../../core/utils/finaiSyncEvents';
import { budgetApi, type BudgetResponse, type BudgetItemResponse } from '../api/budgetApi';
import { transactionApi, type CategoryItem, type TransactionItem } from '../../cash-flow-management/api/transactionApi';
import './BudgetManagementScreen.css';

type Props = { onNotify: (message: string) => void };

// Định dạng thanh tiến độ phần trăm
function ProgressBar({ percent, color = 'bg-[#007F53]', height = 'h-2' }: { percent: number; color?: string; height?: string }) {
  const bounded = Math.min(100, Math.max(0, percent));
  return (
    <div className={`relative w-full ${height} overflow-hidden rounded-full bg-[#e2e8f0] budget-progress-track`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${bounded}%` }} />
    </div>
  );
}

export function BudgetManagementScreen({ onNotify }: Props) {
  const [currentBudget, setCurrentBudget] = useState<BudgetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'safe' | 'warning' | 'exceeded'>('all');
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Tháng đang chọn để quản lý ngân sách
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal Thêm ngân sách (chuẩn 2 chế độ như bản App: Gộp danh mục & Bảng cả tháng)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'grouped' | 'batch'>('grouped');
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newThreshold, setNewThreshold] = useState('80');
  const [batchAmounts, setBatchAmounts] = useState<{ [catId: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown chọn tháng
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Modal Mẫu ngân sách tài chính (Quy tắc 50/30/20 & 6 Chiếc Hũ)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateIncome, setTemplateIncome] = useState<string>('15.000.000');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<'50_30_20' | '6_JARS'>('50_30_20');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Modal Xem chi tiết / Sửa / Xóa 1 hạn mức danh mục
  const [selectedItem, setSelectedItem] = useState<BudgetItemResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editThreshold, setEditThreshold] = useState('80');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Lịch sử giao dịch chi tiêu thực tế thuộc ngân sách
  const [itemTransactions, setItemTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // Modal xác nhận xóa ngân sách (Custom modal)
  const [budgetItemToDelete, setBudgetItemToDelete] = useState<BudgetItemResponse | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Danh sách các tháng để chọn: gồm các tháng tới (2-3 tháng tới để lập ngân sách trước) và các tháng quá khứ
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    // 3 tháng tới (ví dụ đang tháng 10 thì có tháng 11, tháng 12, tháng 1 năm sau)
    for (let i = 3; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push({
        key: `${y}-${m}`,
        label: `Tháng ${m}/${y}`,
      });
    }
    // Tháng hiện tại và 12 tháng trước đó
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

  // Tải ngân sách của tháng đang chọn
  const loadBudgetForSelectedMonth = async () => {
    try {
      setIsLoading(true);
      const [yStr, mStr] = selectedMonth.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);

      const res = await budgetApi.getBudgets({ year, month });
      const found = res.budgets && res.budgets.length > 0 ? res.budgets[0] : null;

      if (found) {
        // Lấy chi tiết có danh sách từng items
        const detail = await budgetApi.getBudgetById(found.id);
        setCurrentBudget(detail);
      } else {
        setCurrentBudget(null);
      }
    } catch {
      onNotify('Không thể tải dữ liệu ngân sách');
    } finally {
      setIsLoading(false);
    }
  };

  // Tải danh mục chi tiêu của user
  const loadCategories = async () => {
    try {
      const cats = await transactionApi.getCategories('EXPENSE');
      setCategories(cats || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadBudgetForSelectedMonth();
  }, [selectedMonth]);

  useEffect(() => {
    loadCategories();
    const unsubscribeFinAi = subscribeFinAiActionCompleted(() => {
      loadBudgetForSelectedMonth();
      loadCategories();
    });
    return () => unsubscribeFinAi();
  }, []);

  // Lấy các item con (các ngân sách nhỏ của từng danh mục)
  const budgetItems = useMemo(() => {
    return currentBudget?.items || [];
  }, [currentBudget]);

  // Lọc các item theo bộ lọc trạng thái (Tất cả, An toàn, Cảnh báo, Vượt hạn mức)
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'safe') {
      return budgetItems.filter((i) => (i.percentageUsed || 0) < 80);
    }
    if (selectedFilter === 'warning') {
      return budgetItems.filter((i) => (i.percentageUsed || 0) >= 80 && (i.percentageUsed || 0) <= 100);
    }
    if (selectedFilter === 'exceeded') {
      return budgetItems.filter((i) => (i.percentageUsed || 0) > 100);
    }
    return budgetItems;
  }, [budgetItems, selectedFilter]);

  // Danh mục chưa được thiết lập ngân sách trong tháng này
  const unconfiguredCategories = useMemo(() => {
    const configuredCatIds = new Set(budgetItems.map((item) => item.category?.id || item.categoryId));
    return categories.filter((c) => !configuredCatIds.has(c.id));
  }, [categories, budgetItems]);

  // Mở modal thêm hạn mức
  const handleOpenAddModal = () => {
    setSelectedCatIds([]);
    setCreateMode('grouped');
    setNewBudgetName('');
    setNewAmount('');
    setNewThreshold('80');
    setBatchAmounts({});
    setIsAddModalOpen(true);
  };

  // Toggle chọn danh mục
  const handleToggleCategory = (catId: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // Chọn tất cả danh mục
  const handleSelectAllCategories = () => {
    setSelectedCatIds(categories.map((c) => c.id));
  };

  // Bỏ chọn tất cả danh mục
  const handleDeselectAllCategories = () => {
    setSelectedCatIds([]);
  };

  // Submit thêm hạn mức danh mục (Hỗ trợ cả Grouped & Batch Setup chuẩn như App)
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [yStr, mStr] = selectedMonth.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);

    if (createMode === 'grouped') {
      const amtNum = parseFloat(newAmount.replace(/\D/g, ''));
      if (selectedCatIds.length === 0) {
        onNotify('Vui lòng chọn ít nhất 1 danh mục chi tiêu');
        return;
      }
      if (!amtNum || amtNum <= 0) {
        onNotify('Vui lòng nhập số tiền hạn mức hợp lệ (> 0)');
        return;
      }

      try {
        setIsSubmitting(true);
        const perCategoryAmount = Math.round(amtNum / selectedCatIds.length);
        let successCount = 0;

        for (const catId of selectedCatIds) {
          const cat = categories.find((c) => c.id === catId);
          const itemName = newBudgetName.trim()
            ? (selectedCatIds.length > 1 ? `${newBudgetName.trim()} - ${cat?.name}` : newBudgetName.trim())
            : (cat?.name || 'Ngân sách danh mục');

          await budgetApi.addCategoryBudgetForMonth({
            year,
            month,
            categoryId: catId,
            name: itemName,
            amount: perCategoryAmount,
            alertThresholdPercentage: parseInt(newThreshold, 10) || 80,
          });
          successCount++;
        }

        onNotify(
          selectedCatIds.length > 1
            ? `Đã thiết lập hạn mức cho ${selectedCatIds.length} danh mục thành công!`
            : 'Đã thêm ngân sách cho danh mục thành công!'
        );
        setIsAddModalOpen(false);
        loadBudgetForSelectedMonth();
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Thêm ngân sách thất bại. Vui lòng thử lại';
        onNotify(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Chế độ Batch (Bảng cả tháng)
      const validEntries = Object.entries(batchAmounts).filter(([_, str]) => {
        const n = Number(str.replace(/\D/g, ''));
        return n > 0;
      });

      if (validEntries.length === 0) {
        onNotify('Vui lòng nhập số tiền cho ít nhất 1 danh mục chi tiêu');
        return;
      }

      try {
        setIsSubmitting(true);
        let count = 0;
        for (const [catId, str] of validEntries) {
          const cat = categories.find((c) => c.id === catId);
          const amount = Number(str.replace(/\D/g, ''));
          await budgetApi.addCategoryBudgetForMonth({
            year,
            month,
            categoryId: catId,
            name: cat?.name || 'Ngân sách danh mục',
            amount,
            alertThresholdPercentage: 80,
          });
          count++;
        }

        onNotify(`Đã thiết lập ngân sách cho ${count} danh mục chi tiêu!`);
        setIsAddModalOpen(false);
        setBatchAmounts({});
        loadBudgetForSelectedMonth();
      } catch (err: any) {
        onNotify(err.response?.data?.message || 'Không thể lưu ngân sách.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Tính tổng số tiền ngân sách nhập theo batch
  const totalBatchAmount = useMemo(() => {
    return Object.values(batchAmounts).reduce((sum, str) => {
      const num = Number(str.replace(/\D/g, '')) || 0;
      return sum + num;
    }, 0);
  }, [batchAmounts]);

  // Tính toán số tiền mẫu phân bổ tài chính
  const incomeNumber = useMemo(() => {
    return Number(templateIncome.replace(/\D/g, '')) || 0;
  }, [templateIncome]);

  const templateAllocations = useMemo(() => {
    if (selectedTemplateKey === '50_30_20') {
      return [
        { name: 'Ăn uống', percent: 25, amount: Math.round(incomeNumber * 0.25), icon: 'utensils' as IconName, color: '#EF4444', group: '50% Nhu cầu thiết yếu' },
        { name: 'Sinh hoạt & Hóa đơn', percent: 15, amount: Math.round(incomeNumber * 0.15), icon: 'home' as IconName, color: '#10B981', group: '50% Nhu cầu thiết yếu' },
        { name: 'Di chuyển & Xăng xe', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'car' as IconName, color: '#0EA5E9', group: '50% Nhu cầu thiết yếu' },
        { name: 'Mua sắm cá nhân', percent: 15, amount: Math.round(incomeNumber * 0.15), icon: 'shopping-bag' as IconName, color: '#8B5CF6', group: '30% Mong muốn cá nhân' },
        { name: 'Giải trí & Du lịch', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'film' as IconName, color: '#F59E0B', group: '30% Mong muốn cá nhân' },
        { name: 'Sức khỏe & Khác', percent: 5, amount: Math.round(incomeNumber * 0.05), icon: 'heart' as IconName, color: '#EC4899', group: '30% Mong muốn cá nhân' },
      ];
    }
    return [
      { name: 'Chi tiêu thiết yếu (Ăn uống, nhà cửa, xăng xe)', percent: 55, amount: Math.round(incomeNumber * 0.55), icon: 'home' as IconName, color: '#EF4444', group: 'Hũ 1: Thiết yếu (NEC - 55%)' },
      { name: 'Tiết kiệm dài hạn (Mua xe, mua nhà, dự phòng)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'coin-stack' as IconName, color: '#10B981', group: 'Hũ 2: Tiết kiệm dài hạn (LTSS - 10%)' },
      { name: 'Tự do tài chính (Đầu tư, kinh doanh sinh lời)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'chart' as IconName, color: '#007F53', group: 'Hũ 3: Tự do tài chính (FFA - 10%)' },
      { name: 'Giáo dục & Học tập (Sách vở, khóa học, kỹ năng)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'book' as IconName, color: '#0EA5E9', group: 'Hũ 4: Giáo dục (EDUC - 10%)' },
      { name: 'Hưởng thụ cá nhân (Mua sắm, ăn ngon, du lịch)', percent: 10, amount: Math.round(incomeNumber * 0.10), icon: 'shopping-bag' as IconName, color: '#8B5CF6', group: 'Hũ 5: Hưởng thụ (PLAY - 10%)' },
      { name: 'Cho đi & Từ thiện (Quà tặng, giúp đỡ gia đình)', percent: 5, amount: Math.round(incomeNumber * 0.05), icon: 'gift' as IconName, color: '#F59E0B', group: 'Hũ 6: Cho đi (GIVE - 5%)' },
    ];
  }, [incomeNumber, selectedTemplateKey]);

  // Áp dụng mẫu phân bổ vào ngân sách tháng
  const handleApplyTemplate = async () => {
    if (incomeNumber <= 0) {
      onNotify('Vui lòng nhập số tiền thu nhập dự kiến');
      return;
    }
    try {
      setIsApplyingTemplate(true);
      const [yStr, mStr] = selectedMonth.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);

      for (let i = 0; i < templateAllocations.length; i++) {
        const alloc = templateAllocations[i];
        const matched =
          categories.find(
            (c) =>
              c.name.toLowerCase().includes(alloc.name.toLowerCase()) ||
              alloc.name.toLowerCase().includes(c.name.toLowerCase())
          ) || categories[i % categories.length];

        if (matched) {
          await budgetApi.addCategoryBudgetForMonth({
            year,
            month,
            categoryId: matched.id,
            name: alloc.name,
            amount: alloc.amount,
            alertThresholdPercentage: 80,
          });
        }
      }

      onNotify(`Đã áp dụng mẫu ngân sách thành công cho tháng ${month}/${year}!`);
      setIsTemplateModalOpen(false);
      loadBudgetForSelectedMonth();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Không thể áp dụng mẫu ngân sách.');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Mở modal chi tiết
  const handleOpenDetail = async (item: BudgetItemResponse) => {
    setSelectedItem(item);
    setIsEditing(false);
    setEditName(item.name || item.category?.name || item.categoryName || '');
    setEditAmount((item.amount || 0).toLocaleString('vi-VN'));
    setEditThreshold(String(item.alertThresholdPercentage || 80));
    setItemTransactions([]);

    // Tải các giao dịch chi tiêu thuộc danh mục ngân sách này trong tháng đang chọn
    const catId = item.category?.id || item.categoryId;
    if (catId) {
      try {
        setIsLoadingTx(true);
        const [yStr, mStr] = selectedMonth.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10);
        const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const txRes = await transactionApi.getTransactions({
          categoryId: catId,
          transactionType: 'EXPENSE',
          fromDate,
          toDate,
          pageSize: 50,
        });

        const list = txRes.transactions || (txRes as any)?.data?.transactions || [];
        setItemTransactions(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Lỗi tải giao dịch ngân sách:', e);
        setItemTransactions([]);
      } finally {
        setIsLoadingTx(false);
      }
    }
  };

  // Lưu chỉnh sửa ngân sách danh mục
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBudget || !selectedItem) return;
    const amtNum = parseFloat(editAmount.replace(/\D/g, ''));
    if (!amtNum || amtNum <= 0) {
      onNotify('Vui lòng nhập số tiền hạn mức hợp lệ (> 0)');
      return;
    }

    try {
      setIsSavingEdit(true);
      await budgetApi.updateBudgetItem(currentBudget.id, selectedItem.id, {
        name: editName.trim() || undefined,
        amount: amtNum,
        alertThresholdPercentage: parseInt(editThreshold, 10) || 80,
      });

      onNotify('Đã cập nhật ngân sách thành công!');
      setIsEditing(false);
      setSelectedItem(null);
      loadBudgetForSelectedMonth();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Cập nhật ngân sách thất bại';
      onNotify(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Mở popup xác nhận xóa 1 hạn mức danh mục
  const handleDeleteItem = (item: BudgetItemResponse) => {
    setBudgetItemToDelete(item);
  };

  // Xác nhận xóa ngân sách
  const confirmDeleteBudgetItem = async () => {
    if (!currentBudget || !budgetItemToDelete) return;
    setIsDeletingItem(true);
    const displayName = budgetItemToDelete.name || budgetItemToDelete.category?.name || budgetItemToDelete.categoryName;
    try {
      await budgetApi.deleteBudgetItem(currentBudget.id, budgetItemToDelete.id);
      onNotify(`Đã xóa ngân sách "${displayName}" thành công!`);
      setBudgetItemToDelete(null);
      setSelectedItem(null);
      loadBudgetForSelectedMonth();
    } catch {
      onNotify('Xóa ngân sách thất bại');
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Tổng hợp số liệu tháng hiện tại
  const totalBudgeted = currentBudget?.totalAmount || 0;
  const totalSpent = currentBudget?.spentAmount || 0;
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  // Lấy icon hợp lệ đồng nhất cho danh mục
  const getCategoryIcon = (iconName?: string, categoryName?: string): IconName => {
    return resolveCategoryIconName(iconName, 'EXPENSE', categoryName);
  };

  // Lấy màu sắc nguyên bản của danh mục (hoặc fallback theo tên/icon nếu chưa có)
  const getCategoryTheme = (itemOrCat: BudgetItemResponse | CategoryItem) => {
    const rawColor =
      ('category' in itemOrCat && itemOrCat.category?.color) ||
      ('categoryColor' in itemOrCat && itemOrCat.categoryColor) ||
      ('color' in itemOrCat && itemOrCat.color) ||
      categories.find((c) => c.id === ('category' in itemOrCat ? (itemOrCat.category?.id || itemOrCat.categoryId) : itemOrCat.id))?.color;

    if (rawColor) {
      return {
        color: rawColor,
        bgLight: `${rawColor}15`,
        bgDark: `${rawColor}22`,
        border: `${rawColor}40`,
      };
    }

    // Bảng màu mặc định phong phú theo loại danh mục (Ăn uống, Đi lại, Hóa đơn, Mua sắm, v.v.)
    const name = (
      ('category' in itemOrCat && itemOrCat.category?.name) ||
      ('categoryName' in itemOrCat && itemOrCat.categoryName) ||
      itemOrCat.name ||
      ''
    ).toLowerCase();

    if (name.includes('uống') || name.includes('ăn')) {
      return { color: '#f59e0b', bgLight: '#fef3c7', bgDark: '#3b2507', border: '#784d12' }; // Vàng cam ấm
    }
    if (name.includes('đi lại') || name.includes('xe') || name.includes('xăng')) {
      return { color: '#06b6d4', bgLight: '#cffafe', bgDark: '#083344', border: '#155e75' }; // Xanh cyan / ngọc biển
    }
    if (name.includes('hóa đơn') || name.includes('tiện ích') || name.includes('điện') || name.includes('nước')) {
      return { color: '#3b82f6', bgLight: '#dbeafe', bgDark: '#172554', border: '#1e40af' }; // Xanh dương
    }
    if (name.includes('mua sắm') || name.includes('shop')) {
      return { color: '#ec4899', bgLight: '#fce7f3', bgDark: '#500724', border: '#9d174d' }; // Hồng tím
    }
    if (name.includes('nhà') || name.includes('thuê')) {
      return { color: '#8b5cf6', bgLight: '#ede9fe', bgDark: '#2e1065', border: '#5b21b6' }; // Tím
    }
    if (name.includes('sức khỏe') || name.includes('y tế') || name.includes('thuốc')) {
      return { color: '#ef4444', bgLight: '#fee2e2', bgDark: '#450a0a', border: '#991b1b' }; // Đỏ
    }
    return { color: '#10b981', bgLight: '#d1fae5', bgDark: '#064e3b', border: '#007F53' }; // Xanh ngọc
  };

  return (
    <main className="budget-management-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#F8FAFC] px-3 pb-24 pt-4 text-[#0F172A] sm:gap-6 sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-6" aria-label="Quản lý ngân sách">

      {/* 4 Cards thống kê tổng quan của tháng đang chọn */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thống kê ngân sách">
        {/* Card 1: Tổng hạn mức tháng */}
        <article className="budget-stat-card flex min-h-[135px] flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Tổng Ngân Sách Tháng</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                {totalBudgeted.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#64748B]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#eaf0fb] text-[#2563eb]">
              <FinanceIcon name="wallet" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Đã phân bổ cho <strong className="text-[#0F172A]">{budgetItems.length}</strong> danh mục chi tiêu
          </p>
        </article>

        {/* Card 2: Đã sử dụng thực tế */}
        <article className="budget-stat-card flex min-h-[135px] flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Đã Sử Dụng Thực Tế</p>
              <p className="budget-spent-amount mt-1 text-2xl font-bold text-[#dc2626]">
                {totalSpent.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#64748B]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#fef2f2] text-[#dc2626]">
              <FinanceIcon name="chart" size={20} />
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-[#64748B]">
              <span>Tỷ lệ sử dụng</span>
              <span className="font-semibold text-[#dc2626]">{overallPercent}%</span>
            </div>
            <ProgressBar percent={overallPercent} color={overallPercent > 100 ? 'bg-[#dc2626]' : overallPercent >= 80 ? 'bg-[#f59e0b]' : 'bg-[#007F53]'} />
          </div>
        </article>

        {/* Card 3: Số dư khả dụng còn lại */}
        <article className="budget-stat-card flex min-h-[135px] flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Còn Lại Khả Dụng</p>
              <p className={`budget-remaining-amount mt-1 text-2xl font-bold ${totalRemaining >= 0 ? 'text-[#16a34a] is-safe' : 'text-[#dc2626] is-over'}`}>
                {totalRemaining.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#64748B]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#f0fdf4] text-[#16a34a]">
              <FinanceIcon name="shield" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#16a34a]">
            {totalRemaining >= 0 ? '✓ Nằm trong tầm kiểm soát' : '⚠ Đã chi tiêu vượt hạn mức'}
          </p>
        </article>

        {/* Card 4: Trạng thái cảnh báo */}
        <article className="budget-hero-alert-card flex min-h-[135px] flex-col justify-between rounded-2xl bg-gradient-to-br from-[#063d31] via-[#007F53] to-[#063d31] p-5 text-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#a8ebca]">Cảnh Báo Thông Minh</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {budgetItems.filter((i) => (i.percentageUsed || 0) > 100).length} Vượt mức
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-[#a8ebca]">
              <FinanceIcon name="spark" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#d1fae5]">
            {budgetItems.filter((i) => (i.percentageUsed || 0) >= 80 && (i.percentageUsed || 0) <= 100).length} danh mục cần chú ý (≥80%)
          </p>
        </article>
      </section>

      {/* Thanh công cụ: Chọn tháng, Bộ lọc & Nút Thêm ngân sách */}
      <section className="flex flex-col gap-4" aria-label="Danh sách hạn mức ngân sách">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          {/* Trái: Tiêu đề gọn gàng giống App */}
          <div className="shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">Ngân Sách Chi Tiêu</h2>
            <p className="text-[11px] text-[#64748B]">Định mức theo từng danh mục</p>
          </div>

          {/* Phải: Cụm bộ lọc, Chọn tháng (ở giữa), Nút Thêm ngân sách */}
          <div className="flex flex-nowrap items-center gap-2 py-0.5">
            {/* Bộ lọc trạng thái kiểu pill xanh chuẩn theme */}
            <div className="budget-filter-box inline-flex h-9 shrink-0 items-center rounded-xl bg-[#F1F5F9] p-1 gap-1">
              {([
                ['all', 'Tất cả'],
                ['safe', 'An toàn'],
                ['warning', 'Chú ý'],
                ['exceeded', 'Vượt hạn mức'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSelectedFilter(val)}
                  className={`h-full rounded-lg px-2.5 text-xs font-bold transition flex items-center justify-center whitespace-nowrap ${
                    selectedFilter === val
                      ? 'is-active bg-[#007F53] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#007F53] hover:bg-[#e4ede7]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Dropdown Chọn tháng hiện đại tuỳ biến */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen((prev) => !prev)}
                className="flex h-9 items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-[#0F172A] shadow-xs hover:border-[#007F53] hover:bg-[#F8FAFC] transition cursor-pointer"
                aria-label="Chọn tháng quản lý ngân sách"
              >
                <FinanceIcon name="calendar" size={14} color="#007F53" />
                <span>
                  Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                </span>
                <FinanceIcon
                  name="chevron-down"
                  size={13}
                  className={`text-[#64748B] transition-transform duration-200 ${
                    isMonthDropdownOpen ? 'rotate-180 text-[#007F53]' : ''
                  }`}
                />
              </button>

              {/* Menu danh sách các tháng thả xuống */}
              {isMonthDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMonthDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-2xl border border-[#e2eae4] bg-white p-1.5 shadow-xl transition-all max-h-60 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      Chọn kỳ ngân sách
                    </div>
                    {availableMonths.map((m) => {
                      const isSelected = m.key === selectedMonth;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(m.key);
                            setIsMonthDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#ECFDF5] font-bold text-[#007F53]'
                              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                          }`}
                        >
                          <span>{m.label}</span>
                          {isSelected && (
                            <span className="text-[#007F53]">
                              <FinanceIcon name="check" size={13} color="#007F53" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Nút Mẫu ngân sách */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 px-3 text-xs font-bold text-sky-700 dark:text-sky-300 shadow-xs transition cursor-pointer whitespace-nowrap"
              title="Áp dụng quy tắc tài chính 50/30/20 hoặc 6 Chiếc Hũ"
            >
              <FinanceIcon name="spark" size={14} color="#0284c7" />
              <span>Mẫu ngân sách</span>
            </button>

            {/* Nút Thêm ngân sách */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-budget-add inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#007F53] hover:bg-[#004D3B] px-3.5 text-xs font-bold text-white shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <FinanceIcon name="plus" size={14} color="#FFFFFF" />
              <span>Thêm ngân sách</span>
            </button>
          </div>
        </div>

        {/* Danh sách các hạn mức ngân sách nhỏ của từng danh mục */}
        {isLoading ? (
          <div className="grid place-items-center rounded-2xl border border-[#E2E8F0] bg-white py-16 text-sm text-[#64748B]">
            <span className="inline-block size-6 animate-spin rounded-full border-2 border-[#007F53] border-t-transparent" />
            <p className="mt-2">Đang tải hạn mức ngân sách...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#F1F5F9] text-[#64748B]">
              <FinanceIcon name="wallet" size={24} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#0F172A]">Chưa có hạn mức ngân sách nào trong tháng này</p>
            <p className="mt-1 text-xs text-[#64748B]">Hãy bấm nút &quot;+ Thêm ngân sách&quot; để thiết lập hạn mức cho từng danh mục chi tiêu.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => {
              const pct = Math.round(item.percentageUsed || 0);
              const isOver = pct > 100;
              const isWarn = pct >= 80 && pct <= 100;
              const catName = item.category?.name || item.categoryName || 'Danh mục';
              const catIcon = getCategoryIcon(item.category?.icon || item.categoryIcon, catName);
              const spent = item.spentAmount || 0;
              const limit = item.amount || 0;
              const rem = limit - spent;

              // Màu sắc trạng thái (chỉ hiện % gọn gàng)
              const statusLabel = `${pct}%`;
              const statusBg = isOver ? 'bg-[#fee2e2] budget-badge-over' : isWarn ? 'bg-[#ffddb8] budget-badge-warn' : 'bg-[#E6F4EA] budget-badge-safe';
              const statusColor = isOver ? 'text-[#991b1b]' : isWarn ? 'text-[#653e00]' : 'text-[#007F53]';
              const progressColor = isOver ? 'bg-[#dc2626]' : isWarn ? 'bg-[#f49d0a]' : 'bg-[#007F53]';

              const catTheme = getCategoryTheme(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="budget-item-card group flex w-full cursor-pointer flex-col items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#007F53]/40"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    {/* Trái: Icon & Tên danh mục */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="budget-cat-icon-box grid size-11 shrink-0 place-items-center rounded-xl transition"
                        style={{
                          backgroundColor: catTheme.bgLight,
                          borderColor: catTheme.border,
                          color: catTheme.color,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }}
                      >
                        <FinanceIcon name={catIcon} size={20} />
                      </span>
                      <div className="min-w-0">
                        <span className="budget-item-title block truncate text-sm font-semibold text-[#0F172A] group-hover:text-[#007F53]">
                          {item.name || catName}
                        </span>
                        <span className="budget-item-sub mt-0.5 block truncate text-xs text-[#64748B]">
                          {item.name && item.name !== catName && (
                            <span
                              className="budget-item-tag font-semibold mr-1.5"
                              style={{ color: catTheme.color }}
                            >
                              [{catName}]
                            </span>
                          )}
                          Đã dùng {spent.toLocaleString('vi-VN')} đ / {limit.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Phải: Trạng thái & Số tiền còn lại */}
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBg} ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <span className="budget-item-rem mt-1 block text-xs text-[#64748B]">
                        Còn lại: <strong className={rem >= 0 ? 'text-[#16a34a] budget-val-safe' : 'text-[#dc2626] budget-val-over'}>{rem.toLocaleString('vi-VN')} đ</strong>
                      </span>
                    </div>
                  </div>

                  {/* Thanh tiến độ trực quan */}
                  <ProgressBar percent={pct} color={progressColor} height="h-2.5" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Thêm ngân sách hỗ trợ 2 chế độ: Gộp danh mục & Bảng cả tháng */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
          <div className="budget-modal-card w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Thiết Lập Ngân Sách Danh Mục</h3>
                <p className="text-xs text-[#64748B]">Áp dụng cho kỳ: <strong className="text-[#007F53]">Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chuyển chế độ: Gộp danh mục vs Bảng cả tháng (giống App) */}
            <div className="px-6 pt-4 shrink-0">
              <div className="grid grid-cols-2 p-1 bg-[#F1F5F9] rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setCreateMode('grouped')}
                  className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    createMode === 'grouped'
                      ? 'bg-white text-[#007F53] shadow-xs'
                      : 'text-[#475569] hover:text-[#007F53]'
                  }`}
                >
                  <FinanceIcon name="tag" size={14} />
                  <span>Gộp danh mục</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('batch')}
                  className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    createMode === 'batch'
                      ? 'bg-white text-[#007F53] shadow-xs'
                      : 'text-[#475569] hover:text-[#007F53]'
                  }`}
                >
                  <FinanceIcon name="chart" size={14} />
                  <span>Bảng cả tháng</span>
                </button>
              </div>
            </div>

            {/* Nội dung form theo tab */}
            <form onSubmit={handleAddItemSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                {createMode === 'grouped' ? (
                  <>
                    {/* Chọn các danh mục */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#0F172A]">
                          Chọn danh mục chi tiêu ({selectedCatIds.length} đã chọn) *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllCategories}
                            className="text-[11px] font-bold text-[#007F53] hover:underline cursor-pointer"
                          >
                            Chọn tất cả
                          </button>
                          <span className="text-[#CBD5E1]">|</span>
                          <button
                            type="button"
                            onClick={handleDeselectAllCategories}
                            className="text-[11px] font-medium text-[#64748B] hover:underline cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        {categories.map((cat) => {
                          const isSelected = selectedCatIds.includes(cat.id);
                          const iconName = getCategoryIcon(cat.icon, cat.name);
                          const catTheme = getCategoryTheme(cat);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleToggleCategory(cat.id)}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs transition cursor-pointer select-none ${
                                isSelected
                                  ? 'border-[#007F53] bg-[#ECFDF5] font-bold text-[#007F53] shadow-xs'
                                  : 'border-[#E2E8F0] bg-white text-[#475569] hover:border-[#b4c8be] hover:bg-[#F8FAFC]'
                              }`}
                            >
                              <span
                                className={`grid size-4 shrink-0 place-items-center rounded border transition-colors ${
                                  isSelected
                                    ? 'border-[#007F53] bg-[#007F53] text-white'
                                    : 'border-[#cbd5e1] bg-white'
                                }`}
                              >
                                {isSelected && (
                                  <FinanceIcon name="check" size={11} color="#FFFFFF" />
                                )}
                              </span>
                              <span
                                className="grid size-7 shrink-0 place-items-center rounded-lg shadow-xs"
                                style={{
                                  backgroundColor: catTheme.bgLight,
                                  color: catTheme.color,
                                }}
                              >
                                <FinanceIcon name={iconName} size={15} color={catTheme.color} />
                              </span>
                              <span className="truncate flex-1">{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[11px] text-[#64748B]">Có thể chọn 1 hoặc nhiều danh mục để lập ngân sách chung.</p>
                    </div>

                    {/* Tên ngân sách */}
                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1">Tên ngân sách (tùy chọn)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Ăn uống & Cà phê"
                        value={newBudgetName}
                        onChange={(e) => setNewBudgetName(e.target.value)}
                        maxLength={100}
                        className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                      />
                    </div>

                    {/* Số tiền hạn mức */}
                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1">Số tiền hạn mức (VND) *</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 2,500,000"
                        value={newAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setNewAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                        }}
                        className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                        required
                      />
                      {selectedCatIds.length > 1 && newAmount && (
                        <p className="mt-1 text-[11px] text-[#007F53]">
                          Phân bổ: ~{Math.round(Number(newAmount.replace(/\D/g, '')) / selectedCatIds.length).toLocaleString('vi-VN')} đ/danh mục
                        </p>
                      )}
                    </div>

                    {/* Ngưỡng cảnh báo */}
                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1">Ngưỡng cảnh báo chi tiêu (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(e.target.value)}
                        className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-xs text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-[#64748B]">Hệ thống sẽ chuyển trạng thái sang &quot;Cần chú ý&quot; khi đạt đến ngưỡng này.</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Chế độ Bảng cả tháng */}
                    <div>
                      <p className="text-xs text-[#64748B] mb-3">
                        Nhập trực tiếp số tiền hạn mức dự kiến cho từng danh mục chi tiêu của tháng này:
                      </p>
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {categories.map((cat) => {
                          const val = batchAmounts[cat.id] || '';
                          const iconName = getCategoryIcon(cat.icon, cat.name);
                          const catTheme = getCategoryTheme(cat);
                          return (
                            <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#b4c8be] bg-white">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span
                                  className="grid size-8 shrink-0 place-items-center rounded-lg shadow-xs"
                                  style={{
                                    backgroundColor: catTheme.bgLight,
                                    color: catTheme.color,
                                  }}
                                >
                                  <FinanceIcon name={iconName} size={16} color={catTheme.color} />
                                </span>
                                <span className="text-xs font-semibold text-[#0F172A] truncate">{cat.name}</span>
                              </div>
                              <div className="w-40 shrink-0 relative flex items-center">
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={val}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setBatchAmounts((prev) => ({
                                      ...prev,
                                      [cat.id]: raw ? Number(raw).toLocaleString('vi-VN') : '',
                                    }));
                                  }}
                                  className="w-full h-9 rounded-lg border border-[#CBD5E1] pl-3 pr-7 text-right text-xs font-bold text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                                />
                                <span className="absolute right-2.5 text-xs font-semibold text-[#64748B] pointer-events-none select-none">
                                  đ
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-[#F1F5F9] text-xs font-bold text-[#007F53]">
                        <span>Tổng ngân sách dự kiến:</span>
                        <span>{totalBatchAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Nút hành động dưới modal */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E2E8F0] bg-[#fdfdfd] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-xs font-semibold text-[#53645a] hover:bg-[#F1F5F9] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#007F53] px-5 py-2 text-xs font-semibold text-white hover:bg-[#004D3B] transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu ngân sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mẫu ngân sách tài chính (Quy tắc 50/30/20 & 6 Chiếc Hũ) */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}>
          <div className="budget-modal-card w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <FinanceIcon name="spark" size={18} color="#0284c7" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Mẫu Ngân Sách Thông Minh</h3>
                  <p className="text-xs text-[#64748B]">Phân bổ thu nhập theo phương pháp tài chính chuẩn quốc tế</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              {/* Nhập thu nhập */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Thu nhập ước tính tháng này (VND) *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={templateIncome}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTemplateIncome(raw ? Number(raw).toLocaleString('vi-VN') : '');
                    }}
                    placeholder="15,000,000"
                    className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2.5 text-sm font-bold text-[#007F53] focus:border-[#007F53] focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-[#64748B]">VND</span>
                </div>
              </div>

              {/* Lựa chọn mô hình */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-2">Chọn phương pháp phân bổ</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateKey('50_30_20')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedTemplateKey === '50_30_20'
                        ? 'border-[#007F53] bg-[#ECFDF5] shadow-xs'
                        : 'border-[#E2E8F0] bg-white hover:border-[#b4c8be]'
                    }`}
                  >
                    <p className={`text-xs font-bold ${selectedTemplateKey === '50_30_20' ? 'text-[#007F53]' : 'text-[#0F172A]'}`}>
                      Quy tắc 50/30/20
                    </p>
                    <p className="mt-1 text-[11px] text-[#64748B]">50% Thiết yếu • 30% Mong muốn • 20% Tiết kiệm</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplateKey('6_JARS')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedTemplateKey === '6_JARS'
                        ? 'border-[#007F53] bg-[#ECFDF5] shadow-xs'
                        : 'border-[#E2E8F0] bg-white hover:border-[#b4c8be]'
                    }`}
                  >
                    <p className={`text-xs font-bold ${selectedTemplateKey === '6_JARS' ? 'text-[#007F53]' : 'text-[#0F172A]'}`}>
                      6 Chiếc Hũ (T. Harv Eker)
                    </p>
                    <p className="mt-1 text-[11px] text-[#64748B]">55% NEC • 10% FFA • 10% LTSS • 10% PLAY • 10% EDUC • 5% GIVE</p>
                  </button>
                </div>
              </div>

              {/* Danh sách phân bổ chi tiết */}
              <div>
                <p className="text-xs font-semibold text-[#0F172A] mb-2">Phân bổ dự kiến vào ngân sách:</p>
                <div className="space-y-2">
                  {templateAllocations.map((alloc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2E8F0] bg-[#fbfdfc]">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-xl"
                          style={{
                            backgroundColor: `${alloc.color}15`,
                            color: alloc.color,
                          }}
                        >
                          <FinanceIcon name={alloc.icon} size={18} color={alloc.color} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#0F172A] truncate">{alloc.name}</p>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: alloc.color }}
                            >
                              {alloc.percent}%
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5">{alloc.group}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#007F53] shrink-0">
                        {alloc.amount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-[#fdfdfd] shrink-0">
              <span className="text-xs text-[#64748B]">
                Kỳ áp dụng: <strong>Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-xs font-semibold text-[#53645a] hover:bg-[#F1F5F9] transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyTemplate}
                  disabled={isApplyingTemplate || incomeNumber <= 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#007F53] px-5 py-2 text-xs font-semibold text-white hover:bg-[#004D3B] transition cursor-pointer disabled:opacity-50"
                >
                  <FinanceIcon name="check" size={14} color="#FFFFFF" />
                  <span>{isApplyingTemplate ? 'Đang tạo ngân sách...' : 'Áp dụng mẫu này'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi tiết / Chỉnh sửa / Xóa 1 Hạn mức danh mục */}
      {selectedItem && (() => {
        const modalCatTheme = getCategoryTheme(selectedItem);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="budget-modal-card w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-12 place-items-center rounded-2xl"
                    style={{
                      backgroundColor: modalCatTheme.bgLight,
                      borderColor: modalCatTheme.border,
                      color: modalCatTheme.color,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <FinanceIcon name={getCategoryIcon(selectedItem.category?.icon || selectedItem.categoryIcon, selectedItem.name || selectedItem.category?.name || selectedItem.categoryName)} size={22} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {isEditing ? 'Chỉnh Sửa Ngân Sách' : (selectedItem.name || selectedItem.category?.name || selectedItem.categoryName)}
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      {selectedItem.name && !isEditing && (
                        <span
                          className="font-semibold mr-1"
                          style={{ color: modalCatTheme.color }}
                        >
                          [{selectedItem.category?.name || selectedItem.categoryName}]
                        </span>
                      )}
                      Ngân sách tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  ✕
                </button>
              </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Tên ngân sách *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Số tiền hạn mức (VND) *</label>
                  <input
                    type="text"
                    value={editAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEditAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                    }}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Ngưỡng cảnh báo chi tiêu (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] px-3.5 py-2 text-xs text-[#0F172A] focus:border-[#007F53] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-xl border border-[#CBD5E1] py-2 text-xs font-semibold text-[#53645a] hover:bg-[#F1F5F9]"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 rounded-xl bg-[#007F53] py-2 text-xs font-semibold text-white hover:bg-[#004D3B] disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="budget-detail-summary-box mt-4 rounded-xl bg-[#f8fafc] p-3.5 border border-[#e2e8f0] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Hạn mức:</span>
                    <strong className="text-[#0F172A]">{(selectedItem.amount || 0).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Đã chi tiêu thực tế:</span>
                    <strong className="text-[#dc2626]">{(selectedItem.spentAmount || 0).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Số dư khả dụng:</span>
                    <strong className={(selectedItem.remaining || 0) >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                      {(selectedItem.remaining || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className="pt-1">
                    <ProgressBar percent={Math.round(selectedItem.percentageUsed || 0)} color={(selectedItem.percentageUsed || 0) > 100 ? 'bg-[#dc2626]' : 'bg-[#007F53]'} />
                  </div>
                </div>

                {/* Lịch sử thanh toán chi tiêu thực tế thuộc ngân sách này */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-gray-200">
                      Lịch sử thanh toán thực tế ({itemTransactions.length})
                    </h4>
                    <span className="text-[10px] text-[#64748B]">Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</span>
                  </div>

                  {isLoadingTx ? (
                    <div className="py-4 text-center text-xs text-gray-400">Đang tải lịch sử chi tiêu...</div>
                  ) : itemTransactions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2 text-center">Chưa có giao dịch chi tiêu nào trong tháng này</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pr-1">
                      {itemTransactions.map((tx) => (
                        <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-[#0F172A] dark:text-gray-200 truncate">{tx.description || tx.accountName || 'Chi tiêu'}</p>
                            <span className="text-[10.5px] text-gray-500">
                              {tx.transactionDate} {tx.accountName ? `· ${tx.accountName}` : ''}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[#dc2626]">
                              -{Number(tx.amount || 0).toLocaleString('vi-VN')} đ
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-semibold">Đã thanh toán ✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(selectedItem)}
                    className="btn-budget-delete flex-1 rounded-xl border border-[#fecaca] bg-[#fff1f2] py-2.5 text-xs font-semibold text-[#dc2626] hover:bg-[#ffe4e6] transition flex items-center justify-center gap-1.5"
                  >
                    <FinanceIcon name="delete" size={14} />
                    Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn-budget-edit flex-1 rounded-xl border border-[#007F53] bg-[#007F53]/5 py-2.5 text-xs font-semibold text-[#007F53] hover:bg-[#007F53]/10 transition flex items-center justify-center gap-1.5"
                  >
                    <FinanceIcon name="edit" size={14} />
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="btn-budget-close flex-1 rounded-xl bg-[#007F53] py-2.5 text-xs font-semibold text-white hover:bg-[#004D3B] transition"
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {/* CUSTOM CONFIRM DELETE BUDGET ITEM MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(budgetItemToDelete)}
        title="Xác nhận xóa ngân sách?"
        subtitle="Hạn mức chi tiêu này sẽ bị xóa khỏi tháng hiện tại"
        itemName={budgetItemToDelete?.name || budgetItemToDelete?.category?.name || budgetItemToDelete?.categoryName}
        itemTypeLabel="Danh mục"
        message={
          budgetItemToDelete
            ? `Bạn có chắc chắn muốn xóa ngân sách "${budgetItemToDelete.name || budgetItemToDelete.category?.name || budgetItemToDelete.categoryName}" không?`
            : ''
        }
        isDeleting={isDeletingItem}
        onConfirm={confirmDeleteBudgetItem}
        onClose={() => setBudgetItemToDelete(null)}
      />
    </main>
  );
}

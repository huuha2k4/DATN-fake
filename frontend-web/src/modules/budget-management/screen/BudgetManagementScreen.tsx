import { useEffect, useState, useMemo } from 'react';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import { budgetApi, type BudgetResponse, type BudgetItemResponse } from '../api/budgetApi';
import { transactionApi, type CategoryItem } from '../../cash-flow-management/api/transactionApi';
import './BudgetManagementScreen.css';

type Props = { onNotify: (message: string) => void };

// Định dạng thanh tiến độ phần trăm
function ProgressBar({ percent, color = 'bg-[#006c49]', height = 'h-2' }: { percent: number; color?: string; height?: string }) {
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

  // Modal Thêm ngân sách cho 1 danh mục chi tiêu
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newThreshold, setNewThreshold] = useState('80');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xem chi tiết / Sửa / Xóa 1 hạn mức danh mục
  const [selectedItem, setSelectedItem] = useState<BudgetItemResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editThreshold, setEditThreshold] = useState('80');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    let initialCatId = '';
    let initialCatName = '';
    if (unconfiguredCategories.length > 0) {
      initialCatId = unconfiguredCategories[0].id;
      initialCatName = unconfiguredCategories[0].name;
    } else if (categories.length > 0) {
      initialCatId = categories[0].id;
      initialCatName = categories[0].name;
    }
    setSelectedCategoryId(initialCatId);
    setNewBudgetName(initialCatName ? `Ngân sách ${initialCatName}` : '');
    setNewAmount('');
    setNewThreshold('80');
    setIsAddModalOpen(true);
  };

  // Submit thêm hạn mức danh mục
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(newAmount.replace(/\D/g, ''));
    if (!selectedCategoryId) {
      onNotify('Vui lòng chọn danh mục chi tiêu');
      return;
    }
    if (!amtNum || amtNum <= 0) {
      onNotify('Vui lòng nhập số tiền hạn mức hợp lệ (> 0)');
      return;
    }

    try {
      setIsSubmitting(true);
      const [yStr, mStr] = selectedMonth.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);

      await budgetApi.addCategoryBudgetForMonth({
        year,
        month,
        categoryId: selectedCategoryId,
        name: newBudgetName.trim() || undefined,
        amount: amtNum,
        alertThresholdPercentage: parseInt(newThreshold, 10) || 80,
      });

      onNotify('Đã thêm ngân sách cho danh mục thành công!');
      setIsAddModalOpen(false);
      loadBudgetForSelectedMonth();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Thêm ngân sách thất bại. Vui lòng thử lại';
      onNotify(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mở modal chi tiết
  const handleOpenDetail = (item: BudgetItemResponse) => {
    setSelectedItem(item);
    setIsEditing(false);
    setEditName(item.name || item.category?.name || item.categoryName || '');
    setEditAmount((item.amount || 0).toLocaleString('vi-VN'));
    setEditThreshold(String(item.alertThresholdPercentage || 80));
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

  // Xóa 1 hạn mức danh mục
  const handleDeleteItem = async (item: BudgetItemResponse) => {
    if (!currentBudget) return;
    const displayName = item.name || item.category?.name || item.categoryName;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ngân sách "${displayName}"?`)) return;

    try {
      await budgetApi.deleteBudgetItem(currentBudget.id, item.id);
      onNotify('Đã xóa ngân sách thành công!');
      setSelectedItem(null);
      loadBudgetForSelectedMonth();
    } catch {
      onNotify('Xóa ngân sách thất bại');
    }
  };

  // Tổng hợp số liệu tháng hiện tại
  const totalBudgeted = currentBudget?.totalAmount || 0;
  const totalSpent = currentBudget?.spentAmount || 0;
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  // Lấy icon hợp lệ cho danh mục
  const getCategoryIcon = (iconName?: string): IconName => {
    const validIcons: IconName[] = ['coffee', 'wallet', 'arrows', 'bolt', 'chart', 'bank', 'trend', 'spark', 'shield', 'calendar', 'plus', 'delete', 'edit', 'eye', 'shopping-bag', 'car', 'home', 'heart', 'book', 'film'];
    if (iconName && validIcons.includes(iconName as IconName)) {
      return iconName as IconName;
    }
    return 'wallet';
  };

  // Lấy màu sắc nguyên bản của danh mục (hoặc fallback theo tên/icon nếu chưa có)
  const getCategoryTheme = (item: BudgetItemResponse) => {
    const rawColor = item.category?.color || item.categoryColor || categories.find((c) => c.id === (item.category?.id || item.categoryId))?.color;
    if (rawColor) {
      return {
        color: rawColor,
        bgLight: `${rawColor}15`,
        bgDark: `${rawColor}22`,
        border: `${rawColor}40`,
      };
    }

    // Bảng màu mặc định phong phú theo loại danh mục (Ăn uống, Đi lại, Hóa đơn, Mua sắm, v.v.)
    const name = (item.category?.name || item.categoryName || item.name || '').toLowerCase();
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
    return { color: '#10b981', bgLight: '#d1fae5', bgDark: '#064e3b', border: '#047857' }; // Xanh ngọc
  };

  return (
    <main className="budget-management-page mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-6 bg-[#f6f8f6] px-3 pb-24 pt-4 text-[#14251f] sm:gap-6 sm:px-[22px] lg:px-[34px] lg:pb-10 lg:pt-6" aria-label="Quản lý ngân sách">

      {/* 4 Cards thống kê tổng quan của tháng đang chọn */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thống kê ngân sách">
        {/* Card 1: Tổng hạn mức tháng */}
        <article className="budget-stat-card flex min-h-[135px] flex-col justify-between rounded-2xl border border-[#e7ece8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Tổng Ngân Sách Tháng</p>
              <p className="mt-1 text-2xl font-bold text-[#14251f]">
                {totalBudgeted.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#eaf0fb] text-[#2563eb]">
              <FinanceIcon name="wallet" size={20} />
            </span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Đã phân bổ cho <strong className="text-[#14251f]">{budgetItems.length}</strong> danh mục chi tiêu
          </p>
        </article>

        {/* Card 2: Đã sử dụng thực tế */}
        <article className="budget-stat-card flex min-h-[135px] flex-col justify-between rounded-2xl border border-[#e7ece8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Đã Sử Dụng Thực Tế</p>
              <p className="budget-spent-amount mt-1 text-2xl font-bold text-[#dc2626]">
                {totalSpent.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-xl bg-[#fef2f2] text-[#dc2626]">
              <FinanceIcon name="chart" size={20} />
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-[#718078]">
              <span>Tỷ lệ sử dụng</span>
              <span className="font-semibold text-[#dc2626]">{overallPercent}%</span>
            </div>
            <ProgressBar percent={overallPercent} color={overallPercent > 100 ? 'bg-[#dc2626]' : overallPercent >= 80 ? 'bg-[#f59e0b]' : 'bg-[#006c49]'} />
          </div>
        </article>

        {/* Card 3: Số dư khả dụng còn lại */}
        <article className="budget-stat-card flex min-h-[135px] flex-col justify-between rounded-2xl border border-[#e7ece8] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">Còn Lại Khả Dụng</p>
              <p className={`budget-remaining-amount mt-1 text-2xl font-bold ${totalRemaining >= 0 ? 'text-[#16a34a] is-safe' : 'text-[#dc2626] is-over'}`}>
                {totalRemaining.toLocaleString('vi-VN')} <span className="text-sm font-normal text-[#718078]">đ</span>
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
        <article className="budget-hero-alert-card flex min-h-[135px] flex-col justify-between rounded-2xl bg-gradient-to-br from-[#063d31] via-[#07543f] to-[#063d31] p-5 text-white shadow-sm">
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
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          {/* Trái: Tiêu đề */}
          <div>
            <h2 className="text-lg font-semibold text-[#14251f]">Hạn Mức Ngân Sách Chi Tiêu</h2>
            <p className="text-xs text-[#718078]">Giới hạn định mức kiểm soát dòng tiền theo từng danh mục</p>
          </div>

          {/* Phải: Cụm bộ lọc, Chọn tháng (ở giữa), Nút Thêm ngân sách */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bộ lọc trạng thái kiểu pill xanh chuẩn theme */}
            <div className="budget-filter-box inline-flex h-[38px] items-center rounded-xl bg-[#f0f5f2] p-1 gap-1">
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
                  className={`h-full rounded-lg px-3.5 text-xs font-bold transition flex items-center justify-center whitespace-nowrap ${
                    selectedFilter === val
                      ? 'is-active bg-[#07543f] text-white shadow-xs'
                      : 'text-[#52665a] hover:text-[#07543f] hover:bg-[#e4ede7]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Dropdown Chọn tháng (nằm giữa bộ lọc và nút thêm ngân sách) */}
            <div className="budget-month-selector flex h-[38px] items-center gap-2 rounded-xl border border-[#d2dcd5] bg-white px-3.5 shadow-sm">
              <FinanceIcon name="calendar" size={15} />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#14251f] outline-none cursor-pointer py-1"
                aria-label="Chọn tháng quản lý ngân sách"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút Thêm ngân sách */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-budget-add inline-flex h-[38px] items-center justify-center rounded-xl bg-[#07543f] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#064232] transition"
            >
              Thêm ngân sách
            </button>
          </div>
        </div>

        {/* Danh sách các hạn mức ngân sách nhỏ của từng danh mục */}
        {isLoading ? (
          <div className="grid place-items-center rounded-2xl border border-[#e7ece8] bg-white py-16 text-sm text-[#718078]">
            <span className="inline-block size-6 animate-spin rounded-full border-2 border-[#07543f] border-t-transparent" />
            <p className="mt-2">Đang tải hạn mức ngân sách...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#f1f5f2] text-[#718078]">
              <FinanceIcon name="wallet" size={24} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#14251f]">Chưa có hạn mức ngân sách nào trong tháng này</p>
            <p className="mt-1 text-xs text-[#718078]">Hãy bấm nút &quot;+ Thêm ngân sách&quot; để thiết lập hạn mức cho từng danh mục chi tiêu.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => {
              const pct = Math.round(item.percentageUsed || 0);
              const isOver = pct > 100;
              const isWarn = pct >= 80 && pct <= 100;
              const catName = item.category?.name || item.categoryName || 'Danh mục';
              const catIcon = getCategoryIcon(item.category?.icon || item.categoryIcon);
              const spent = item.spentAmount || 0;
              const limit = item.amount || 0;
              const rem = limit - spent;

              // Màu sắc trạng thái (chỉ hiện % gọn gàng)
              const statusLabel = `${pct}%`;
              const statusBg = isOver ? 'bg-[#fee2e2] budget-badge-over' : isWarn ? 'bg-[#ffddb8] budget-badge-warn' : 'bg-[#e3f4e9] budget-badge-safe';
              const statusColor = isOver ? 'text-[#991b1b]' : isWarn ? 'text-[#653e00]' : 'text-[#006c49]';
              const progressColor = isOver ? 'bg-[#dc2626]' : isWarn ? 'bg-[#f49d0a]' : 'bg-[#006c49]';

              const catTheme = getCategoryTheme(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="budget-item-card group flex w-full cursor-pointer flex-col items-start gap-3 rounded-2xl border border-[#e7ece8] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#07543f]/40"
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
                        <span className="budget-item-title block truncate text-sm font-semibold text-[#14251f] group-hover:text-[#07543f]">
                          {item.name || catName}
                        </span>
                        <span className="budget-item-sub mt-0.5 block truncate text-xs text-[#718078]">
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
                      <span className="budget-item-rem mt-1 block text-xs text-[#718078]">
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

      {/* Modal Thêm ngân sách cho 1 danh mục chi tiêu */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="budget-modal-card w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e7ece8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14251f]">Thêm Ngân Sách Danh Mục</h3>
                <p className="text-xs text-[#718078]">Áp dụng cho kỳ: <strong>Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#f1f5f2]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="mt-4 space-y-4">
              {/* Chọn danh mục chi tiêu */}
              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Danh mục chi tiêu *</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setSelectedCategoryId(catId);
                    const catObj = categories.find((c) => c.id === catId);
                    if (catObj && (!newBudgetName || newBudgetName.startsWith('Ngân sách '))) {
                      setNewBudgetName(`Ngân sách ${catObj.name}`);
                    }
                  }}
                  className="w-full rounded-xl border border-[#d2dcd5] bg-white px-3.5 py-2.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#718078]">Hệ thống sẽ tự động đối soát các khoản chi của danh mục này vào ngân sách.</p>
              </div>

              {/* Tên ngân sách (Tự gợi ý hoặc tự đặt) */}
              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Tên ngân sách *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ngân sách Ăn uống & Cà phê"
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  required
                />
                <p className="mt-1 text-[11px] text-[#718078]">Tên hiển thị để bạn dễ dàng quản lý và theo dõi.</p>
              </div>

              {/* Số tiền hạn mức */}
              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Số tiền hạn mức (VND) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 2,500,000"
                  value={newAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                  }}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  required
                />
              </div>

              {/* Ngưỡng cảnh báo */}
              <div>
                <label className="block text-xs font-semibold text-[#14251f] mb-1">Ngưỡng cảnh báo chi tiêu (%)</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2.5 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#718078]">Hệ thống sẽ chuyển trạng thái sang &quot;Cần chú ý&quot; khi đạt đến ngưỡng này.</p>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e7ece8]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-[#d2dcd5] px-4 py-2 text-xs font-semibold text-[#53645a] hover:bg-[#f1f5f2]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#07543f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#064232] disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Thêm ngân sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi tiết / Chỉnh sửa / Xóa 1 Hạn mức danh mục */}
      {selectedItem && (() => {
        const modalCatTheme = getCategoryTheme(selectedItem);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="budget-modal-card w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                    <FinanceIcon name={getCategoryIcon(selectedItem.category?.icon || selectedItem.categoryIcon)} size={22} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#14251f]">
                      {isEditing ? 'Chỉnh Sửa Ngân Sách' : (selectedItem.name || selectedItem.category?.name || selectedItem.categoryName)}
                    </h3>
                    <p className="text-xs text-[#718078]">
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
                  className="grid size-8 place-items-center rounded-lg text-[#718078] hover:bg-[#f1f5f2]"
                >
                  ✕
                </button>
              </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Tên ngân sách *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Số tiền hạn mức (VND) *</label>
                  <input
                    type="text"
                    value={editAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setEditAmount(val ? Number(val).toLocaleString('vi-VN') : '');
                    }}
                    className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#14251f] mb-1">Ngưỡng cảnh báo chi tiêu (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="w-full rounded-xl border border-[#d2dcd5] px-3.5 py-2 text-xs text-[#14251f] focus:border-[#07543f] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#e7ece8]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-xl border border-[#d2dcd5] py-2 text-xs font-semibold text-[#53645a] hover:bg-[#f1f5f2]"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 rounded-xl bg-[#07543f] py-2 text-xs font-semibold text-white hover:bg-[#064232] disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="budget-detail-summary-box mt-4 rounded-xl bg-[#f8fafc] p-3.5 border border-[#e2e8f0] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Hạn mức:</span>
                    <strong className="text-[#14251f]">{(selectedItem.amount || 0).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Đã chi tiêu thực tế:</span>
                    <strong className="text-[#dc2626]">{(selectedItem.spentAmount || 0).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#718078]">Số dư khả dụng:</span>
                    <strong className={(selectedItem.remaining || 0) >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                      {(selectedItem.remaining || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className="pt-1">
                    <ProgressBar percent={Math.round(selectedItem.percentageUsed || 0)} color={(selectedItem.percentageUsed || 0) > 100 ? 'bg-[#dc2626]' : 'bg-[#006c49]'} />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
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
                    className="btn-budget-edit flex-1 rounded-xl border border-[#07543f] bg-[#07543f]/5 py-2.5 text-xs font-semibold text-[#07543f] hover:bg-[#07543f]/10 transition flex items-center justify-center gap-1.5"
                  >
                    <FinanceIcon name="edit" size={14} />
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="btn-budget-close flex-1 rounded-xl bg-[#07543f] py-2.5 text-xs font-semibold text-white hover:bg-[#064232] transition"
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
    </main>
  );
}

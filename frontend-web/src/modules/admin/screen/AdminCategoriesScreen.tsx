import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';

interface SystemCategoryItem {
  id: string;
  name: string;
  code?: string;
  kind: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
  parentId?: string | null;
  displayOrder?: number;
  isSystem: boolean;
}

export const AdminCategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<SystemCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SystemCategoryItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formKind, setFormKind] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formIcon, setFormIcon] = useState('cart');
  const [formColor, setFormColor] = useState('#07543f');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getSystemCategories();
      setCategories(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh mục hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormCode('');
    setFormKind('EXPENSE');
    setFormIcon('cart');
    setFormColor('#07543f');
    setModalNotice('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: SystemCategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code || '');
    setFormKind(cat.kind);
    setFormIcon(cat.icon || 'tag');
    setFormColor(cat.color || '#07543f');
    setModalNotice('');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalNotice('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalNotice('');
      if (editingCategory) {
        await adminApi.updateSystemCategory(editingCategory.id, {
          name: formName.trim(),
          code: formCode.trim() || undefined,
          kind: formKind,
          icon: formIcon,
          color: formColor,
        });
      } else {
        await adminApi.createSystemCategory({
          name: formName.trim(),
          code: formCode.trim() || undefined,
          kind: formKind,
          icon: formIcon,
          color: formColor,
        });
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setModalNotice(err?.response?.data?.message || 'Lỗi khi lưu danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: SystemCategoryItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục mặc định "${cat.name}" khỏi hệ thống?`)) {
      return;
    }
    try {
      await adminApi.deleteSystemCategory(cat.id);
      loadCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể xóa danh mục');
    }
  };

  // Lọc theo Kind và Search
  const filteredCategories = categories.filter((c) => {
    const matchKind = kindFilter === 'ALL' || c.kind === kindFilter;
    const matchSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(search.toLowerCase()));
    return matchKind && matchSearch;
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Thanh lọc & Thao tác đồng bộ chuẩn như Quản lý Người dùng */}
      <div className="overview-main-panel !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Ô Tìm kiếm rộng rãi bên trái */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên danh mục hoặc mã code..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <span className="absolute left-3 top-3 text-gray-400">
              <FinanceIcon name="search" size={15} />
            </span>
          </div>

          {/* Các bộ lọc & Nút bấm bên phải */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Lọc Loại danh mục */}
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as any)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">Tất cả Phân loại ({categories.length})</option>
              <option value="EXPENSE">Chi tiêu (Expense)</option>
              <option value="INCOME">Thu nhập (Income)</option>
            </select>

            {/* Khối thống kê số lượng */}
            <div className="h-10 px-3.5 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Tổng: <strong className="text-[#07543f] dark:text-emerald-400 font-bold">{filteredCategories.length}</strong>
              </span>
            </div>

            {/* Nút Thêm danh mục */}
            <button
              type="button"
              onClick={openCreateModal}
              className="h-10 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
            >
              <span className="text-sm font-bold">+</span>
              <span>Thêm danh mục</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Danh sách Danh mục Hệ thống (Đồng bộ chuẩn Table như Quản lý người dùng, gọn gàng, rõ ràng) */}
      <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Biểu tượng & Tên danh mục</th>
                <th className="py-3.5 px-4">Mã nhận diện (Code)</th>
                <th className="py-3.5 px-4">Phân loại</th>
                <th className="py-3.5 px-4">Phạm vi áp dụng</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="inline-block size-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="m-0 text-xs">Đang tải danh sách danh mục...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Không tìm thấy danh mục nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const isIncome = cat.kind === 'INCOME';
                  const iconName = resolveCategoryIconName(cat.icon, cat.kind, cat.name);

                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cột 1: Icon & Tên */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`size-9 rounded-xl grid place-items-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            <FinanceIcon name={iconName} size={18} />
                          </span>
                          <div>
                            <strong className="text-gray-900 dark:text-slate-100 font-bold block text-[13px]">
                              {cat.name}
                            </strong>
                            <span className="text-[11px] text-gray-400 dark:text-slate-500">
                              Mặc định Finora
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Mã Code */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600 dark:text-slate-300 font-semibold">
                        {cat.code || 'SYS_DEFAULT'}
                      </td>

                      {/* Cột 3: Loại */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {isIncome ? 'Thu nhập' : 'Chi tiêu'}
                        </span>
                      </td>

                      {/* Cột 4: Phạm vi */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 bg-gray-100/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          Toàn hệ thống (Mặc định)
                        </span>
                      </td>

                      {/* Cột 5: Thao tác */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer text-xs"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer text-xs"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh sửa Danh mục Hệ thống */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 m-0">
                {editingCategory ? 'Chỉnh sửa Danh mục Hệ thống' : 'Thêm Danh mục Mặc định Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalNotice && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {modalNotice}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Ăn uống, Tiền lương..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Mã Code nhận diện
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Để trống hệ thống sẽ tự sinh SYS_..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Loại danh mục
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormKind('EXPENSE')}
                    className={`h-10 rounded-xl font-bold border transition ${
                      formKind === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600'
                    }`}
                  >
                    Chi tiêu (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormKind('INCOME')}
                    className={`h-10 rounded-xl font-bold border transition ${
                      formKind === 'INCOME'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600'
                    }`}
                  >
                    Thu nhập (Income)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Biểu tượng (Icon)
                </label>
                <select
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="cart">Giỏ hàng / Mua sắm (cart)</option>
                  <option value="bank">Ngân hàng / Tiền lương (bank)</option>
                  <option value="wallet">Ví tiền (wallet)</option>
                  <option value="receipt">Hóa đơn (receipt)</option>
                  <option value="spark">Trợ lý / Khác (spark)</option>
                  <option value="shield">Bảo hiểm / An toàn (shield)</option>
                  <option value="trend">Đầu tư / Sinh lời (trend)</option>
                  <option value="users">Gia đình / Nhóm (users)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

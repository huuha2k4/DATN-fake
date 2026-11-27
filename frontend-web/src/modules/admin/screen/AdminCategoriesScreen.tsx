import React, { useEffect, useState } from 'react';
import { AdminDialog } from '../components/AdminDialog';
import { AdminBadge, AdminEmptyState, AdminNotice, AdminSurface } from '../components/AdminPrimitives';
import { adminError } from '../hooks/useAdminPage';
import { adminApi, type AdminCategoryItem } from '../api/adminApi';
import { FinanceIcon, resolveCategoryIconName } from '../../core/components/FinanceIcon';
import { AdminConfirmDialog as ConfirmDeleteModal } from '../components/AdminConfirmDialog';

type SystemCategoryItem = AdminCategoryItem;

export const AdminCategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<SystemCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SystemCategoryItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<SystemCategoryItem | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formKind, setFormKind] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formIcon, setFormIcon] = useState('cart');
  const [formParent, setFormParent] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [deleteError, setDeleteError] = useState('');
  const [formColor, setFormColor] = useState('#007F53');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getSystemCategories();
      setCategories(data || []);
    } catch (err: unknown) {
      setError(adminError(err, 'Không thể tải danh mục hệ thống'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadCategories();
    });
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormCode('');
    setFormKind('EXPENSE');
    setFormIcon('cart');
    setFormParent('');
    setFormOrder('0');
    setFormColor('#007F53');
    setModalNotice('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: SystemCategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code || '');
    setFormKind(cat.kind);
    setFormIcon(cat.icon || 'tag');
    setFormParent(cat.parentId ?? '');
    setFormOrder(String(cat.displayOrder ?? 0));
    setFormColor(cat.color || '#007F53');
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
      const payload = {
        name: formName.trim(),
        code: formCode.trim() || undefined,
        kind: formKind,
        icon: formIcon,
        color: formColor,
        parentId: formParent || null,
        displayOrder: Number(formOrder),
      };
      if (editingCategory) {
        await adminApi.updateSystemCategory(editingCategory.id, payload);
      } else {
        await adminApi.createSystemCategory(payload);
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: unknown) {
      setModalNotice(adminError(err, 'Lỗi khi lưu danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCat(true);
    try {
      await adminApi.deleteSystemCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: unknown) {
      setDeleteError(adminError(err, 'Không thể xóa danh mục'));
    } finally {
      setIsDeletingCat(false);
    }
  };

  const byId = new Map(categories.map((category) => [category.id, category]));
  const filteredCategories = categories.filter((c) => {
    const matchKind = kindFilter === 'ALL' || c.kind === kindFilter;
    const matchSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(search.toLowerCase()));
    return matchKind && matchSearch;
  });

  return (
    <div className="space-y-4">
      <AdminSurface noPadding busy={loading}>
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--admin-border)]">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
              <FinanceIcon name="search" size={14} />
            </span>
            <input
              type="search"
              aria-label="Tìm danh mục hệ thống"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên danh mục hoặc mã code…"
              className="admin-input w-full pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Lọc loại danh mục"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as 'ALL' | 'EXPENSE' | 'INCOME')}
              className="admin-select"
            >
              <option value="ALL">Tất cả ({categories.length})</option>
              <option value="EXPENSE">Chi tiêu (Expense)</option>
              <option value="INCOME">Thu nhập (Income)</option>
            </select>

            <span className="inline-flex h-9 items-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 text-xs text-[var(--admin-ink-muted)] tabular-nums">
              Hiển thị: <strong className="ml-1 text-[var(--admin-ink)]">{filteredCategories.length}</strong>
            </span>

            <button type="button" onClick={openCreateModal} className="admin-btn-primary">
              <FinanceIcon name="plus" size={15} />
              Thêm danh mục
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Bảng danh mục hệ thống">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Danh mục</th>
                <th>Mã nhận diện</th>
                <th>Phân loại</th>
                <th>Thứ tự</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[var(--admin-ink-muted)]">
                    Đang tải danh sách danh mục…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-rose-600 dark:text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <AdminEmptyState
                      icon="wallet"
                      title="Không tìm thấy danh mục"
                      description="Thử xóa bộ lọc tìm kiếm hoặc tạo danh mục mặc định mới."
                    />
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const isIncome = cat.kind === 'INCOME';
                  const iconName = resolveCategoryIconName(cat.icon, cat.kind, cat.name);
                  return (
                    <tr key={cat.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span
                            className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            <FinanceIcon name={iconName} size={16} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--admin-ink)]">{cat.name}</div>
                            <div className="text-[11px] text-[var(--admin-ink-muted)]">
                              {cat.parentId ? `Thuộc: ${byId.get(cat.parentId)?.name ?? 'Danh mục cha'}` : 'Danh mục gốc · Mặc định Finora'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code className="rounded bg-[var(--admin-surface-subtle)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--admin-ink-secondary)] border border-[var(--admin-border)]">
                          {cat.code || 'SYS_DEFAULT'}
                        </code>
                      </td>

                      <td>
                        <AdminBadge tone={isIncome ? 'emerald' : 'rose'}>
                          {isIncome ? 'Thu nhập' : 'Chi tiêu'}
                        </AdminBadge>
                      </td>

                      <td className="text-xs text-[var(--admin-ink-muted)] tabular-nums">
                        {cat.displayOrder ?? 0}
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className="admin-btn-secondary admin-btn-sm"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('');
                              setCategoryToDelete(cat);
                            }}
                            className="admin-btn-ghost admin-btn-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
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
      </AdminSurface>

      {/* Modal Thêm / Chỉnh sửa */}
      {isModalOpen && (
        <AdminDialog
          label="Danh mục hệ thống"
          onClose={() => setIsModalOpen(false)}
          pending={isSubmitting}
        >
          <div className="admin-dialog-body space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
              <h3 className="text-base font-bold text-[var(--admin-ink)] m-0">
                {editingCategory ? 'Chỉnh sửa danh mục hệ thống' : 'Thêm danh mục mặc định mới'}
              </h3>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
                className="admin-icon-button"
              >
                <FinanceIcon name="close" size={16} />
              </button>
            </div>

            {modalNotice && <AdminNotice tone="rose" message={modalNotice} />}

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>
                  Tên danh mục <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  aria-label="Tên danh mục"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Ăn uống, Tiền lương…"
                  className="admin-input"
                  required
                />
              </label>

              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Mã Code nhận diện</span>
                <input
                  type="text"
                  aria-label="Mã danh mục"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Để trống hệ thống tự sinh SYS_…"
                  className="admin-input font-mono"
                />
              </label>

              <div className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Loại danh mục</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    aria-pressed={formKind === 'EXPENSE'}
                    onClick={() => {
                      setFormKind('EXPENSE');
                      setFormParent('');
                    }}
                    className={`h-9 rounded-lg font-semibold border transition cursor-pointer ${
                      formKind === 'EXPENSE'
                        ? 'bg-rose-500/10 border-rose-500/60 text-rose-700 dark:text-rose-300'
                        : 'border-[var(--admin-border)] text-[var(--admin-ink-secondary)] hover:bg-[var(--admin-surface-hover)]'
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    aria-pressed={formKind === 'INCOME'}
                    onClick={() => {
                      setFormKind('INCOME');
                      setFormParent('');
                    }}
                    className={`h-9 rounded-lg font-semibold border transition cursor-pointer ${
                      formKind === 'INCOME'
                        ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--admin-border)] text-[var(--admin-ink-secondary)] hover:bg-[var(--admin-surface-hover)]'
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Biểu tượng (Icon)</span>
                <select
                  aria-label="Biểu tượng danh mục"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="admin-select"
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
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                  <span>Danh mục cha</span>
                  <select
                    value={formParent}
                    onChange={(event) => setFormParent(event.target.value)}
                    className="admin-select"
                  >
                    <option value="">Danh mục gốc</option>
                    {categories
                      .filter((category) => category.kind === formKind && category.id !== editingCategory?.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                  <span>Thứ tự hiển thị</span>
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    max={32767}
                    step={1}
                    required
                    value={formOrder}
                    onChange={(event) => setFormOrder(event.target.value)}
                  />
                </label>

                <label className="flex items-center gap-2.5 font-medium text-[var(--admin-ink-secondary)]">
                  <span>Màu danh mục</span>
                  <input
                    className="h-8 w-11 rounded border border-[var(--admin-border)] bg-transparent cursor-pointer"
                    type="color"
                    value={formColor}
                    onChange={(event) => setFormColor(event.target.value)}
                  />
                </label>

                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-1.5 admin-wrap">
                  <FinanceIcon
                    name={resolveCategoryIconName(formIcon, formKind, formName)}
                    size={17}
                    color={formColor}
                  />
                  <span className="font-medium text-[var(--admin-ink)] truncate">
                    {formName || 'Xem trước danh mục'}
                  </span>
                </div>
              </div>

              <div className="admin-dialog-actions">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary">
                  {isSubmitting ? 'Đang lưu…' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </AdminDialog>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(categoryToDelete)}
        title="Xóa danh mục mặc định?"
        subtitle="Danh mục hệ thống sẽ bị xóa khỏi dữ liệu dùng chung"
        itemName={categoryToDelete?.name}
        itemTypeLabel="Danh mục"
        error={deleteError}
        message={
          categoryToDelete
            ? `Bạn có chắc chắn muốn xóa danh mục mặc định "${categoryToDelete.name}" khỏi hệ thống?`
            : ''
        }
        isDeleting={isDeletingCat}
        onConfirm={confirmDeleteCategory}
        onClose={() => setCategoryToDelete(null)}
      />
    </div>
  );
};

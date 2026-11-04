import React, { useEffect, useState, useTransition } from 'react';
import { adminApi, type AdminUserItem } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

export const AdminUserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modal Sửa/Nâng cấp Người dùng
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editRole, setEditRole] = useState<string>('USER');
  const [editTier, setEditTier] = useState<string>('FREE');
  const [extendDays, setExtendDays] = useState<number>(0);
  const [editVerified, setEditVerified] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const [, startTransition] = useTransition();

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listUsers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
        page,
        size: 15,
      });
      setUsers(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, tierFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadUsers();
  };

  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditStatus(user.userStatus);
    setEditRole(user.systemRole);
    setEditTier(user.subscriptionTier);
    setEditVerified(user.emailVerified);
    setExtendDays(0);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSubmitting(true);
      const updated = await adminApi.updateUser(editingUser.id, {
        userStatus: editStatus,
        systemRole: editRole,
        subscriptionTier: editTier,
        extendSubscriptionDays: extendDays > 0 ? extendDays : undefined,
        emailVerified: editVerified,
      });
      setNotice(`Đã cập nhật thông tin cho người dùng "${updated.fullName || updated.username}"`);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async (user: AdminUserItem) => {
    const isBlocking = user.userStatus === 'ACTIVE';
    const confirmMsg = isBlocking
      ? `Bạn có chắc muốn KHÓA tài khoản "${user.fullName || user.username}" không?`
      : `MỞ KHÓA cho tài khoản "${user.fullName || user.username}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const updated = await adminApi.toggleBlockUser(user.id);
      setNotice(`Đã ${updated.userStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản thành công!`);
      loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Thao tác khóa/mở khóa thất bại');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-2xs">
          <span>✓ {notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-sm font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Thanh lọc & Tìm kiếm */}
      <div className="overview-main-panel !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Ô Tìm kiếm rộng rãi bên trái */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo Tên, Email, Username, SĐT..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <span className="absolute left-3 top-3 text-gray-400">
                <FinanceIcon name="search" size={15} />
              </span>
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Tìm
            </button>
          </form>

          {/* Các bộ lọc và số lượng xếp gọn bên phải */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Lọc Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Trạng thái</option>
              <option value="ACTIVE">Hoạt động (Active)</option>
              <option value="LOCKED">Đang bị khóa (Locked)</option>
              <option value="PENDING">Chờ kích hoạt (Pending)</option>
            </select>

            {/* Lọc Gói cước */}
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(0);
              }}
              className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Gói</option>
              <option value="FREE">Gói FREE</option>
              <option value="PREMIUM">Gói PREMIUM</option>
              <option value="ENTERPRISE">Gói ENTERPRISE</option>
            </select>

            <div className="h-10 px-3.5 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Tổng: <strong className="text-[#07543f] dark:text-emerald-400 font-bold">{totalElements}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng Danh sách Người dùng */}
      <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Người dùng</th>
                <th className="py-3 px-4">Gói dịch vụ</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Email OTP</th>
                <th className="py-3 px-4">Ngày đăng ký</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isBlocked = u.userStatus === 'LOCKED' || u.userStatus === 'DISABLED';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                      {/* Avatar + Tên + Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#07543f] dark:text-emerald-300 font-bold text-xs grid place-items-center shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="size-full rounded-full object-cover" />
                            ) : (
                              (u.fullName || u.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-[#14261e] dark:text-slate-100 block truncate">
                              {u.fullName || u.username}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Gói cước */}
                      <td className="py-3 px-4">
                        {u.subscriptionTier === 'PREMIUM' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ★ PREMIUM
                          </span>
                        ) : u.subscriptionTier === 'ENTERPRISE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            👑 ENTERPRISE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                            FREE
                          </span>
                        )}
                        {u.subscriptionExpiresAt && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                            Hết hạn: {u.subscriptionExpiresAt.slice(0, 10)}
                          </span>
                        )}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.systemRole === 'ADMIN'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {u.systemRole}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isBlocked
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                            : u.userStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-[#07543f] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          <span className={`size-1.5 rounded-full ${isBlocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {u.userStatus}
                        </span>
                      </td>

                      {/* Email OTP verified */}
                      <td className="py-3 px-4">
                        {u.emailVerified ? (
                          <span className="text-emerald-600 font-bold text-xs" title="Đã xác thực OTP">
                            ✓ Đã kích hoạt
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px]" title="Chưa kích hoạt OTP">
                            Chưa xác thực
                          </span>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3 px-4 text-[11px] text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {u.createdAt ? u.createdAt.slice(0, 10) : '—'}
                      </td>

                      {/* Nút thao tác */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="h-7 px-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 transition cursor-pointer"
                            title="Sửa quyền hạn & nâng gói"
                          >
                            Chi tiết
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBlock(u)}
                            className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              isBlocked
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100'
                            }`}
                          >
                            {isBlocked ? 'Mở khóa' : 'Khóa'}
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

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[#edf2ee] dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Trang {page + 1} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 px-2.5 rounded border border-gray-200 dark:border-slate-700 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2.5 rounded border border-gray-200 dark:border-slate-700 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Cập nhật Người dùng / Nâng cấp Gói */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-[#14261e] dark:text-slate-100 m-0">
                  Cập nhật Tài khoản Người dùng
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 m-0 mt-0.5">
                  {editingUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="size-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 grid place-items-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col gap-3.5 text-xs">
              {/* Họ tên */}
              <div>
                <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  defaultValue={editingUser.fullName}
                  name="fullName"
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100"
                />
              </div>

              {/* Gói cước Hội viên */}
              <div>
                <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">
                  Gói dịch vụ (Subscription Tier)
                </label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-200"
                >
                  <option value="FREE">Gói Miễn phí (FREE)</option>
                  <option value="PREMIUM">Gói Cá nhân VIP (PREMIUM)</option>
                  <option value="ENTERPRISE">Gói Doanh nghiệp (ENTERPRISE)</option>
                </select>
              </div>

              {/* Gia hạn số ngày VIP */}
              {editTier !== 'FREE' && (
                <div>
                  <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">
                    Cộng thêm thời hạn VIP (Ngày)
                  </label>
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value={0}>Không gia hạn thêm</option>
                    <option value={30}>+ 30 Ngày (1 tháng)</option>
                    <option value={90}>+ 90 Ngày (3 tháng)</option>
                    <option value={365}>+ 365 Ngày (1 năm)</option>
                  </select>
                </div>
              )}

              {/* Vai trò Hệ thống */}
              <div>
                <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">
                  Vai trò (System Role)
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="USER">USER (Người dùng thông thường)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên hệ thống)</option>
                </select>
              </div>

              {/* Trạng thái tài khoản */}
              <div>
                <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">
                  Trạng thái Tài khoản
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="ACTIVE">ACTIVE (Bình thường)</option>
                  <option value="LOCKED">LOCKED (Bị khóa đăng nhập)</option>
                  <option value="PENDING">PENDING (Chờ xác nhận)</option>
                </select>
              </div>

              {/* Xác thực Email thủ công */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="emailVerified"
                  checked={editVerified}
                  onChange={(e) => setEditVerified(e.target.checked)}
                  className="size-4 accent-[#07543f]"
                />
                <label htmlFor="emailVerified" className="text-xs text-gray-700 dark:text-slate-300 font-medium cursor-pointer">
                  Đánh dấu Email đã xác thực (Hỗ trợ khi user không nhận được OTP)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-8 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


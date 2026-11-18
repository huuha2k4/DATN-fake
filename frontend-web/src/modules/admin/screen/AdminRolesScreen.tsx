import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface RoleStat {
  role: string;
  name: string;
  description: string;
  totalAccounts: number;
  permissions: string[];
  isSystemProtected: boolean;
}

export const AdminRolesScreen: React.FC = () => {
  const [roles, setRoles] = useState<RoleStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleStat | null>(null);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getRoles();
      setRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách vai trò');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Đang tải cấu hình phân quyền hệ thống...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">{error}</p>
        <button
          type="button"
          onClick={loadRoles}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Thông tin nguyên tắc hệ thống */}
      <div className="overview-main-panel !p-4 flex items-center gap-3.5 border-l-4 border-l-emerald-600">
        <span className="icon-box-mint shrink-0">
          <FinanceIcon name="shield" size={20} />
        </span>
        <div className="text-xs">
          <strong className="text-gray-900 dark:text-slate-100 font-bold block mb-0.5">
            Nguyên tắc Phân quyền Finora RBAC (Role-Based Access Control)
          </strong>
          <span className="text-gray-600 dark:text-slate-400">
            Hệ thống phân tách rạch ròi giữa <strong>Quản trị viên (ADMIN)</strong> chuyên trách vận hành, giám sát kỹ thuật, và <strong>Người dùng (USER)</strong> quản lý chi tiêu cá nhân. Admin tuyệt đối không can thiệp số dư cá nhân của người dùng.
          </span>
        </div>
      </div>

      {/* Grid 2 cột: Danh sách vai trò & Chi tiết quyền hạn */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái: Thẻ tóm tắt các Role */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {roles.map((r) => {
            const isSelected = selectedRole?.role === r.role;
            const isAdmin = r.role === 'ADMIN';

            return (
              <div
                key={r.role}
                onClick={() => setSelectedRole(r)}
                className={`overview-main-panel !p-5 cursor-pointer transition-all border-2 ${
                  isSelected
                    ? 'border-emerald-600 shadow-md bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-transparent hover:border-gray-200 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`size-9 rounded-xl grid place-items-center font-bold text-sm ${
                        isAdmin
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {isAdmin ? '★' : '👤'}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 m-0">
                        {r.role}
                      </h3>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                        {r.name}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.isSystemProtected
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {r.isSystemProtected ? 'Hệ thống bảo vệ' : 'Mặc định'}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 my-2.5 leading-relaxed">
                  {r.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800 text-xs">
                  <span className="text-gray-500 dark:text-slate-400">Số tài khoản đang giữ vai trò:</span>
                  <strong className="text-gray-900 dark:text-slate-100 font-bold text-sm">
                    {r.totalAccounts}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cột phải: Bảng chi tiết quyền hạn của vai trò đang chọn */}
        <div className="lg:col-span-7">
          {selectedRole ? (
            <div className="overview-main-panel !p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 m-0">
                      Chi tiết Quyền hạn: {selectedRole.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200">
                      {selectedRole.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {selectedRole.description}
                  </p>
                </div>
              </div>

              {/* Danh sách quyền hạn được cấp */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
                  Danh sách Quyền hạn Được thực thi ({selectedRole.permissions.length})
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedRole.permissions.map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex items-center gap-3 text-xs"
                    >
                      <span className="size-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 grid place-items-center text-[10px] font-black shrink-0">
                        ✓
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">
                        {perm}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranh giới an toàn thông tin (Bảo vệ tính riêng tư người dùng) */}
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-1">
                  <span>🔒</span>
                  <span>Chính sách Bảo mật Ranh giới Dữ liệu (Privacy Boundary)</span>
                </div>
                <p className="text-amber-700 dark:text-amber-400/90 m-0 leading-relaxed text-[11px]">
                  Tài khoản có vai trò <strong>{selectedRole.role}</strong> tuân thủ chính sách cách ly: Các bảng dữ liệu thu chi, giao dịch cụ thể và số dư tài khoản ngân hàng của cá nhân chỉ người dùng sở hữu mới có quyền truy cập, hoàn toàn ẩn khỏi các API quản trị công khai.
                </p>
              </div>
            </div>
          ) : (
            <div className="overview-main-panel !p-12 text-center text-gray-400 text-xs">
              Vui lòng chọn vai trò để xem chi tiết quyền hạn
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


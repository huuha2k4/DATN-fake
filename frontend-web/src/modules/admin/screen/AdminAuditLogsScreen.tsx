import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface AuditLogItem {
  id: string;
  adminUsername: string;
  adminFullName: string;
  action: string;
  targetEntity: string;
  targetId: string;
  description: string;
  ipAddress: string;
  status: string;
  createdAt: string;
}

export const AdminAuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listAuditLogs({
        action: actionFilter || undefined,
        targetEntity: entityFilter || undefined,
      });
      setLogs(res || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, entityFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.description.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.adminFullName.toLowerCase().includes(q) ||
      l.targetEntity.toLowerCase().includes(q) ||
      l.ipAddress.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. THANH LỌC & TÌM KIẾM ĐỒNG BỘ CHUẨN */}
      <div className="overview-main-panel !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Ô Tìm kiếm rộng rãi */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Mô tả hành động, Quản trị viên, Hành vi, Địa chỉ IP..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <span className="absolute left-3 top-3 text-gray-400">
              <FinanceIcon name="search" size={15} />
            </span>
          </div>

          {/* Lọc Hành vi & Đối tượng */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Đối tượng</option>
              <option value="USER">Người dùng (USER)</option>
              <option value="CATEGORY">Danh mục (CATEGORY)</option>
              <option value="NOTIFICATION">Thông báo (NOTIFICATION)</option>
              <option value="SYSTEM">Hệ thống (SYSTEM)</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Hành vi</option>
              <option value="USER_UPDATE">Cập nhật User</option>
              <option value="USER_LOCK">Khóa tài khoản</option>
              <option value="USER_UNLOCK">Mở khóa tài khoản</option>
              <option value="CATEGORY_CREATE">Tạo danh mục</option>
              <option value="BROADCAST_SEND">Phát thông báo</option>
            </select>

            <div className="h-10 px-3.5 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Tổng: <strong className="text-[#07543f] dark:text-emerald-400 font-bold">{filteredLogs.length}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
              className="h-10 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* 2. BẢNG DANH SÁCH NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL TABLE) */}
      <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Quản trị viên thực hiện</th>
                <th className="py-3.5 px-4">Hành vi (Action)</th>
                <th className="py-3.5 px-4">Đối tượng tác động</th>
                <th className="py-3.5 px-4">Nội dung chi tiết</th>
                <th className="py-3.5 px-4">Địa chỉ IP</th>
                <th className="py-3.5 px-5 text-right">Thời gian ghi nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="inline-block size-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="m-0 text-xs">Đang truy xuất nhật ký bảo mật...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Chưa có nhật ký hoạt động nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isLock = log.action === 'USER_LOCK';
                  const isBroadcast = log.action === 'BROADCAST_SEND';
                  const isCreate = log.action.includes('CREATE');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cột 1: Admin */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="size-8 rounded-full bg-[#07543f] text-white font-bold text-xs grid place-items-center shrink-0">
                            A
                          </span>
                          <div>
                            <strong className="text-gray-900 dark:text-slate-100 font-bold block text-[13px]">
                              {log.adminFullName}
                            </strong>
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                              @{log.adminUsername}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Hành vi */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[11px]">
                        <span
                          className={`px-2 py-1 rounded-md ${
                            isLock
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : isBroadcast
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : isCreate
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Cột 3: Đối tượng tác động */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                          {log.targetEntity}
                        </span>
                      </td>

                      {/* Cột 4: Mô tả */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <span className="text-gray-700 dark:text-slate-300 block line-clamp-2 leading-relaxed">
                          {log.description}
                        </span>
                      </td>

                      {/* Cột 5: IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                        {log.ipAddress}
                      </td>

                      {/* Cột 6: Thời gian */}
                      <td className="py-3.5 px-5 text-right text-gray-400 text-[11px]">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


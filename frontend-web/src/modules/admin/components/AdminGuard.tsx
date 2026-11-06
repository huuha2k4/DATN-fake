import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser, isAuthenticated } from '../../auth/api/authApi';

interface AdminGuardProps {
  children?: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = getStoredUser();
  const isAdmin = user?.systemRole === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f4f7f5] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="size-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 grid place-items-center mb-4 text-2xl font-bold shadow-sm">
          ✕
        </div>
        <h2 className="text-xl font-bold text-[#14261e] dark:text-slate-100 mb-2">
          Không có quyền truy cập
        </h2>
        <p className="text-sm text-[#718579] dark:text-slate-400 max-w-md mb-6">
          Khu vực này chỉ dành riêng cho Quản trị viên hệ thống (Super Admin). Tài khoản hiện tại của bạn không có quyền xem trang này.
        </p>
        <a
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition shadow-xs"
        >
          Trở về Trang chủ
        </a>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};


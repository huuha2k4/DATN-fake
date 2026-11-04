import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface ActivityPoint {
  date: string;
  transactionCount: number;
  newUsers: number;
}

interface FeatureUsage {
  featureName: string;
  icon: string;
  totalEvents: number;
  percentage: number;
}

interface AnalyticsData {
  totalUsers: number;
  activeUsersDAU: number;
  activeUsersWAU: number;
  activeUsersMAU: number;
  retentionRate: number;
  totalTransactions: number;
  totalGroups: number;
  totalReceipts: number;
  activityTrend: ActivityPoint[];
  featureUsages: FeatureUsage[];
}

export const AdminAnalyticsScreen: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAnalyticsOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải số liệu thống kê sử dụng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Đang tổng hợp dữ liệu phân tích hệ thống...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">{error || 'Có lỗi xảy ra'}</p>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const maxActivity = Math.max(...data.activityTrend.map((p) => Math.max(p.transactionCount, p.newUsers)), 1);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. HÀNG 4 THẺ CHỈ SỐ HOẠT ĐỘNG DAU / WAU / MAU / RETENTION */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* DAU */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              DAU (HÔM NAY)
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="users" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight">
              {data.activeUsersDAU.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Người dùng tương tác trong ngày
          </div>
        </article>

        {/* WAU */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              WAU (7 NGÀY QUA)
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="trend" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight">
              {data.activeUsersWAU.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Tài khoản truy cập trong tuần
          </div>
        </article>

        {/* MAU */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              MAU (30 NGÀY QUA)
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="chart" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#07543f] dark:text-emerald-400 tracking-tight">
              {data.activeUsersMAU.toLocaleString('vi-VN')}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Người dùng hoạt động hàng tháng
          </div>
        </article>

        {/* TỶ LỆ GIỮ CHÂN */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              TỶ LỆ QUAY LẠI
            </span>
            <span className="size-9 rounded-xl grid place-items-center bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <FinanceIcon name="spark" size={18} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-purple-700 dark:text-purple-400 tracking-tight">
              {data.retentionRate}%
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Tỷ lệ thành viên thường xuyên sử dụng
          </div>
        </article>
      </section>

      {/* 2. KHU VỰC GIỮA: BIỂU ĐỒ HOẠT ĐỘNG 14 NGÀY VÀ CƠ CẤU TÍNH NĂNG */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Biểu đồ hoạt động 14 ngày */}
        <article className="overview-main-panel xl:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#14261e] dark:text-slate-100 text-headline">
                  Tần suất Hoạt động Hệ thống (14 ngày qua)
                </h2>
                <p className="text-xs text-[#718078] dark:text-slate-400 text-sub mt-0.5">
                  Số lượng giao dịch ghi nhận & người dùng mới theo ngày
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[#07543f] dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-[#10b981]" /> Giao dịch
                </span>
                <span className="flex items-center gap-1.5 font-bold text-gray-400 dark:text-slate-500">
                  <span className="size-2 rounded-full bg-gray-400" /> User mới
                </span>
              </div>
            </div>

            {/* Khung Biểu đồ cột */}
            <div className="mt-8 flex h-[260px] items-end justify-around gap-1.5 sm:gap-3 border-b border-[#edf2ee] pb-4 dark:border-[#122432]">
              {data.activityTrend.map((pt) => {
                const txHeight = Math.max(12, Math.round((pt.transactionCount / maxActivity) * 85));
                const userHeight = pt.newUsers > 0 ? Math.max(12, Math.round((pt.newUsers / maxActivity) * 85)) : 0;

                return (
                  <div key={pt.date} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                    <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition">
                      {pt.transactionCount}
                    </span>

                    <div className="flex items-end gap-1" style={{ height: '180px' }}>
                      {/* Cột Giao dịch (Xanh ngọc) */}
                      <div
                        className="w-2.5 sm:w-3.5 rounded-t-full bg-gradient-to-t from-[#07543f] to-[#10b981] hover:brightness-110 transition cursor-pointer"
                        style={{ height: `${txHeight}%` }}
                        title={`${pt.date}: ${pt.transactionCount} giao dịch`}
                      />
                      {/* Cột User mới (Xám) */}
                      <div
                        className={`w-2.5 sm:w-3.5 rounded-t-full ${
                          pt.newUsers > 0 ? 'bg-gray-300 dark:bg-slate-600' : 'h-1 bg-gray-200 dark:bg-slate-800'
                        }`}
                        style={pt.newUsers > 0 ? { height: `${userHeight}%` } : {}}
                        title={`${pt.date}: ${pt.newUsers} người dùng mới`}
                      />
                    </div>

                    <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 whitespace-nowrap">
                      {pt.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        {/* Khối Cơ cấu Sử dụng Tính năng */}
        <article className="overview-main-panel xl:col-span-5 !p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">
              Tính năng Được sử dụng Nhiều nhất
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
              Phân bố tỷ trọng tương tác của người dùng trên nền tảng
            </p>

            <div className="flex flex-col gap-4">
              {data.featureUsages.map((feat) => (
                <div key={feat.featureName} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-slate-200">
                      <span className="size-6 rounded-lg grid place-items-center bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                        <FinanceIcon name={feat.icon as any} size={14} />
                      </span>
                      <span>{feat.featureName}</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-gray-500 dark:text-slate-400 font-mono text-[11px]">
                        {feat.totalEvents.toLocaleString('vi-VN')} lượt
                      </span>
                      <span className="text-[#07543f] dark:text-emerald-400 text-xs font-black">
                        {feat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${feat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 mt-5 flex items-center justify-between text-xs text-gray-500">
            <span>Tổng lượng hành vi ghi nhận:</span>
            <strong className="text-gray-900 dark:text-slate-100 font-bold">
              {(data.totalTransactions + data.totalReceipts + data.totalGroups * 3).toLocaleString('vi-VN')} tương tác
            </strong>
          </div>
        </article>
      </section>
    </div>
  );
};


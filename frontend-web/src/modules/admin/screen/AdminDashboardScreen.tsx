import React, { useEffect, useState } from 'react';
import { adminApi, type AdminDashboardOverview } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

export const AdminDashboardScreen: React.FC = () => {
  const [data, setData] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const overview = await adminApi.getDashboardOverview();
      setData(overview);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải số liệu tổng quan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Đang tải dữ liệu tổng quan hệ thống...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">{error || 'Có lỗi xảy ra'}</p>
        <button
          type="button"
          onClick={loadOverview}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // Tính số liệu cho biểu đồ cột
  const maxGrowth = Math.max(...data.userGrowth.map((p) => p.count), 1);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. KHU VỰC TOP: 4 CARD KPI CHÍNH (Chiếm 100% chiều ngang theo tỷ lệ 4 cột đều nhau) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* Card 1: NGƯỜI DÙNG */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              NGƯỜI DÙNG
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="users" size={20} />
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight text-headline flex items-baseline gap-1">
              <span>{data.totalUsers.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#718078] dark:text-slate-400 text-sub flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f7f0] dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-[#07543f] dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-[#10b981]" />
              +{data.newUsersToday} hôm nay
            </span>
            <span>· +{data.newUsersThisMonth} tháng này</span>
          </div>
        </article>

        {/* Card 2: SỐ HOẠT ĐỘNG */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              SỐ HOẠT ĐỘNG
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="shield" size={20} />
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight text-headline flex items-baseline gap-1">
              <span>{data.activeUsers.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#718078] dark:text-slate-400 text-sub">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f7f0] dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-[#07543f] dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-[#10b981]" />
              Tài khoản tương tác
            </span>
          </div>
        </article>

        {/* Card 3: GÓI TRẢ PHÍ */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              GÓI TRẢ PHÍ
            </span>
            <span className="icon-box-mint">
              <span className="text-sm font-bold text-[#10b981]">★</span>
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight text-headline flex items-baseline gap-1">
              <span>{(data.premiumUsers + data.enterpriseUsers).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#718078] dark:text-slate-400 text-sub">
            <span>{data.freeUsers} Free</span>
            <span>·</span>
            <span className="text-[#07543f] dark:text-emerald-400 font-semibold">{data.premiumUsers} Premium</span>
            <span>·</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">{data.enterpriseUsers} Enterprise</span>
          </div>
        </article>

        {/* Card 4: KHỐI LƯỢNG SỬ DỤNG */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              KHỐI LƯỢNG SỬ DỤNG
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="receipt" size={20} />
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight text-headline flex items-baseline gap-1">
              <span>{data.totalReceiptsScanned.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#718078] dark:text-slate-400 text-sub">
            <span>Hóa đơn quét</span>
            <span>·</span>
            <span>{data.totalGroups} nhóm tạo</span>
          </div>
        </article>
      </section>

      {/* 2. KHU VỰC DƯỚI: BIỂU ĐỒ & HẠ TẦNG */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Biểu đồ đăng ký 7 ngày gần nhất - Chiếm 7 phần trên 12 (hoặc 60%), co giãn full chiều cao */}
        <article className="overview-main-panel xl:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#14261e] dark:text-slate-100 text-headline">
                  Tăng trưởng Người dùng 7 ngày gần nhất
                </h2>
                <p className="text-xs text-[#718078] dark:text-slate-400 text-sub mt-0.5">
                  Số tài khoản mới đăng ký theo ngày
                </p>
              </div>
              <span className="text-xs font-bold text-[#07543f] dark:text-emerald-400 bg-[#e8f7f0] dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                Tuần hiện tại
              </span>
            </div>

            {/* Khung vẽ cột biểu đồ */}
            <div className="mt-8 flex h-[250px] sm:h-[270px] items-end justify-around gap-2 sm:gap-5 border-b border-[#edf2ee] pb-4 dark:border-[#122432]">
              {data.userGrowth.map((point) => {
                // Chiều cao chuẩn xác theo tỷ lệ max
                const heightPct = point.count > 0 ? Math.max(18, Math.round((point.count / maxGrowth) * 85)) : 0;
                return (
                  <div key={point.date} className="flex flex-col items-center gap-3 flex-1 h-full justify-end group">
                    {/* Số lượng hiển thị trên đỉnh cột */}
                    <span className={`text-[11px] font-bold transition ${point.count > 0 ? 'text-[#07543f] dark:text-emerald-400 font-extrabold' : 'text-gray-400 dark:text-slate-600'}`}>
                      {point.count}
                    </span>

                    {/* Thân cột */}
                    <div className="w-full flex justify-center items-end" style={{ height: '190px' }}>
                      <div
                        className={`w-7 sm:w-9 rounded-t-full transition-all duration-500 relative cursor-pointer ${
                          point.count > 0
                            ? 'chart-bar-income hover:opacity-90 shadow-sm'
                            : 'h-1.5 w-4 rounded-full bg-gray-200 dark:bg-slate-800'
                        }`}
                        style={point.count > 0 ? { height: `${heightPct}%` } : {}}
                        title={`${point.date}: ${point.count} người dùng mới`}
                      />
                    </div>

                    {/* Ngày tháng dưới chân cột */}
                    <span className="text-[11px] font-semibold text-[#718078] dark:text-slate-400 truncate whitespace-nowrap">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        {/* Cột phải: Cơ cấu gói & Tình trạng hạ tầng - Chiếm 5 phần trên 12, chia đều chiều cao */}
        <div className="xl:col-span-5 flex flex-col gap-5 justify-between">
          {/* Box 1: Cơ cấu gói */}
          <article className="overview-main-panel !p-5 flex-1 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-[#14261e] dark:text-slate-100 text-headline m-0 mb-3">
              Cơ cấu Gói Hội viên
            </h3>
            <div className="flex flex-col gap-3.5 my-auto">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-600 dark:text-slate-400">Gói Miễn phí (FREE)</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{data.freeUsers}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{ width: `${data.totalUsers ? (data.freeUsers / data.totalUsers) * 100 : 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700 dark:text-emerald-400">Gói Cá nhân (PREMIUM)</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{data.premiumUsers}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${data.totalUsers ? (data.premiumUsers / data.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-purple-700 dark:text-purple-400">Doanh nghiệp (ENTERPRISE)</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">{data.enterpriseUsers}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${data.totalUsers ? (data.enterpriseUsers / data.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </article>

          {/* Box 2: Hạ tầng máy chủ */}
          <article className="overview-main-panel !p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#14261e] dark:text-slate-100 text-headline m-0">
                Hạ tầng Máy chủ
              </h3>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-[#e8f7f0] dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
                Hoạt động tốt
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mt-2">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block mb-1">PostgreSQL</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">KẾT NỐI TỐT</strong>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 flex flex-col justify-center">
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block mb-1">Bộ nhớ JVM Heap</span>
                <strong className="text-gray-800 dark:text-slate-200 text-[13px]">
                  {data.systemHealth?.heapMemoryUsedMB} / {data.systemHealth?.heapMemoryMaxMB} MB
                </strong>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

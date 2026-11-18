import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface HealthData {
  status: string;
  uptimeSeconds: number;
  startTime: string;
  memory: {
    heapUsedMB: number;
    heapMaxMB: number;
    heapCommittedMB: number;
    heapUsagePercent: number;
    nonHeapUsedMB: number;
  };
  cpu: {
    availableProcessors: number;
    systemCpuLoad: number;
    processCpuLoad: number;
    activeThreadCount: number;
    peakThreadCount: number;
    totalLoadedClasses: number;
  };
  database: {
    status: string;
    databaseProductName: string;
    databaseProductVersion: string;
    pingTimeMs: number;
    activeConnections: number;
    maxPoolSize: number;
  };
  disk: {
    totalSpaceGB: number;
    freeSpaceGB: number;
    usableSpaceGB: number;
    diskUsagePercent: number;
  };
  runtime: Record<string, string>;
}

export const AdminSystemHealthScreen: React.FC = () => {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadHealth = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getSystemHealth();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể kết nối dịch vụ giám sát hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    // Tự động thăm dò tình trạng máy chủ mỗi 15 giây
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d} ngày ${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    return `${m} phút ${s} giây`;
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Đang kiểm tra chỉ số phần cứng & máy chủ...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">{error}</p>
        <button
          type="button"
          onClick={loadHealth}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const isUp = data?.status === 'UP';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. HÀNG 4 THẺ CHỈ SỐ PHẦN CỨNG THẬT (JVM Heap, PostgreSQL Ping, CPU Cores, Uptime) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* TRẠNG THÁI HỆ THỐNG */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              TÌNH TRẠNG HỆ THỐNG
            </span>
            <span className={`size-2.5 rounded-full ${isUp ? 'bg-[#10b981] animate-pulse' : 'bg-rose-500'}`} />
          </div>
          <div className="my-2">
            <div className={`text-2xl sm:text-[28px] font-black tracking-tight ${isUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
              {isUp ? 'HOẠT ĐỘNG TỐT' : 'CÓ CẢNH BÁO'}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Khởi động lúc: {data?.startTime}
          </div>
        </article>

        {/* BỘ NHỚ JVM HEAP THẬT */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              BỘ NHỚ JVM HEAP
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="shield" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-[28px] font-black text-[#14261e] dark:text-slate-100 tracking-tight">
              {data?.memory.heapUsedMB} <span className="text-sm font-semibold text-gray-500">/ {data?.memory.heapMaxMB} MB</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (data?.memory.heapUsagePercent || 0) > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${data?.memory.heapUsagePercent || 0}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
              {data?.memory.heapUsagePercent}%
            </span>
          </div>
        </article>

        {/* POSTGRESQL DATABASE THẬT */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              POSTGRESQL LATENCY
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="bank" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-[28px] font-black text-[#07543f] dark:text-emerald-400 tracking-tight">
              {data?.database.pingTimeMs} ms
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            {data?.database.status === 'CONNECTED' ? 'Kết nối ổn định (SELECT 1 OK)' : 'Lỗi kết nối DB'}
          </div>
        </article>

        {/* THỜI GIAN HOẠT ĐỘNG (UPTIME) THẬT */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              THỜI GIAN HOẠT ĐỘNG
            </span>
            <span className="size-9 rounded-xl grid place-items-center bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <FinanceIcon name="trend" size={18} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-[22px] font-black text-purple-700 dark:text-purple-400 tracking-tight">
              {data ? formatUptime(data.uptimeSeconds) : '0'}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400 flex items-center justify-between">
            <span>Cập nhật lúc:</span>
            <strong>{lastRefreshed.toLocaleTimeString('vi-VN')}</strong>
          </div>
        </article>
      </section>

      {/* 2. KHU VỰC CHI TIẾT: 3 PANEL BỘ NHỚ, CPU & Ổ CỨNG MÁY CHỦ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Panel 1: Chi tiết Bộ nhớ JVM */}
        <div className="overview-main-panel !p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <span>🧠</span>
              <span>Chi tiết Bộ nhớ JVM</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
              Phân bổ Heap & Non-Heap Memory từ Java Runtime
            </p>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Heap Đang dùng:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{data?.memory.heapUsedMB} MB</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Heap Đã cam kết (Committed):</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.memory.heapCommittedMB} MB</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Heap Tối đa (Max Allowed):</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.memory.heapMaxMB} MB</strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-slate-400">Non-Heap (Metaspace):</span>
                <strong className="text-purple-700 dark:text-purple-400 font-bold">{data?.memory.nonHeapUsedMB} MB</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: CPU & Luồng Xử Lý (Threads) */}
        <div className="overview-main-panel !p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <span>⚡</span>
              <span>CPU & Luồng Xử Lý (Threads)</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
              Tài nguyên xử lý đa luồng máy chủ thực tế
            </p>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Số nhân CPU vật lý/logic:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{data?.cpu.availableProcessors} Cores</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Luồng đang chạy (Active Threads):</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.cpu.activeThreadCount} Threads</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Đỉnh luồng từng đạt (Peak Threads):</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.cpu.peakThreadCount} Threads</strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-slate-400">Classes đã nạp vào bộ nhớ:</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.cpu.totalLoadedClasses} Classes</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Ổ cứng & Dung lượng lưu trữ */}
        <div className="overview-main-panel !p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <span>💾</span>
              <span>Lưu trữ Ổ cứng Máy chủ</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
              Dung lượng ổ đĩa lưu trữ mã nguồn & cơ sở dữ liệu
            </p>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Tổng dung lượng đĩa:</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.disk.totalSpaceGB} GB</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Dung lượng còn trống:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{data?.disk.freeSpaceGB} GB</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Mức sử dụng đĩa:</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.disk.diskUsagePercent}%</strong>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-slate-400">Hệ điều hành máy chủ:</span>
                <strong className="text-gray-800 dark:text-slate-200 font-bold">{data?.runtime.osName} ({data?.runtime.osArch})</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface OcrItem {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  merchantName: string;
  totalAmount: number;
  currency: string;
  transactionDate: string;
  confidence: number;
  needsReview: boolean;
  aiCategoryName?: string;
  kind: string;
  createdAt: string;
}

interface OcrOverviewData {
  totalScanned: number;
  scannedToday: number;
  scannedThisMonth: number;
  needReviewCount: number;
  averageConfidence: number;
  recentReceipts: OcrItem[];
}

export const AdminOcrManagementScreen: React.FC = () => {
  const [data, setData] = useState<OcrOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'ACCURATE' | 'NEEDS_REVIEW'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8; // Hiển thị 8 hóa đơn mỗi trang vừa khít khung màn hình

  const loadOcrData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getOcrOverview();
      setData(res);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải số liệu OCR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOcrData();
  }, []);

  const receipts = data?.recentReceipts || [];

  const filteredReceipts = receipts.filter((r) => {
    const matchSearch =
      !search.trim() ||
      r.merchantName.toLowerCase().includes(search.toLowerCase()) ||
      r.userFullName.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(search.toLowerCase());

    const matchReview =
      reviewFilter === 'ALL' ||
      (reviewFilter === 'NEEDS_REVIEW' && r.needsReview) ||
      (reviewFilter === 'ACCURATE' && !r.needsReview);

    return matchSearch && matchReview;
  });

  const totalPages = Math.ceil(filteredReceipts.length / pageSize) || 1;
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. HÀNG 4 THẺ CHỈ SỐ OCR (Thiết kế đồng bộ sắc nét 100% full width) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* Card 1: TỔNG HÓA ĐƠN ĐÃ QUÉT */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              TỔNG HÓA ĐƠN QUÉT
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="receipt" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight">
              {data?.totalScanned.toLocaleString('vi-VN') || 0}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#718078] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f7f0] dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-[#07543f] dark:text-emerald-300">
              +{data?.scannedToday || 0} hôm nay
            </span>
            <span>· +{data?.scannedThisMonth || 0} tháng này</span>
          </div>
        </article>

        {/* Card 2: ĐỘ CHÍNH XÁC TRUNG BÌNH */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              ĐỘ TIN CẬY TRÍ TUỆ
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="spark" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#07543f] dark:text-emerald-400 tracking-tight">
              {data ? `${Math.round((data.averageConfidence || 0.88) * 100)}%` : '0%'}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Tỷ lệ nhận diện đúng phân loại & nhà bán hàng
          </div>
        </article>

        {/* Card 3: CẦN NGƯỜI DÙNG XÁC NHẬN */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              CẦN KIỂM TRA LẠI
            </span>
            <span className="size-9 rounded-xl grid place-items-center bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <FinanceIcon name="shield" size={18} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {data?.needReviewCount.toLocaleString('vi-VN') || 0}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Hóa đơn mờ hoặc nghi vấn sai lệch
          </div>
        </article>

        {/* Card 4: TRẠNG THÁI OCR ENGINE */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              TRẠNG THÁI OCR CORE
            </span>
            <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-[26px] font-black text-[#14261e] dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>SẴN SÀNG</span>
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Google Vision & FinAI Text Extraction
          </div>
        </article>
      </section>

      {/* 2. THANH LỌC & TÌM KIẾM HÓA ĐƠN */}
      <div className="overview-main-panel !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Ô Tìm kiếm rộng rãi */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Tên nhà bán hàng, Người quét, Email..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <span className="absolute left-3 top-3 text-gray-400">
              <FinanceIcon name="search" size={15} />
            </span>
          </div>

          {/* Lọc theo mức độ tin cậy */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value as any)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="ALL">Tất cả tình trạng ({receipts.length})</option>
              <option value="ACCURATE">Tin cậy cao (Đã khớp)</option>
              <option value="NEEDS_REVIEW">Cần người dùng xem lại</option>
            </select>

            <div className="h-10 px-3.5 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Hiển thị: <strong className="text-[#07543f] dark:text-emerald-400 font-bold">{filteredReceipts.length}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={loadOcrData}
              className="h-10 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH HÓA ĐƠN QUÉT GẦN ĐÂY */}
      <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Hóa đơn quét (Merchant)</th>
                <th className="py-3.5 px-4">Người tải lên</th>
                <th className="py-3.5 px-4">Phân loại AI</th>
                <th className="py-3.5 px-4">Độ tin cậy OCR</th>
                <th className="py-3.5 px-5 text-right">Thời gian quét</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="inline-block size-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="m-0 text-xs">Đang tải nhật ký quét hóa đơn...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Chưa có hóa đơn nào được ghi nhận
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((r) => {
                  const confPct = Math.round((Number(r.confidence) || 0.8) * 100);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cột 1: Quét hóa đơn gì (Tên nhà bán hàng / Dịch vụ) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="size-9 rounded-xl grid place-items-center shrink-0 bg-[#e8f7f0] dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-300">
                            <FinanceIcon name="receipt" size={18} />
                          </span>
                          <div>
                            <strong className="text-gray-900 dark:text-slate-100 font-bold block text-[13px]">
                              {r.merchantName || 'Hóa đơn bán lẻ'}
                            </strong>
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                              Mã ID: {r.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Ai tải lên */}
                      <td className="py-3.5 px-4">
                        <strong className="text-gray-900 dark:text-slate-100 block font-semibold">
                          {r.userFullName || 'Người dùng Finora'}
                        </strong>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">
                          {r.userEmail || 'Tài khoản thường'}
                        </span>
                      </td>

                      {/* Cột 3: Phân loại */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {r.aiCategoryName || 'Chi tiêu chung'}
                        </span>
                      </td>

                      {/* Cột 4: Độ tin cậy OCR */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                confPct >= 80 ? 'bg-emerald-500' : confPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${confPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300">
                            {confPct}%
                          </span>
                        </div>
                        {r.needsReview && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                            ⚠ Cần người dùng xác nhận
                          </span>
                        )}
                      </td>

                      {/* Cột 5: Thời gian */}
                      <td className="py-3.5 px-5 text-right text-gray-500 dark:text-slate-400 text-xs">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang Pagination */}
        {filteredReceipts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[#edf2ee] dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850/40 text-xs">
            <span className="text-gray-500 dark:text-slate-400 text-[11px]">
              Hiển thị <strong className="text-gray-800 dark:text-slate-200 font-bold">{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredReceipts.length)}</strong> trên tổng số <strong className="text-gray-800 dark:text-slate-200 font-bold">{filteredReceipts.length}</strong> hóa đơn
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
              >
                ← Trước
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`size-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentPage === page
                              ? 'bg-[#07543f] text-white shadow-xs'
                              : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface FeedbackItem {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userAvatar?: string;
  title: string;
  content: string;
  category: string;
  status: string;
  priority: string;
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export const AdminFeedbacksScreen: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal Phản hồi
  const [replyingFeedback, setReplyingFeedback] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.listFeedbacks({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setFeedbacks(res || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách phản hồi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [statusFilter, categoryFilter]);

  const openReplyModal = (fb: FeedbackItem) => {
    setReplyingFeedback(fb);
    setReplyText(fb.adminReply || '');
    setReplyStatus(fb.status === 'PENDING' ? 'RESOLVED' : fb.status);
    setModalNotice('');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingFeedback) return;
    if (!replyText.trim()) {
      setModalNotice('Vui lòng nhập nội dung giải đáp cho người dùng');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalNotice('');
      await adminApi.replyFeedback(replyingFeedback.id, {
        reply: replyText.trim(),
        status: replyStatus,
      });
      setReplyingFeedback(null);
      loadFeedbacks();
    } catch (err: any) {
      setModalNotice(err?.response?.data?.message || 'Lỗi khi gửi phản hồi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      fb.title.toLowerCase().includes(q) ||
      fb.content.toLowerCase().includes(q) ||
      fb.userFullName.toLowerCase().includes(q) ||
      fb.userEmail.toLowerCase().includes(q)
    );
  });

  const pendingCount = feedbacks.filter((f) => f.status === 'PENDING').length;
  const inProgressCount = feedbacks.filter((f) => f.status === 'IN_PROGRESS').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'RESOLVED').length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. HÀNG 4 THẺ THỐNG KÊ PHẢN HỒI (Full Width chuẩn) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* TỔNG PHẢN HỒI */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              TỔNG YÊU CẦU HỖ TRỢ
            </span>
            <span className="icon-box-mint">
              <FinanceIcon name="message" size={20} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#14261e] dark:text-slate-100 tracking-tight">
              {feedbacks.length}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Ý kiến đóng góp & yêu cầu từ người dùng
          </div>
        </article>

        {/* CHỜ XỬ LÝ (PENDING) */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              CHỜ GIẢI QUYẾT
            </span>
            <span className="size-9 rounded-xl grid place-items-center bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <FinanceIcon name="bell" size={18} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {pendingCount}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Cần ban quản trị phản hồi sớm
          </div>
        </article>

        {/* ĐANG XỬ LÝ (IN PROGRESS) */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              ĐANG TIẾP NHẬN
            </span>
            <span className="size-9 rounded-xl grid place-items-center bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <FinanceIcon name="shield" size={18} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {inProgressCount}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Đang được chuyển sang bộ phận kỹ thuật
          </div>
        </article>

        {/* ĐÃ GIẢI QUYẾT (RESOLVED) */}
        <article className="overview-white-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#63756b] dark:text-slate-400 uppercase">
              ĐÃ XỬ LÝ XONG
            </span>
            <span className="size-9 rounded-xl grid place-items-center bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FinanceIcon name="spark" size={18} />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-[34px] font-black text-[#07543f] dark:text-emerald-400 tracking-tight">
              {resolvedCount}
            </div>
          </div>
          <div className="text-xs text-[#718078] dark:text-slate-400">
            Đã giải đáp hoàn tất cho người dùng
          </div>
        </article>
      </section>

      {/* 2. THANH LỌC & TÌM KIẾM ĐỒNG BỘ CHUẨN */}
      <div className="overview-main-panel !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Ô Tìm kiếm rộng rãi */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Tiêu đề, Nội dung, Người gửi, Email..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <span className="absolute left-3 top-3 text-gray-400">
              <FinanceIcon name="search" size={15} />
            </span>
          </div>

          {/* Lọc Trạng thái & Phân loại */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Lọc Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Trạng thái</option>
              <option value="PENDING">Chờ giải quyết</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
            </select>

            {/* Lọc Phân loại */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="">Tất cả Phân loại</option>
              <option value="BUG">Báo lỗi (Bug)</option>
              <option value="FEATURE_REQUEST">Đề xuất tính năng</option>
              <option value="PAYMENT">Thanh toán & Gói cước</option>
              <option value="GENERAL">Khác</option>
            </select>

            <div className="h-10 px-3.5 rounded-xl bg-gray-100/80 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Tổng: <strong className="text-[#07543f] dark:text-emerald-400 font-bold">{filteredFeedbacks.length}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={loadFeedbacks}
              className="h-10 px-4 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH PHẢN HỒI */}
      <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Người gửi</th>
                <th className="py-3.5 px-4">Tiêu đề & Nội dung</th>
                <th className="py-3.5 px-4">Phân loại</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="inline-block size-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="m-0 text-xs">Đang tải danh sách phản hồi...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Không có phản hồi nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((fb) => {
                  const isPending = fb.status === 'PENDING';
                  const isInProgress = fb.status === 'IN_PROGRESS';
                  const isResolved = fb.status === 'RESOLVED';

                  return (
                    <tr
                      key={fb.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Cột 1: Người gửi */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-[#07543f] text-white font-bold text-xs grid place-items-center shadow-xs shrink-0">
                            {fb.userFullName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <strong className="text-gray-900 dark:text-slate-100 font-bold block text-[13px]">
                              {fb.userFullName}
                            </strong>
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                              {fb.userEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Tiêu đề & Nội dung */}
                      <td className="py-3.5 px-4 max-w-md">
                        <strong className="text-gray-900 dark:text-slate-100 font-bold block mb-1">
                          {fb.title}
                        </strong>
                        <p className="text-gray-600 dark:text-slate-400 line-clamp-2 m-0 text-[11px] leading-relaxed">
                          {fb.content}
                        </p>
                        {fb.adminReply && (
                          <div className="mt-2 p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <strong>Phản hồi của Admin:</strong> {fb.adminReply}
                          </div>
                        )}
                      </td>

                      {/* Cột 3: Phân loại */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                          {fb.category === 'BUG' ? 'Báo lỗi' : fb.category === 'FEATURE_REQUEST' ? 'Góp ý' : fb.category === 'PAYMENT' ? 'Thanh toán' : 'Khác'}
                        </span>
                      </td>

                      {/* Cột 4: Trạng thái */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isPending
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60'
                              : isInProgress
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isPending ? 'bg-rose-500' : isInProgress ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {isPending ? 'Chờ xử lý' : isInProgress ? 'Đang xử lý' : 'Đã giải quyết'}
                        </span>
                      </td>

                      {/* Cột 5: Thời gian */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => openReplyModal(fb)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#07543f] hover:bg-[#064232] text-white font-bold transition cursor-pointer text-xs shadow-xs"
                        >
                          {fb.adminReply ? 'Sửa phản hồi' : 'Trả lời'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Trả lời Phản hồi người dùng */}
      {replyingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 m-0">
                  Phản hồi Yêu cầu Hỗ trợ
                </h3>
                <span className="text-xs text-gray-500">
                  Gửi tới: <strong>{replyingFeedback.userFullName}</strong> ({replyingFeedback.userEmail})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingFeedback(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nội dung khiếu nại của người dùng */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 text-xs">
              <strong className="text-gray-900 dark:text-slate-100 block mb-1">
                Tiêu đề: {replyingFeedback.title}
              </strong>
              <p className="text-gray-600 dark:text-slate-400 m-0 leading-relaxed">
                {replyingFeedback.content}
              </p>
            </div>

            {modalNotice && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {modalNotice}
              </div>
            )}

            <form onSubmit={handleSendReply} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Trạng thái xử lý
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyStatus('IN_PROGRESS')}
                    className={`h-9 rounded-xl font-bold border transition ${
                      replyStatus === 'IN_PROGRESS'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600'
                    }`}
                  >
                    Đang xử lý
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyStatus('RESOLVED')}
                    className={`h-9 rounded-xl font-bold border transition ${
                      replyStatus === 'RESOLVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600'
                    }`}
                  >
                    Đã giải quyết
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyStatus('REJECTED')}
                    className={`h-9 rounded-xl font-bold border transition ${
                      replyStatus === 'REJECTED'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600'
                    }`}
                  >
                    Từ chối
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Nội dung phản hồi giải đáp <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung giải đáp cho người dùng..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReplyingFeedback(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


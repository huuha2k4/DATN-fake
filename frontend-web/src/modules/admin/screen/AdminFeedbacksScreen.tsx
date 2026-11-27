import React, { useState } from 'react';
import { AdminDialog } from '../components/AdminDialog';
import { AdminBadge, AdminEmptyState, AdminNotice, AdminStatStrip, AdminSurface } from '../components/AdminPrimitives';
import { useAdminPage, useAdminIdempotency, adminError } from '../hooks/useAdminPage';
import { AdminPageFooter } from '../components/AdminPageFooter';
import { adminApi, type AdminFeedbackItem as FeedbackItem } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

const CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Báo lỗi',
  FEATURE: 'Đề xuất tính năng',
  FEATURE_REQUEST: 'Đề xuất tính năng',
  QUESTION: 'Hỏi đáp',
  GENERAL: 'Hỏi đáp',
  PAYMENT: 'Thanh toán',
  OTHER: 'Khác',
};

export const AdminFeedbacksScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const list = useAdminPage(adminApi.listFeedbacks, {
    size: 8,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });
  const feedbacks = list.data?.content ?? [];
  const { loading, error, search, setSearch } = list;
  const total = list.data?.totalElements ?? 0;
  const idempotency = useAdminIdempotency();

  const [replyingFeedback, setReplyingFeedback] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  const openReplyModal = (fb: FeedbackItem) => {
    setReplyingFeedback(fb);
    setReplyText(fb.adminReply || '');
    setReplyStatus(fb.status === 'PENDING' ? 'RESOLVED' : fb.status);
    setModalNotice('');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingFeedback) return;
    try {
      setIsSubmitting(true);
      setModalNotice('');
      const payload = {
        reply: replyText.trim(),
        status: replyStatus,
        expectedUpdatedAt: replyingFeedback.updatedAt,
      };
      await adminApi.replyFeedback(
        replyingFeedback.id,
        payload,
        idempotency.get({ id: replyingFeedback.id, ...payload })
      );
      idempotency.clear();
      setReplyingFeedback(null);
      list.reload();
    } catch (err: unknown) {
      setModalNotice(adminError(err, 'Lỗi khi gửi phản hồi'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = feedbacks.filter((f) => f.status === 'PENDING').length;
  const inProgressCount = feedbacks.filter((f) => f.status === 'IN_PROGRESS').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'RESOLVED').length;

  return (
    <div className="space-y-5">
      <AdminStatStrip
        busy={loading}
        items={[
          { label: 'Tổng yêu cầu hỗ trợ', value: total.toLocaleString('vi-VN'), icon: 'message', tone: 'sky' },
          {
            label: 'Chờ giải quyết (trang này)',
            value: pendingCount,
            icon: 'bell',
            tone: pendingCount > 0 ? 'rose' : 'default',
          },
          {
            label: 'Đang xử lý (trang này)',
            value: inProgressCount,
            icon: 'shield',
            tone: inProgressCount > 0 ? 'amber' : 'default',
          },
          { label: 'Đã giải quyết (trang này)', value: resolvedCount, icon: 'check', tone: 'emerald' },
        ]}
      />

      <AdminSurface noPadding busy={loading}>
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-[var(--admin-border)]">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-ink-muted)]">
              <FinanceIcon name="search" size={14} />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm phản hồi"
              placeholder="Tìm theo tiêu đề, nội dung, người gửi, email…"
              className="admin-input w-full pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Trạng thái phản hồi"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                list.setPage(0);
              }}
              className="admin-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ giải quyết</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
            </select>

            <select
              aria-label="Loại phản hồi"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                list.setPage(0);
              }}
              className="admin-select"
            >
              <option value="">Tất cả phân loại</option>
              <option value="BUG">Báo lỗi (Bug)</option>
              <option value="FEATURE">Đề xuất tính năng</option>
              <option value="QUESTION">Hỏi đáp / Hỗ trợ</option>
              <option value="PAYMENT">Thanh toán & Gói cước</option>
              <option value="OTHER">Khác</option>
              <option value="FEATURE_REQUEST">Đề xuất tính năng (Legacy)</option>
              <option value="GENERAL">Chung (Legacy)</option>
            </select>

            <button type="button" onClick={list.reload} className="admin-btn-secondary">
              <FinanceIcon name="refresh" size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Danh sách phản hồi">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người gửi</th>
                <th>Tiêu đề & Nội dung</th>
                <th>Phân loại</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && !feedbacks.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--admin-ink-muted)]">
                    Đang tải danh sách phản hồi…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-rose-600 dark:text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <AdminEmptyState
                      icon="message"
                      title="Không có phản hồi nào"
                      description="Chưa có phản hồi hoặc yêu cầu hỗ trợ khớp với bộ lọc hiện tại."
                    />
                  </td>
                </tr>
              ) : (
                feedbacks.map((fb) => {
                  const isPending = fb.status === 'PENDING';
                  const isInProgress = fb.status === 'IN_PROGRESS';
                  const isRejected = fb.status === 'REJECTED';

                  return (
                    <tr key={fb.id}>
                      <td>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-full bg-[var(--admin-selected)] text-[var(--admin-selected-text)] font-semibold text-xs grid place-items-center shrink-0">
                            {fb.userFullName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--admin-ink)] truncate">
                              {fb.userFullName}
                            </div>
                            <div className="text-xs text-[var(--admin-ink-muted)] truncate">
                              {fb.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-md">
                        <div className="font-semibold text-[var(--admin-ink)]">{fb.title}</div>
                        <p className="text-xs text-[var(--admin-ink-secondary)] line-clamp-2 m-0 mt-0.5">
                          {fb.content}
                        </p>
                        {fb.adminReply && (
                          <div className="mt-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <strong>Admin:</strong> {fb.adminReply}
                          </div>
                        )}
                      </td>

                      <td>
                        <AdminBadge dot={false} tone="slate">
                          {CATEGORY_LABELS[fb.category] ?? 'Khác'}
                        </AdminBadge>
                      </td>

                      <td>
                        <AdminBadge
                          tone={isPending ? 'rose' : isInProgress ? 'amber' : isRejected ? 'slate' : 'emerald'}
                        >
                          {isPending
                            ? 'Chờ xử lý'
                            : isInProgress
                            ? 'Đang xử lý'
                            : isRejected
                            ? 'Từ chối'
                            : 'Đã giải quyết'}
                        </AdminBadge>
                      </td>

                      <td className="text-xs text-[var(--admin-ink-muted)] whitespace-nowrap tabular-nums">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openReplyModal(fb)}
                          className="admin-btn-primary admin-btn-sm"
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

        <AdminPageFooter
          page={list.page}
          totalPages={list.data?.totalPages ?? 0}
          loading={list.loading}
          error={list.error}
          onPage={list.setPage}
          onRetry={list.reload}
        />
      </AdminSurface>

      {/* Drawer Phản hồi */}
      {replyingFeedback && (
        <AdminDialog
          label="Chi tiết phản hồi"
          onClose={() => setReplyingFeedback(null)}
          pending={isSubmitting}
          drawer
        >
          <div className="admin-dialog-body space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--admin-ink)] m-0">
                  Phản hồi yêu cầu hỗ trợ
                </h3>
                <p className="text-xs text-[var(--admin-ink-muted)] m-0 mt-0.5 truncate">
                  {replyingFeedback.userFullName} · {replyingFeedback.userEmail}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setReplyingFeedback(null)}
                aria-label="Đóng"
                className="admin-icon-button"
              >
                <FinanceIcon name="close" size={16} />
              </button>
            </div>

            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 text-xs space-y-1">
              <div className="font-semibold text-[var(--admin-ink)]">{replyingFeedback.title}</div>
              <p className="admin-wrap text-[var(--admin-ink-secondary)] m-0 leading-relaxed whitespace-pre-wrap">
                {replyingFeedback.content}
              </p>
            </div>

            {modalNotice && <AdminNotice tone="rose" message={modalNotice} />}

            <form onSubmit={handleSendReply} className="space-y-4 text-xs">
              <div className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>Trạng thái xử lý</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={
                      ['RESOLVED', 'REJECTED'].includes(replyingFeedback.status) &&
                      replyingFeedback.status !== 'IN_PROGRESS'
                    }
                    aria-pressed={replyStatus === 'IN_PROGRESS'}
                    onClick={() => setReplyStatus('IN_PROGRESS')}
                    className={`h-9 rounded-lg font-semibold border transition cursor-pointer ${
                      replyStatus === 'IN_PROGRESS'
                        ? 'bg-amber-500/12 border-amber-500/60 text-amber-800 dark:text-amber-300'
                        : 'border-[var(--admin-border)] text-[var(--admin-ink-secondary)] hover:bg-[var(--admin-surface-hover)]'
                    }`}
                  >
                    Đang xử lý
                  </button>
                  <button
                    type="button"
                    disabled={
                      ['RESOLVED', 'REJECTED'].includes(replyingFeedback.status) &&
                      replyingFeedback.status !== 'RESOLVED'
                    }
                    aria-pressed={replyStatus === 'RESOLVED'}
                    onClick={() => setReplyStatus('RESOLVED')}
                    className={`h-9 rounded-lg font-semibold border transition cursor-pointer ${
                      replyStatus === 'RESOLVED'
                        ? 'bg-emerald-500/12 border-emerald-500/60 text-emerald-800 dark:text-emerald-300'
                        : 'border-[var(--admin-border)] text-[var(--admin-ink-secondary)] hover:bg-[var(--admin-surface-hover)]'
                    }`}
                  >
                    Đã giải quyết
                  </button>
                  <button
                    type="button"
                    disabled={
                      ['RESOLVED', 'REJECTED'].includes(replyingFeedback.status) &&
                      replyingFeedback.status !== 'REJECTED'
                    }
                    aria-pressed={replyStatus === 'REJECTED'}
                    onClick={() => setReplyStatus('REJECTED')}
                    className={`h-9 rounded-lg font-semibold border transition cursor-pointer ${
                      replyStatus === 'REJECTED'
                        ? 'bg-rose-500/12 border-rose-500/60 text-rose-800 dark:text-rose-300'
                        : 'border-[var(--admin-border)] text-[var(--admin-ink-secondary)] hover:bg-[var(--admin-surface-hover)]'
                    }`}
                  >
                    Từ chối
                  </button>
                </div>
              </div>

              <label
                htmlFor="admin-feedback-reply"
                className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]"
              >
                <span>Nội dung phản hồi (không bắt buộc khi đổi trạng thái)</span>
                <textarea
                  rows={4}
                  id="admin-feedback-reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung giải đáp cho người dùng…"
                  className="admin-textarea w-full"
                  maxLength={4000}
                />
              </label>

              <div className="admin-dialog-actions">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setReplyingFeedback(null)}
                  className="admin-btn-secondary"
                >
                  Đóng
                </button>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary">
                  {isSubmitting ? 'Đang gửi…' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </AdminDialog>
      )}
    </div>
  );
};

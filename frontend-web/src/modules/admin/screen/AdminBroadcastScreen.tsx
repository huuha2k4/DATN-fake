import React, { useCallback, useEffect, useState } from 'react';
import { AdminDialog } from '../components/AdminDialog';
import {
  AdminBadge,
  AdminEmptyState,
  AdminNotice,
  AdminSurface,
  type BadgeTone,
} from '../components/AdminPrimitives';
import { useAdminPage, useAdminIdempotency, adminError } from '../hooks/useAdminPage';
import { AdminPageFooter } from '../components/AdminPageFooter';
import { adminApi, type AdminNotificationTemplate as NotificationTemplateItem } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

const QUICK_PRESETS: {
  type: string;
  label: string;
  title: string;
  body: string;
  priority: 'NORMAL' | 'HIGH';
  audience: 'ALL' | 'PREMIUM_ONLY' | 'FREE_ONLY';
  tone: BadgeTone;
}[] = [
    {
      type: 'MAINTENANCE',
      label: 'Bảo trì hệ thống',
      title: 'Thông báo bảo trì máy chủ định kỳ',
      body: 'Finora sẽ tiến hành bảo trì nâng cấp hệ thống từ [00:00] đến [02:00] ngày [DD/MM]. Trong thời gian này, các tính năng có thể bị gián đoạn tạm thời. Rất mong quý khách thông cảm!',
      priority: 'HIGH',
      audience: 'ALL',
      tone: 'rose',
    },
    {
      type: 'FEATURE',
      label: 'Tính năng mới',
      title: 'Trải nghiệm tính năng [Tên tính năng mới] trên Finora',
      body: 'Hệ thống vừa ra mắt tính năng [Tên tính năng]. Hãy cập nhật ứng dụng và trải nghiệm ngay hôm nay!',
      priority: 'NORMAL',
      audience: 'ALL',
      tone: 'emerald',
    },
    {
      type: 'PROMO',
      label: 'Ưu đãi & Khuyến mãi',
      title: 'Ưu đãi đặc biệt: Giảm [30%] nâng cấp gói VIP',
      body: 'Cơ hội sở hữu gói [Premium] với mức giá ưu đãi [30%] áp dụng từ ngày [DD/MM] đến [DD/MM]. Nâng cấp ngay để mở khóa không giới hạn tính năng!',
      priority: 'NORMAL',
      audience: 'ALL',
      tone: 'amber',
    },
    {
      type: 'SECURITY',
      label: 'Cảnh báo bảo mật',
      title: 'Khuyến cáo bảo mật tài khoản người dùng',
      body: 'Finora khuyến cáo người dùng không chia sẻ mã OTP hoặc mật khẩu cho bất kỳ ai. Vui lòng kích hoạt xác thực hai yếu tố để bảo vệ tài khoản an toàn.',
      priority: 'HIGH',
      audience: 'ALL',
      tone: 'sky',
    },
    {
      type: 'SURVEY',
      label: 'Khảo sát ý kiến',
      title: 'Khảo sát trải nghiệm người dùng Finora',
      body: 'Ý kiến đóng góp của bạn rất quan trọng với chúng tôi! Hãy dành 1 phút để đánh giá và giúp Finora hoàn thiện hơn mỗi ngày.',
      priority: 'NORMAL',
      audience: 'ALL',
      tone: 'slate',
    },
    {
      type: 'HOLIDAY',
      label: 'Chúc mừng lễ tết',
      title: 'Chúc mừng [Dịp lễ / Năm mới] từ đội ngũ Finora',
      body: 'Finora chúc bạn và gia đình một kỳ nghỉ [Dịp lễ] ngập tràn niềm vui, sức khỏe và đạt nhiều thành công trong quản lý tài chính cá nhân!',
      priority: 'NORMAL',
      audience: 'ALL',
      tone: 'emerald',
    },
    {
      type: 'POLICY_UPDATE',
      label: 'Cập nhật điều khoản',
      title: 'Thông báo cập nhật Điều khoản sử dụng & Chính sách bảo mật',
      body: 'Finora vừa cập nhật Chính sách bảo mật và Điều khoản dịch vụ mới có hiệu lực từ ngày [DD/MM]. Vui lòng xem chi tiết tại mục Cài đặt tài khoản.',
      priority: 'NORMAL',
      audience: 'ALL',
      tone: 'slate',
    },
    {
      type: 'SERVER_INCIDENT',
      label: 'Sự cố & Đã khắc phục',
      title: 'Thông báo: Hệ thống đã khắc phục sự cố kết nối',
      body: 'Sự cố gián đoạn dịch vụ vào lúc [00:00] đã được đội ngũ kỹ thuật xử lý hoàn tất. Mọi tính năng đồng bộ và dữ liệu của bạn đã hoạt động bình thường.',
      priority: 'HIGH',
      audience: 'ALL',
      tone: 'amber',
    },
  ];

export const AdminBroadcastScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'CREATE' | 'LOGS'>('TEMPLATES');
  const [legacy, setLegacy] = useState(false);
  const list = useAdminPage(adminApi.listBroadcastLogs, { size: 15, legacy }, activeTab === 'LOGS');
  const logs = list.data?.content ?? [];
  const idempotency = useAdminIdempotency();
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formAudience, setFormAudience] = useState<'ALL' | 'PREMIUM_ONLY' | 'FREE_ONLY'>('ALL');
  const [formPriority, setFormPriority] = useState<'NORMAL' | 'HIGH'>('NORMAL');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [togglingTemplate, setTogglingTemplate] = useState<string | null>(null);

  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setTemplates(await adminApi.listNotificationTemplates());
    } catch (err: unknown) {
      setError(adminError(err, 'Không thể tải mẫu thông báo'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const handleApplyPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setFormTitle(preset.title);
    setFormBody(preset.body);
    setFormPriority(preset.priority);
    setFormAudience(preset.audience);
    setBroadcastSuccess(`Đã áp dụng mẫu [${preset.label}], bạn có thể chỉnh sửa trước khi gửi.`);
    setTimeout(() => setBroadcastSuccess(''), 4000);
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) {
      setBroadcastError('Nhập tiêu đề và nội dung thông báo.');
      return;
    }
    setBroadcastError('');
    setConfirmSend(true);
  };

  const submitBroadcast = async () => {
    if (isBroadcasting) return;
    try {
      setIsBroadcasting(true);
      setBroadcastSuccess('');
      setBroadcastError('');
      const payload = {
        title: formTitle.trim(),
        body: formBody.trim(),
        targetAudience: formAudience,
        priority: formPriority,
      };
      const campaign = await adminApi.broadcastNotification(payload, idempotency.get(payload));
      idempotency.clear();
      setBroadcastSuccess(`Đã xếp hàng chiến dịch. Dự kiến ${campaign.expectedCount ?? 0} người nhận.`);
      setConfirmSend(false);
      setFormTitle('');
      setFormBody('');
      setLegacy(false);
      list.setPage(0);
      list.reload();
      setActiveTab('LOGS');
    } catch (err: unknown) {
      setBroadcastError(adminError(err, 'Không thể xếp hàng chiến dịch'));
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleToggleTemplate = async (templateId: string) => {
    if (togglingTemplate) return;
    try {
      setTogglingTemplate(templateId);
      const next = await adminApi.toggleNotificationTemplate(templateId);
      setTemplates((items) => items.map((item) => (item.id === next.id ? next : item)));
    } catch (err: unknown) {
      alert(adminError(err, 'Không thể thay đổi trạng thái mẫu thông báo'));
    } finally {
      setTogglingTemplate(null);
    }
  };

  const openEditTemplate = (item: NotificationTemplateItem) => {
    setEditingTemplate(item);
    setTemplateTitle(item.title);
    setTemplateBody(item.bodyTemplate);
    setModalNotice('');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    if (!templateTitle.trim() || !templateBody.trim()) {
      setModalNotice('Vui lòng nhập đầy đủ tiêu đề và nội dung mẫu');
      return;
    }
    try {
      setIsSubmitting(true);
      setModalNotice('');
      const next = await adminApi.updateNotificationTemplate(editingTemplate.id, {
        title: templateTitle.trim(),
        bodyTemplate: templateBody.trim(),
      });
      setTemplates((items) => items.map((item) => (item.id === next.id ? next : item)));
      setEditingTemplate(null);
    } catch (err: unknown) {
      setModalNotice(adminError(err, 'Không thể cập nhật mẫu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="admin-tabs" role="tablist" aria-label="Quản lý thông báo hệ thống">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'TEMPLATES'}
          onClick={() => setActiveTab('TEMPLATES')}
        >
          Mẫu tự động ({templates.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'CREATE'}
          onClick={() => setActiveTab('CREATE')}
        >
          Gửi thông báo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'LOGS'}
          onClick={() => setActiveTab('LOGS')}
        >
          Lịch sử chiến dịch ({list.data?.totalElements ?? 0})
        </button>
      </div>

      {broadcastError && <AdminNotice tone="rose" message={broadcastError} />}
      {activeTab === 'LOGS' && broadcastSuccess && (
        <AdminNotice tone="emerald" message={broadcastSuccess} onClose={() => setBroadcastSuccess('')} />
      )}

      {activeTab === 'TEMPLATES' && loading && !templates.length ? (
        <AdminSurface>
          <div className="flex items-center gap-3 py-8 text-xs text-[var(--admin-ink-muted)]">
            <div className="size-5 border-2 border-[#007f53] border-t-transparent rounded-full animate-spin" />
            <span>Đang tải dữ liệu thông báo hệ thống…</span>
          </div>
        </AdminSurface>
      ) : activeTab === 'TEMPLATES' && error ? (
        <AdminNotice
          tone="rose"
          message={error}
          action={
            <button type="button" onClick={loadData} className="admin-btn-secondary admin-btn-sm">
              Thử lại
            </button>
          }
        />
      ) : activeTab === 'TEMPLATES' ? (
        <AdminSurface noPadding title="Mẫu thông báo tự động" subtitle="Lịch gửi định kỳ và mẫu tin nhắn hệ thống">
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Bảng mẫu thông báo">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tiêu đề & Nội dung mẫu</th>
                  <th>Chu kỳ gửi</th>
                  <th>Đối tượng</th>
                  <th className="text-right">Đã gửi</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <AdminEmptyState icon="bell" title="Chưa có mẫu thông báo" />
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td className="max-w-md">
                        <div className="font-semibold text-[var(--admin-ink)]">{tpl.title}</div>
                        <p className="text-xs text-[var(--admin-ink-muted)] m-0 line-clamp-2 mt-0.5">
                          {tpl.bodyTemplate}
                        </p>
                      </td>
                      <td className="text-xs text-[var(--admin-ink-secondary)] whitespace-nowrap">
                        {tpl.scheduleCron === '0 20 * * *' || tpl.scheduleCron === '0 0 20 * * ?'
                          ? '20:00 hằng ngày (VN)'
                          : tpl.scheduleCron === '0 0 8 ? * MON'
                            ? '08:00 Thứ Hai hằng tuần (VN)'
                            : tpl.scheduleCron === '0 8 1 * *' || tpl.scheduleCron === '0 0 8 1 * ?'
                              ? '08:00 ngày 1 hằng tháng (VN)'
                              : tpl.scheduleCron === '0 9 * * *' || tpl.scheduleCron === '0 0 9 * * ?'
                                ? '09:00 hằng ngày (VN)'
                                : tpl.scheduleCron || 'Theo sự kiện'}
                      </td>
                      <td className="text-xs text-[var(--admin-ink-secondary)]">
                        {tpl.targetAudience === 'ALL'
                          ? 'Người dùng ACTIVE'
                          : tpl.targetAudience === 'FREE_ONLY'
                            ? 'Người dùng Free'
                            : tpl.targetAudience === 'PREMIUM_ONLY'
                              ? 'Người dùng VIP'
                              : 'Theo sự kiện'}
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {tpl.totalDispatched == null ? '—' : tpl.totalDispatched.toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <AdminBadge tone={tpl.isActive ? 'emerald' : 'slate'}>
                          {tpl.isActive == null ? 'Theo sự kiện' : tpl.isActive ? 'Đang bật' : 'Tạm tắt'}
                        </AdminBadge>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {tpl.editable ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditTemplate(tpl)}
                              className="admin-btn-secondary admin-btn-sm"
                            >
                              Sửa nội dung
                            </button>
                            <button
                              type="button"
                              disabled={togglingTemplate !== null}
                              onClick={() => handleToggleTemplate(tpl.id)}
                              className="admin-btn-secondary admin-btn-sm"
                            >
                              {tpl.isActive ? 'Tắt' : 'Bật'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--admin-ink-muted)]">Cố định</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurface>
      ) : activeTab === 'CREATE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] gap-5 items-start">
          {/* Cột Trái: Presets */}
          <AdminSurface
            noPadding
            title={`Mẫu gợi ý (${QUICK_PRESETS.length})`}
            subtitle="Chọn để điền nhanh nội dung"
          >
            <div className="divide-y divide-[var(--admin-border)] max-h-[34rem] overflow-y-auto">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-3.5 hover:bg-[var(--admin-surface-subtle)] transition-colors space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <AdminBadge dot={false} tone={preset.tone}>
                      {preset.label}
                    </AdminBadge>
                    <span className="text-[11px] font-medium text-[var(--admin-selected-text)]">Áp dụng</span>
                  </div>
                  <div className="text-xs font-semibold text-[var(--admin-ink)] line-clamp-1">
                    {preset.title}
                  </div>
                  <p className="text-[11px] text-[var(--admin-ink-muted)] m-0 line-clamp-2">
                    {preset.body}
                  </p>
                </button>
              ))}
            </div>
          </AdminSurface>

          {/* Cột Phải: Form soạn */}
          <AdminSurface
            title="Soạn & phát thông báo"
            subtitle="Gửi trực tiếp vào hộp thông báo người dùng (xếp hàng worker)"
            action={
              (formTitle || formBody) && (
                <button
                  type="button"
                  onClick={() => {
                    setFormTitle('');
                    setFormBody('');
                    setBroadcastSuccess('');
                  }}
                  className="admin-btn-ghost admin-btn-sm"
                >
                  Xóa trắng
                </button>
              )
            }
          >
            <div className="space-y-4">
              {broadcastSuccess && (
                <AdminNotice
                  tone="emerald"
                  message={broadcastSuccess}
                  onClose={() => setBroadcastSuccess('')}
                />
              )}

              <form id="broadcast-form" onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
                <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                  <span>
                    Tiêu đề thông báo <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Lịch bảo trì nâng cấp máy chủ Finora…"
                    className="admin-input"
                    required
                  />
                </label>

                <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                  <span>
                    Nội dung chi tiết <span className="text-rose-500">*</span>
                  </span>
                  <textarea
                    rows={5}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Nhập nội dung thông báo gửi đến người dùng…"
                    className="admin-textarea w-full leading-relaxed"
                    required
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                    <span>Đối tượng nhận thông báo</span>
                    <select
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value as typeof formAudience)}
                      className="admin-select"
                    >
                      <option value="ALL">Tất cả người dùng (All)</option>
                      <option value="PREMIUM_ONLY">Chỉ thành viên VIP (Premium & Enterprise)</option>
                      <option value="FREE_ONLY">Chỉ người dùng miễn phí (Free)</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                    <span>Mức độ ưu tiên</span>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as typeof formPriority)}
                      className="admin-select"
                    >
                      <option value="NORMAL">Bình thường (Tin tức / Lời nhắc)</option>
                      <option value="HIGH">Khẩn cấp (Bảo trì / Cảnh báo)</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-end pt-3 border-t border-[var(--admin-border)]">
                  <button type="submit" disabled={isBroadcasting} className="admin-btn-primary">
                    <FinanceIcon name="bell" size={15} />
                    {isBroadcasting ? 'Đang phát thông báo…' : 'Phát thông báo ngay'}
                  </button>
                </div>
              </form>
            </div>
          </AdminSurface>
        </div>
      ) : (
        <AdminSurface noPadding busy={list.loading}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--admin-border)]">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <input
                type="search"
                aria-label="Tìm chiến dịch theo tiêu đề"
                placeholder="Tìm theo tiêu đề chiến dịch…"
                value={list.search}
                onChange={(event) => list.setSearch(event.target.value)}
                className="admin-input w-full sm:w-64"
              />
              <label className="inline-flex items-center gap-2 text-xs text-[var(--admin-ink-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={legacy}
                  onChange={(event) => {
                    setLegacy(event.target.checked);
                    list.setPage(0);
                  }}
                  className="size-4 accent-[#007f53]"
                />
                <span>Bản ghi Legacy</span>
              </label>
            </div>
            <button
              type="button"
              onClick={list.reload}
              disabled={list.loading}
              className="admin-btn-secondary admin-btn-sm"
            >
              <FinanceIcon name="refresh" size={14} className={list.loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Lịch sử chiến dịch">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tiêu đề & Nội dung</th>
                  <th>Đối tượng</th>
                  <th>Ưu tiên</th>
                  <th>Dự kiến / Đã tạo / Đã đọc</th>
                  <th className="text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <AdminEmptyState
                        icon="bell"
                        title={
                          list.loading
                            ? 'Đang tải lịch sử…'
                            : list.error
                              ? 'Không tải được lịch sử.'
                              : 'Chưa có chiến dịch phù hợp'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-md">
                        <div className="font-semibold text-[var(--admin-ink)]">{item.title}</div>
                        <p className="text-xs text-[var(--admin-ink-muted)] m-0 line-clamp-2 mt-0.5">
                          {item.body}
                        </p>
                      </td>
                      <td>
                        <AdminBadge dot={false} tone="slate">
                          {item.targetAudience === 'PREMIUM_ONLY'
                            ? 'Chỉ VIP'
                            : item.targetAudience === 'FREE_ONLY'
                              ? 'Chỉ miễn phí'
                              : item.targetAudience === 'ALL'
                                ? 'Toàn bộ'
                                : 'N/A'}
                        </AdminBadge>
                      </td>
                      <td>
                        <AdminBadge
                          tone={item.priority === 'HIGH' || item.priority === 'URGENT' ? 'rose' : 'emerald'}
                        >
                          {item.priority === 'HIGH' || item.priority === 'URGENT'
                            ? 'Khẩn'
                            : item.priority === 'NORMAL'
                              ? 'Thường'
                              : item.priority === 'LOW'
                                ? 'Thấp'
                                : 'N/A'}
                        </AdminBadge>
                      </td>
                      <td>
                        <div className="font-semibold tabular-nums text-[var(--admin-ink)]">
                          {item.legacy
                            ? 'N/A'
                            : `${item.expectedCount ?? '—'} / ${item.recipientCount ?? '—'} / ${item.readCount ?? '—'}`}
                        </div>
                        <div className="text-[11px] text-[var(--admin-ink-muted)]">
                          {
                            {
                              QUEUED: 'Đang chờ',
                              PROCESSING: 'Đang tạo thông báo',
                              COMPLETED: 'Đã tạo xong',
                              LEGACY: 'Legacy',
                            }[item.status]
                          }
                        </div>
                      </td>
                      <td className="text-right text-xs text-[var(--admin-ink-muted)] whitespace-nowrap tabular-nums">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'N/A'}
                      </td>
                    </tr>
                  ))
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
      )}

      {/* Modal Sửa Template */}
      {editingTemplate && (
        <AdminDialog
          label="Chỉnh sửa mẫu thông báo"
          onClose={() => setEditingTemplate(null)}
          pending={isSubmitting}
        >
          <div className="admin-dialog-body space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--admin-ink)] m-0">
                  Cài đặt câu chữ thông báo tự động
                </h3>
                <p className="text-xs text-[var(--admin-ink-muted)] font-mono m-0 mt-0.5">
                  Sự kiện: {editingTemplate.triggerEvent}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setEditingTemplate(null)}
                aria-label="Đóng"
                className="admin-icon-button"
              >
                <FinanceIcon name="close" size={16} />
              </button>
            </div>

            {modalNotice && <AdminNotice tone="rose" message={modalNotice} />}

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <span>
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="admin-input"
                  required
                />
              </label>

              <label className="grid gap-1.5 font-medium text-[var(--admin-ink-secondary)]">
                <div className="flex items-center justify-between">
                  <span>
                    Nội dung câu chào / Lời nhắc <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-[var(--admin-ink-muted)]">
                    Biến: <code className="rounded bg-[var(--admin-surface-subtle)] px-1">{'{user_name}'}</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="admin-textarea w-full leading-relaxed"
                  required
                />
              </label>

              <div className="admin-dialog-actions">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingTemplate(null)}
                  className="admin-btn-secondary"
                >
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary">
                  {isSubmitting ? 'Đang lưu…' : 'Lưu cài đặt'}
                </button>
              </div>
            </form>
          </div>
        </AdminDialog>
      )}

      {/* Modal Xác nhận phát thông báo */}
      {confirmSend && (
        <AdminDialog
          label="Xác nhận gửi thông báo"
          pending={isBroadcasting}
          onClose={() => setConfirmSend(false)}
        >
          <div className="admin-dialog-body space-y-4">
            <h2 className="text-base font-bold text-[var(--admin-ink)] m-0">Xác nhận gửi thông báo</h2>
            <p className="text-xs text-[var(--admin-ink-secondary)] m-0">
              Chiến dịch sẽ được xếp hàng cho{' '}
              <strong>
                {formAudience === 'ALL'
                  ? 'tất cả người dùng'
                  : formAudience === 'PREMIUM_ONLY'
                    ? 'hội viên Premium'
                    : 'tài khoản Free'}
              </strong>
              .
            </p>
            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3 space-y-1">
              <div className="admin-wrap text-xs font-semibold text-[var(--admin-ink)]">{formTitle}</div>
              <p className="admin-wrap whitespace-pre-wrap text-xs text-[var(--admin-ink-secondary)] m-0">
                {formBody}
              </p>
            </div>
            {broadcastError && <AdminNotice tone="rose" message={broadcastError} />}
            <div className="admin-dialog-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                autoFocus
                onClick={() => setConfirmSend(false)}
                disabled={isBroadcasting}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => void submitBroadcast()}
                disabled={isBroadcasting}
              >
                {isBroadcasting ? 'Đang gửi…' : 'Xác nhận gửi'}
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
};

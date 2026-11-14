import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface BroadcastLogItem {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  priority: string;
  actionUrl?: string;
  actionText?: string;
  recipientCount: number;
  createdBy: string;
  createdAt: string;
}

interface NotificationTemplateItem {
  id: string;
  code: string;
  title: string;
  bodyTemplate: string;
  triggerEvent: string;
  scheduleCron?: string;
  targetAudience: string;
  priority: string;
  isActive: boolean;
  totalDispatched: number;
  lastDispatchedAt?: string;
  createdAt: string;
}

// Danh sách các mẫu thông báo sẵn có (Quick Presets) dạng khung sườn để Admin điền thông tin nhanh
const QUICK_PRESETS = [
  {
    type: 'MAINTENANCE',
    label: 'Bảo trì hệ thống',
    title: 'Thông báo bảo trì máy chủ định kỳ',
    body: 'Finora sẽ tiến hành bảo trì nâng cấp hệ thống từ [00:00] đến [02:00] ngày [DD/MM]. Trong thời gian này, các tính năng có thể bị gián đoạn tạm thời. Rất mong quý khách thông cảm!',
    placeholderTitle: 'Ví dụ: Lịch bảo trì nâng cấp máy chủ...',
    placeholderBody: 'Nhập nội dung bảo trì, khung giờ bảo trì...',
    priority: 'HIGH',
    audience: 'ALL',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60'
  },
  {
    type: 'FEATURE',
    label: 'Tính năng mới',
    title: 'Trải nghiệm tính năng [Tên tính năng mới] trên Finora 🚀',
    body: 'Hệ thống vừa ra mắt tính năng [Tên tính năng]. Hãy cập nhật ứng dụng và trải nghiệm ngay hôm nay!',
    placeholderTitle: 'Ví dụ: Ra mắt tính năng Báo cáo phân tích mới...',
    placeholderBody: 'Mô tả tính năng mới và hướng dẫn sử dụng nhanh...',
    priority: 'NORMAL',
    audience: 'ALL',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
  },
  {
    type: 'PROMO',
    label: 'Ưu đãi & Khuyến mãi',
    title: 'Ưu đãi đặc biệt: Giảm [30%] nâng cấp gói VIP 💎',
    body: 'Cơ hội sở hữu gói [Premium] với mức giá ưu đãi [30%] áp dụng từ ngày [DD/MM] đến [DD/MM]. Nâng cấp ngay để mở khóa không giới hạn tính năng!',
    placeholderTitle: 'Ví dụ: Ưu đãi nâng cấp VIP tuần này...',
    placeholderBody: 'Nội dung chương trình khuyến mãi, thời hạn ưu đãi...',
    priority: 'NORMAL',
    audience: 'ALL',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60'
  },
  {
    type: 'SECURITY',
    label: 'Cảnh báo bảo mật',
    title: 'Khuyến cáo bảo mật tài khoản người dùng 🔒',
    body: 'Finora khuyến cáo người dùng không chia sẻ mã OTP hoặc mật khẩu cho bất kỳ ai. Vui lòng kích hoạt xác thực hai yếu tố để bảo vệ tài khoản an toàn.',
    placeholderTitle: 'Ví dụ: Cảnh báo bảo mật thông tin tài khoản...',
    placeholderBody: 'Nội dung khuyến cáo an toàn bảo mật tài khoản...',
    priority: 'HIGH',
    audience: 'ALL',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60'
  },
  {
    type: 'SURVEY',
    label: 'Khảo sát ý kiến',
    title: 'Khảo sát trải nghiệm người dùng Finora 📝',
    body: 'Ý kiến đóng góp của bạn rất quan trọng với chúng tôi! Hãy dành 1 phút để đánh giá và giúp Finora hoàn thiện hơn mỗi ngày.',
    placeholderTitle: 'Ví dụ: Khảo sát chất lượng dịch vụ...',
    placeholderBody: 'Nội dung kêu gọi người dùng đóng góp ý kiến...',
    priority: 'NORMAL',
    audience: 'ALL',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60'
  },
  {
    type: 'HOLIDAY',
    label: 'Chúc mừng lễ tết',
    title: 'Chúc mừng [Dịp lễ / Năm mới] từ đội ngũ Finora 🎉',
    body: 'Finora chúc bạn và gia đình một kỳ nghỉ [Dịp lễ] ngập tràn niềm vui, sức khỏe và đạt nhiều thành công trong quản lý tài chính cá nhân!',
    placeholderTitle: 'Ví dụ: Chúc mừng năm mới...',
    placeholderBody: 'Lời chúc mừng từ ban quản trị...',
    priority: 'NORMAL',
    audience: 'ALL',
    badgeClass: 'bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200/60'
  },
  {
    type: 'POLICY_UPDATE',
    label: 'Cập nhật điều khoản',
    title: 'Thông báo cập nhật Điều khoản sử dụng & Chính sách bảo mật 📜',
    body: 'Finora vừa cập nhật Chính sách bảo mật và Điều khoản dịch vụ mới có hiệu lực từ ngày [DD/MM]. Vui lòng xem chi tiết tại mục Cài đặt tài khoản.',
    placeholderTitle: 'Ví dụ: Cập nhật điều khoản dịch vụ...',
    placeholderBody: 'Nội dung thay đổi chính sách, thời gian áp dụng...',
    priority: 'NORMAL',
    audience: 'ALL',
    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60'
  },
  {
    type: 'SERVER_INCIDENT',
    label: 'Sự cố & Đã khắc phục',
    title: 'Thông báo: Hệ thống đã khắc phục sự cố kết nối 🛠️',
    body: 'Sự cố gián đoạn dịch vụ vào lúc [00:00] đã được đội ngũ kỹ thuật xử lý hoàn tất. Mọi tính năng đồng bộ và dữ liệu của bạn đã hoạt động bình thường.',
    placeholderTitle: 'Ví dụ: Thông báo khắc phục sự cố...',
    placeholderBody: 'Mô tả tình trạng khắc phục, lời cảm ơn người dùng kiên nhẫn...',
    priority: 'HIGH',
    audience: 'ALL',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60'
  }
];

// Hàm dịch Cron expression sang tiếng Việt dễ hiểu
function formatScheduleCron(triggerEvent: string, cron?: string): { typeBadge: string; detail: string; badgeColor: string } {
  if (triggerEvent === 'WELCOME_ONBOARDING') {
    return {
      typeBadge: 'Theo sự kiện',
      detail: 'Gửi ngay khi tài khoản đăng ký mới',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60'
    };
  }
  if (triggerEvent === 'OCR_LIMIT_WARNING') {
    return {
      typeBadge: 'Theo sự kiện',
      detail: 'Gửi khi tài khoản quét chạm 80% hạn mức tháng',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60'
    };
  }
  if (triggerEvent === 'DAILY_NO_EXPENSE_CHECK' || (cron && cron.includes('20 * * *'))) {
    return {
      typeBadge: 'Định kỳ Hàng ngày',
      detail: 'Mỗi tối lúc 20:00 (nếu trong ngày chưa có giao dịch)',
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60'
    };
  }
  if (cron && cron.includes('1 * *') || triggerEvent.includes('MONTHLY')) {
    return {
      typeBadge: 'Định kỳ Hàng tháng',
      detail: 'Ngày 01 hàng tháng lúc 08:00 sáng',
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60'
    };
  }
  if (cron && (cron.includes('MON') || cron.includes('* * 1') || cron.includes('* * 0')) || triggerEvent.includes('WEEKLY')) {
    return {
      typeBadge: 'Định kỳ Hàng tuần',
      detail: 'Sáng Thứ Hai hàng tuần lúc 08:00',
      badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60'
    };
  }
  if (triggerEvent.includes('VIP')) {
    return {
      typeBadge: 'Định kỳ Hàng ngày',
      detail: 'Quét mỗi ngày lúc 09:00 sáng',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60'
    };
  }
  return {
    typeBadge: 'Định kỳ',
    detail: `Lịch chạy: ${cron}`,
    badgeColor: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
  };
}

export const AdminBroadcastScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'CREATE' | 'LOGS'>('TEMPLATES');
  const [logs, setLogs] = useState<BroadcastLogItem[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form Thêm thông báo mới (Phát tức thì)
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formAudience, setFormAudience] = useState<'ALL' | 'PREMIUM_ONLY' | 'FREE_ONLY'>('ALL');
  const [formPriority, setFormPriority] = useState<'NORMAL' | 'HIGH'>('NORMAL');
  const [formActionUrl, setFormActionUrl] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Modal Sửa Template Tự Động
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateItem | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templatePriority, setTemplatePriority] = useState('NORMAL');
  const [templateAudience, setTemplateAudience] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [resTemplates, resLogs] = await Promise.all([
        adminApi.listNotificationTemplates(),
        adminApi.listBroadcastLogs(),
      ]);
      setTemplates(resTemplates || []);
      setLogs(resLogs || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu thông báo hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setFormTitle(preset.title);
    setFormBody(preset.body);
    setFormPriority(preset.priority as any);
    setFormAudience(preset.audience as any);
    setBroadcastSuccess(`Đã áp dụng mẫu [${preset.label}], bạn có thể chỉnh sửa trước khi bấm Gửi!`);
    setTimeout(() => setBroadcastSuccess(''), 4000);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    try {
      setIsBroadcasting(true);
      setBroadcastSuccess('');
      const newLog = await adminApi.broadcastNotification({
        title: formTitle.trim(),
        body: formBody.trim(),
        targetAudience: formAudience,
        priority: formPriority,
        actionUrl: formActionUrl.trim() || undefined
      });
      setBroadcastSuccess(`Đã phát thông báo thành công tới ${newLog.recipientCount} tài khoản người dùng!`);
      // Reset form
      setFormTitle('');
      setFormBody('');
      setFormActionUrl('');
      // Reload logs
      const updatedLogs = await adminApi.listBroadcastLogs();
      setLogs(updatedLogs);
      setTimeout(() => {
        setBroadcastSuccess('');
        setActiveTab('LOGS');
      }, 2000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi khi phát thông báo');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleToggleTemplate = async (templateId: string) => {
    try {
      await adminApi.toggleNotificationTemplate(templateId);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể thay đổi trạng thái mẫu thông báo');
    }
  };

  const openEditTemplate = (item: NotificationTemplateItem) => {
    setEditingTemplate(item);
    setTemplateTitle(item.title);
    setTemplateBody(item.bodyTemplate);
    setTemplatePriority(item.priority || 'NORMAL');
    setTemplateAudience(item.targetAudience || 'ALL');
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
      await adminApi.updateNotificationTemplate(editingTemplate.id, {
        title: templateTitle.trim(),
        bodyTemplate: templateBody.trim(),
        priority: templatePriority,
        targetAudience: templateAudience,
      });
      setEditingTemplate(null);
      loadData();
    } catch (err: any) {
      setModalNotice(err?.response?.data?.message || 'Lỗi khi cập nhật mẫu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. THANH CHUYỂN TAB ĐỒNG BỘ */}
      <div className="overview-main-panel !p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'TEMPLATES'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            <FinanceIcon name="spark" size={15} />
            <span>Thông báo Tự động theo Chu kỳ ({templates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREATE')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'CREATE'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            <FinanceIcon name="plus" size={15} />
            <span>Tạo & Phát thông báo mới</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'LOGS'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
            }`}
          >
            <FinanceIcon name="bell" size={15} />
            <span>Nhật ký Thông báo Hệ thống ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. NỘI DUNG THEO TAB */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Đang tải dữ liệu thông báo hệ thống...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
          <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : activeTab === 'TEMPLATES' ? (
        /* TAB 1: THÔNG BÁO TỰ ĐỘNG THEO CHU KỲ & SỰ KIỆN */
        <div className="flex flex-col gap-4">
          <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Loại thông báo & Lời chào mẫu</th>
                    <th className="py-3.5 px-4">Chu kỳ gửi tự động</th>
                    <th className="py-3.5 px-4">Đối tượng</th>
                    <th className="py-3.5 px-4 text-center">Đã gửi trong DB</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-5 text-center w-64">Thao tác quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
                  {templates.map((tpl) => {
                    const sched = formatScheduleCron(tpl.triggerEvent, tpl.scheduleCron);

                    return (
                      <tr key={tpl.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Cột 1: Thông báo & câu chữ */}
                        <td className="py-4 px-5 max-w-sm">
                          <strong className="text-gray-900 dark:text-slate-100 font-bold block text-[13px] mb-1">
                            {tpl.title}
                          </strong>
                          <p className="text-gray-500 dark:text-slate-400 m-0 line-clamp-2 text-[11px] leading-relaxed">
                            {tpl.bodyTemplate}
                          </p>
                        </td>

                        {/* Cột 2: Chu kỳ ngày/tuần/tháng rõ ràng */}
                        <td className="py-4 px-4 min-w-[190px]">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${sched.badgeColor}`}>
                            {sched.typeBadge}
                          </span>
                          <span className="block text-[11px] text-gray-600 dark:text-slate-400 mt-1 font-medium">
                            {sched.detail}
                          </span>
                        </td>

                        {/* Cột 3: Đối tượng */}
                        <td className="py-4 px-4">
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-300">
                            {tpl.targetAudience === 'PREMIUM_ONLY' ? 'Chỉ VIP' : 'Toàn bộ'}
                          </span>
                        </td>

                        {/* Cột 4: Đã gửi tự động thật */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-sm text-[#07543f] dark:text-emerald-400">
                          {tpl.totalDispatched} lượt
                        </td>

                        {/* Cột 5: Trạng thái */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                              tpl.isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                                : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${tpl.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            {tpl.isActive ? 'Đang kích hoạt' : 'Tạm tắt'}
                          </span>
                        </td>

                        {/* Cột 6: Thao tác đặt chính giữa hàng, không bị rớt dòng */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditTemplate(tpl)}
                              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 font-bold hover:border-emerald-500 hover:text-emerald-600 transition cursor-pointer text-xs whitespace-nowrap shadow-2xs"
                            >
                              Cài đặt câu chữ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleTemplate(tpl.id)}
                              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer text-xs whitespace-nowrap min-w-[56px] text-center shadow-2xs ${
                                tpl.isActive
                                  ? 'border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {tpl.isActive ? 'Tắt' : 'Bật'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'CREATE' ? (
        /* TAB 2: TẠO & PHÁT THÔNG BÁO MỚI (CÂN ĐỐI THEO CHIỀU CAO VIEWPORT, KHÔNG BỊ TRÀN MÀN HÌNH) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Cột Trái: Các mẫu gợi ý - Khống chế chiều cao theo viewport và hỗ trợ cuộn êm ái */}
          <div className="overview-main-panel flex flex-col gap-3.5 h-[620px] max-h-[75vh]">
            <div className="shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 m-0">
                  <FinanceIcon name="spark" size={16} />
                  Mẫu thông báo gợi ý ({QUICK_PRESETS.length})
                </h3>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-normal">
                Click vào mẫu để điền nhanh khung sườn. Cuộn danh sách để xem thêm các mẫu khác.
              </p>
            </div>

            {/* Container cuộn danh sách mẫu (chỉ hiển thị 3 - 4 cái vừa vặn) */}
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {QUICK_PRESETS.map((preset) => (
                <div
                  key={preset.type}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 hover:border-emerald-500 hover:bg-emerald-50/30 transition cursor-pointer group shrink-0"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${preset.badgeClass}`}>
                      {preset.label}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                      Áp dụng →
                    </span>
                  </div>
                  <strong className="text-xs text-gray-800 dark:text-slate-200 block line-clamp-1 mb-1">
                    {preset.title}
                  </strong>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 m-0 line-clamp-2 leading-relaxed">
                    {preset.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cột Phải: Form soạn và phát thông báo vào DB thật (Chiều cao đồng bộ với cột trái) */}
          <div className="lg:col-span-2 overview-main-panel flex flex-col justify-between h-[620px] max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 m-0">
                    <FinanceIcon name="bell" size={16} />
                    Soạn & Phát thông báo trực tiếp
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Gửi trực tiếp vào chuông thông báo của người dùng (Lưu vào PostgreSQL thật)
                  </p>
                </div>
                {(formTitle || formBody) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormTitle('');
                      setFormBody('');
                      setBroadcastSuccess('');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
                  >
                    Xóa trắng form
                  </button>
                )}
              </div>

              {broadcastSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <FinanceIcon name="check" size={16} />
                  <span>{broadcastSuccess}</span>
                </div>
              )}

              <form id="broadcast-form" onSubmit={handleBroadcastSubmit} className="flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Tiêu đề thông báo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Lịch bảo trì nâng cấp máy chủ Finora..."
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Nội dung chi tiết thông báo <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Nhập nội dung thông báo gửi đến chuông người dùng..."
                    className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs focus:outline-none focus:border-emerald-500 leading-relaxed"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Đối tượng nhận thông báo
                    </label>
                    <select
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Tất cả người dùng (All)</option>
                      <option value="PREMIUM_ONLY">Chỉ thành viên VIP (Premium & Enterprise)</option>
                      <option value="FREE_ONLY">Chỉ người dùng miễn phí (Free)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Mức độ ưu tiên
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="NORMAL">Bình thường (Tin tức / Lời nhắc)</option>
                      <option value="HIGH">Khẩn cấp (Bảo trì / Cảnh báo tài khoản)</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 mt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="submit"
                form="broadcast-form"
                disabled={isBroadcasting}
                className="px-6 py-2.5 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 text-xs"
              >
                <FinanceIcon name="bell" size={16} />
                <span>{isBroadcasting ? 'Đang phát thông báo...' : 'Phát thông báo ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: NHẬT KÝ THÔNG BÁO HỆ THỐNG ĐÃ PHÁT (KHỐNG CHẾ CHIỀU CAO THEO VIEWPORT, KHÔNG BỊ TRÀN MÀN HÌNH) */
        <div className="overview-main-panel !p-0 overflow-hidden shadow-2xs h-[620px] max-h-[75vh] flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#edf2ee] dark:border-slate-800 bg-gray-50/95 dark:bg-slate-850/95 backdrop-blur-xs text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Tiêu đề & Nội dung</th>
                  <th className="py-3.5 px-4">Đối tượng</th>
                  <th className="py-3.5 px-4">Mức độ ưu tiên</th>
                  <th className="py-3.5 px-4">Số lượng đã nhận</th>
                  <th className="py-3.5 px-5 text-right">Thời gian phát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2ee] dark:divide-slate-800 text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      Chưa có thông báo nào được ghi nhận
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5 max-w-md">
                        <strong className="text-gray-900 dark:text-slate-100 block font-bold text-[13px] mb-0.5">
                          {item.title}
                        </strong>
                        <p className="text-gray-500 dark:text-slate-400 m-0 line-clamp-2 text-[11px] leading-relaxed">
                          {item.body}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                          {item.targetAudience === 'PREMIUM_ONLY' ? 'Chỉ VIP' : 'Toàn bộ'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            item.priority === 'HIGH' || item.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                          }`}
                        >
                          {item.priority === 'HIGH' || item.priority === 'URGENT' ? 'Khẩn' : 'Thường'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#07543f] dark:text-emerald-400">
                        {item.recipientCount} user
                      </td>
                      <td className="py-3.5 px-5 text-right text-gray-400 text-[11px]">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cài đặt câu chữ Mẫu thông báo tự động */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 m-0">
                  Cài đặt Câu chữ Thông báo Tự động
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  Sự kiện: {editingTemplate.triggerEvent}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalNotice && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {modalNotice}
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-slate-300">
                    Nội dung câu chào / Lời nhắc <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400">
                    Hỗ trợ biến: <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">{'{user_name}'}</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 dark:text-slate-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

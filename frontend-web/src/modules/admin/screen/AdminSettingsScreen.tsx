import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { FinanceIcon } from '../../core/components/FinanceIcon';

interface SystemSettingItem {
  key: string;
  value: string;
  group: string;
  description: string;
  updatedAt: string;
}

// Bảng từ điển ánh xạ tham số chuẩn theo key
const SETTING_METADATA: Record<string, { label: string; unit?: string; icon: string; hint: string; type: 'BOOLEAN' | 'NUMBER' | 'STRING' }> = {
  MAINTENANCE_MODE: {
    label: 'Chế độ Bảo trì Hệ thống',
    icon: 'shield',
    type: 'BOOLEAN',
    hint: 'Khi bật, người dùng thông thường sẽ không thể đăng nhập hoặc thực hiện giao dịch mới.'
  },
  ALLOW_REGISTRATION: {
    label: 'Cho phép Đăng ký Tài khoản mới',
    icon: 'users',
    type: 'BOOLEAN',
    hint: 'Bật/Tắt tính năng tạo tài khoản mới từ trang đăng nhập ứng dụng.'
  },
  FREE_TIER_MAX_WALLETS: {
    label: 'Số ví tối đa (Gói Miễn phí)',
    unit: 'Ví',
    icon: 'wallet',
    type: 'NUMBER',
    hint: 'Số lượng ví tài khoản tối đa mà người dùng gói Free được phép tạo.'
  },
  FREE_TIER_OCR_LIMIT: {
    label: 'Hạn mức quét OCR / tháng (Gói Free)',
    unit: 'Lượt/tháng',
    icon: 'receipt',
    type: 'NUMBER',
    hint: 'Số lượt quét hóa đơn bằng công nghệ OCR miễn phí mỗi tháng.'
  },
  PREMIUM_TIER_PRICE_MONTHLY: {
    label: 'Giá gói Hội viên Premium',
    unit: 'VNĐ/tháng',
    icon: 'spark',
    type: 'NUMBER',
    hint: 'Mức phí gia hạn gói Premium hàng tháng thanh toán qua cổng thanh toán.'
  },
  ENTERPRISE_TIER_PRICE_MONTHLY: {
    label: 'Giá gói Doanh nghiệp (Enterprise)',
    unit: 'VNĐ/tháng',
    icon: 'trend',
    type: 'NUMBER',
    hint: 'Mức phí hàng tháng cho tài khoản quy mô tổ chức và công ty.'
  },
  AI_RESPONSE_TEMPERATURE: {
    label: 'Độ sáng tạo FinAI (Temperature)',
    unit: '0.0 - 1.0',
    icon: 'bot',
    type: 'NUMBER',
    hint: 'Chỉ số từ 0.0 (chính xác, logic toán) đến 1.0 (sáng tạo, giàu biểu cảm).'
  },
  SESSION_TIMEOUT_HOURS: {
    label: 'Thời gian hết hạn phiên đăng nhập',
    unit: 'Giờ',
    icon: 'calendar',
    type: 'NUMBER',
    hint: 'Thời lượng duy trì JWT token trước khi bắt buộc đăng nhập lại.'
  }
};

export const AdminSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('ALL');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data: any = await adminApi.listSettings();
      // Chuẩn hóa dữ liệu trả về từ backend (key/value/group)
      const safeData: SystemSettingItem[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        key: item.key || item.settingKey || '',
        value: item.value || item.settingValue || '',
        group: (item.group || item.settingGroup || 'SYSTEM').toUpperCase(),
        description: item.description || '',
        updatedAt: item.updatedAt || ''
      }));

      setSettings(safeData);
      const valMap: Record<string, string> = {};
      safeData.forEach(item => {
        if (item.key) {
          valMap[item.key] = item.value;
        }
      });
      setFormValues(valMap);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể tải danh sách cấu hình');
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleToggle = async (item: SystemSettingItem) => {
    const currentVal = formValues[item.key] === 'true';
    const nextVal = (!currentVal).toString();
    setFormValues(prev => ({ ...prev, [item.key]: nextVal }));
    await handleSave(item.key, nextVal);
  };

  const handleSave = async (key: string, customVal?: string) => {
    try {
      setSavingKey(key);
      setSuccessMsg(null);
      setErrorMsg(null);
      const valToSave = customVal !== undefined ? customVal : (formValues[key] ?? '');
      await adminApi.updateSetting(key, valToSave);
      const label = SETTING_METADATA[key]?.label || key;
      setSuccessMsg(`Đã cập nhật [${label}] thành công!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      
      // Cập nhật lại giá trị gốc để ẩn nút Lưu
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: valToSave } : s));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || `Lỗi khi lưu cấu hình [${key}]`);
    } finally {
      setSavingKey(null);
    }
  };

  // Các nhóm chuẩn khớp với migration V41 trong Database
  const groups = [
    { id: 'ALL', label: 'Tất cả tham số', iconName: 'filter', groupKeys: [] },
    { id: 'SYSTEM', label: 'Hệ thống chung', iconName: 'chart', groupKeys: ['SYSTEM'] },
    { id: 'AUTH', label: 'Tài khoản & Đăng ký', iconName: 'shield', groupKeys: ['AUTH'] },
    { id: 'TIERS', label: 'Gói cước & Hạn mức', iconName: 'wallet', groupKeys: ['SUBSCRIPTION', 'PRICING'] },
    { id: 'AI', label: 'Trí tuệ nhân tạo (FinAI)', iconName: 'bot', groupKeys: ['AI'] },
    { id: 'SECURITY', label: 'Bảo mật & Phiên', iconName: 'shield', groupKeys: ['SECURITY'] }
  ];

  const filteredSettings = activeGroup === 'ALL'
    ? settings
    : settings.filter(s => {
        const currentGroupDef = groups.find(g => g.id === activeGroup);
        return currentGroupDef ? currentGroupDef.groupKeys.includes(s.group) : s.group === activeGroup;
      });

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. THANH CHUYỂN TAB ĐỒNG BỘ CHUẨN */}
      <div className="overview-main-panel !p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl shrink-0 overflow-x-auto max-w-full">
          {groups.map((g) => {
            const isActive = activeGroup === g.id;
            const count = g.id === 'ALL'
              ? settings.length
              : settings.filter(s => g.groupKeys.includes(s.group)).length;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                <FinanceIcon name={g.iconName} size={15} />
                <span>{g.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-[#e8f7f0] dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-300'
                    : 'bg-gray-200/70 dark:bg-slate-800 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thông báo trạng thái lưu */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
          <FinanceIcon name="check" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-semibold shadow-xs">
          <FinanceIcon name="alert" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. KHU VỰC THIẾT LẬP CẤU HÌNH (THIẾT KẾ CARD HIỆN ĐẠI, Ô NHẬP ĐẸP MẮT) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="size-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Đang tải danh sách tham số cấu hình...</p>
        </div>
      ) : filteredSettings.length === 0 ? (
        <div className="overview-main-panel text-center py-12 text-gray-400 text-xs">
          Chưa có tham số nào trong nhóm này
        </div>
      ) : (
        <div className="overview-main-panel !p-4 h-[630px] max-h-[75vh] flex flex-col">
          <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
              {filteredSettings.map(item => {
                const meta = SETTING_METADATA[item.key] || {
                  label: item.key,
                  icon: 'filter',
                  type: 'STRING',
                  hint: item.description
                };
                const isSaving = savingKey === item.key;
                const currentVal = formValues[item.key] ?? item.value;
                const isBool = meta.type === 'BOOLEAN' || currentVal === 'true' || currentVal === 'false';
                const hasChanged = currentVal !== item.value;

                return (
                  <div
                    key={item.key}
                    className="p-5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-gray-200 dark:hover:border-slate-700 transition flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Tiêu đề thân thiện + Icon + Badge Nhóm */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="size-9 rounded-xl grid place-items-center bg-[#e8f7f0] dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-300 shrink-0">
                            <FinanceIcon name={meta.icon} size={18} />
                          </span>
                          <div>
                            <strong className="text-[13px] font-bold text-gray-900 dark:text-slate-100 block">
                              {meta.label}
                            </strong>
                            <span className="text-[11px] text-gray-400 font-mono">
                              Mã: {item.key}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 uppercase tracking-wider shrink-0">
                          {item.group}
                        </span>
                      </div>

                      {/* Giải thích nghiệp vụ */}
                      <p className="text-xs text-gray-500 dark:text-slate-400 m-0 leading-relaxed pl-0.5">
                        {meta.hint || item.description}
                      </p>
                    </div>

                    {/* Bộ điều khiển tinh chỉnh (Switch bật/tắt hoặc Input đẹp mắt kèm Nút Lưu) */}
                    <div className="pt-3.5 border-t border-gray-100 dark:border-slate-800/80">
                      {isBool ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${currentVal === 'true' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
                              {currentVal === 'true' ? 'Kích hoạt (ON)' : 'Tạm tắt (OFF)'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggle(item)}
                            disabled={isSaving}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              currentVal === 'true' ? 'bg-[#07543f]' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            title="Bấm để bật/tắt"
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                currentVal === 'true' ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          {/* Ô nhập liệu thiết kế chuẩn UI */}
                          <div className="relative flex-1">
                            <input
                              type={meta.type === 'NUMBER' ? 'number' : 'text'}
                              value={currentVal}
                              onChange={(e) => handleInputChange(item.key, e.target.value)}
                              className="w-full h-11 pl-4 pr-16 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/70 text-xs font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition"
                              placeholder="Nhập giá trị..."
                            />
                            {meta.unit && (
                              <span className="absolute right-3.5 top-3 text-[11px] font-bold text-gray-400 dark:text-slate-500 pointer-events-none">
                                {meta.unit}
                              </span>
                            )}
                          </div>

                          {/* Nút lưu với animation mượt mà */}
                          <button
                            type="button"
                            onClick={() => handleSave(item.key)}
                            disabled={isSaving || !hasChanged}
                            className={`h-11 px-5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs shrink-0 shadow-2xs ${
                              hasChanged
                                ? 'bg-[#07543f] hover:bg-[#064232] text-white shadow-emerald-700/20 shadow-md'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed border border-gray-200/50 dark:border-slate-700/50'
                            }`}
                            title={hasChanged ? 'Lưu thay đổi vào Database' : 'Chưa có thay đổi'}
                          >
                            <FinanceIcon name="check" size={14} />
                            <span>{isSaving ? 'Đang lưu...' : 'Lưu'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

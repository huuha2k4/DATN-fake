import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

const NOTIFICATION_SETTINGS_FILE = 'finora_notification_settings.json';

export interface NotificationSettingsState {
  // 1. Nhóm nhắc nợ & Lịch tài chính
  remindersEnabled: boolean;
  debtDueReminder: boolean;
  scheduleDueReminder: boolean;
  remindAdvanceDays: number; // 0: Đúng ngày, 1: Trước 1 ngày, 2: Trước 2 ngày, 3: Trước 3 ngày

  // 2. Nhóm ngân sách & Chi tiêu
  budgetAlertEnabled: boolean;
  budgetThreshold80: boolean;
  budgetThreshold100: boolean;
  balanceForecastAlert: boolean;

  // 3. Nhóm giao dịch & Quỹ nhóm
  transactionSuccessNotify: boolean;
  groupExpenseNotify: boolean;

  // 4. Nhóm báo cáo định kỳ
  weeklyReportNotify: boolean;
  monthlyReportNotify: boolean;

  // 5. Cài đặt âm thanh & Rung
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsState = {
  remindersEnabled: true,
  debtDueReminder: true,
  scheduleDueReminder: true,
  remindAdvanceDays: 1, // Trước 1 ngày

  budgetAlertEnabled: true,
  budgetThreshold80: true,
  budgetThreshold100: true,
  balanceForecastAlert: true,

  transactionSuccessNotify: true,
  groupExpenseNotify: true,

  weeklyReportNotify: true,
  monthlyReportNotify: true,

  soundEnabled: true,
  vibrateEnabled: true,
};

let cachedSettings: NotificationSettingsState = { ...DEFAULT_NOTIFICATION_SETTINGS };
let isLoaded = false;

export const notificationSettingsStorage = {
  /**
   * Lấy cấu hình cài đặt thông báo (ưu tiên đồng bộ từ Backend, fallback FileSystem)
   */
  async getSettings(): Promise<NotificationSettingsState> {
    // 1. Thử lấy từ Backend nếu đã đăng nhập
    const token = authStorage.getToken();
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/notifications/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            cachedSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...json.data };
            isLoaded = true;
            // Lưu cache cục bộ
            try {
              const dir = FileSystem.documentDirectory;
              if (dir) {
                await FileSystem.writeAsStringAsync(
                  `${dir}${NOTIFICATION_SETTINGS_FILE}`,
                  JSON.stringify(cachedSettings)
                );
              }
            } catch (_) {}
            return cachedSettings;
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy notification settings từ Backend, dùng cache offline:', err);
      }
    }

    if (isLoaded) {
      return cachedSettings;
    }

    try {
      const dir = FileSystem.documentDirectory;
      if (dir) {
        const filePath = `${dir}${NOTIFICATION_SETTINGS_FILE}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          if (content) {
            const parsed = JSON.parse(content);
            cachedSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
            isLoaded = true;
            return cachedSettings;
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc notification settings:', e);
    }

    isLoaded = true;
    return cachedSettings;
  },

  /**
   * Lưu cấu hình cài đặt thông báo (lưu local ngay lập tức + đồng bộ ngầm lên Backend)
   */
  async saveSettings(newSettings: NotificationSettingsState): Promise<boolean> {
    cachedSettings = { ...newSettings };
    // 1. Lưu local để app phản hồi tức thì và hoạt động offline
    try {
      const dir = FileSystem.documentDirectory;
      if (dir) {
        const filePath = `${dir}${NOTIFICATION_SETTINGS_FILE}`;
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(newSettings));
      }
    } catch (e) {
      console.warn('Lỗi lưu notification settings offline:', e);
    }

    // 2. Đồng bộ ngầm lên server
    const token = authStorage.getToken();
    if (token) {
      fetch(`${API_BASE_URL}/api/v1/notifications/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      }).catch((err) => {
        console.warn('Đồng bộ notification settings lên server thất bại:', err);
      });
    }

    return true;
  },
};


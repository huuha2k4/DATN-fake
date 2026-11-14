import * as FileSystem from 'expo-file-system/legacy';

const APP_SETTINGS_FILE = 'finora_app_system_settings.json';

export type AppTheme = 'LIGHT' | 'DARK' | 'SYSTEM';
export type AppLanguage = 'vi' | 'en';
export type PrimaryCurrency = 'VND' | 'USD' | 'EUR' | 'JPY';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

export interface AppSystemSettingsState {
  // 1. Giao diện & Trải nghiệm
  theme: AppTheme;
  language: AppLanguage;

  // 2. Định dạng tài chính & Tiền tệ
  primaryCurrency: PrimaryCurrency;
  dateFormat: DateFormat;
  hideBalanceOnLaunch: boolean; // Ẩn số dư khi vừa mở app (bảo vệ quyền riêng tư nơi công cộng)

  // 3. Khóa bảo vệ ứng dụng
  appLockEnabled: boolean; // Bật khóa ứng dụng
  biometricEnabled: boolean; // Dùng FaceID / Vân tay mở khóa
  autoLockMinutes: number; // Tự động khóa sau 0 (ngay lập tức), 1, 5, 15 phút

  // 4. Hiệu năng & Bộ nhớ
  hapticFeedback: boolean; // Phản hồi rung xúc giác khi chạm
  autoCacheClean: boolean; // Tự dọn cache ảnh hóa đơn sau 30 ngày
}

export const DEFAULT_APP_SETTINGS: AppSystemSettingsState = {
  theme: 'LIGHT',
  language: 'vi',
  primaryCurrency: 'VND',
  dateFormat: 'DD/MM/YYYY',
  hideBalanceOnLaunch: false,
  appLockEnabled: false,
  biometricEnabled: false,
  autoLockMinutes: 1,
  hapticFeedback: true,
  autoCacheClean: true,
};

let cachedSettings: AppSystemSettingsState = { ...DEFAULT_APP_SETTINGS };
let isLoaded = false;

export const appSettingsStorage = {
  async getSettings(): Promise<AppSystemSettingsState> {
    if (isLoaded) {
      return cachedSettings;
    }
    try {
      const dir = FileSystem.documentDirectory;
      if (dir) {
        const filePath = `${dir}${APP_SETTINGS_FILE}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          if (content) {
            const parsed = JSON.parse(content);
            cachedSettings = { ...DEFAULT_APP_SETTINGS, ...parsed };
            isLoaded = true;
            return cachedSettings;
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc app system settings:', e);
    }
    isLoaded = true;
    return cachedSettings;
  },

  async saveSettings(newSettings: AppSystemSettingsState): Promise<boolean> {
    cachedSettings = { ...newSettings };
    try {
      const dir = FileSystem.documentDirectory;
      if (dir) {
        const filePath = `${dir}${APP_SETTINGS_FILE}`;
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(newSettings));
        return true;
      }
    } catch (e) {
      console.warn('Lỗi ghi app system settings:', e);
    }
    return false;
  },
};


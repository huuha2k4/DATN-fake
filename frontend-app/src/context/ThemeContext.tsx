import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { appSettingsStorage, type AppTheme } from '../modules/profile/api/appSettingsApi';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSubtle: string;
  cardBorder: string;
  divider: string;
  
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textWhite: string;
  textMint: string;
  
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accentGreen: string;
  brightGreen: string;
  
  income: string;
  expense: string;
  
  bottomNavBg: string;
  bottomNavBorder: string;
  tabInactive: string;
  
  bannerAiBg: string;
  bannerAiBorder: string;
  bannerForecastBg: string;
  
  cardShadow: string;
}

export const lightColors: ThemeColors = {
  isDark: false,
  background: '#F4F8F5',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAF9',
  cardBorder: '#E5EFE8',
  divider: '#F1F5F3',

  textPrimary: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
  textMint: '#A8EBCA',

  primary: '#007F53',
  primaryDark: '#004D3B',
  primaryLight: '#E8F8F0',
  accentGreen: '#00B86B',
  brightGreen: '#6CEB96',

  income: '#007F53',
  expense: '#EF3340',

  bottomNavBg: 'rgba(255, 255, 255, 0.94)',
  bottomNavBorder: '#E2E8F0',
  tabInactive: '#475569',

  bannerAiBg: '#E8F8F0',
  bannerAiBorder: '#C2EBD6',
  bannerForecastBg: '#F0FDF4',

  cardShadow: '#000000',
};

export const darkColors: ThemeColors = {
  isDark: true,
  background: '#0B1310', // Đen ngọc thẫm sang trọng
  surface: '#121F1A', // Thẻ card tối màu ngọc lục bảo
  surfaceSubtle: '#182923',
  cardBorder: '#1F372E',
  divider: '#1A3027',

  textPrimary: '#F1F5F9', // Chữ trắng sáng dễ đọc
  textSecondary: '#94A3B8', // Chữ phụ xám sáng
  textMuted: '#64748B',
  textWhite: '#FFFFFF',
  textMint: '#6EE7B7',

  primary: '#10B981', // Xanh lục bảo neon sáng nổi trên nền tối
  primaryDark: '#047857',
  primaryLight: '#133529',
  accentGreen: '#34D399',
  brightGreen: '#A7F3D0',

  income: '#34D399',
  expense: '#F87171',

  bottomNavBg: 'rgba(18, 31, 26, 0.96)',
  bottomNavBorder: '#1F372E',
  tabInactive: '#64748B',

  bannerAiBg: '#132820',
  bannerAiBorder: '#1E4435',
  bannerForecastBg: '#132820',

  cardShadow: '#000000',
};

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (newTheme: AppTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'LIGHT',
  isDark: false,
  colors: lightColors,
  setTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<AppTheme>('LIGHT');

  useEffect(() => {
    appSettingsStorage.getSettings().then((s) => {
      if (s?.theme) {
        setThemeState(s.theme);
      }
    });

    const unsubscribe = appSettingsStorage.subscribe?.((newSettings) => {
      if (newSettings?.theme) {
        setThemeState(newSettings.theme);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'DARK') return true;
    if (theme === 'LIGHT') return false;
    return systemScheme === 'dark';
  }, [theme, systemScheme]);

  const currentColors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const setTheme = async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    const curr = await appSettingsStorage.getSettings();
    await appSettingsStorage.saveSettings({ ...curr, theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: currentColors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert as NativeAlert,
  Platform,
} from 'react-native';
import { useAppTheme } from './ThemeContext';
import { FinanceIcon, type IconName } from '../modules/core/components/FinanceIcon';

export interface AlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AppDialogOptions {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'danger' | 'confirm';
  icon?: IconName;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

interface DialogContextValue {
  showDialog: (options: AppDialogOptions) => void;
  confirmDelete: (options: {
    title?: string;
    message?: string;
    itemName?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }) => void;
  showSuccess: (title: string, message?: string, onOk?: () => void) => void;
  showError: (title: string, message?: string, onOk?: () => void) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

// Global bridge for drop-in Alert replacement
let globalShowDialog: ((options: AppDialogOptions) => void) | null = null;

export const AppAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean }
  ) => {
    if (globalShowDialog) {
      let type: AppDialogOptions['type'] = 'info';
      const hasDestructive = buttons?.some((b) => b.style === 'destructive');
      if (hasDestructive || /xóa|hủy|từ chối|danger/i.test(title)) {
        type = 'danger';
      } else if (/thành công|hoàn thành|🎉/i.test(title)) {
        type = 'success';
      } else if (/lỗi|thất bại|cảnh báo|chú ý/i.test(title)) {
        type = 'warning';
      }

      globalShowDialog({
        title,
        message,
        type,
        buttons,
        cancelable: options?.cancelable ?? true,
      });
    } else {
      // Fallback nếu dialog chưa mount
      NativeAlert.alert(
        title,
        message,
        buttons?.map((b) => ({
          text: b.text,
          style: b.style,
          onPress: () => {
            const res = b.onPress?.();
            if (res instanceof Promise) {
              res.catch(console.error);
            }
          },
        })),
        options
      );
    }
  },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { isDark, colors: themeColors } = useAppTheme();
  const [currentDialog, setCurrentDialog] = useState<AppDialogOptions | null>(null);
  const [loadingButtonIndex, setLoadingButtonIndex] = useState<number | null>(null);

  const hideDialog = useCallback(() => {
    setCurrentDialog(null);
    setLoadingButtonIndex(null);
  }, []);

  const showDialog = useCallback((options: AppDialogOptions) => {
    setCurrentDialog(options);
    setLoadingButtonIndex(null);
  }, []);

  // Expose to global helper
  useEffect(() => {
    globalShowDialog = showDialog;
    return () => {
      globalShowDialog = null;
    };
  }, [showDialog]);

  const confirmDelete = useCallback(
    ({
      title = 'Xác nhận xóa',
      message,
      itemName,
      onConfirm,
      onCancel,
    }: {
      title?: string;
      message?: string;
      itemName?: string;
      onConfirm: () => void | Promise<void>;
      onCancel?: () => void;
    }) => {
      const msg =
        message ||
        (itemName
          ? `Bạn có chắc chắn muốn xóa "${itemName}" không?\nHành động này không thể hoàn tác.`
          : 'Bạn có chắc chắn muốn thực hiện hành động này không?');

      showDialog({
        title,
        message: msg,
        type: 'danger',
        icon: 'trash',
        buttons: [
          {
            text: 'Hủy bỏ',
            style: 'cancel',
            onPress: () => {
              hideDialog();
              onCancel?.();
            },
          },
          {
            text: 'Xóa vĩnh viễn',
            style: 'destructive',
            onPress: async () => {
              await onConfirm();
              hideDialog();
            },
          },
        ],
      });
    },
    [showDialog, hideDialog]
  );

  const showSuccess = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showDialog({
        title,
        message,
        type: 'success',
        icon: 'check',
        buttons: [
          {
            text: 'Đã hiểu',
            style: 'default',
            onPress: () => {
              hideDialog();
              onOk?.();
            },
          },
        ],
      });
    },
    [showDialog, hideDialog]
  );

  const showError = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showDialog({
        title,
        message,
        type: 'danger',
        icon: 'alert-circle',
        buttons: [
          {
            text: 'Đóng',
            style: 'default',
            onPress: () => {
              hideDialog();
              onOk?.();
            },
          },
        ],
      });
    },
    [showDialog, hideDialog]
  );

  const handleButtonPress = async (btn: AlertButton, index: number) => {
    if (loadingButtonIndex !== null) return;
    if (btn.onPress) {
      try {
        setLoadingButtonIndex(index);
        const result = btn.onPress();
        if (result instanceof Promise) {
          await result;
        }
        hideDialog();
      } catch (e) {
        console.error('Dialog action failed:', e);
        hideDialog();
      } finally {
        setLoadingButtonIndex(null);
      }
    } else {
      hideDialog();
    }
  };

  const getBadgeMeta = (type: AppDialogOptions['type'] = 'info') => {
    switch (type) {
      case 'danger':
        return {
          icon: 'trash' as IconName,
          bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
          iconColor: isDark ? '#F87171' : '#DC2626',
        };
      case 'success':
        return {
          icon: 'check' as IconName,
          bgColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7',
          borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#BBF7D0',
          iconColor: isDark ? themeColors.accentGreen : '#16A34A',
        };
      case 'warning':
        return {
          icon: 'alert-circle' as IconName,
          bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
          iconColor: isDark ? '#FBBF24' : '#D97706',
        };
      default:
        return {
          icon: 'info' as IconName,
          bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E0F2FE',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BAE6FD',
          iconColor: isDark ? '#60A5FA' : '#0284C7',
        };
    }
  };

  const buttons = currentDialog?.buttons?.length
    ? currentDialog.buttons
    : [{ text: 'Đồng ý', style: 'default' as const }];

  const meta = getBadgeMeta(currentDialog?.type);
  const activeIcon = currentDialog?.icon || meta.icon;

  return (
    <DialogContext.Provider
      value={{
        showDialog,
        confirmDelete,
        showSuccess,
        showError,
        hideDialog,
      }}
    >
      {children}

      <Modal
        visible={Boolean(currentDialog)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (currentDialog?.cancelable !== false) {
            hideDialog();
          }
        }}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (currentDialog?.cancelable !== false) {
                hideDialog();
              }
            }}
          />

          <View
            style={[
              styles.dialogCard,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            {/* Top Icon Badge */}
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: meta.bgColor,
                  borderColor: meta.borderColor,
                },
              ]}
            >
              <FinanceIcon name={activeIcon} size={28} color={meta.iconColor} />
            </View>

            {/* Title */}
            <Text
              style={[
                styles.dialogTitle,
                isDark && { color: themeColors.textPrimary },
              ]}
            >
              {currentDialog?.title}
            </Text>

            {/* Message */}
            {Boolean(currentDialog?.message) && (
              <Text
                style={[
                  styles.dialogMessage,
                  isDark && { color: themeColors.textSecondary },
                ]}
              >
                {currentDialog?.message}
              </Text>
            )}

            {/* Button Actions */}
            <View
              style={[
                styles.buttonRow,
                buttons.length > 2 && styles.buttonColumn,
              ]}
            >
              {buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isLoading = loadingButtonIndex === index;

                return (
                  <Pressable
                    key={index}
                    disabled={loadingButtonIndex !== null}
                    onPress={() => handleButtonPress(btn, index)}
                    style={({ pressed }) => [
                      styles.btnBase,
                      isCancel && [
                        styles.btnCancel,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                        },
                      ],
                      isDestructive && [
                        styles.btnDestructive,
                        isDark && { backgroundColor: '#DC2626' },
                      ],
                      !isCancel &&
                        !isDestructive && [
                          styles.btnDefault,
                          isDark && { backgroundColor: themeColors.accentGreen },
                        ],
                      buttons.length <= 2 && { flex: 1 },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={isCancel ? (isDark ? '#FFF' : '#333') : '#FFF'}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.btnText,
                          isCancel && [
                            styles.btnTextCancel,
                            isDark && { color: themeColors.textSecondary },
                          ],
                          isDestructive && styles.btnTextDestructive,
                          !isCancel && !isDestructive && styles.btnTextDefault,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within a DialogProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 99999,
    elevation: 99999,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 100000,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  btnBase: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDefault: {
    backgroundColor: '#074838',
  },
  btnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  btnTextDefault: {
    color: '#FFFFFF',
  },
  btnTextCancel: {
    color: '#475569',
  },
  btnTextDestructive: {
    color: '#FFFFFF',
  },
});

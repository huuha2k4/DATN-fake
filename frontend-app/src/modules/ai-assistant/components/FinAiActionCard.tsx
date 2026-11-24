import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FinanceIcon, resolveCategoryIconName, type IconName } from '../../core/components/FinanceIcon';
import type { FinAiActionResponse } from '../api/finAiAgentApi';
import { useAppTheme } from '../../../context/ThemeContext';

interface FinAiActionCardProps {
  action: FinAiActionResponse;
  onConfirm: (actionId: string) => Promise<void>;
  onCancel: (actionId: string) => Promise<void>;
  isProcessing?: boolean;
}

export function FinAiActionCard({
  action,
  onConfirm,
  onCancel,
  isProcessing = false,
}: FinAiActionCardProps) {
  const { isDark, colors: themeColors } = useAppTheme();
  const [internalLoading, setInternalLoading] = useState<'confirm' | 'cancel' | null>(null);

  const { toolName, title, description, preview, status, expiresAt, error } = action;

  const isPending = status === 'PENDING';
  const isExecuting = status === 'EXECUTING' || status === 'CONFIRMED';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';
  const isExpired = status === 'EXPIRED';
  const isFailed = status === 'FAILED';

  const formatCurrency = (amount?: number) => {
    if (amount == null) return '0 ₫';
    return Number(amount).toLocaleString('vi-VN') + ' ₫';
  };

  const formatDateDisplay = (rawDate?: string | null) => {
    if (!rawDate) return '';
    const trimmed = String(rawDate).trim();
    // YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    // DD/MM/YYYY already
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  };

  const handleConfirmClick = async () => {
    if (!isPending || isProcessing || internalLoading) return;
    setInternalLoading('confirm');
    try {
      await onConfirm(action.actionId);
    } finally {
      setInternalLoading(null);
    }
  };

  const handleCancelClick = async () => {
    if (!isPending || isProcessing || internalLoading) return;
    setInternalLoading('cancel');
    try {
      await onCancel(action.actionId);
    } finally {
      setInternalLoading(null);
    }
  };

  const renderBadge = () => {
    if (isPending) {
      return (
        <View
          style={[
            styles.badge,
            styles.badgePending,
            isDark && {
              backgroundColor: 'rgba(245, 158, 11, 0.22)',
              borderWidth: 1,
              borderColor: 'rgba(251, 191, 36, 0.45)',
            },
          ]}
        >
          <Text style={[styles.badgePendingText, isDark && { color: '#FCD34D' }]}>Chờ xác nhận</Text>
        </View>
      );
    }
    if (isExecuting) {
      return (
        <View
          style={[
            styles.badge,
            styles.badgeExecuting,
            isDark && {
              backgroundColor: 'rgba(14, 165, 233, 0.22)',
              borderWidth: 1,
              borderColor: 'rgba(56, 189, 248, 0.45)',
            },
          ]}
        >
          <ActivityIndicator size="small" color={isDark ? '#38BDF8' : '#2563EB'} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeExecutingText, isDark && { color: '#38BDF8' }]}>Đang thực thi</Text>
        </View>
      );
    }
    if (isCompleted) {
      return (
        <View
          style={[
            styles.badge,
            styles.badgeCompleted,
            isDark && {
              backgroundColor: 'rgba(16, 185, 129, 0.22)',
              borderWidth: 1,
              borderColor: 'rgba(52, 211, 153, 0.45)',
            },
          ]}
        >
          <Text style={[styles.badgeCompletedText, isDark && { color: '#34D399' }]}>✓ Hoàn thành</Text>
        </View>
      );
    }
    if (isCancelled) {
      return (
        <View
          style={[
            styles.badge,
            styles.badgeCancelled,
            isDark && {
              backgroundColor: '#1E293B',
              borderWidth: 1,
              borderColor: '#334155',
            },
          ]}
        >
          <Text style={[styles.badgeCancelledText, isDark && { color: '#94A3B8' }]}>✕ Đã hủy</Text>
        </View>
      );
    }
    if (isExpired) {
      return (
        <View
          style={[
            styles.badge,
            styles.badgeExpired,
            isDark && {
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.4)',
            },
          ]}
        >
          <Text style={[styles.badgeExpiredText, isDark && { color: '#FCA5A5' }]}>⏱️ Hết hạn</Text>
        </View>
      );
    }
    if (isFailed) {
      return (
        <View
          style={[
            styles.badge,
            styles.badgeFailed,
            isDark && {
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.4)',
            },
          ]}
        >
          <Text style={[styles.badgeFailedText, isDark && { color: '#FCA5A5' }]}>⚠️ Thất bại</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <Text style={{ fontSize: 11, color: isDark ? '#CBD5E1' : '#475569' }}>{status}</Text>
      </View>
    );
  };

  const renderTransactionPreview = () => {
    const rawType = preview.transactionType || preview.type;
    const isIncome = rawType === 'INCOME';
    const isTransfer = rawType === 'TRANSFER';
    const typeLabel = isIncome ? 'Thu nhập' : isTransfer ? 'Chuyển tiền' : 'Chi tiêu';

    const accountDisplayName =
      preview.accountName || preview.account || preview.accountId || null;
    const toAccountDisplayName =
      preview.toAccountName || preview.toAccount || preview.toAccountId || null;
    const categoryDisplayName =
      preview.categoryName || preview.category || preview.categoryId || null;
    const dateDisplay = preview.transactionDate || preview.date || null;
    const noteDisplay = preview.note || preview.description || null;

    return (
      <View style={styles.bodyWrap}>
        {/* Banner Số tiền nổi bật */}
        <View
          style={[
            styles.amountHighlightBox,
            isDark
              ? {
                  backgroundColor: '#132822',
                  borderWidth: 1,
                  borderColor: 'rgba(52, 211, 153, 0.25)',
                }
              : { backgroundColor: '#F8FAF9' },
          ]}
        >
          <Text style={[styles.amountLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Số tiền</Text>
          <Text
            style={[
              styles.amountValue,
              { color: isIncome ? '#34D399' : isTransfer ? '#38BDF8' : '#F87171' },
            ]}
          >
            {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(preview.amount)}
          </Text>
        </View>

        {/* Khung các trường thông tin kèm icon */}
        <View
          style={[
            styles.detailsContainer,
            isDark
              ? {
                  backgroundColor: '#132822',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(52, 211, 153, 0.2)',
                }
              : { backgroundColor: 'transparent' },
          ]}
        >
          {/* Tài khoản / Ví */}
          {accountDisplayName && (
            <View style={[styles.detailRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={styles.detailLabelCol}>
                <FinanceIcon name="credit-card" size={17} color={isDark ? '#6EE7B7' : '#64748B'} />
                <Text style={[styles.detailLabelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {isTransfer ? 'Ví nguồn' : 'Tài khoản / Ví'}
                </Text>
              </View>
              <Text style={[styles.detailValueText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                {accountDisplayName}
              </Text>
            </View>
          )}

          {/* Ví đích nếu là chuyển khoản */}
          {isTransfer && toAccountDisplayName && (
            <View style={[styles.detailRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={styles.detailLabelCol}>
                <FinanceIcon name="credit-card" size={17} color={isDark ? '#6EE7B7' : '#64748B'} />
                <Text style={[styles.detailLabelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Ví đích</Text>
              </View>
              <Text style={[styles.detailValueText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                {toAccountDisplayName}
              </Text>
            </View>
          )}

          {/* Danh mục */}
          {categoryDisplayName && (
            <View style={[styles.detailRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={styles.detailLabelCol}>
                <FinanceIcon name="tag" size={17} color={isDark ? '#6EE7B7' : '#64748B'} />
                <Text style={[styles.detailLabelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Danh mục</Text>
              </View>
              <Text style={[styles.detailValueText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                {categoryDisplayName}
              </Text>
            </View>
          )}

          {/* Thời gian */}
          {dateDisplay && (
            <View style={[styles.detailRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={styles.detailLabelCol}>
                <FinanceIcon name="calendar" size={17} color={isDark ? '#6EE7B7' : '#64748B'} />
                <Text style={[styles.detailLabelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Thời gian</Text>
              </View>
              <Text style={[styles.detailValueText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                {formatDateDisplay(dateDisplay)}
              </Text>
            </View>
          )}

          {/* Ghi chú */}
          {noteDisplay && (
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <View style={styles.detailLabelCol}>
                <FinanceIcon name="file-text" size={17} color={isDark ? '#6EE7B7' : '#64748B'} />
                <Text style={[styles.detailLabelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Ghi chú</Text>
              </View>
              <Text style={[styles.detailValueText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                {noteDisplay}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBudgetPreview = () => {
    return (
      <View
        style={[
          styles.previewContainer,
          isDark && {
            backgroundColor: '#132822',
            borderWidth: 1,
            borderColor: 'rgba(52, 211, 153, 0.25)',
          },
        ]}
      >
        {preview.name && (
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Tên ngân sách</Text>
            <Text style={[styles.previewValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{preview.name}</Text>
          </View>
        )}

        <View style={styles.previewRow}>
          <Text style={[styles.previewLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Tổng mức chi</Text>
          <Text style={[styles.previewAmount, { color: isDark ? '#34D399' : '#059669' }]}>
            {formatCurrency(preview.totalAmount)}
          </Text>
        </View>

        {(preview.startDate || preview.endDate) && (
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Thời gian</Text>
            <Text style={[styles.previewValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              {formatDateDisplay(preview.startDate)} → {formatDateDisplay(preview.endDate)}
            </Text>
          </View>
        )}

        {Array.isArray(preview.items) && preview.items.length > 0 && (
          <View style={[styles.budgetItemsContainer, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0' }]}>
            <Text style={[styles.budgetItemsHeader, { color: isDark ? '#94A3B8' : '#64748B' }]}>Chi tiết phân bổ:</Text>
            {preview.items.map((item, idx) => (
              <View key={idx} style={styles.budgetItemRow}>
                <Text style={[styles.budgetItemName, { color: isDark ? '#F1F5F9' : '#334155' }]}>
                  • {item.categoryName || item.category || 'Mục chi'}
                </Text>
                <Text style={[styles.budgetItemAmount, { color: isDark ? '#34D399' : '#059669' }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderGenericPreview = () => {
    const isDebt = preview.entityType === 'DEBT' || action.toolName === 'create_debt' || toolName === 'create_debt';
    const isInstallment = isDebt && Boolean(
      preview.paymentFrequency &&
      preview.paymentFrequency !== 'ONE_TIME' &&
      preview.paymentAmount != null &&
      preview.nextPaymentDate !== preview.dueDate
    );

    const amount = preview.amount ?? preview.targetAmount ?? preview.afterAmount ?? preview.principalAmount;

    let rows: [string, any][] = [];
    if (isDebt && !isInstallment) {
      // Khoản nợ trả 1 lần (không trả góp): chỉ hiển thị hạn trả và số tiền phải trả
      rows = [
        ['Đối tượng', preview.entityName || preview.name],
        ['Loại', preview.debtType || preview.goalType || preview.scheduleType || preview.accountType],
        ['Kỳ hạn trả', preview.dueDate || preview.nextPaymentDate || preview.date || preview.targetDate],
        ['Số tiền phải trả', amount != null ? formatCurrency(amount) : null],
        ['Ví / tài khoản', preview.accountName],
        ['Ghi chú', preview.note || description],
      ];
    } else {
      rows = [
        ['Đối tượng', preview.entityName || preview.name],
        ['Loại', preview.goalType || preview.debtType || preview.scheduleType || preview.accountType || preview.paymentFrequency],
        ['Ví / tài khoản', preview.accountName],
        ['Ngày thực hiện', preview.date || preview.targetDate || (!preview.nextPaymentDate ? preview.startDate : null)],
        ['Ngày kỳ đầu', preview.nextPaymentDate],
        ['Ngày kỳ cuối', preview.dueDate],
        ['Số tiền mỗi kỳ', preview.paymentAmount != null ? formatCurrency(preview.paymentAmount) : null],
        ['Trước → sau', preview.beforeAmount != null && preview.afterAmount != null
          ? `${formatCurrency(preview.beforeAmount)} → ${formatCurrency(preview.afterAmount)}` : null],
        ['Ghi chú', preview.note || description],
      ];
    }
    const filteredRows = rows.filter(([, value]) => value != null && value !== '');
    return (
      <View
        style={[
          styles.previewContainer,
          isDark && {
            backgroundColor: '#132822',
            borderWidth: 1,
            borderColor: 'rgba(52, 211, 153, 0.25)',
            padding: 12,
          },
        ]}
      >
        {amount != null && (
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Số tiền</Text>
            <Text style={[styles.previewAmount, { color: isDark ? '#34D399' : '#059669' }]}>{formatCurrency(amount)}</Text>
          </View>
        )}
        {filteredRows.map(([label, value]) => (
          <View style={styles.previewRow} key={String(label)}>
            <Text style={[styles.previewLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
            <Text style={[styles.previewValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              {String(label).includes('Ngày') ? formatDateDisplay(String(value)) : String(value)}
            </Text>
          </View>
        ))}
        {preview.warning && (
          <View style={[
            styles.errorBox,
            isDark
              ? { backgroundColor: 'rgba(245, 158, 11, 0.16)', borderColor: 'rgba(245, 158, 11, 0.4)' }
              : { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
          ]}>
            <Text style={[styles.errorText, { color: isDark ? '#FBBF24' : '#92400E' }]}>⚠️ {preview.warning}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCardHeader = () => {
    const rawType = preview.transactionType || preview.type;
    const isIncome = rawType === 'INCOME';
    const isTransfer = rawType === 'TRANSFER';
    const typeLabel = isIncome ? 'Thu nhập' : isTransfer ? 'Chuyển tiền' : 'Chi tiêu';

    const categoryDisplayName =
      preview.categoryName || preview.category || preview.categoryId || '';

    // Lấy icon chuẩn theo danh mục chi tiêu/thu nhập từ hệ thống
    const iconName: IconName = toolName === 'create_budget'
      ? 'wallet'
      : isTransfer
      ? 'arrow-left-right'
      : resolveCategoryIconName(
          undefined,
          isIncome ? 'INCOME' : 'EXPENSE',
          categoryDisplayName || typeLabel
        );

    const actionLabels: Record<string, string> = {
      create_goal: 'Đề xuất mục tiêu', contribute_to_goal: 'Đề xuất đóng góp mục tiêu',
      create_debt: 'Đề xuất khoản nợ', record_debt_payment: 'Đề xuất thanh toán nợ',
      update_budget: 'Đề xuất cập nhật ngân sách',
      create_schedule: 'Đề xuất lịch tài chính', update_schedule: 'Đề xuất cập nhật lịch',
      create_account: 'Đề xuất tài khoản mới',
      create_group_transaction: 'Đề xuất chi tiêu nhóm', contribute_group_fund: 'Đề xuất nộp quỹ nhóm',
      create_child_spend: 'Đề xuất chi tiêu ví trẻ em', deposit_child_wallet: 'Đề xuất cấp tiền ví trẻ em',
    };
    const subtitleText = actionLabels[toolName] || (toolName === 'create_budget' ? 'Đề xuất ngân sách' : 'Đề xuất giao dịch');
    const mainTitleText = actionLabels[toolName]
      ? (preview.entityName || preview.name || title)
      : toolName === 'create_budget' ? (preview.name || 'Ngân sách') : typeLabel;

    return (
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isIncome ? '#047857' : isTransfer ? '#0284C7' : '#059669' },
            ]}
          >
            <FinanceIcon
              name={iconName}
              size={22}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={[styles.cardSubHeader, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
              {subtitleText}
            </Text>
            <Text style={[styles.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
              {mainTitleText}
            </Text>
          </View>
        </View>
        <View style={styles.badgeWrapper}>
          {renderBadge()}
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.cardContainer,
        isDark
          ? {
              backgroundColor: '#0F261E',
              borderColor: 'rgba(52, 211, 153, 0.4)',
              borderWidth: 1.5,
              shadowColor: '#10B981',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 5,
            }
          : {
              backgroundColor: isPending ? '#FFFDF5' : isCompleted ? '#F0FDF4' : '#FFFFFF',
              borderColor: isPending ? '#FDE68A' : isCompleted ? '#A7F3D0' : '#E2E8F0',
            },
      ]}
    >
      {/* Header */}
      {renderCardHeader()}

      {/* Body preview */}
      {toolName === 'create_budget' ? renderBudgetPreview()
        : (toolName === 'create_transaction' || toolName === 'create_child_spend' || toolName === 'deposit_child_wallet') ? renderTransactionPreview()
        : renderGenericPreview()}

      {/* Expiry warning */}
      {isPending && expiresAt && (
        <View style={styles.expiryRow}>
          <Text style={[styles.expiryText, { color: isDark ? '#FBBF24' : '#D97706' }]}>
            ⏱️ Đề xuất tự động hết hạn: {new Date(expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {/* Error display */}
      {isFailed && error && (
        <View style={[styles.errorBox, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#7F1D1D' }]}>
          <Text style={[styles.errorText, isDark && { color: '#FCA5A5' }]}>⚠️ {error}</Text>
        </View>
      )}

      {/* Action buttons (only in PENDING state) */}
      {isPending && (
        <View style={styles.actionsFooter}>
          <TouchableOpacity
            style={[
              styles.btn,
              styles.cancelBtn,
              isDark
                ? {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  }
                : {
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                  },
            ]}
            onPress={handleCancelClick}
            disabled={isProcessing || internalLoading !== null}
            activeOpacity={0.7}
          >
            {internalLoading === 'cancel' ? (
              <ActivityIndicator size="small" color={isDark ? '#94A3B8' : '#64748B'} />
            ) : (
              <Text style={[styles.cancelBtnText, { color: isDark ? '#F1F5F9' : '#475569' }]}>Hủy bỏ</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              styles.confirmBtn,
              isDark ? { backgroundColor: '#00B86B' } : { backgroundColor: '#059669' },
              (isProcessing || internalLoading !== null) && styles.btnDisabled,
            ]}
            onPress={handleConfirmClick}
            disabled={isProcessing || internalLoading !== null}
            activeOpacity={0.8}
          >
            {internalLoading === 'confirm' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>Xác nhận</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F1E19',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  badgeWrapper: {
    flexShrink: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  cardSubHeader: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgePendingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400E',
  },
  badgeExecuting: {
    backgroundColor: '#DBEAFE',
  },
  badgeExecutingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  badgeCompletedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065F46',
  },
  badgeCancelled: {
    backgroundColor: '#334155',
  },
  badgeCancelledText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  badgeExpired: {
    backgroundColor: '#7F1D1D',
  },
  badgeExpiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FCA5A5',
  },
  badgeFailed: {
    backgroundColor: '#7F1D1D',
  },
  badgeFailedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F87171',
  },
  bodyWrap: {
    gap: 8,
  },
  amountHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  amountLabel: {
    fontSize: 13.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6.5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabelText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  detailValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    textAlign: 'right',
    maxWidth: '55%',
  },
  previewContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 2,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  previewLabel: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  previewAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  budgetItemsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    gap: 6,
  },
  budgetItemsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  budgetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetItemName: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  budgetItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  expiryRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  expiryText: {
    fontSize: 11.5,
    color: '#FBBF24',
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  confirmBtn: {
    backgroundColor: '#00B86B',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

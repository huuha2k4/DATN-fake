import { useState } from 'react';
import { FinanceIcon, resolveCategoryIconName, type IconName } from '../../core/components/FinanceIcon';
import type { FinAiActionResponse } from '../api/finAiAgentApi';
import './FinAiActionCard.css';

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
  const [internalLoading, setInternalLoading] = useState<'confirm' | 'cancel' | null>(null);

  const { toolName, title, description, preview = {}, status, expiresAt, error } = action;

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
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
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

  const renderStatusBadge = () => {
    if (isPending) {
      return <span className="action-badge pending">Chờ xác nhận</span>;
    }
    if (isExecuting) {
      return <span className="action-badge executing">⚙️ Đang thực thi...</span>;
    }
    if (isCompleted) {
      return <span className="action-badge completed">✓ Đã hoàn thành</span>;
    }
    if (isCancelled) {
      return <span className="action-badge cancelled">✕ Đã hủy</span>;
    }
    if (isExpired) {
      return <span className="action-badge expired">⏱️ Đã hết hạn</span>;
    }
    if (isFailed) {
      return <span className="action-badge failed">⚠️ Thất bại</span>;
    }
    return <span className="action-badge">{status}</span>;
  };

  // Header Title & Icon
  const renderCardHeader = () => {
    const rawType = preview.transactionType || preview.type;
    const isIncome = rawType === 'INCOME';
    const isTransfer = rawType === 'TRANSFER';
    const typeLabel = isIncome ? 'Thu nhập' : isTransfer ? 'Chuyển tiền' : 'Chi tiêu';

    const categoryDisplayName =
      preview.categoryName || preview.category || preview.categoryId || null;

    const iconName: IconName =
      toolName === 'create_budget'
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
    const subTitle = actionLabels[toolName] || (toolName === 'create_budget' ? 'Đề xuất ngân sách' : 'Đề xuất giao dịch');
    const mainTitle = actionLabels[toolName]
      ? (preview.entityName || preview.name || title)
      : toolName === 'create_budget' ? (preview.name || 'Ngân sách') : typeLabel;

    const iconBg = isIncome ? '#007F53' : isTransfer ? '#0284C7' : '#059669';

    return (
      <div className="action-card-header">
        <div className="action-card-title-row">
          <div className="action-icon-circle" style={{ backgroundColor: iconBg }}>
            <FinanceIcon name={iconName} size={20} color="#FFFFFF" />
          </div>
          <div className="action-card-titles">
            <span className="action-card-sub">{subTitle}</span>
            <h4 className="action-card-main-title">{mainTitle}</h4>
          </div>
        </div>
        {renderStatusBadge()}
      </div>
    );
  };

  const renderTransactionPreview = () => {
    const rawType = preview.transactionType || preview.type;
    const isIncome = rawType === 'INCOME';
    const isTransfer = rawType === 'TRANSFER';

    const accountDisplayName =
      preview.accountName || preview.account || preview.accountId || null;
    const toAccountDisplayName =
      preview.toAccountName || preview.toAccount || preview.toAccountId || null;
    const categoryDisplayName =
      preview.categoryName || preview.category || preview.categoryId || null;
    const dateDisplay = preview.transactionDate || preview.date || null;
    const noteDisplay = preview.note || preview.description || null;

    return (
      <div className="action-card-body">
        {/* Số tiền highlight banner */}
        <div className="action-amount-box">
          <span className="amount-label">Số tiền</span>
          <span className={`amount-number ${isIncome ? 'income' : 'expense'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(preview.amount)}
          </span>
        </div>

        {/* Danh sách thông tin chi tiết */}
        <div className="action-details-list">
          {/* Tài khoản / Ví nguồn */}
          {accountDisplayName && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon">
                  <FinanceIcon name="credit-card" size={16} />
                </span>
                <span className="item-label">Tài khoản / Ví</span>
              </div>
              <span className="item-value">{accountDisplayName}</span>
            </div>
          )}

          {/* Ví đích nếu chuyển khoản */}
          {isTransfer && toAccountDisplayName && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon">
                  <FinanceIcon name="credit-card" size={16} />
                </span>
                <span className="item-label">Ví đích</span>
              </div>
              <span className="item-value">{toAccountDisplayName}</span>
            </div>
          )}

          {/* Danh mục */}
          {categoryDisplayName && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon">
                  <FinanceIcon name="tag" size={16} />
                </span>
                <span className="item-label">Danh mục</span>
              </div>
              <span className="item-value">{categoryDisplayName}</span>
            </div>
          )}

          {/* Thời gian */}
          {dateDisplay && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon">
                  <FinanceIcon name="calendar" size={16} />
                </span>
                <span className="item-label">Thời gian</span>
              </div>
              <span className="item-value">{formatDateDisplay(dateDisplay)}</span>
            </div>
          )}

          {/* Ghi chú */}
          {noteDisplay && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon">
                  <FinanceIcon name="file-text" size={16} />
                </span>
                <span className="item-label">Ghi chú</span>
              </div>
              <span className="item-value">{noteDisplay}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBudgetPreview = () => {
    return (
      <div className="action-card-body">
        {/* Hạn mức banner */}
        <div className="action-amount-box">
          <span className="amount-label">Tổng hạn mức</span>
          <span className="amount-number budget">
            {formatCurrency(preview.totalAmount)}
          </span>
        </div>

        <div className="action-details-list">
          {preview.name && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon"><FinanceIcon name="wallet" size={16} /></span>
                <span className="item-label">Tên ngân sách</span>
              </div>
              <span className="item-value">{preview.name}</span>
            </div>
          )}

          {(preview.startDate || preview.periodType) && (
            <div className="action-detail-item">
              <div className="item-left">
                <span className="item-icon"><FinanceIcon name="calendar" size={16} /></span>
                <span className="item-label">Kỳ hạn</span>
              </div>
              <span className="item-value">
                {preview.startDate && preview.endDate
                  ? `${formatDateDisplay(preview.startDate)} → ${formatDateDisplay(preview.endDate)}`
                  : preview.periodType || 'Tháng'}
              </span>
            </div>
          )}

          {preview.items && preview.items.length > 0 && (
            <div className="action-detail-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="item-left" style={{ marginBottom: 6 }}>
                <span className="item-icon"><FinanceIcon name="tag" size={16} /></span>
                <span className="item-label">Hạn mức theo danh mục</span>
              </div>
              <div className="budget-items-box">
                {preview.items.map((item, idx) => (
                  <div key={idx} className="budget-cat-row">
                    <span className="budget-cat-name">
                      {item.categoryName || item.category || 'Chung'}
                    </span>
                    <span className="budget-cat-amt">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
      <div className="action-card-body">
        {amount != null && <div className="action-amount-box"><span className="amount-label">Số tiền</span><span className="amount-number budget">{formatCurrency(amount)}</span></div>}
        <div className="action-details-list">
          {filteredRows.map(([label, value]) => <div className="action-detail-item" key={String(label)}><span className="item-label">{label}</span><span className="item-value">{String(label).includes('Ngày') || String(label).includes('Kỳ hạn') ? formatDateDisplay(String(value)) : String(value)}</span></div>)}
        </div>
        {preview.warning && <div className="action-error-box"><FinanceIcon name="info" size={14} /><span>{preview.warning}</span></div>}
      </div>
    );
  };

  return (
    <div className={`finai-action-card status-${status.toLowerCase()}`}>
      {/* Header */}
      {renderCardHeader()}

      {/* Body preview */}
      {toolName === 'create_budget' ? renderBudgetPreview()
        : (toolName === 'create_transaction' || toolName === 'create_child_spend' || toolName === 'deposit_child_wallet') ? renderTransactionPreview()
        : renderGenericPreview()}

      {/* Error display */}
      {error && (
        <div className="action-error-box">
          <FinanceIcon name="danger" size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Expiry hint */}
      {expiresAt && isPending && (
        <div className="action-expires-hint">
          <span>⏱️ Đề xuất tự động hết hạn: {new Date(expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Actions footer */}
      {isPending && (
        <div className="action-card-footer">
          <button
            type="button"
            className="action-btn-cancel"
            onClick={handleCancelClick}
            disabled={isProcessing || internalLoading !== null}
          >
            {internalLoading === 'cancel' ? 'Đang hủy...' : 'Hủy bỏ'}
          </button>
          <button
            type="button"
            className="action-btn-confirm"
            onClick={handleConfirmClick}
            disabled={isProcessing || internalLoading !== null}
          >
            {internalLoading === 'confirm' ? 'Đang thực thi...' : 'Xác nhận'}
          </button>
        </div>
      )}
    </div>
  );
}

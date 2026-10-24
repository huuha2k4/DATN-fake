import { FinanceIcon } from './FinanceIcon'
import './FloatingActions.css'

interface FloatingActionsProps {
  onAddTransaction: () => void;
  onOpenInvoiceScanner: () => void;
  onOpenAIAssistant: () => void;
}

export function FloatingActions({
  onAddTransaction,
  onOpenInvoiceScanner,
  onOpenAIAssistant,
}: FloatingActionsProps) {
  return (
    <aside className="floating-actions-dock" aria-label="Thao tác nhanh">
      <button
        type="button"
        className="fab-item fab-scanner"
        onClick={onOpenInvoiceScanner}
        title="Quét hóa đơn (OCR)"
        aria-label="Quét hóa đơn"
      >
        <span className="fab-tooltip">Quét hóa đơn</span>
        <FinanceIcon name="receipt" size={18} />
      </button>

      <button
        type="button"
        className="fab-item fab-ai"
        onClick={onOpenAIAssistant}
        title="Trợ lý Finora"
        aria-label="Trợ lý Finora"
      >
        <span className="fab-tooltip">Trợ lý AI</span>
        <FinanceIcon name="spark" size={18} />
      </button>

      <button
        type="button"
        className="fab-item fab-primary fab-add"
        onClick={onAddTransaction}
        title="Thêm giao dịch thu / chi mới"
        aria-label="Thêm giao dịch mới"
      >
        <span className="fab-tooltip">Thêm giao dịch</span>
        <FinanceIcon name="plus" size={18} />
      </button>
    </aside>
  );
}

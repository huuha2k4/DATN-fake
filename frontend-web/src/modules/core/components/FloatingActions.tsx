import { useState, useEffect, useRef } from 'react'
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
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // Đóng lại khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <aside ref={dockRef} className={`floating-actions-dock ${isOpen ? 'is-open' : ''}`} aria-label="Thao tác nhanh">
      {/* 3 Nút thao tác nhanh phụ (Chỉ hiển thị khi bấm mở) */}
      <div className={`fab-menu-items ${isOpen ? 'active' : ''}`}>
        <button
          type="button"
          className="fab-item fab-scanner"
          onClick={() => {
            onOpenInvoiceScanner();
            setIsOpen(false);
          }}
          title="Quét hóa đơn (OCR)"
          aria-label="Quét hóa đơn"
        >
          <span className="fab-tooltip">Quét hóa đơn</span>
          <FinanceIcon name="receipt" size={17} />
        </button>

        <button
          type="button"
          className="fab-item fab-ai"
          onClick={() => {
            onOpenAIAssistant();
            setIsOpen(false);
          }}
          title="Trợ lý Finora"
          aria-label="Trợ lý Finora"
        >
          <span className="fab-tooltip">Trợ lý AI</span>
          <FinanceIcon name="spark" size={17} />
        </button>

        <button
          type="button"
          className="fab-item fab-primary fab-add"
          onClick={() => {
            onAddTransaction();
            setIsOpen(false);
          }}
          title="Thêm giao dịch thu / chi mới"
          aria-label="Thêm giao dịch mới"
        >
          <span className="fab-tooltip">Thêm giao dịch</span>
          <FinanceIcon name="plus" size={17} />
        </button>
      </div>

      {/* Nút tròn chính Trigger: Bấm để Mở ra 3 nút hoặc Thu nhỏ lại (dấu X) */}
      <button
        type="button"
        className={`fab-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Thu nhỏ thao tác nhanh' : 'Mở menu thao tác nhanh'}
        aria-label={isOpen ? 'Đóng menu' : 'Mở menu thao tác nhanh'}
      >
        <span className="fab-trigger-icon">
          {isOpen ? '✕' : <FinanceIcon name="plus" size={20} />}
        </span>
      </button>
    </aside>
  );
}


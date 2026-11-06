import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { ocrApi, type OcrReceiptResult } from '../api/ocrApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import { transactionApi, type CategoryItem } from '../../cash-flow-management/api/transactionApi';
import './InvoiceOcrScreen.css';

function formatIsoToDdMmYyyy(iso?: string): string {
  if (!iso) return '';
  const clean = iso.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

function parseDdMmYyyyToIso(val: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.trim().replace(/-/g, '/').split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y && y.length === 4 && d && m) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return val;
}

type Props = {
  onCancel: () => void;
  onNotify: (message: string) => void;
};

export function InvoiceOcrScreen({ onCancel, onNotify }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const datePickerInputRef = useRef<HTMLInputElement>(null);

  // Loading & scan states
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<OcrReceiptResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Active workspace tab in right column
  const [activeRightTab, setActiveRightTab] = useState<'FORM' | 'HISTORY'>('FORM');

  // History & reference data
  const [recentReceipts, setRecentReceipts] = useState<OcrReceiptResult[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Form fields
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Custom Dropdown Open States
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || categories[0];
  }, [categories, selectedCategoryId]);

  const selectedAccountObj = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // History filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyTab, setHistoryTab] = useState<'ALL' | 'PAID' | 'DRAFT'>('ALL');

  // Clean state when leaving OCR screen
  useEffect(() => {
    return () => {
      setScanResult(null);
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setMerchant('');
      setAmount('');
      setNote('');
    };
  }, []);

  // Load accounts, categories & receipts history
  const loadInitialData = async () => {
    setLoadingReceipts(true);
    try {
      const [accs, cats, receiptsResp] = await Promise.all([
        accountApi.getAccounts().catch(() => []),
        transactionApi.getCategories('EXPENSE').catch(() => []),
        ocrApi.getReceipts().catch(() => ({ receipts: [] })),
      ]);
      setAccounts(accs);
      if (accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0].id);
      }
      setCategories(cats);
      const list = receiptsResp.receipts || [];
      setRecentReceipts(list);
    } catch {
      onNotify('Không thể nạp dữ liệu tài khoản và danh mục');
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const reloadReceipts = async () => {
    try {
      const resp = await ocrApi.getReceipts();
      setRecentReceipts(resp.receipts || []);
    } catch {
      // Ignore background reload errors
    }
  };

  // Process chosen or dropped file
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.pdf')) {
      onNotify('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP) hoặc PDF');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      onNotify('Dung lượng tệp tối đa là 15 MB');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);
    setActiveRightTab('FORM');

    setScanning(true);
    try {
      const result = await ocrApi.scanReceipt(file);
      setScanResult(result);

      // --- Xử lý các kind bị từ chối ---
      const REJECTED_KINDS = ['not_receipt', 'low_quality', 'handwritten', 'draft'];
      if (REJECTED_KINDS.includes(result.kind)) {
        const rejectMessages: Record<string, string> = {
          not_receipt: '❌ Ảnh không phải hóa đơn hoặc biên lai. Vui lòng chụp lại đúng hóa đơn.',
          low_quality: '📷 Ảnh quá mờ hoặc thiếu thông tin. Vui lòng chụp lại rõ hơn.',
          handwritten: '✏️ Phát hiện chữ viết tay. Vui lòng nhập thông tin thủ công.',
          draft: '⚠️ Đây là phiếu tạm tính chưa thanh toán. Vui lòng dùng hóa đơn cuối.',
        };
        onNotify(result.rejectReason || rejectMessages[result.kind] || 'Không thể xử lý ảnh này.');
        // Giữ preview ảnh để người dùng thấy ảnh nào bị reject, nhưng không điền form
        return;
      }

      // --- Hóa đơn hợp lệ: điền form ---
      if (result.imageUrl) setPreviewUrl(result.imageUrl);
      setMerchant(result.merchantName || 'Hóa đơn mua sắm');
      if (result.transactionDate) setDate(result.transactionDate);
      if (result.transactionTime) setTime(result.transactionTime.slice(0, 5));
      setAmount(result.totalAmount != null ? String(result.totalAmount) : '');

      // Match category
      if (result.aiCategoryId || result.aiCategoryName) {
        const matched = categories.find(
          (c) =>
            c.id === result.aiCategoryId ||
            c.name.toLowerCase() === result.aiCategoryName?.toLowerCase()
        );
        if (matched) {
          setSelectedCategoryId(matched.id);
        } else if (categories.length > 0) {
          setSelectedCategoryId(categories[0].id);
        }
      } else if (categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].id);
      }

      const reviewNote = result.needsReview ? ' — cần kiểm tra lại' : '';
      onNotify(`✅ Quét thành công: ${result.merchantName || file.name}${reviewNote}`);
      reloadReceipts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể quét hóa đơn. Vui lòng thử lại.';
      onNotify(msg);
    } finally {
      setScanning(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const resetCurrentScan = () => {
    setScanResult(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setMerchant('');
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm and create real transaction
  const handleConfirmTransaction = async () => {
    if (!scanResult) {
      onNotify('Vui lòng quét hóa đơn trước khi lưu giao dịch.');
      return;
    }
    if (!selectedAccountId) {
      onNotify('Vui lòng chọn tài khoản thanh toán.');
      return;
    }
    const numericAmount = parseFloat(amount.replace(/\D/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onNotify('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    try {
      await ocrApi.createTransaction({
        receiptId: scanResult.id,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId || undefined,
        description: merchant.trim() || 'Hóa đơn OCR',
        note: note.trim() || undefined,
        overrideAmount: numericAmount,
      });

      onNotify(`Đã lưu giao dịch thành công: ${Number(numericAmount).toLocaleString('vi-VN')} ₫`);
      resetCurrentScan();
      await reloadReceipts();
      setActiveRightTab('HISTORY');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo giao dịch.';
      onNotify(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a receipt from history
  const handleDeleteReceipt = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi hóa đơn này khỏi lịch sử?')) return;
    try {
      await ocrApi.deleteReceipt(id);
      onNotify('Đã xóa hóa đơn khỏi lịch sử');
      if (scanResult?.id === id) {
        resetCurrentScan();
      }
      reloadReceipts();
    } catch {
      onNotify('Không thể xóa hóa đơn');
    }
  };

  // Populate form & preview from a historical receipt
  const handleSelectRecentReceipt = (r: OcrReceiptResult) => {
    setScanResult(r);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(r.imageUrl || null);
    setMerchant(r.merchantName || 'Hóa đơn');
    if (r.transactionDate) setDate(r.transactionDate);
    if (r.transactionTime) setTime(r.transactionTime.slice(0, 5));
    if (r.totalAmount != null) setAmount(String(r.totalAmount));
    if (r.aiCategoryId) {
      const matched = categories.find((c) => c.id === r.aiCategoryId || c.name === r.aiCategoryName);
      if (matched) setSelectedCategoryId(matched.id);
    }
    onNotify(`Đã nạp hóa đơn: ${r.merchantName || 'Hóa đơn'}`);
  };

  // Filter receipts list
  const filteredReceipts = useMemo(() => {
    return recentReceipts.filter((r) => {
      const matchesSearch =
        !historySearch.trim() ||
        `${r.merchantName || ''} ${r.aiCategoryName || ''} ${r.totalAmount || ''}`
          .toLowerCase()
          .includes(historySearch.toLowerCase());

      const isPaid = Boolean(r.transactionId || r.kind === 'paid');
      const matchesTab =
        historyTab === 'ALL' ||
        (historyTab === 'PAID' && isPaid) ||
        (historyTab === 'DRAFT' && !isPaid);

      return matchesSearch && matchesTab;
    });
  }, [recentReceipts, historySearch, historyTab]);

  return (
    <main className="ocr-workspace-page mx-auto flex h-[calc(100vh-68px)] max-h-[calc(100vh-68px)] w-full flex-1 flex-col bg-[#f6f8f6] dark:bg-[#07131e] p-2 sm:p-3 lg:p-4 pb-6 sm:pb-6 text-[#14251f] dark:text-slate-100 overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* TWO-COLUMN WORKSPACE: Clean, full-height, maximizing space */}
      <div className="grid w-full h-full flex-1 gap-3 sm:gap-4 lg:grid-cols-12 items-stretch min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN (6 COLS): Large Receipt Image Viewer / Upload Dropzone */}
        <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 ocr-panel-card">
          
          {/* Card Top Toolbar (Clean, harmonious light theme) */}
          <div className="ocr-card-header">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  resetCurrentScan();
                  onCancel();
                }}
                className="ocr-tool-btn ocr-tool-btn-ghost !size-8 !p-0"
                title="Quay lại danh sách"
              >
                <FinanceIcon name="arrow" size={13} className="rotate-180" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                  {previewUrl ? 'Hóa đơn gốc' : 'Ảnh hóa đơn'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-[#07543f] dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  FinAI Vision
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="ocr-tool-btn ocr-tool-btn-ghost !h-8"
                  title="Phóng to toàn màn hình"
                >
                  <FinanceIcon name="eye" size={13} />
                  <span>Xem to</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ocr-tool-btn ocr-tool-btn-primary !h-8"
              >
                <FinanceIcon name="plus" size={13} />
                <span>{previewUrl ? 'Đổi ảnh' : 'Chọn ảnh'}</span>
              </button>
            </div>
          </div>

          {/* Main Image Body */}
          <div className="flex-1 p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden bg-[#f8faf9] dark:bg-[#07131e]/60">
            {!previewUrl ? (
              /* DROPZONE WHEN NO IMAGE */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center h-full rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center ${
                  isDragOver
                    ? 'border-[#07543f] bg-emerald-50/80 dark:bg-emerald-950/30 scale-[0.99]'
                    : 'border-[#cfded4] dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-emerald-50/40 dark:hover:bg-slate-900 hover:border-[#07543f]/60'
                }`}
              >
                <div className="size-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-[#07543f] dark:text-emerald-300 grid place-items-center mb-3 shadow-inner">
                  <FinanceIcon name="receipt" size={30} />
                </div>
                <h3 className="text-sm font-bold text-[#17261f] dark:text-white">
                  Kéo và thả ảnh hóa đơn vào đây
                </h3>
                <p className="mt-1 text-xs text-[#718078] dark:text-slate-400 max-w-sm">
                  hoặc <span className="font-bold text-[#07543f] dark:text-emerald-400 underline underline-offset-2">bấm vào đây để chọn ảnh</span> từ máy
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-[#718078] dark:text-slate-500 font-medium">
                  <span className="px-2 py-0.5 rounded-md bg-[#f1f5f2] dark:bg-slate-800 border border-[#e2ece5] dark:border-slate-700">JPG</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#f1f5f2] dark:bg-slate-800 border border-[#e2ece5] dark:border-slate-700">PNG</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#f1f5f2] dark:bg-slate-800 border border-[#e2ece5] dark:border-slate-700">WEBP</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#f1f5f2] dark:bg-slate-800 border border-[#e2ece5] dark:border-slate-700">Tối đa 15MB</span>
                </div>

                <div className="mt-6 w-full max-w-sm rounded-xl bg-[#f9fbf9] dark:bg-slate-900 border border-[#e2ece5] dark:border-slate-800 p-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#07543f] dark:text-emerald-400 block mb-1">
                    Gợi ý chụp nét:
                  </span>
                  <p className="text-[11px] text-[#59675f] dark:text-slate-400 leading-relaxed">
                    Chụp đủ sáng, thẳng góc, nhìn rõ tên cửa hàng và tổng tiền để AI nhận diện chính xác nhất.
                  </p>
                </div>
              </div>
            ) : (
              /* LARGE IMAGE PREVIEW CONTAINER */
              <div className="relative flex-1 w-full h-full min-h-0 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner group">
                <img
                  src={previewUrl}
                  alt="Ảnh hóa đơn lớn"
                  className="w-full h-full object-contain select-none transition-transform duration-200 group-hover:scale-[1.01]"
                  onClick={() => setLightboxOpen(true)}
                  title="Bấm để xem ảnh phóng to"
                />

                {/* Scanning Laser Shimmer Overlay */}
                {scanning && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-4 text-center z-10">
                    <div className="relative size-14">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30" />
                      <div className="size-14 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
                      <div className="absolute inset-0 grid place-items-center text-emerald-300">
                        <FinanceIcon name="spark" size={18} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-300">FinAI Vision đang nhận diện hóa đơn...</p>
                      <p className="text-xs text-slate-300 mt-0.5">Trích xuất tên quán, tổng tiền, ngày &amp; danh mục</p>
                    </div>
                  </div>
                )}

                {/* Floating Bottom Badge */}
                {scanResult && !scanning && (
                  <div className={`absolute bottom-2.5 left-2.5 right-2.5 rounded-xl backdrop-blur-md p-2.5 border text-white flex items-center justify-between gap-2 shadow-lg ${
                    ['not_receipt', 'low_quality', 'handwritten', 'draft'].includes(scanResult.kind)
                      ? 'bg-red-900/90 border-red-500/40'
                      : 'bg-slate-900/90 border-white/10'
                  }`}>
                    <div className="min-w-0">
                      {['not_receipt', 'low_quality', 'handwritten', 'draft'].includes(scanResult.kind) ? (
                        <>
                          <p className="text-xs font-bold text-red-300 truncate">
                            {{
                              not_receipt: '❌ Không phải hóa đơn',
                              low_quality: '📷 Ảnh quá mờ — chụp lại',
                              handwritten: '✏️ Chữ viết tay — nhập thủ công',
                              draft: '⚠️ Phiếu tạm tính',
                            }[scanResult.kind as string] ?? 'Không thể xử lý'}
                          </p>
                          <span className="text-[10px] text-red-400 line-clamp-1">
                            {scanResult.rejectReason || 'Vui lòng thử lại với ảnh khác'}
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-white truncate">
                            {scanResult.merchantName || 'Hóa đơn đã nhận diện'}
                          </p>
                          <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                            <FinanceIcon name="spark" size={10} />
                            Độ tin cậy: {Math.round((scanResult.confidence || 0.95) * 100)}%
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="h-7 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white transition shrink-0 flex items-center gap-1"
                    >
                      <FinanceIcon name="eye" size={12} />
                      <span>Xem to</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (6 COLS): Extracted Form & Recent Receipts Tabs */}
        <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 ocr-panel-card">
          
          {/* Top Segmented Tabs Bar */}
          <div className="ocr-tabs-bar">
            <div className="ocr-tabs-pill-track">
              <button
                type="button"
                onClick={() => setActiveRightTab('FORM')}
                className={`ocr-tab-btn ${activeRightTab === 'FORM' ? 'is-active' : ''}`}
              >
                <FinanceIcon name="receipt" size={13} />
                <span>Thông tin hóa đơn</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('HISTORY')}
                className={`ocr-tab-btn ${activeRightTab === 'HISTORY' ? 'is-active' : ''}`}
              >
                <FinanceIcon name="clock" size={13} />
                <span>Lịch sử ({recentReceipts.length})</span>
              </button>
            </div>

            {activeRightTab === 'HISTORY' && (
              <button
                type="button"
                onClick={reloadReceipts}
                className="size-7 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 grid place-items-center transition"
                title="Tải lại danh sách"
              >
                <FinanceIcon name="refresh" size={13} />
              </button>
            )}
          </div>

          {/* TAB 1: FORM CONTENT */}
          {activeRightTab === 'FORM' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="ocr-form-scroll">
                
                {/* Clean Luxury FinTech Amount Card */}
                <div className="ocr-amount-card">
                  <span className="ocr-amount-title">
                    Tổng tiền thanh toán (VNĐ)
                  </span>
                  <div className="ocr-amount-input-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setAmount(raw);
                      }}
                      className="ocr-amount-input"
                    />
                    <span className="ocr-amount-currency">
                      ₫
                    </span>
                  </div>

                  {scanResult?.aiCategoryName && (
                    <div className="ocr-ai-chip">
                      <FinanceIcon name="spark" size={11} />
                      <span>Danh mục AI: {scanResult.aiCategoryName}</span>
                    </div>
                  )}
                </div>

                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Tên quán / Đơn vị */}
                  <label className="ocr-field-label sm:col-span-2">
                    <span>Đơn vị / Cửa hàng</span>
                    <div className="ocr-input-icon-group">
                      <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder="VD: Highlands Coffee, WinMart, Siêu thị..."
                        className="ocr-field-control"
                      />
                      <span className="ocr-input-icon-btn pointer-events-none">
                        <FinanceIcon name="store" size={14} />
                      </span>
                    </div>
                  </label>

                  {/* Custom Danh mục Dropdown */}
                  <div ref={categoryDropdownRef} className="relative flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-bold text-gray-700 dark:text-slate-300">
                        Danh mục chi tiêu
                      </span>
                      {scanResult?.aiCategoryName && (
                        <span className="text-[10px] font-bold text-[#07543f] dark:text-emerald-400 flex items-center gap-1">
                          <FinanceIcon name="spark" size={10} />
                          AI gợi ý
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen((prev) => !prev);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`h-[42px] w-full rounded-[13px] border px-3 text-left transition flex items-center justify-between cursor-pointer ${
                        isCategoryDropdownOpen
                          ? 'border-[#07543f] dark:border-emerald-500 bg-white dark:bg-[#142b3d] ring-2 ring-[#07543f]/20'
                          : 'border-[#e1ece4] dark:border-white/10 bg-[#f8faf9] dark:bg-[#0f2231] hover:bg-white dark:hover:bg-[#142b3d] hover:border-[#c4dacf]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-6 rounded-lg bg-emerald-100/80 dark:bg-emerald-950 text-[#07543f] dark:text-emerald-300 grid place-items-center shrink-0">
                          <FinanceIcon name="shopping-bag" size={13} />
                        </div>
                        <span className="truncate text-xs font-bold text-gray-800 dark:text-white">
                          {selectedCategoryObj?.name || 'Chọn danh mục'}
                        </span>
                      </div>
                      <FinanceIcon
                        name="arrow"
                        size={12}
                        className={`rotate-90 text-gray-400 transition-transform duration-200 shrink-0 ${
                          isCategoryDropdownOpen ? '-rotate-90 text-[#07543f] dark:text-emerald-400' : ''
                        }`}
                      />
                    </button>

                    {/* Popup Menu */}
                    {isCategoryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-56 overflow-y-auto rounded-xl border border-[#d8e3dc] dark:border-slate-700 bg-white dark:bg-[#0e2333] p-1.5 shadow-xl animate-fadeIn">
                        <div className="flex flex-col gap-1">
                          {categories.map((c) => {
                            const isSelected = c.id === selectedCategoryId;
                            const isAiRecommended = scanResult?.aiCategoryName?.toLowerCase() === c.name.toLowerCase();
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryId(c.id);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition text-xs font-semibold cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-800/60'
                                    : 'text-gray-700 dark:text-slate-200 hover:bg-[#f3f7f4] dark:hover:bg-slate-800/80 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`size-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                                  <span className="truncate">{c.name}</span>
                                </div>
                                {isAiRecommended && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                                    <FinanceIcon name="spark" size={9} />
                                    AI
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Tài khoản thanh toán Dropdown */}
                  <div ref={accountDropdownRef} className="relative flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-bold text-gray-700 dark:text-slate-300">
                        Tài khoản thanh toán
                      </span>
                      {selectedAccountObj && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          {Number(selectedAccountObj.balance || 0).toLocaleString('vi-VN')} {selectedAccountObj.currencyCode || 'VND'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen((prev) => !prev);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`h-[42px] w-full rounded-[13px] border px-3 text-left transition flex items-center justify-between cursor-pointer ${
                        isAccountDropdownOpen
                          ? 'border-[#07543f] dark:border-emerald-500 bg-white dark:bg-[#142b3d] ring-2 ring-[#07543f]/20'
                          : 'border-[#e1ece4] dark:border-white/10 bg-[#f8faf9] dark:bg-[#0f2231] hover:bg-white dark:hover:bg-[#142b3d] hover:border-[#c4dacf]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-6 rounded-lg bg-emerald-100/80 dark:bg-emerald-950 text-[#07543f] dark:text-emerald-300 grid place-items-center shrink-0">
                          <FinanceIcon name="wallet" size={13} />
                        </div>
                        <div className="min-w-0 truncate">
                          <span className="text-xs font-bold text-gray-800 dark:text-white">
                            {selectedAccountObj?.name || 'Chọn tài khoản'}
                          </span>
                        </div>
                      </div>
                      <FinanceIcon
                        name="arrow"
                        size={12}
                        className={`rotate-90 text-gray-400 transition-transform duration-200 shrink-0 ${
                          isAccountDropdownOpen ? '-rotate-90 text-[#07543f] dark:text-emerald-400' : ''
                        }`}
                      />
                    </button>

                    {/* Popup Menu */}
                    {isAccountDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-56 overflow-y-auto rounded-xl border border-[#d8e3dc] dark:border-slate-700 bg-white dark:bg-[#0e2333] p-1.5 shadow-xl animate-fadeIn">
                        <div className="flex flex-col gap-1">
                          {accounts.map((a) => {
                            const isSelected = a.id === selectedAccountId;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAccountId(a.id);
                                  setIsAccountDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition text-xs cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#07543f] dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-800/60'
                                    : 'text-gray-700 dark:text-slate-200 hover:bg-[#f3f7f4] dark:hover:bg-slate-800/80 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FinanceIcon name="bank" size={13} className="text-gray-400 shrink-0" />
                                  <span className="truncate font-semibold">{a.name}</span>
                                </div>
                                <span className="text-[11px] font-bold text-[#07543f] dark:text-emerald-400 shrink-0">
                                  {Number(a.balance || 0).toLocaleString('vi-VN')} {a.currencyCode || 'VND'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ngày hóa đơn */}
                  <label className="ocr-field-label">
                    <span>Ngày hóa đơn</span>
                    <div className="ocr-input-icon-group">
                      <input
                        type="text"
                        value={formatIsoToDdMmYyyy(date)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const iso = parseDdMmYyyyToIso(val);
                          setDate(iso);
                        }}
                        placeholder=""
                        className="ocr-field-control font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (datePickerInputRef.current) {
                            try {
                              datePickerInputRef.current.showPicker();
                            } catch {
                              datePickerInputRef.current.focus();
                            }
                          }
                        }}
                        className="ocr-input-icon-btn"
                        title="Chọn ngày từ lịch"
                      >
                        <FinanceIcon name="calendar" size={15} />
                      </button>
                      <input
                        ref={datePickerInputRef}
                        type="date"
                        value={date.length === 10 ? date : ''}
                        onChange={(e) => {
                          if (e.target.value) setDate(e.target.value);
                        }}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </div>
                  </label>

                  {/* Giờ giao dịch */}
                  <label className="ocr-field-label">
                    <span>Giờ giao dịch</span>
                    <div className="ocr-input-icon-group">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="ocr-field-control font-mono"
                      />
                      <span className="ocr-input-icon-btn pointer-events-none">
                        <FinanceIcon name="clock" size={15} />
                      </span>
                    </div>
                  </label>

                  {/* Ghi chú */}
                  <label className="ocr-field-label sm:col-span-2">
                    <span>Ghi chú thêm</span>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nhập ghi chú chi tiết hóa đơn..."
                      className="ocr-field-control"
                    />
                  </label>
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="ocr-form-footer">
                {scanResult && (
                  <button
                    type="button"
                    onClick={resetCurrentScan}
                    disabled={submitting}
                    className="ocr-btn-reset"
                  >
                    Xóa form
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmTransaction}
                  disabled={submitting || !scanResult}
                  className="ocr-btn-submit"
                >
                  {submitting ? (
                    <>
                      <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <FinanceIcon name="plus" size={14} />
                      <span>Xác nhận &amp; Lưu giao dịch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORY CONTENT */}
          {activeRightTab === 'HISTORY' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Search & Filter Bar */}
              <div className="ocr-history-filter-bar">
                <div className="relative">
                  <FinanceIcon
                    name="search"
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Tìm theo tên quán, danh mục..."
                    className="ocr-field-control !h-8 !pl-8 !text-xs"
                  />
                </div>

                <div className="ocr-filter-track">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('ALL')}
                    className={`ocr-filter-pill ${historyTab === 'ALL' ? 'is-active' : ''}`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('PAID')}
                    className={`ocr-filter-pill ${historyTab === 'PAID' ? 'is-active' : ''}`}
                  >
                    Đã lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('DRAFT')}
                    className={`ocr-filter-pill ${historyTab === 'DRAFT' ? 'is-active' : ''}`}
                  >
                    Chưa lưu
                  </button>
                </div>
              </div>

              {/* Scrollable Receipts List */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {loadingReceipts ? (
                  <div className="py-12 text-center text-xs text-[#718579] flex flex-col items-center gap-2">
                    <span className="size-5 rounded-full border-2 border-[#07543f] border-t-transparent animate-spin" />
                    <span>Đang tải danh sách hóa đơn...</span>
                  </div>
                ) : filteredReceipts.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
                    <div className="size-10 rounded-full bg-gray-100 dark:bg-slate-800 grid place-items-center text-gray-400">
                      <FinanceIcon name="receipt" size={18} />
                    </div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                      {recentReceipts.length === 0 ? 'Chưa có hóa đơn nào' : 'Không tìm thấy hóa đơn'}
                    </p>
                  </div>
                ) : (
                  filteredReceipts.map((r) => {
                    const isPaid = Boolean(r.transactionId || r.kind === 'paid');
                    const isSelected = scanResult?.id === r.id;

                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRecentReceipt(r)}
                        className={`ocr-history-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Receipt Image Thumbnail */}
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt={r.merchantName || 'Hóa đơn'}
                                className="ocr-history-thumb"
                              />
                            ) : (
                              <div className="ocr-thumb-placeholder">
                                <FinanceIcon name="receipt" size={16} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {r.merchantName || 'Hóa đơn chưa đặt tên'}
                              </h4>
                              <span className="text-[10px] text-gray-400 dark:text-slate-400 block font-mono">
                                {[formatIsoToDdMmYyyy(r.transactionDate), r.transactionTime?.slice(0, 5)].filter(Boolean).join(' · ') || 'Không rõ thời gian'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {r.imageUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewUrl(r.imageUrl || null);
                                  setLightboxOpen(true);
                                }}
                                className="size-7 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 grid place-items-center transition"
                                title="Xem ảnh to"
                              >
                                <FinanceIcon name="eye" size={13} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleDeleteReceipt(e, r.id)}
                              className="size-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 grid place-items-center transition"
                              title="Xóa hóa đơn"
                            >
                              <FinanceIcon name="delete" size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#edf3ef] dark:border-slate-800/80 pt-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {r.aiCategoryName && (
                              <span className="rounded-md bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600 dark:text-slate-300">
                                {r.aiCategoryName}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-[#07543f] dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {isPaid ? 'Đã lưu GD' : 'Chưa lưu'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-[#07543f] dark:text-emerald-400">
                              {r.totalAmount != null ? `-${Number(r.totalAmount).toLocaleString('vi-VN')} ₫` : '—'}
                            </span>

                            {isSelected && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectRecentReceipt(r);
                                  setActiveRightTab('FORM');
                                }}
                                className="px-2 py-0.5 rounded-md bg-[#07543f] text-white text-[10px] font-bold hover:bg-[#064232] transition flex items-center gap-1 shadow-2xs"
                                title="Mở biểu mẫu để chỉnh sửa hoặc lưu giao dịch"
                              >
                                <span>Vào form</span>
                                <FinanceIcon name="arrow" size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX MODAL: Full Screen Image Preview */}
      {lightboxOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="size-9 rounded-full bg-white/20 hover:bg-white/35 text-white grid place-items-center transition backdrop-blur-sm cursor-pointer shadow-lg"
              title="Đóng"
            >
              <FinanceIcon name="close" size={16} />
            </button>
          </div>

          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={previewUrl}
              alt="Hóa đơn phóng to"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10 select-none"
            />
          </div>
        </div>
      )}
    </main>
  );
}

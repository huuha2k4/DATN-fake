import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { ocrApi, type OcrReceiptResult } from '../api/ocrApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';
import { transactionApi, type CategoryItem } from '../../cash-flow-management/api/transactionApi';

type Props = {
  onCancel: () => void;
  onNotify: (message: string) => void;
};

export function InvoiceOcrScreen({ onCancel, onNotify }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // History filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyTab, setHistoryTab] = useState<'ALL' | 'PAID' | 'DRAFT'>('ALL');

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

      // Auto-preview latest receipt with image if available
      const latestWithImage = list.find((item) => item.imageUrl);
      if (latestWithImage && !previewUrl && !scanResult) {
        setScanResult(latestWithImage);
        setPreviewUrl(latestWithImage.imageUrl || null);
        setMerchant(latestWithImage.merchantName || '');
        if (latestWithImage.transactionDate) setDate(latestWithImage.transactionDate);
        if (latestWithImage.transactionTime) setTime(latestWithImage.transactionTime.slice(0, 5));
        if (latestWithImage.totalAmount != null) setAmount(String(latestWithImage.totalAmount));
        if (latestWithImage.aiCategoryId) {
          const matched = cats.find((c) => c.id === latestWithImage.aiCategoryId || c.name === latestWithImage.aiCategoryName);
          if (matched) setSelectedCategoryId(matched.id);
        }
      }
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
      // If server returned imageUrl, use it; otherwise fallback to local blob
      if (result.imageUrl) {
        setPreviewUrl(result.imageUrl);
      }
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

      onNotify(`Quét thành công: ${result.merchantName || file.name}`);
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
    <main className="mx-auto flex h-[calc(100vh-68px)] max-h-[calc(100vh-68px)] w-full flex-1 flex-col bg-[#f6f8f6] dark:bg-[#07131e] p-2 sm:p-3 lg:p-4 text-[#14251f] dark:text-slate-100 overflow-hidden">
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
        <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col h-full rounded-2xl border border-[#e2ece5] dark:border-white/10 bg-white dark:bg-[#0c1a24] shadow-sm overflow-hidden min-h-0">
          
          {/* Card Top Toolbar (Clean, harmonious light theme) */}
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-[#edf3ef] dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="size-8 rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f8faf9] dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[#07543f] dark:text-emerald-400 grid place-items-center transition shadow-2xs"
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
                  className="h-8 px-2.5 rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-200 transition flex items-center gap-1 shadow-2xs"
                  title="Phóng to toàn màn hình"
                >
                  <FinanceIcon name="eye" size={13} />
                  <span>Xem to</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-xl bg-[#07543f] hover:bg-[#064232] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
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
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md p-2.5 border border-white/10 text-white flex items-center justify-between gap-2 shadow-lg">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {scanResult.merchantName || 'Hóa đơn đã nhận diện'}
                      </p>
                      <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                        <FinanceIcon name="spark" size={10} />
                        Độ tin cậy: {Math.round((scanResult.confidence || 0.95) * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="h-7 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white transition shrink-0 flex items-center gap-1"
                    >
                      <FinanceIcon name="eye" size={12} />
                      <span>Xem chi tiết ảnh</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (6 COLS): Extracted Form & Recent Receipts Tabs */}
        <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col h-full rounded-2xl border border-[#e2ece5] dark:border-white/10 bg-white dark:bg-[#0c1a24] shadow-sm overflow-hidden min-h-0">
          
          {/* Top Segmented Tabs Bar */}
          <div className="px-4 py-2 border-b border-[#edf3ef] dark:border-slate-800 flex items-center justify-between shrink-0 bg-[#f9fbf9] dark:bg-slate-900/80">
            <div className="flex h-8 items-center rounded-xl bg-[#e9f0eb] dark:bg-slate-800 p-0.5 border border-[#dce7df] dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveRightTab('FORM')}
                className={`h-full px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'FORM'
                    ? 'bg-white dark:bg-[#07543f] text-[#07543f] dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
                }`}
              >
                <FinanceIcon name="receipt" size={13} />
                <span>Thông tin hóa đơn</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRightTab('HISTORY');
                  if (!previewUrl && recentReceipts.length > 0) {
                    const firstWithImage = recentReceipts.find((r) => r.imageUrl) || recentReceipts[0];
                    handleSelectRecentReceipt(firstWithImage);
                  }
                }}
                className={`h-full px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'HISTORY'
                    ? 'bg-white dark:bg-[#07543f] text-[#07543f] dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
                }`}
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
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5">
                
                {/* Clean, Harmonious Amount Card */}
                <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 via-[#f4f9f6] to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 p-4 text-center shadow-2xs relative overflow-hidden shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#07543f] dark:text-emerald-400 block mb-1">
                    Tổng tiền thanh toán (VNĐ)
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setAmount(raw);
                      }}
                      className="bg-transparent text-center font-black text-3xl sm:text-4xl text-[#07543f] dark:text-white outline-none border-none ring-0 tracking-tight max-w-[280px]"
                    />
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 select-none">
                      ₫
                    </span>
                  </div>

                  {scanResult?.aiCategoryName && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-[#07543f] dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                      <FinanceIcon name="spark" size={11} />
                      <span>Danh mục AI: {scanResult.aiCategoryName}</span>
                    </div>
                  )}
                </div>

                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tên quán / Đơn vị */}
                  <label className="sm:col-span-2 flex flex-col gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                    <span>Đơn vị / Cửa hàng</span>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="VD: Highlands Coffee, WinMart..."
                      className="h-10 w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f9fbf9] dark:bg-slate-900 px-3 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-[#07543f] focus:ring-2 focus:ring-[#07543f]/20 transition"
                    />
                  </label>

                  {/* Danh mục */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                    <span className="flex items-center justify-between">
                      <span>Danh mục</span>
                      {scanResult?.aiCategoryName && (
                        <span className="text-[10px] font-semibold text-[#07543f] dark:text-emerald-400 flex items-center gap-0.5">
                          <FinanceIcon name="spark" size={10} />
                          AI gợi ý
                        </span>
                      )}
                    </span>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f9fbf9] dark:bg-slate-900 px-3 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-[#07543f] focus:ring-2 focus:ring-[#07543f]/20 transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Tài khoản thanh toán */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                    <span>Tài khoản thanh toán</span>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f9fbf9] dark:bg-slate-900 px-3 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-[#07543f] focus:ring-2 focus:ring-[#07543f]/20 transition"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({Number(a.balance || 0).toLocaleString('vi-VN')} {a.currencyCode || 'VND'})
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Ngày giao dịch */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                    <span>Ngày hóa đơn</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f9fbf9] dark:bg-slate-900 px-3 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-[#07543f] focus:ring-2 focus:ring-[#07543f]/20 transition"
                    />
                  </label>

                  {/* Giờ giao dịch */}
                  <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                    <span>Giờ giao dịch</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f9fbf9] dark:bg-slate-900 px-3 text-xs font-semibold text-gray-800 dark:text-white outline-none focus:border-[#07543f] focus:ring-2 focus:ring-[#07543f]/20 transition"
                    />
                  </label>

                  {/* Ghi chú */}
                  <label className="sm:col-span-2 flex flex-col gap-1 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                    <span>Ghi chú thêm</span>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú chi tiết hóa đơn..."
                      className="w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-[#f9fbf9] dark:bg-slate-900 p-2.5 text-xs font-medium text-gray-800 dark:text-white outline-none focus:border-[#07543f] focus:ring-2 focus:ring-[#07543f]/20 transition resize-none"
                    />
                  </label>
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="p-3.5 bg-[#f8faf9] dark:bg-slate-900 border-t border-[#e2ece5] dark:border-slate-800 shrink-0 flex items-center justify-end gap-2.5">
                {scanResult && (
                  <button
                    type="button"
                    onClick={resetCurrentScan}
                    disabled={submitting}
                    className="h-10 px-4 rounded-xl border border-[#d8e3dc] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 text-xs font-bold text-gray-700 dark:text-slate-200 transition"
                  >
                    Xóa form
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmTransaction}
                  disabled={submitting || !scanResult}
                  className="h-10 px-6 rounded-xl bg-[#07543f] hover:bg-[#064232] text-xs font-bold text-white shadow-md hover:shadow-lg transition flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
              <div className="p-3 border-b border-[#edf3ef] dark:border-slate-800 flex flex-col gap-2 shrink-0 bg-[#f9fbf9] dark:bg-slate-900/60">
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
                    className="h-8 w-full rounded-xl border border-[#e2ece5] dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs font-medium text-gray-800 dark:text-white outline-none focus:border-[#07543f] transition"
                  />
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('ALL')}
                    className={`flex-1 h-6 rounded-lg text-[10px] font-bold transition ${
                      historyTab === 'ALL'
                        ? 'bg-[#07543f] text-white shadow-2xs'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('PAID')}
                    className={`flex-1 h-6 rounded-lg text-[10px] font-bold transition ${
                      historyTab === 'PAID'
                        ? 'bg-[#07543f] text-white shadow-2xs'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Đã lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('DRAFT')}
                    className={`flex-1 h-6 rounded-lg text-[10px] font-bold transition ${
                      historyTab === 'DRAFT'
                        ? 'bg-[#07543f] text-white shadow-2xs'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
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
                        className={`group relative p-2.5 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'border-[#07543f] bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs'
                            : 'border-[#edf3ef] dark:border-slate-800/80 bg-[#fbfdfb] dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Receipt Image Thumbnail */}
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt={r.merchantName || 'Hóa đơn'}
                                className="size-11 rounded-lg object-cover border border-[#d8e3dc] dark:border-slate-700 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="size-11 rounded-lg bg-emerald-100/70 dark:bg-emerald-950 text-[#07543f] dark:text-emerald-300 grid place-items-center shrink-0">
                                <FinanceIcon name="receipt" size={16} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {r.merchantName || 'Hóa đơn chưa đặt tên'}
                              </h4>
                              <span className="text-[10px] text-gray-400 block">
                                {[r.transactionDate, r.transactionTime?.slice(0, 5)].filter(Boolean).join(' · ') || 'Không rõ thời gian'}
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

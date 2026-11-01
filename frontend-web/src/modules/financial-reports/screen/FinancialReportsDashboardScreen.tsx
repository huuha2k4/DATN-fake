import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { FinanceIcon, type IconName } from '../../core/components/FinanceIcon';
import { reportApi, type TransactionSummaryResponse, type PeriodFlowItem } from '../api/reportApi';
import { transactionApi, type TransactionItem } from '../../cash-flow-management/api/transactionApi';
import { accountApi, type AccountItem } from '../../account-management/api/accountApi';

type Props = { onNotify: (message: string) => void };

const TABS = ['Thu - Chi', 'Danh mục', 'So sánh'];
const PRESET_PERIODS = [
  { label: 'Tháng này', value: 'this_month' },
  { label: 'Tháng trước', value: 'last_month' },
  { label: '3 tháng qua', value: '3_months' },
  { label: '6 tháng qua', value: '6_months' },
  { label: 'Năm nay', value: 'this_year' },
  { label: 'Tùy chỉnh', value: 'custom' },
];

const CATEGORY_COLORS = [
  '#07543f', '#168361', '#e3a33d', '#478ac1', '#8971bb',
  '#c94e62', '#e67832', '#087557', '#526159', '#6366f1'
];

function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '0 đ';
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

function formatShortCurrency(amount: number | undefined | null): string {
  if (amount == null || amount === 0) return '0';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1).replace('.0', '') + 'B';
  }
  if (abs >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  if (abs >= 1_000) {
    return (amount / 1_000).toFixed(0) + 'k';
  }
  return amount.toString();
}

// Chuyển định dạng ngày YYYY-MM-DD sang DD/MM/YYYY chuẩn Việt Nam
function formatDateToVN(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDateVN(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (parts.length === 2) {
    return `Tháng ${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getCategoryIcon(name: string): IconName {
  const lower = name.toLowerCase();
  if (lower.includes('ăn') || lower.includes('uống') || lower.includes('cà phê') || lower.includes('food')) return 'coffee';
  if (lower.includes('mua') || lower.includes('sắm') || lower.includes('shopping')) return 'wallet';
  if (lower.includes('xe') || lower.includes('xăng') || lower.includes('di chuyển') || lower.includes('transport')) return 'arrows';
  if (lower.includes('hóa đơn') || lower.includes('điện') || lower.includes('nước') || lower.includes('bill')) return 'receipt';
  if (lower.includes('lương') || lower.includes('thu nhập') || lower.includes('salary') || lower.includes('thưởng')) return 'income';
  if (lower.includes('giải trí') || lower.includes('du lịch') || lower.includes('chơi')) return 'spark';
  return 'receipt';
}

export function FinancialReportsDashboardScreen({ onNotify }: Props) {
  const [activeTab, setActiveTab] = useState('Thu - Chi');
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  // Helper format ngày theo giờ địa phương YYYY-MM-DD chuẩn xác không bị lệch timezone UTC
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateRange, setDateRange] = useState<{ fromDate: string; toDate: string }>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      fromDate: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
      toDate: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
    };
  });

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<TransactionSummaryResponse | null>(null);
  const [trendData, setTrendData] = useState<PeriodFlowItem[]>([]);
  const [topTransactions, setTopTransactions] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [prevSummaryData, setPrevSummaryData] = useState<TransactionSummaryResponse | null>(null);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Tính ngày theo preset
  const handlePeriodChange = (val: string) => {
    setSelectedPeriod(val);
    const now = new Date();
    let from = '';
    let to = '';

    if (val === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = formatLocalDate(first);
      to = formatLocalDate(last);
    } else if (val === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      from = formatLocalDate(first);
      to = formatLocalDate(last);
    } else if (val === '3_months') {
      const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      from = formatLocalDate(first);
      to = formatLocalDate(now);
    } else if (val === '6_months') {
      const first = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      from = formatLocalDate(first);
      to = formatLocalDate(now);
    } else if (val === 'this_year') {
      const first = new Date(now.getFullYear(), 0, 1);
      from = formatLocalDate(first);
      to = formatLocalDate(now);
    }

    if (from && to) {
      setDateRange({ fromDate: from, toDate: to });
    }
  };

  // Tải danh sách ví / tài khoản phục vụ bộ lọc
  useEffect(() => {
    accountApi.getAccounts().then((res) => {
      setAccounts(res || []);
    }).catch(() => { });

    const handleClickOutside = (e: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(e.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xác định xem khoảng thời gian hiện tại có phải là 1 tháng (chu kỳ ngắn) hay nhiều tháng
  const isSingleMonthPeriod = useMemo(() => {
    if (selectedPeriod === 'this_month' || selectedPeriod === 'last_month') return true;
    if (!dateRange.fromDate || !dateRange.toDate) return true;
    const start = new Date(dateRange.fromDate);
    const end = new Date(dateRange.toDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 35; // Khoảng 1 tháng hoặc ít hơn -> Hiển thị theo ngày
  }, [selectedPeriod, dateRange]);

  // Nhãn hiển thị kỳ báo cáo động theo khoảng thời gian được chọn
  const { currentPeriodLabel, periodShortLabel, currentReportYear } = useMemo(() => {
    const year = dateRange.toDate ? dateRange.toDate.split('-')[0] : new Date().getFullYear().toString();

    if (selectedPeriod === 'this_month') {
      if (dateRange.toDate) {
        const parts = dateRange.toDate.split('-');
        const monthNum = parseInt(parts[1], 10);
        return { 
          currentPeriodLabel: `Tháng ${monthNum}/${parts[0]}`, 
          periodShortLabel: `Tháng ${monthNum}`, 
          currentReportYear: year 
        };
      }
      return { currentPeriodLabel: 'Tháng này', periodShortLabel: 'Tháng này', currentReportYear: year };
    }
    if (selectedPeriod === 'last_month') {
      if (dateRange.fromDate) {
        const parts = dateRange.fromDate.split('-');
        const monthNum = parseInt(parts[1], 10);
        return { 
          currentPeriodLabel: `Tháng ${monthNum}/${parts[0]}`, 
          periodShortLabel: `Tháng ${monthNum}`, 
          currentReportYear: year 
        };
      }
      return { currentPeriodLabel: 'Tháng trước', periodShortLabel: 'Tháng trước', currentReportYear: year };
    }
    if (selectedPeriod === '3_months') {
      return { currentPeriodLabel: '3 tháng qua', periodShortLabel: '3 tháng', currentReportYear: year };
    }
    if (selectedPeriod === '6_months') {
      return { currentPeriodLabel: '6 tháng qua', periodShortLabel: '6 tháng', currentReportYear: year };
    }
    if (selectedPeriod === 'this_year') {
      return { currentPeriodLabel: `Năm ${year}`, periodShortLabel: year, currentReportYear: year };
    }
    // Tùy chỉnh (custom)
    if (dateRange.fromDate && dateRange.toDate) {
      const fParts = dateRange.fromDate.split('-');
      const tParts = dateRange.toDate.split('-');
      const fromStr = `${fParts[2]}/${fParts[1]}`;
      const toStr = `${tParts[2]}/${tParts[1]}/${tParts[0]}`;
      return {
        currentPeriodLabel: `${fromStr} - ${toStr}`,
        periodShortLabel: `${fromStr}-${tParts[2]}/${tParts[1]}`,
        currentReportYear: year
      };
    }
    return { currentPeriodLabel: 'Kỳ này', periodShortLabel: 'Kỳ này', currentReportYear: year };
  }, [selectedPeriod, dateRange]);

  // Tải dữ liệu báo cáo chính (Kỳ này & Kỳ trước liền kề để phục vụ So sánh)
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const activeGroupBy = isSingleMonthPeriod ? 'day' : 'month';

      // Tính khoảng thời gian của Kỳ trước liền kề có độ dài tương đương
      let prevFrom = '';
      let prevTo = '';
      if (dateRange.fromDate && dateRange.toDate) {
        const currStart = new Date(dateRange.fromDate);
        const currEnd = new Date(dateRange.toDate);
        const diffMs = currEnd.getTime() - currStart.getTime();
        const prevEnd = new Date(currStart.getTime() - 24 * 60 * 60 * 1000);
        const prevStart = new Date(prevEnd.getTime() - diffMs);
        prevFrom = formatLocalDate(prevStart);
        prevTo = formatLocalDate(prevEnd);
      }

      const [sumRes, prevSumRes, trendRes, txListRes] = await Promise.all([
        reportApi.getSummary({
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          groupBy: activeGroupBy,
          accountId: selectedAccountId || undefined,
        }),
        prevFrom && prevTo ? reportApi.getSummary({
          fromDate: prevFrom,
          toDate: prevTo,
          groupBy: activeGroupBy,
          accountId: selectedAccountId || undefined,
        }).catch(() => null) : Promise.resolve(null),
        reportApi.getTrends('6months'),
        transactionApi.getTransactions({
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          accountId: selectedAccountId || undefined,
          transactionType: 'EXPENSE',
          pageSize: 5,
          sortBy: 'amount',
          sortOrder: 'desc',
        })
      ]);

      setSummaryData(sumRes);
      setPrevSummaryData(prevSumRes);

      // Xử lý dữ liệu xu hướng flow: Điền đầy đủ tất cả các mốc (ngày hoặc tháng) trong chu kỳ
      const rawPeriods = (sumRes.byPeriod && sumRes.byPeriod.length > 0)
        ? sumRes.byPeriod
        : (!isSingleMonthPeriod && trendRes.byPeriod && trendRes.byPeriod.length > 0 ? trendRes.byPeriod : []);

      // Tạo map dữ liệu để tra cứu nhanh theo date
      const flowMap = new Map<string, PeriodFlowItem>();
      rawPeriods.forEach(p => {
        if (p.date) {
          flowMap.set(p.date, p);
        }
      });

      const filledTrends: PeriodFlowItem[] = [];

      if (isSingleMonthPeriod) {
        // Chu kỳ ngày: lặp từ fromDate đến toDate
        if (dateRange.fromDate && dateRange.toDate) {
          const curr = new Date(dateRange.fromDate);
          const end = new Date(dateRange.toDate);

          while (curr <= end) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const existing = flowMap.get(dateStr);
            if (existing) {
              filledTrends.push(existing);
            } else {
              filledTrends.push({
                date: dateStr,
                income: 0,
                expense: 0,
                net: 0,
                transactionCount: 0,
              });
            }
            curr.setDate(curr.getDate() + 1);
          }
        }
      } else {
        // Chu kỳ tháng: lặp từ tháng bắt đầu đến tháng kết thúc
        if (dateRange.fromDate && dateRange.toDate) {
          const startParts = dateRange.fromDate.split('-');
          const endParts = dateRange.toDate.split('-');
          let y = parseInt(startParts[0], 10);
          let m = parseInt(startParts[1], 10);
          const endY = parseInt(endParts[0], 10);
          const endM = parseInt(endParts[1], 10);

          while (y < endY || (y === endY && m <= endM)) {
            const mStr = String(m).padStart(2, '0');
            const monthKey = `${y}-${mStr}`;
            const existing = flowMap.get(monthKey);
            if (existing) {
              filledTrends.push(existing);
            } else {
              filledTrends.push({
                date: monthKey,
                income: 0,
                expense: 0,
                net: 0,
                transactionCount: 0,
              });
            }
            m++;
            if (m > 12) {
              m = 1;
              y++;
            }
          }
        }
      }

      setTrendData(filledTrends.length > 0 ? filledTrends : rawPeriods);

      setTopTransactions(txListRes.transactions || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo cáo:', err);
      onNotify('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedAccountId, isSingleMonthPeriod, onNotify]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Thống kê tóm tắt
  const summary = summaryData?.summary || {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    averageDailyExpense: 0,
    transactionCount: 0,
  };

  const categories = useMemo(() => {
    const rawList = summaryData?.byCategory || [];
    // Tính tổng thực tế của các danh mục để tỷ lệ phần trăm luôn khớp 100%
    const sumCategories = rawList.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
    const effectiveTotal = sumCategories > 0 ? sumCategories : (summaryData?.summary?.totalExpense || 0);

    return rawList.map((cat, idx) => {
      const actualPct = effectiveTotal > 0 ? (cat.totalAmount / effectiveTotal) * 100 : 0;
      return {
        ...cat,
        percentage: actualPct,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        icon: getCategoryIcon(cat.categoryName),
      };
    });
  }, [summaryData]);

  // Helper tính góc slice và tạo SVG Donut Chart tương tác với hover tooltip
  const donutSlices = useMemo(() => {
    if (!categories.length || summary.totalExpense === 0) return [];
    let startAngle = 0;
    return categories.map((cat) => {
      const angle = (cat.percentage / 100) * 360;
      const endAngle = startAngle + angle;
      const slice = {
        ...cat,
        startAngle,
        endAngle,
      };
      startAngle = endAngle;
      return slice;
    });
  }, [categories, summary.totalExpense]);

  // Hàm chuyển góc sang tọa độ SVG
  const getCoordinatesForPercent = (angleInDegrees: number, radius = 50, center = 60) => {
    const radians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  // Render SVG Path cho từng múi Donut
  const createDonutPath = (startAngle: number, endAngle: number, innerR = 32, outerR = 52, center = 60) => {
    const isFullCircle = endAngle - startAngle >= 359.99;
    const adjustedEnd = isFullCircle ? startAngle + 359.99 : endAngle;

    const p1 = getCoordinatesForPercent(startAngle, outerR, center);
    const p2 = getCoordinatesForPercent(adjustedEnd, outerR, center);
    const p3 = getCoordinatesForPercent(adjustedEnd, innerR, center);
    const p4 = getCoordinatesForPercent(startAngle, innerR, center);

    const largeArc = adjustedEnd - startAngle > 180 ? 1 : 0;

    return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
  };

  // Dữ liệu so sánh Kỳ này vs Kỳ trước
  const comparisonData = useMemo(() => {
    const prevSum = prevSummaryData?.summary || {
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
      transactionCount: 0,
    };

    // Tính % tăng/giảm cho các chỉ số KPI
    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / Math.abs(prev)) * 100);
    };

    const incomeDelta = calcDelta(summary.totalIncome, prevSum.totalIncome);
    const expenseDelta = calcDelta(summary.totalExpense, prevSum.totalExpense);
    const netDelta = calcDelta(summary.netCashFlow, prevSum.netCashFlow);

    // Ghép danh sách danh mục giữa Kỳ này và Kỳ trước để so sánh
    const prevCategories = prevSummaryData?.byCategory || [];
    const prevCatMap = new Map<string, CategorySummaryItem>();
    prevCategories.forEach(c => {
      if (c.categoryId || c.categoryName) {
        prevCatMap.set(c.categoryId || c.categoryName, c);
      }
    });

    // Danh sách tất cả các category có mặt ở cả 2 kỳ
    const allCatKeys = new Set<string>();
    categories.forEach(c => allCatKeys.add(c.categoryId || c.categoryName));
    prevCategories.forEach(c => allCatKeys.add(c.categoryId || c.categoryName));

    const comparedCategories = Array.from(allCatKeys).map(key => {
      const currentCat = categories.find(c => (c.categoryId || c.categoryName) === key);
      const prevCat = prevCatMap.get(key);

      const name = currentCat?.categoryName || prevCat?.categoryName || 'Danh mục';
      const color = currentCat?.color || '#047857';
      const currentAmount = currentCat?.totalAmount || 0;
      const prevAmount = prevCat?.totalAmount || 0;
      const diffAmount = currentAmount - prevAmount;
      const pctChange = prevAmount > 0 
        ? Math.round(((currentAmount - prevAmount) / prevAmount) * 100)
        : (currentAmount > 0 ? 100 : 0);

      return {
        key,
        name,
        color,
        currentAmount,
        prevAmount,
        diffAmount,
        pctChange,
        currentCount: currentCat?.transactionCount || 0,
        prevCount: prevCat?.transactionCount || 0,
      };
    }).sort((a, b) => b.currentAmount - a.currentAmount);

    return {
      prevSum,
      incomeDelta,
      expenseDelta,
      netDelta,
      comparedCategories,
      prevPeriodLabel: 'Kỳ trước',
    };
  }, [summary, prevSummaryData, categories]);

  // Xuất file Excel (.xlsx) chuyên nghiệp và PDF chuẩn in ấn A4 (Chụp đủ cả 3 tab: Thu - Chi, Danh mục, So sánh)
  const handleExport = async (format: 'Excel' | 'PDF') => {
    if (format === 'PDF') {
      const container = reportContainerRef.current;
      if (!container) {
        onNotify('Không tìm thấy nội dung để xuất PDF.');
        return;
      }

      setIsExportingPdf(true);
      const originalTab = activeTab; // Lưu lại tab hiện tại người dùng đang đứng
      onNotify('Đang tổng hợp và chụp hình cả 3 phần báo cáo (Thu-Chi, Danh mục, So sánh)...');

      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const marginX = 8;
        const printWidth = pageWidth - marginX * 2;

        const tabsToCapture = ['Thu - Chi', 'Danh mục', 'So sánh'];
        let isFirstPage = true;
        let pendingImg: { imgData: string; width: number; height: number } | null = null;

        for (let i = 0; i < tabsToCapture.length; i++) {
          const tabName = tabsToCapture[i];
          // Chuyển sang tab tương ứng và đợi DOM render hoàn tất
          setActiveTab(tabName);
          await new Promise((resolve) => setTimeout(resolve, 350));
          await (document as any).fonts?.ready;

          // Chụp ảnh nguyên bản giao diện web với nền trắng thanh lịch, cố định độ rộng mô phỏng chuẩn máy tính desktop
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: Math.max(container.offsetWidth || 0, 1140),
            onclone: (clonedDoc) => {
              // Ép toàn bộ bản clone sang chế độ sáng (bỏ class 'dark' trên <html> và <body>)
              clonedDoc.documentElement.classList.remove('dark');
              clonedDoc.body.classList.remove('dark');
              clonedDoc.documentElement.style.colorScheme = 'light';
              clonedDoc.body.style.backgroundColor = '#ffffff';

              // Thêm banner Header và Footer bằng HTML trực tiếp để dùng đúng font Plus Jakarta Sans chuẩn của web
              const clonedContainer = clonedDoc.getElementById('financial-report-content');
              if (clonedContainer) {
                // Đảm bảo container chụp luôn rộng rãi chuẩn Desktop
                clonedContainer.style.width = '1120px';
                clonedContainer.style.maxWidth = '1120px';
                clonedContainer.style.margin = '0 auto';
                clonedContainer.style.backgroundColor = '#ffffff';

                // Thêm CSS khử triệt để toàn bộ hệ màu oklab, oklch trong bản clone trước khi chụp
                const styleOverride = clonedDoc.createElement('style');
                styleOverride.innerHTML = `
                  * {
                    color-scheme: light !important;
                  }
                  .dark {
                    color-scheme: light !important;
                  }
                `;
                clonedDoc.head.appendChild(styleOverride);

                // Header HTML
                const headerDiv = clonedDoc.createElement('div');
                headerDiv.style.display = 'flex';
                headerDiv.style.justifyContent = 'space-between';
                headerDiv.style.alignItems = 'center';
                headerDiv.style.padding = '8px 4px 12px 4px';
                headerDiv.style.borderBottom = '1.5px solid #e2e8f0';
                headerDiv.style.marginBottom = '12px';
                headerDiv.style.fontFamily = "'Plus Jakarta Sans', 'Inter', sans-serif";
                headerDiv.innerHTML = `
                  <div style="font-weight: 800; font-size: 13px; color: #07543f; letter-spacing: 0.5px;">
                    FINORA · QUẢN LÝ TÀI CHÍNH CÁ NHÂN & GIA ĐÌNH
                  </div>
                  <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                    Kỳ báo cáo: ${formatDateToVN(dateRange.fromDate)} → ${formatDateToVN(dateRange.toDate)} · Phần: ${tabName}
                  </div>
                `;
                clonedContainer.insertBefore(headerDiv, clonedContainer.firstChild);

                // Footer HTML
                const nowStr = new Date().toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const footerDiv = clonedDoc.createElement('div');
                footerDiv.style.display = 'flex';
                footerDiv.style.justifyContent = 'space-between';
                footerDiv.style.alignItems = 'center';
                footerDiv.style.padding = '12px 4px 4px 4px';
                footerDiv.style.borderTop = '1.5px solid #e2e8f0';
                footerDiv.style.marginTop = '16px';
                footerDiv.style.fontFamily = "'Plus Jakarta Sans', 'Inter', sans-serif";
                footerDiv.innerHTML = `
                  <div style="font-size: 10px; font-weight: 600; color: #64748b;">
                    Thời gian xuất báo cáo: ${nowStr} (Hệ thống Finora)
                  </div>
                  <div style="font-size: 10px; font-weight: 700; color: #07543f;">
                    Báo cáo ${tabName}
                  </div>
                `;
                clonedContainer.appendChild(footerDiv);
              }

              // Xử lý thay thế màu oklch và loại bỏ các thuộc tính gây cắt dòng chữ tiếng Việt trong html2canvas
              const elements = clonedDoc.querySelectorAll('*');
              elements.forEach((el) => {
                const htmlEl = el as HTMLElement;

                // Tắt overflow-y: auto / max-height giới hạn cuộn để danh mục mở rộng trọn vẹn, không bị scroll che mất hàng cuối
                if (htmlEl.classList.contains('overflow-y-auto')) {
                  htmlEl.style.maxHeight = 'none';
                  htmlEl.style.overflow = 'visible';
                }

                // Tắt truncate và overflow-hidden trên thẻ văn bản trong bản sao chụp để không bị cắt chữ
                if (htmlEl.classList.contains('truncate')) {
                  htmlEl.style.overflow = 'visible';
                  htmlEl.style.textOverflow = 'clip';
                  htmlEl.style.whiteSpace = 'normal';
                }

                // Giữ tên danh mục trong bảng báo cáo không bao giờ bị bẻ rớt dòng
                if (htmlEl.classList.contains('reports-cat-name')) {
                  htmlEl.style.whiteSpace = 'nowrap';
                  htmlEl.style.wordBreak = 'keep-all';
                  htmlEl.style.overflow = 'visible';
                }

                // Cố định chiều cao và căn giữa cho các badge trạng thái (Thâm hụt chi tiêu, Thặng dư tích lũy)
                if (htmlEl.classList.contains('reports-badge-deficit') || htmlEl.classList.contains('reports-badge-surplus')) {
                  htmlEl.style.height = 'auto';
                  htmlEl.style.minHeight = '24px';
                  htmlEl.style.lineHeight = '18px';
                  htmlEl.style.display = 'inline-flex';
                  htmlEl.style.alignItems = 'center';
                  htmlEl.style.justifyContent = 'center';
                  htmlEl.style.padding = '3px 8px';
                  htmlEl.style.whiteSpace = 'nowrap';
                }

                // Đảm bảo line-height rộng rãi để các dấu tiếng Việt (mũ, ngã, hỏi, sắc, huyền) không bị cắt
                if (['STRONG', 'SMALL', 'SPAN', 'P', 'H2', 'DIV'].includes(htmlEl.tagName)) {
                  htmlEl.style.lineHeight = '1.35';
                }

                const style = window.getComputedStyle(el);
                const isUnsupportedColor = (str: string | null) => {
                  if (!str) return false;
                  return str.includes('oklch') || str.includes('oklab') || str.includes('color(') || str.includes('lab(') || str.includes('lch(');
                };

                if (isUnsupportedColor(style.color)) {
                  htmlEl.style.color = '#0f172a';
                }
                if (isUnsupportedColor(style.backgroundColor)) {
                  htmlEl.style.backgroundColor = 'transparent';
                }
                if (isUnsupportedColor(style.borderColor)) {
                  htmlEl.style.borderColor = '#e2e8f0';
                }
                if (isUnsupportedColor(style.outlineColor)) {
                  htmlEl.style.outlineColor = 'transparent';
                }
                if (isUnsupportedColor((style as any).fill)) {
                  (htmlEl.style as any).fill = '#047857';
                }
                if (isUnsupportedColor((style as any).stroke)) {
                  (htmlEl.style as any).stroke = 'transparent';
                }
              });
            },
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const currentH = (canvas.height * printWidth) / canvas.width;

          // Xử lý bố cục: Trang 1 (Thu - Chi) riêng biệt
          // Nếu tab 2 (Danh mục) và tab 3 (So sánh) có tổng chiều cao vừa đủ trong 1 trang A4 (<= 270mm) -> ghép chung vào 1 trang!
          if (tabName === 'Thu - Chi') {
            if (!isFirstPage) pdf.addPage();
            isFirstPage = false;

            const scaleToFit = Math.min(1, (pageHeight - 20) / currentH);
            const finalW = printWidth * scaleToFit;
            const finalH = currentH * scaleToFit;
            const posX = (pageWidth - finalW) / 2;
            const posY = 10; // Trải từ trên xuống dưới

            pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH);
          } else if (tabName === 'Danh mục') {
            pendingImg = { imgData, width: printWidth, height: currentH };
          } else if (tabName === 'So sánh') {
            if (pendingImg) {
              const combinedHeight = pendingImg.height + currentH + 8; // Khoảng cách giữa 2 phần là 8mm

              if (combinedHeight <= (pageHeight - 20)) {
                // Đủ diện tích: Nhét cả Danh mục + So sánh vào chung 1 trang A4, trải từ trên xuống dưới
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;

                let currentY = 10;
                pdf.addImage(pendingImg.imgData, 'JPEG', marginX, currentY, pendingImg.width, pendingImg.height);
                currentY += pendingImg.height + 8;
                pdf.addImage(imgData, 'JPEG', marginX, currentY, printWidth, currentH);
              } else {
                // Nếu dữ liệu danh mục quá dài không đủ trang, in Danh mục trang 2 và So sánh trang 3 (đều trải từ trên xuống Y=10)
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;
                const scaleCat = Math.min(1, (pageHeight - 20) / pendingImg.height);
                pdf.addImage(pendingImg.imgData, 'JPEG', (pageWidth - pendingImg.width * scaleCat) / 2, 10, pendingImg.width * scaleCat, pendingImg.height * scaleCat);

                pdf.addPage();
                const scaleComp = Math.min(1, (pageHeight - 20) / currentH);
                pdf.addImage(imgData, 'JPEG', (pageWidth - printWidth * scaleComp) / 2, 10, printWidth * scaleComp, currentH * scaleComp);
              }
              pendingImg = null;
            }
          }
        }

        // Tên file xuất PDF theo định dạng dd/mm/yyyy
        const fromDateFormatted = formatDateVN(dateRange.fromDate).replace(/\//g, '-');
        const toDateFormatted = formatDateVN(dateRange.toDate).replace(/\//g, '-');
        pdf.save(`Bao_cao_tai_chinh_${fromDateFormatted}_den_${toDateFormatted}.pdf`);
        onNotify('Đã xuất thành công file PDF báo cáo tài chính đầy đủ 3 phần!');
      } catch (err) {
        console.error('Lỗi xuất PDF:', err);
        onNotify('Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại sau.');
      } finally {
        // Phục hồi lại tab ban đầu mà người dùng đang xem
        setActiveTab(originalTab);
        setIsExportingPdf(false);
      }
      return;
    }

    if (format === 'Excel') {
      try {
        onNotify('Đang khởi tạo bảng tính Excel chất lượng cao...');
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Finora Financial Management';
        workbook.created = new Date();

        // Hàm format ngày từ YYYY-MM-DD hoặc YYYY-MM sang DD/MM/YYYY
        const formatDateVN = (dateStr: string) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          if (parts.length === 2) {
            return `Tháng ${parts[1]}/${parts[0]}`;
          }
          return dateStr;
        };

        // Chỉ tạo đúng 1 Sheet duy nhất "Báo cáo tài chính" chứa toàn bộ thông tin liền mạch
        const sheet = workbook.addWorksheet('Báo cáo tài chính', {
          views: [{ showGridLines: true }]
        });

        // Thiết lập độ rộng các cột
        sheet.columns = [
          { key: 'A', width: 4 },
          { key: 'B', width: 22 },
          { key: 'C', width: 28 },
          { key: 'D', width: 22 },
          { key: 'E', width: 22 },
          { key: 'F', width: 20 },
          { key: 'G', width: 22 },
        ];

        // 1. Tiêu đề thương hiệu và Báo cáo
        sheet.mergeCells('B2:G2');
        const brandCell = sheet.getCell('B2');
        brandCell.value = 'FINORA · HỆ THỐNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN & GIA ĐÌNH';
        brandCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF07543F' } };
        brandCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(2).height = 20;

        sheet.mergeCells('B3:G3');
        const titleCell = sheet.getCell('B3');
        titleCell.value = 'BÁO CÁO TÀI CHÍNH VÀ THỐNG KÊ CHI TIÊU TOÀN DIỆN';
        titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF07543F' } };
        sheet.getRow(3).height = 36;

        // Phụ đề ngày tháng chuẩn dd/mm/yyyy
        sheet.mergeCells('B4:G4');
        const subCell = sheet.getCell('B4');
        const fromDateFormatted = formatDateVN(dateRange.fromDate);
        const toDateFormatted = formatDateVN(dateRange.toDate);
        const selectedWalletName = selectedAccountId
          ? accounts.find((a) => a.id === selectedAccountId)?.name || 'Tài khoản'
          : 'Tất cả tài khoản / ví';

        subCell.value = `Khoảng thời gian: ${fromDateFormatted}  đến  ${toDateFormatted}  |  Ví: ${selectedWalletName}  |  Năm: ${currentReportYear}`;
        subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
        subCell.alignment = { horizontal: 'center', vertical: 'middle' };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
        sheet.getRow(4).height = 24;

        // 2. KHỐI CHỈ SỐ KPI CHÍNH
        sheet.mergeCells('B6:G6');
        const kpiTitle = sheet.getCell('B6');
        kpiTitle.value = 'I. TỔNG QUAN VÀ CHỈ SỐ TÀI CHÍNH';
        kpiTitle.font = { name: 'Arial', size: 11.5, bold: true, color: { argb: 'FF07543F' } };
        sheet.getRow(6).height = 24;

        sheet.getRow(7).values = ['', 'CHỈ SỐ', 'GIÁ TRỊ (VNĐ)', 'TỶ LỆ / TẦN SUẤT', 'GHI CHÚ / ĐÁNH GIÁ', 'TRẠNG THÁI', ''];
        sheet.getRow(7).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
          const cell = sheet.getCell(`${col}7`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        sheet.getRow(7).height = 26;

        const kpis = [
          ['Tổng thu nhập', summary.totalIncome, '100.0%', 'Nguồn thu nhận được trong kỳ', 'Tích cực', 'FF10B981'],
          ['Tổng chi tiêu', summary.totalExpense, summary.totalIncome > 0 ? `${((summary.totalExpense / summary.totalIncome) * 100).toFixed(1)}% thu nhập` : '100.0%', 'Chi tiêu thực tế phát sinh', 'Cần kiểm soát', 'FFF43F5E'],
          ['Dòng tiền ròng', summary.netCashFlow, summary.totalIncome > 0 ? `${((summary.netCashFlow / summary.totalIncome) * 100).toFixed(1)}%` : '-', summary.netCashFlow >= 0 ? 'Thặng dư an toàn' : 'Thâm hụt ngân sách', summary.netCashFlow >= 0 ? 'Tốt' : 'Cảnh báo', summary.netCashFlow >= 0 ? 'FF10B981' : 'FFF43F5E'],
          ['Tỷ lệ tiết kiệm', `${savingsRate}%`, savingsRate >= 20 ? 'Đạt chuẩn 50/30/20' : 'Dưới mức khuyến nghị 20%', 'Mục tiêu tài chính', savingsRate >= 20 ? 'Đạt' : 'Chưa đạt', 'FF0284C7'],
          ['Tổng số giao dịch', `${summary.transactionCount} giao dịch`, `${summary.transactionCount > 0 ? Math.round(summary.totalExpense / summary.transactionCount).toLocaleString('vi-VN') : 0} đ/GD`, 'Tần suất chi tiêu trung bình', 'Bình thường', 'FF475569'],
        ];

        kpis.forEach((kpi, idx) => {
          const rowNum = 8 + idx;
          const row = sheet.getRow(rowNum);
          row.height = 22;
          row.values = ['', kpi[0], kpi[1], kpi[2], kpi[3], kpi[4]];

          const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
          ['B', 'C', 'D', 'E', 'F'].forEach(col => {
            const cell = sheet.getCell(`${col}${rowNum}`);
            cell.font = { name: 'Arial', size: 9.5 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });

          sheet.getCell(`B${rowNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
          if (typeof kpi[1] === 'number') {
            sheet.getCell(`C${rowNum}`).numFmt = '#,##0 "đ"';
          }
          sheet.getCell(`C${rowNum}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: kpi[5] as string } };
          sheet.getCell(`C${rowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`E${rowNum}`).alignment = { horizontal: 'left', vertical: 'middle' };
          sheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // 3. BẢNG CƠ CẤU CHI TIÊU THEO DANH MỤC
        const catStart = 15;
        sheet.mergeCells(`B${catStart}:G${catStart}`);
        const catTitle = sheet.getCell(`B${catStart}`);
        catTitle.value = 'II. CƠ CẤU CHI TIÊU THEO TỪNG DANH MỤC (BẢNG THỐNG KÊ CHI TIẾT)';
        catTitle.font = { name: 'Arial', size: 11.5, bold: true, color: { argb: 'FF07543F' } };
        sheet.getRow(catStart).height = 24;

        sheet.getRow(catStart + 1).values = ['', 'STT', 'DANH MỤC', 'TỔNG TIỀN (VNĐ)', 'TỶ TRỌNG (%)', 'SỐ LẦN CHI', 'TB / LẦN CHI (VNĐ)'];
        sheet.getRow(catStart + 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
          const cell = sheet.getCell(`${col}${catStart + 1}`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164E63' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        sheet.getRow(catStart + 1).height = 24;

        categories.forEach((cat, idx) => {
          const rNum = catStart + 2 + idx;
          const row = sheet.getRow(rNum);
          row.height = 21;
          row.values = ['', idx + 1, cat.categoryName, cat.totalAmount, cat.percentage / 100, cat.transactionCount, cat.averageAmount];

          const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FBF9';
          ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = sheet.getCell(`${col}${rNum}`);
            cell.font = { name: 'Arial', size: 9.5 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });

          sheet.getCell(`B${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`C${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
          sheet.getCell(`D${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`D${rNum}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE11D48' } };
          sheet.getCell(`D${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`E${rNum}`).numFmt = '0.0%';
          sheet.getCell(`E${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`F${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`G${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`G${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
        });

        // 4. BẢNG ĐỐI CHIẾU SO SÁNH KỲ NÀY VS KỲ TRƯỚC (PERIOD-OVER-PERIOD)
        const compStart = catStart + 3 + categories.length;
        sheet.mergeCells(`B${compStart}:G${compStart}`);
        const compTitle = sheet.getCell(`B${compStart}`);
        compTitle.value = 'III. ĐỐI CHIẾU CHI TIÊU DANH MỤC (KỲ NÀY VS KỲ TRƯỚC)';
        compTitle.font = { name: 'Arial', size: 11.5, bold: true, color: { argb: 'FF07543F' } };
        sheet.getRow(compStart).height = 24;

        sheet.getRow(compStart + 1).values = ['', 'DANH MỤC', 'KỲ TRƯỚC (VNĐ)', 'KỲ NÀY (VNĐ)', 'CHÊNH LỆCH (VNĐ)', '% BIẾN ĐỘNG', 'ĐÁNH GIÁ'];
        sheet.getRow(compStart + 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
          const cell = sheet.getCell(`${col}${compStart + 1}`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        sheet.getRow(compStart + 1).height = 24;

        comparisonData.comparedCategories.forEach((item, idx) => {
          const rNum = compStart + 2 + idx;
          const row = sheet.getRow(rNum);
          row.height = 21;
          const isUp = item.diffAmount > 0;
          const isSame = item.diffAmount === 0;
          const ratingText = isUp ? 'Tăng chi tiêu' : isSame ? 'Ổn định' : 'Tiết kiệm tốt';

          row.values = ['', item.name, item.prevAmount, item.currentAmount, item.diffAmount, item.pctChange / 100, ratingText];

          const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
          ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = sheet.getCell(`${col}${rNum}`);
            cell.font = { name: 'Arial', size: 9.5 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });

          sheet.getCell(`B${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
          sheet.getCell(`C${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`C${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`D${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`D${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFE11D48' } };
          sheet.getCell(`D${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`E${rNum}`).numFmt = '+#,##0 "đ";-#,##0 "đ";0 "đ"';
          sheet.getCell(`E${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: isUp ? 'FFE11D48' : isSame ? 'FF475569' : 'FF059669' } };
          sheet.getCell(`E${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`F${rNum}`).numFmt = '+0.0%;-0.0%;0.0%';
          sheet.getCell(`F${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`G${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`G${rNum}`).font = { name: 'Arial', size: 9, bold: true, color: { argb: isUp ? 'FFE11D48' : isSame ? 'FF64748B' : 'FF059669' } };
        });

        // 5. BẢNG BIẾN ĐỘNG THU - CHI THEO NGÀY (Chuẩn dd/mm/yyyy)
        const trendStart = compStart + 3 + comparisonData.comparedCategories.length;
        sheet.mergeCells(`B${trendStart}:G${trendStart}`);
        const trendTitle = sheet.getCell(`B${trendStart}`);
        trendTitle.value = 'IV. BIẾN ĐỘNG DÒNG TIỀN THEO MỐC THỜI GIAN';
        trendTitle.font = { name: 'Arial', size: 11.5, bold: true, color: { argb: 'FF07543F' } };
        sheet.getRow(trendStart).height = 24;

        sheet.getRow(trendStart + 1).values = ['', 'THỜI GIAN (dd/mm/yyyy)', 'THU NHẬP (VNĐ)', 'CHI TIÊU (VNĐ)', 'CHÊNH LỆCH RÒNG', 'SỐ GIAO DỊCH', 'TRẠNG THÁI'];
        sheet.getRow(trendStart + 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
          const cell = sheet.getCell(`${col}${trendStart + 1}`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164E63' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        sheet.getRow(trendStart + 1).height = 24;

        trendData.forEach((item, idx) => {
          const rNum = trendStart + 2 + idx;
          const row = sheet.getRow(rNum);
          row.height = 21;
          const net = item.income - item.expense;
          const statusText = net > 0 ? 'Thặng dư' : net < 0 ? 'Thâm hụt' : 'Cân bằng';
          row.values = ['', formatDateVN(item.date), item.income, item.expense, net, item.transactionCount, statusText];

          const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
          ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = sheet.getCell(`${col}${rNum}`);
            cell.font = { name: 'Arial', size: 9.5 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });

          sheet.getCell(`B${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`B${rNum}`).font = { name: 'Arial', size: 9.5, bold: true };
          sheet.getCell(`C${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`C${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF10B981' } };
          sheet.getCell(`C${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`D${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`D${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFF43F5E' } };
          sheet.getCell(`D${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`E${rNum}`).numFmt = '#,##0 "đ"';
          sheet.getCell(`E${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: net >= 0 ? 'FF10B981' : 'FFF43F5E' } };
          sheet.getCell(`E${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
          sheet.getCell(`F${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`G${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          sheet.getCell(`G${rNum}`).font = { name: 'Arial', size: 9, bold: true, color: { argb: net >= 0 ? 'FF10B981' : 'FFF43F5E' } };
        });

        // 6. BẢNG DANH SÁCH CÁC GIAO DỊCH ĐÁNG CHÚ Ý (Ngày chuẩn dd/mm/yyyy)
        if (topTransactions.length > 0) {
          const txStart = trendStart + 3 + trendData.length;
          sheet.mergeCells(`B${txStart}:G${txStart}`);
          const txTitle = sheet.getCell(`B${txStart}`);
          txTitle.value = 'V. TOP 5 KHOẢN CHI TIÊU LỚN ĐÁNG CHÚ Ý';
          txTitle.font = { name: 'Arial', size: 11.5, bold: true, color: { argb: 'FF07543F' } };
          sheet.getRow(txStart).height = 24;

          sheet.getRow(txStart + 1).values = ['', 'NGÀY (dd/mm/yyyy)', 'NỘI DUNG GIAO DỊCH', 'DANH MỤC', 'VÍ / NGUỒN TIỀN', 'SỐ TIỀN CHI (VNĐ)', 'GHI CHÚ'];
          sheet.getRow(txStart + 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = sheet.getCell(`${col}${txStart + 1}`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164E63' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
          sheet.getRow(txStart + 1).height = 24;

          topTransactions.forEach((tx, idx) => {
            const rNum = txStart + 2 + idx;
            const row = sheet.getRow(rNum);
            row.height = 21;
            row.values = [
              '',
              formatDateVN(tx.transactionDate),
              tx.description || 'Chi tiêu',
              tx.category?.name || 'Chưa phân loại',
              tx.accountName || 'Ví tiền mặt',
              -Math.abs(tx.amount),
              'Khoản chi lớn'
            ];

            const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
            ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
              const cell = sheet.getCell(`${col}${rNum}`);
              cell.font = { name: 'Arial', size: 9.5 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              };
            });

            sheet.getCell(`B${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getCell(`C${rNum}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
            sheet.getCell(`D${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getCell(`E${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getCell(`F${rNum}`).numFmt = '#,##0 "đ"';
            sheet.getCell(`F${rNum}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF43F5E' } };
            sheet.getCell(`F${rNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
            sheet.getCell(`G${rNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
          });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        const excelFromDate = formatDateVN(dateRange.fromDate).replace(/\//g, '-');
        const excelToDate = formatDateVN(dateRange.toDate).replace(/\//g, '-');
        link.download = `Bao_cao_tai_chinh_${excelFromDate}_den_${excelToDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onNotify('Đã xuất thành công bảng tính Excel chuẩn chuyên nghiệp!');
      } catch (err) {
        console.error('Lỗi xuất Excel:', err);
        onNotify('Có lỗi xảy ra khi tạo file Excel.');
      }
      return;
    }
  };

  // Format nhãn trục hoành biểu đồ:
  // Nếu là ngày (YYYY-MM-DD) -> 'DD/MM' (hoặc 'DD')
  // Nếu là tháng (YYYY-MM) -> 'MM/YYYY'
  const formatChartDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD -> DD/MM
      return `${parts[2]}/${parts[1]}`;
    }
    if (parts.length === 2) {
      // YYYY-MM -> Tháng MM/YYYY
      return `${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Tính tỷ lệ tiết kiệm
  const savingsRate = useMemo(() => {
    if (summary.totalIncome <= 0) return 0;
    const rate = ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100;
    return Math.max(-100, Math.min(100, Math.round(rate)));
  }, [summary.totalIncome, summary.totalExpense]);

  // Chuẩn bị max cho Bar chart xu hướng
  const maxBarValue = useMemo(() => {
    if (!trendData.length) return 10_000_000;
    const maxVal = Math.max(
      ...trendData.map(d => Math.max(d.income, d.expense))
    );
    return maxVal > 0 ? maxVal * 1.15 : 10_000_000;
  }, [trendData]);

  const visibleTransactions = topTransactions.slice(0, 5);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1560px] flex-col gap-4 px-3 pb-24 pt-4 text-[#14251f] sm:px-6 lg:px-8 lg:pb-8 dark:text-slate-100" aria-label="Báo cáo và thống kê tài chính">
      {/* HÀNG 1: TABS CHỨC NĂNG (THU - CHI / DANH MỤC / SO SÁNH) & NÚT XUẤT BÁO CÁO */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* TABS CHÍNH: Thu - Chi | Danh mục | So sánh */}
        <div className="reports-tab-group" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`reports-tab-item ${activeTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* NÚT XUẤT BÁO CÁO: EXCEL & PDF */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('Excel')}
            className="reports-action-btn"
            title="Xuất bảng số liệu ra file Excel (.xls)"
          >
            <FinanceIcon name="download" size={15} className="text-[#07543f] dark:text-[#34d399]" />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('PDF')}
            disabled={isExportingPdf}
            className={`reports-action-btn ${isExportingPdf ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="Chụp nguyên bản giao diện và lưu thành file PDF"
          >
            <FinanceIcon name="receipt" size={15} className="text-[#07543f] dark:text-[#34d399]" />
            <span>{isExportingPdf ? 'Đang xuất...' : 'Xuất PDF'}</span>
          </button>
        </div>
      </section>

      {/* HÀNG 2: THANH BỘ LỌC DỮ LIỆU - CHIỀU CAO ĐỒNG BỘ 44PX (H-11), ĐẸP MẮT CẢ SÁNG VÀ TỐI */}
      <section className="reports-filter-container grid grid-cols-1 gap-2.5 md:grid-cols-12 md:items-center">
        {/* Nhóm 1: Preset Buttons (chiều cao chuẩn h-11 bằng 2 ô bên cạnh) */}
        <div className="reports-preset-group md:col-span-5">
          {PRESET_PERIODS.slice(0, 4).map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePeriodChange(p.value)}
              className={`reports-preset-btn ${selectedPeriod === p.value ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Nhóm 2: Date Picker Input (chiều cao chuẩn h-11) */}
        <div className="reports-date-picker-box md:col-span-4">
          <FinanceIcon name="calendar" size={16} className="text-[#07543f] dark:text-[#34d399] shrink-0" />
          <div className="relative flex-1 flex items-center justify-center">
            <span className="text-xs font-bold text-[#14261e] dark:text-slate-100 pointer-events-none">
              {formatDateToVN(dateRange.fromDate)}
            </span>
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => {
                setSelectedPeriod('custom');
                setDateRange(prev => ({ ...prev, fromDate: e.target.value }));
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Chọn ngày bắt đầu (dd/mm/yyyy)"
            />
          </div>
          <span className="text-[#07543f] dark:text-[#34d399] font-bold select-none">→</span>
          <div className="relative flex-1 flex items-center justify-center">
            <span className="text-xs font-bold text-[#14261e] dark:text-slate-100 pointer-events-none">
              {formatDateToVN(dateRange.toDate)}
            </span>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => {
                setSelectedPeriod('custom');
                setDateRange(prev => ({ ...prev, toDate: e.target.value }));
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Chọn ngày kết thúc (dd/mm/yyyy)"
            />
          </div>
        </div>

        {/* Nhóm 3: Account / Wallet Filter - Custom Dropdown cao cấp, hỗ trợ Dark/Light mode và icon */}
        <div className="md:col-span-3 relative" ref={walletDropdownRef}>
          <button
            type="button"
            onClick={() => setIsWalletDropdownOpen((prev) => !prev)}
            className="reports-wallet-select-box w-full justify-between cursor-pointer"
            aria-expanded={isWalletDropdownOpen}
            aria-label="Lọc theo tài khoản hoặc ví"
          >
            <div className="flex items-center gap-2.5 truncate">
              <FinanceIcon name="wallet" size={16} className="text-[#07543f] dark:text-[#34d399] shrink-0" />
              <span className="truncate text-xs font-bold text-[#14261e] dark:text-slate-100">
                {selectedAccountId
                  ? accounts.find((a) => a.id === selectedAccountId)?.name || 'Tài khoản'
                  : `Tất cả tài khoản / ví (${accounts.length})`}
              </span>
            </div>
            <span className={`text-[10px] text-[#5d7568] dark:text-[#8da6b8] transition-transform duration-200 ${isWalletDropdownOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {isWalletDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-[#d5ded8] dark:border-[#173852] bg-white dark:bg-[#0e2333] p-1.5 shadow-xl max-h-60 overflow-y-auto animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setSelectedAccountId('');
                  setIsWalletDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition cursor-pointer ${selectedAccountId === ''
                    ? 'bg-emerald-50 text-[#07543f] dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                    : 'text-[#14261e] dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#122c40]'
                  }`}
              >
                <span>Tất cả tài khoản / ví ({accounts.length})</span>
                {selectedAccountId === '' && <span className="text-[#07543f] dark:text-emerald-400 font-bold">✓</span>}
              </button>

              <div className="my-1 border-t border-[#edf2ee] dark:border-[#173852]" />

              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setIsWalletDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition cursor-pointer ${isSelected
                        ? 'bg-emerald-50 text-[#07543f] dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                        : 'text-[#14261e] dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#122c40]'
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{acc.name}</span>
                    </div>
                    {isSelected && <span className="text-[#07543f] dark:text-emerald-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* LOADING INDICATOR */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-[#e6f4ec] py-2 text-xs font-medium text-[#07543f] dark:bg-[#07543f]/30 dark:text-[#a8ebca]">
          <span className="inline-block animate-spin">⚙</span>
          <span>Đang cập nhật số liệu báo cáo mới nhất...</span>
        </div>
      )}

      {/* VÙNG NỘI DUNG CHÍNH ĐƯỢC CHỤP ẢNH XUẤT RA PDF CHUẨN XÁC NHƯ MÀN HÌNH */}
      <div ref={reportContainerRef} id="financial-report-content" className="flex flex-col gap-4">
        {/* 3. BẢNG 4 CHỈ SỐ KPI CHÍNH - Ẩn ở tab So sánh để tránh trùng lặp dữ liệu */}
        {activeTab !== 'So sánh' && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số chính">
            {/* Thu nhập */}
            <div className="reports-kpi-card">
              <div className="flex items-center justify-between">
                <span className="reports-card-label">Tổng Thu Nhập</span>
                <span className="grid size-9 place-items-center rounded-xl kpi-icon-income dark:bg-[#07543f]/30 dark:text-[#34d399]">
                  <FinanceIcon name="income" size={17} />
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-[24px] font-black tracking-tight reports-kpi-amount-income dark:text-[#34d399]">
                  {formatCurrency(summary.totalIncome)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 kpi-sub-text dark:text-[#94a3b8]">
                <span className="size-2 rounded-full bg-[#10b981]" />
                <span>Thu thực tế ghi nhận</span>
              </div>
            </div>

            {/* Chi tiêu */}
            <div className="reports-kpi-card">
              <div className="flex items-center justify-between">
                <span className="reports-card-label">Tổng Chi Tiêu</span>
                <span className="grid size-9 place-items-center rounded-xl kpi-icon-expense dark:bg-rose-950/40 dark:text-rose-400">
                  <FinanceIcon name="expense" size={17} />
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-[24px] font-black tracking-tight reports-kpi-amount-expense dark:text-rose-400">
                  {formatCurrency(summary.totalExpense)}
                </div>
              </div>
              <div className="flex items-center gap-1 kpi-sub-text dark:text-[#94a3b8]">
                <span>Trung bình:</span>
                <strong>{formatCurrency(summary.averageDailyExpense)}/ngày</strong>
              </div>
            </div>

            {/* Dòng tiền ròng */}
            <div className="reports-kpi-card">
              <div className="flex items-center justify-between">
                <span className="reports-card-label">Dòng Tiền Ròng</span>
                <span className={`grid size-9 place-items-center rounded-xl ${summary.netCashFlow >= 0 ? 'kpi-icon-net-pos dark:bg-[#07543f]/30 dark:text-[#34d399]' : 'kpi-icon-net-neg dark:bg-rose-950/40 dark:text-rose-400'}`}>
                  <FinanceIcon name="trend" size={17} />
                </span>
              </div>
              <div className="my-2.5">
                <div className={`text-[24px] font-black tracking-tight ${summary.netCashFlow >= 0 ? 'reports-kpi-amount-net-pos dark:text-[#34d399]' : 'reports-kpi-amount-net-neg dark:text-rose-400'}`}>
                  {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
                </div>
              </div>
              <div className="flex items-center">
                <span className={summary.netCashFlow >= 0 ? 'reports-badge-surplus' : 'reports-badge-deficit'}>
                  {summary.netCashFlow >= 0 ? 'Thặng dư tích lũy' : 'Thâm hụt chi tiêu'}
                </span>
              </div>
            </div>

            {/* Tỷ lệ tiết kiệm & Hiệu suất */}
            <div className="reports-kpi-card">
              <div className="flex items-center justify-between">
                <span className="reports-card-label">Tỷ Lệ Tiết Kiệm</span>
                <span className="grid size-9 place-items-center rounded-xl kpi-icon-savings dark:bg-blue-950/40 dark:text-blue-400">
                  <FinanceIcon name="shield" size={17} />
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-[24px] font-black tracking-tight reports-kpi-amount-savings dark:text-[#f8fafc]">
                  {savingsRate}%
                </div>
              </div>
              <div className="flex items-center gap-1 kpi-sub-text dark:text-[#94a3b8]">
                <span>Tổng cộng:</span>
                <strong>{summary.transactionCount} giao dịch</strong>
              </div>
            </div>
          </section>
        )}

        {/* 4. FINAI ADVISOR - THANH ĐÁNH GIÁ TÀI CHÍNH TRỰC QUAN */}
        <section className="reports-advisor-card">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#07543f] text-[#a8ebca]">
            <FinanceIcon name="spark" size={16} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="reports-advisor-text">
              <strong className="font-black text-[#07543f] dark:text-[#6ee7b7]">FinAI Nhận định: </strong>
              {summary.netCashFlow > 0 ? (
                <>
                  Dòng tiền kỳ này đang dương <strong className="font-bold text-[#07543f] dark:text-[#34d399]">{formatCurrency(summary.netCashFlow)}</strong>.
                  {categories.length > 0 && ` Hạng mục tiêu biểu là "${categories[0].categoryName}" (${categories[0].percentage.toFixed(0)}%).`}
                  {' '}Khuyến nghị trích 30% thặng dư này cho quỹ tích lũy dài hạn.
                </>
              ) : summary.netCashFlow < 0 ? (
                <>
                  Chi tiêu đang vượt quá thu nhập <strong className="font-bold text-rose-700 dark:text-rose-400">{formatCurrency(Math.abs(summary.netCashFlow))}</strong>.
                  Hãy cân đối lại các khoản chi mua sắm tùy hứng trong tháng.
                </>
              ) : (
                'Chưa ghi nhận đủ dữ liệu biến động thu chi trong khoảng thời gian đã chọn.'
              )}
            </p>
            <span className="reports-advisor-badge shrink-0">
              Điểm tài chính: {savingsRate >= 20 ? 'Tốt (+A)' : savingsRate >= 0 ? 'Ổn định (B)' : 'Cảnh báo (C)'}
            </span>
          </div>
        </section>

        {/* 5. NỘI DUNG CHÍNH THEO TAB */}
        {activeTab === 'Danh mục' ? (
          /* TAB 2: DANH MỤC - TẬP TRUNG TOÀN DIỆN VÀO CƠ CẤU VÀ BẢNG CHI TIẾT TỪNG DANH MỤC */
          <section className="space-y-4">
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
              {/* VÒNG DONUT CƠ CẤU CHI TIÊU (5 CỘT) */}
              <article className="reports-card flex flex-col justify-between lg:col-span-5">
                <div>
                  <header className="flex items-center justify-between gap-2 border-b border-[#edf2ee] pb-3 dark:border-[#1e293b]">
                    <div>
                      <h2 className="reports-title-dark text-base sm:text-lg">Tỷ Trọng Cơ Cấu Chi Tiêu</h2>
                      <p className="reports-subtitle text-xs">Biểu đồ phân bổ tỷ lệ theo từng nhóm chi phí</p>
                    </div>
                    <span className="reports-category-count-badge">
                      {categories.length} nhóm
                    </span>
                  </header>

                  <div className="mt-5 flex flex-col items-center justify-center gap-5 sm:flex-row">
                    {/* Vòng Donut SVG Tương Tác: Hover múi nào hiện tooltip & sáng múi đó */}
                    <div className="shrink-0 flex flex-col items-center justify-center py-2 relative">
                      <div className="relative size-36">
                        <svg viewBox="0 0 120 120" className="size-full -rotate-90 transform">
                          {donutSlices.length === 0 ? (
                            <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                          ) : (
                            donutSlices.map((slice) => {
                              const isHovered = hoveredCategory === (slice.categoryId || slice.categoryName);
                              return (
                                <path
                                  key={slice.categoryId || slice.categoryName}
                                  d={createDonutPath(slice.startAngle, slice.endAngle, 32, isHovered ? 55 : 50, 60)}
                                  fill={slice.color}
                                  className="transition-all duration-200 cursor-pointer hover:brightness-110"
                                  opacity={hoveredCategory ? (isHovered ? 1 : 0.45) : 1}
                                  onMouseEnter={() => setHoveredCategory(slice.categoryId || slice.categoryName)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                >
                                  <title>{`${slice.categoryName}: ${formatCurrency(slice.totalAmount)} (${slice.percentage.toFixed(1)}%)`}</title>
                                </path>
                              );
                            })
                          )}
                        </svg>
                        {/* Tâm vòng tròn hiển thị số liệu động khi hover */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                          {hoveredCategory ? (
                            (() => {
                              const activeSlice = categories.find(c => (c.categoryId || c.categoryName) === hoveredCategory);
                              if (!activeSlice) return null;
                              return (
                                <>
                                  <strong className="text-xs font-black truncate max-w-[70px] text-[#0f172a] dark:text-white">
                                    {formatShortCurrency(activeSlice.totalAmount)}
                                  </strong>
                                  <span className="text-[10px] font-extrabold text-[#07543f] dark:text-[#34d399]">
                                    {activeSlice.percentage.toFixed(1)}%
                                  </span>
                                  <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[65px]">
                                    {activeSlice.categoryName}
                                  </span>
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <strong className="text-sm font-black">{formatShortCurrency(summary.totalExpense)}</strong>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#07543f] dark:text-[#34d399] truncate max-w-[80px]" title={currentPeriodLabel}>
                                {periodShortLabel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chú giải nhanh các nhóm danh mục chính kèm tương tác hover đồng bộ */}
                    <div className="w-full flex-1 max-h-[220px] overflow-y-auto pr-1">
                      {categories.length === 0 ? (
                        <p className="py-6 text-center text-xs font-semibold text-[#334155] dark:text-[#64748b]">Chưa có khoản chi trong kỳ</p>
                      ) : (
                        <div className="divide-y divide-[#e8eee9] dark:divide-[#1e293b]">
                          {categories.map((item) => {
                            const isHovered = hoveredCategory === (item.categoryId || item.categoryName);
                            return (
                              <div
                                key={item.categoryId || item.categoryName}
                                className={`flex items-center justify-between py-2 text-xs rounded-lg px-1.5 transition-all cursor-pointer ${isHovered ? 'bg-emerald-50/70 dark:bg-emerald-950/40 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                                onMouseEnter={() => setHoveredCategory(item.categoryId || item.categoryName)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              >
                                <span className="flex items-center gap-2 truncate max-w-[140px]">
                                  <i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span className="truncate reports-cat-name dark:text-[#e2e8f0]">{item.categoryName}</span>
                                </span>
                                <span className="text-right font-extrabold text-[#0f172a] dark:text-white">
                                  {formatCurrency(item.totalAmount)} <span className="font-extrabold text-[#047857] dark:text-[#34d399]">({item.percentage.toFixed(1)}%)</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="reports-sub-footer mt-4">
                  {categories.length > 0 ? (
                    <span className="text-[#334155] dark:text-[#94a3b8] font-semibold">
                      Nhóm chiếm tỷ trọng cao nhất: <strong className="font-extrabold text-[#0f172a] dark:text-white">{categories[0].categoryName}</strong> (<strong className="font-black text-[#047857] dark:text-[#34d399]">{categories[0].percentage.toFixed(1)}%</strong>).
                    </span>
                  ) : (
                    <span className="text-[#334155] dark:text-[#94a3b8]">Chưa phát sinh dữ liệu chi tiêu.</span>
                  )}
                </div>
              </article>

              {/* BẢNG CHI TIẾT CỤ THỂ TOÀN BỘ CÁC DANH MỤC TRONG KỲ (7 CỘT) */}
              <article className="reports-card flex flex-col justify-between lg:col-span-7">
                <div>
                  <header className="flex items-center justify-between gap-2 border-b border-[#edf2ee] pb-3 dark:border-[#1e293b]">
                    <div>
                      <h2 className="reports-title-dark text-base sm:text-lg">Bảng Thống Kê Chi Tiết Danh Mục</h2>
                      <p className="reports-subtitle text-xs">Số tiền, tỷ trọng, số lần chi và mức chi tiêu trung bình</p>
                    </div>
                    <span className="text-xs font-bold text-[#07543f] dark:text-[#34d399]">
                      Tổng chi: {formatCurrency(summary.totalExpense)}
                    </span>
                  </header>

                  <div className="mt-2 w-full">
                    <table className="reports-table w-full text-xs">
                      <thead>
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[11px] whitespace-nowrap min-w-[130px]">Danh mục</th>
                          <th className="px-2 py-2.5 text-right text-[11px] whitespace-nowrap">Tổng chi tiêu</th>
                          <th className="px-1.5 py-2.5 text-center text-[11px] whitespace-nowrap">Tỷ trọng</th>
                          <th className="px-1.5 py-2.5 text-center text-[11px] whitespace-nowrap">Số lần</th>
                          <th className="px-2 py-2.5 text-right text-[11px] whitespace-nowrap">TB / lần</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-xs font-semibold text-[#64748b]">Chưa có dữ liệu giao dịch trong khoảng thời gian này</td>
                          </tr>
                        ) : (
                          categories.map((item) => (
                            <tr key={item.categoryId || item.categoryName} className="transition-colors">
                              <td className="px-3 py-2.5 font-bold text-[#0f172a] dark:text-[#f1f5f9] whitespace-nowrap">
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="reports-cat-name dark:text-[#e2e8f0] text-xs whitespace-nowrap">{item.categoryName}</span>
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-right font-extrabold text-[#e11d48] dark:text-rose-400 whitespace-nowrap">
                                -{formatCurrency(item.totalAmount)}
                              </td>
                              <td className="px-1.5 py-2.5 text-center whitespace-nowrap">
                                <span className="inline-flex items-center rounded-md reports-percentage-badge px-2 py-0.5 text-[11px] font-bold dark:bg-[#07543f]/30 dark:text-[#34d399]">
                                  {item.percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-1.5 py-2.5 text-center font-semibold text-[#334155] dark:text-[#94a3b8] whitespace-nowrap">
                                {item.transactionCount}
                              </td>
                              <td className="px-2 py-2.5 text-right font-semibold text-[#334155] dark:text-[#94a3b8] whitespace-nowrap">
                                {formatCurrency(item.averageAmount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              <footer className="mt-3 border-t border-[#edf2ee] pt-2.5 text-[11.5px] reports-tx-footer dark:border-[#1e293b]">
                Thống kê toàn bộ {categories.length} nhóm danh mục chi tiêu trong kỳ
              </footer>
            </article>
          </div>
        </section>
      ) : activeTab === 'So sánh' ? (
        /* TAB 3: SO SÁNH ĐỐI CHIẾU KỲ NÀY VỚI KỲ TRƯỚC (PERIOD-OVER-PERIOD) */
        <section className="space-y-4">
          {/* HÀNG 1: 3 THẺ CHÊNH LỆCH DELTA KPIS */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Thu nhập */}
            <div className="reports-card p-4">
              <span className="text-xs font-bold text-[#5d7568] dark:text-[#94a3b8]">Biến Động Thu Nhập</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black text-[#047857] dark:text-[#34d399]">
                  {formatCurrency(summary.totalIncome)}
                </span>
                <span className={`inline-flex items-center text-xs font-extrabold px-2 py-0.5 rounded-md ${
                  comparisonData.incomeDelta >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {comparisonData.incomeDelta >= 0 ? '↑ +' : '↓ '}{comparisonData.incomeDelta}%
                </span>
              </div>
              <small className="block mt-1 text-[11px] text-slate-500">
                Kỳ trước: {formatCurrency(comparisonData.prevSum.totalIncome)}
              </small>
            </div>

            {/* Chi tiêu */}
            <div className="reports-card p-4">
              <span className="text-xs font-bold text-[#5d7568] dark:text-[#94a3b8]">Biến Động Chi Tiêu</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black text-[#e11d48] dark:text-rose-400">
                  {formatCurrency(summary.totalExpense)}
                </span>
                <span className={`inline-flex items-center text-xs font-extrabold px-2 py-0.5 rounded-md ${
                  comparisonData.expenseDelta <= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {comparisonData.expenseDelta > 0 ? '↑ +' : '↓ '}{comparisonData.expenseDelta}%
                </span>
              </div>
              <small className="block mt-1 text-[11px] text-slate-500">
                Kỳ trước: {formatCurrency(comparisonData.prevSum.totalExpense)} {comparisonData.expenseDelta <= 0 ? '(Tiết kiệm hơn)' : '(Chi tiêu nhiều hơn)'}
              </small>
            </div>

            {/* Dòng tiền ròng */}
            <div className="reports-card p-4">
              <span className="text-xs font-bold text-[#5d7568] dark:text-[#94a3b8]">Dòng Tiền Ròng So Sánh</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-xl font-black ${summary.netCashFlow >= 0 ? 'text-[#047857] dark:text-[#34d399]' : 'text-[#e11d48] dark:text-rose-400'}`}>
                  {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
                </span>
                <span className={`inline-flex items-center text-xs font-extrabold px-2 py-0.5 rounded-md ${
                  summary.netCashFlow >= comparisonData.prevSum.netCashFlow ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {summary.netCashFlow >= comparisonData.prevSum.netCashFlow ? '↑ Cải thiện' : '↓ Giảm'}
                </span>
              </div>
              <small className="block mt-1 text-[11px] text-slate-500">
                Kỳ trước: {comparisonData.prevSum.netCashFlow >= 0 ? '+' : ''}{formatCurrency(comparisonData.prevSum.netCashFlow)}
              </small>
            </div>
          </div>

          {/* HÀNG 2: BẢNG SO SÁNH ĐỐI CHIẾU CHI TIÊU TỪNG DANH MỤC */}
          <article className="reports-card overflow-hidden">
            <header className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center border-b border-[#edf2ee] pb-3 dark:border-[#1e293b]">
              <div>
                <h2 className="reports-title-dark text-base sm:text-lg">Đối Chiếu Chi Tiêu Theo Danh Mục (Kỳ Này vs Kỳ Trước)</h2>
                <p className="reports-subtitle text-xs">Theo dõi mức tăng giảm chi tiêu của từng nhóm danh mục để kiểm soát ngân sách</p>
              </div>
              <span className="text-xs font-bold text-[#07543f] dark:text-[#34d399]">
                {comparisonData.comparedCategories.length} nhóm đối chiếu
              </span>
            </header>

            <div className="w-full">
              <table className="reports-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] whitespace-nowrap min-w-[130px]">Danh mục</th>
                    <th className="px-2 py-2.5 text-right text-[11px] whitespace-nowrap">Kỳ trước</th>
                    <th className="px-2 py-2.5 text-right text-[11px] whitespace-nowrap">Kỳ này</th>
                    <th className="px-2 py-2.5 text-right text-[11px] whitespace-nowrap">Chênh lệch (VNĐ)</th>
                    <th className="px-1.5 py-2.5 text-center text-[11px] whitespace-nowrap">% Biến động</th>
                    <th className="px-2 py-2.5 text-center text-[11px] whitespace-nowrap">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.comparedCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs font-semibold text-[#64748b]">
                        Chưa có dữ liệu giao dịch ở cả hai kỳ để đối chiếu
                      </td>
                    </tr>
                  ) : (
                    comparisonData.comparedCategories.map((item) => {
                      const isUp = item.diffAmount > 0;
                      const isSame = item.diffAmount === 0;
                      return (
                        <tr key={item.key} className="transition-colors">
                          <td className="px-3 py-2.5 font-bold text-[#0f172a] dark:text-[#f1f5f9] whitespace-nowrap">
                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="reports-cat-name dark:text-[#e2e8f0] text-xs whitespace-nowrap">{item.name}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium text-slate-500 whitespace-nowrap">
                            {formatCurrency(item.prevAmount)}
                          </td>
                          <td className="px-2 py-2.5 text-right font-extrabold text-[#0f172a] dark:text-white whitespace-nowrap">
                            {formatCurrency(item.currentAmount)}
                          </td>
                          <td className={`px-2 py-2.5 text-right font-bold whitespace-nowrap ${
                            isUp ? 'text-rose-600 dark:text-rose-400' : isSame ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isUp ? '+' : ''}{formatCurrency(item.diffAmount)}
                          </td>
                          <td className="px-1.5 py-2.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              isUp 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' 
                                : isSame 
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            }`}>
                              {isUp ? '↑ +' : isSame ? '' : '↓ '}{item.pctChange}%
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
                            <span className={`text-[11px] font-semibold ${
                              isUp ? 'text-rose-600 dark:text-rose-400' : isSame ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isUp ? 'Tăng chi tiêu' : isSame ? 'Ổn định' : 'Tiết kiệm tốt'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer className="mt-3 border-t border-[#edf2ee] pt-2.5 text-[11.5px] reports-tx-footer dark:border-[#1e293b]">
              Đối chiếu trực tiếp {comparisonData.comparedCategories.length} nhóm danh mục giữa kỳ hiện tại và kỳ liền kề trước đó
            </footer>
          </article>
        </section>
      ) : (

          /* TAB 1: THU - CHI */
          <section className="space-y-4">
            <article className="reports-card flex flex-col justify-between">
              <div>
                <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="reports-title-dark text-base sm:text-lg">
                      {isSingleMonthPeriod ? `Biến động Thu - Chi Theo Ngày (${formatDateToVN(dateRange.fromDate)} → ${formatDateToVN(dateRange.toDate)})` : `Biến động Thu - Chi Theo Tháng (Năm ${currentReportYear})`}
                    </h2>
                    <p className="reports-subtitle text-xs">
                      {isSingleMonthPeriod ? 'Chi tiết dòng tiền vào và ra toàn bộ các ngày trong kỳ' : 'Đối chiếu dòng tiền vào và ra qua các chu kỳ tháng'}
                    </p>
                  </div>
                  <div className="reports-legend-pill">
                    <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ backgroundColor: '#047857' }} />Thu</span>
                    <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ backgroundColor: '#e11d48' }} />Chi</span>
                  </div>
                </header>

                {/* BIỂU ĐỒ BAR CHART RỘNG RÃI */}
                <div className="relative mt-6 h-[260px] sm:h-[280px]" role="img" aria-label="Biểu đồ thu chi">
                  {/* Trục kẻ ngang */}
                  <div className="absolute inset-0 flex flex-col justify-between pb-7 text-[11px] font-semibold text-[#5d7568] dark:text-[#8da6b8]">
                    {[maxBarValue, maxBarValue * 0.75, maxBarValue * 0.5, maxBarValue * 0.25, 0].map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-10 text-right">{formatShortCurrency(v)}</span>
                        <span className="reports-chart-line" />
                      </div>
                    ))}
                  </div>

                  {/* Vùng cột dữ liệu */}
                  <div className="absolute bottom-7 left-12 right-0 top-0 flex items-end gap-0.5 sm:gap-1">
                    {trendData.length === 0 ? (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-[#5d7568] dark:text-[#8da6b8]">
                        Chưa có dữ liệu chu kỳ
                      </div>
                    ) : (
                      trendData.map((item) => {
                        const incomePct = Math.min(100, Math.max(3, (item.income / maxBarValue) * 100));
                        const expensePct = Math.min(100, Math.max(3, (item.expense / maxBarValue) * 100));
                        return (
                          <div
                            key={item.date}
                            className="flex h-full flex-1 min-w-0 items-end justify-center gap-0.5 group cursor-pointer"
                            title={`${item.date}: Thu ${formatCurrency(item.income)} | Chi ${formatCurrency(item.expense)}`}
                          >
                            <span
                              className="w-[45%] rounded-t-sm transition-all group-hover:brightness-110 shadow-xs"
                              style={{
                                height: item.income > 0 ? `${incomePct}%` : '2px',
                                backgroundColor: item.income > 0 ? '#047857' : '#d1fae5',
                                opacity: item.income > 0 ? 1 : 0.4
                              }}
                            />
                            <span
                              className="w-[45%] rounded-t-sm transition-all group-hover:brightness-110 shadow-xs"
                              style={{
                                height: item.expense > 0 ? `${expensePct}%` : '2px',
                                backgroundColor: item.expense > 0 ? '#e11d48' : '#ffe4e6',
                                opacity: item.expense > 0 ? 1 : 0.4
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Trục hoành nhãn mốc ngày/tháng */}
                  <div className="absolute bottom-0 left-12 right-0 flex justify-between text-[10px] font-bold text-[#5d7568] dark:text-[#8da6b8]">
                    {trendData.length <= 12 ? (
                      trendData.map(item => (
                        <span key={item.date} className="truncate">{formatChartDateLabel(item.date)}</span>
                      ))
                    ) : (
                      <>
                        <span>{formatChartDateLabel(trendData[0]?.date || '')}</span>
                        {trendData[Math.floor(trendData.length * 0.25)] && (
                          <span>{formatChartDateLabel(trendData[Math.floor(trendData.length * 0.25)].date)}</span>
                        )}
                        {trendData[Math.floor(trendData.length * 0.5)] && (
                          <span>{formatChartDateLabel(trendData[Math.floor(trendData.length * 0.5)].date)}</span>
                        )}
                        {trendData[Math.floor(trendData.length * 0.75)] && (
                          <span>{formatChartDateLabel(trendData[Math.floor(trendData.length * 0.75)].date)}</span>
                        )}
                        <span className="font-extrabold text-[#07543f] dark:text-[#34d399]">
                          {formatChartDateLabel(trendData[trendData.length - 1]?.date || '')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Chú thích chân biểu đồ */}
              <footer className="reports-sub-footer mt-4">
                <span className="flex items-center gap-1.5 truncate">
                  <FinanceIcon name="trend" size={14} className="text-[#047857] dark:text-[#34d399] shrink-0" />
                  <span className="text-[#334155] dark:text-[#94a3b8] font-bold">Khoản chi lớn nhất:</span>
                  <strong className="text-[#0f172a] dark:text-white truncate font-extrabold ml-1">
                    {summary.largestExpense ? `${summary.largestExpense.description || 'Chi tiêu'} (${formatCurrency(summary.largestExpense.amount)})` : 'Không có'}
                  </strong>
                </span>
              </footer>
            </article>

            {/* HÀNG DƯỚI: CƠ CẤU CHI TIÊU & TOP 5 KHOẢN CHI LỚN NHẤT */}
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
              <article className="reports-card flex flex-col justify-between lg:col-span-5">
                <div>
                  <header className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="reports-title-dark text-base sm:text-lg">Cơ Cấu Chi Tiêu ({currentPeriodLabel})</h2>
                      <p className="reports-subtitle text-xs">Phân bổ theo nhóm danh mục</p>
                    </div>
                    <span className="reports-category-count-badge">
                      {categories.length} nhóm
                    </span>
                  </header>

                  <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                    <div className="shrink-0 flex justify-center py-1 relative">
                      <div className="relative size-32">
                        <svg viewBox="0 0 120 120" className="size-full -rotate-90 transform">
                          {donutSlices.length === 0 ? (
                            <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                          ) : (
                            donutSlices.map((slice) => {
                              const isHovered = hoveredCategory === (slice.categoryId || slice.categoryName);
                              return (
                                <path
                                  key={slice.categoryId || slice.categoryName}
                                  d={createDonutPath(slice.startAngle, slice.endAngle, 32, isHovered ? 54 : 50, 60)}
                                  fill={slice.color}
                                  className="transition-all duration-200 cursor-pointer hover:brightness-110"
                                  opacity={hoveredCategory ? (isHovered ? 1 : 0.45) : 1}
                                  onMouseEnter={() => setHoveredCategory(slice.categoryId || slice.categoryName)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                >
                                  <title>{`${slice.categoryName}: ${formatCurrency(slice.totalAmount)} (${slice.percentage.toFixed(1)}%)`}</title>
                                </path>
                              );
                            })
                          )}
                        </svg>
                        {/* Tâm vòng tròn Donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                          {hoveredCategory ? (
                            (() => {
                              const activeSlice = categories.find(c => (c.categoryId || c.categoryName) === hoveredCategory);
                              if (!activeSlice) return null;
                              return (
                                <>
                                  <strong className="text-[11px] font-black truncate max-w-[65px] text-[#0f172a] dark:text-white">
                                    {formatShortCurrency(activeSlice.totalAmount)}
                                  </strong>
                                  <span className="text-[9px] font-extrabold text-[#07543f] dark:text-[#34d399]">
                                    {activeSlice.percentage.toFixed(1)}%
                                  </span>
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <strong className="text-xs font-black">{formatShortCurrency(summary.totalExpense)}</strong>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#07543f] dark:text-[#34d399] truncate max-w-[68px]" title={currentPeriodLabel}>
                                {periodShortLabel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex-1 max-h-[170px] overflow-y-auto pr-1">
                      {categories.length === 0 ? (
                        <p className="py-6 text-center text-xs font-semibold text-[#334155] dark:text-[#64748b]">Chưa có khoản chi trong kỳ</p>
                      ) : (
                        <div className="divide-y divide-[#e8eee9] dark:divide-[#1e293b]">
                          {categories.map((item) => {
                            const isHovered = hoveredCategory === (item.categoryId || item.categoryName);
                            return (
                              <div
                                key={item.categoryId || item.categoryName}
                                className={`flex items-center justify-between py-2 text-xs rounded-lg px-1 transition-all cursor-pointer ${isHovered ? 'bg-emerald-50/70 dark:bg-emerald-950/40 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                                onMouseEnter={() => setHoveredCategory(item.categoryId || item.categoryName)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              >
                                <span className="flex items-center gap-2 truncate max-w-[130px]">
                                  <i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span className="truncate reports-cat-name dark:text-[#e2e8f0]">{item.categoryName}</span>
                                </span>
                                <span className="text-right font-extrabold text-[#0f172a] dark:text-white">
                                  {formatShortCurrency(item.totalAmount)} <span className="font-extrabold text-[#047857] dark:text-[#34d399]">({item.percentage.toFixed(0)}%)</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="reports-sub-footer">
                  {categories.length > 0 ? (
                    <span className="text-[#334155] dark:text-[#94a3b8] font-semibold">
                      Nhóm <strong className="font-extrabold text-[#0f172a] dark:text-white">{categories[0].categoryName}</strong> chiếm cao nhất (<strong className="font-black text-[#047857] dark:text-[#34d399]">{categories[0].percentage.toFixed(1)}%</strong>).
                    </span>
                  ) : (
                    <span className="text-[#334155] dark:text-[#94a3b8]">Ghi nhận giao dịch để kích hoạt phân tích cơ cấu chi tiêu.</span>
                  )}
                </div>
              </article>

              <article className="reports-card flex flex-col justify-between lg:col-span-7">
                <div>
                  <header className="flex items-center justify-between gap-3 border-b border-[#edf2ee] pb-3 dark:border-[#1e293b]">
                    <div>
                      <h2 className="reports-title-dark text-base sm:text-lg">Top 5 Khoản Chi Tiêu Lớn Nhất</h2>
                      <p className="reports-subtitle text-xs">5 khoản chi phát sinh đáng chú ý nhất trong kỳ</p>
                    </div>
                  </header>

                  <div className="divide-y divide-[#f2f6f3] dark:divide-[#1e293b]">
                    {visibleTransactions.length === 0 ? (
                      <div className="py-8 text-center text-xs font-semibold text-[#334155] dark:text-[#64748b]">Không có khoản chi tiêu nào</div>
                    ) : (
                      visibleTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-xl reports-tx-icon-box">
                              <FinanceIcon name={getCategoryIcon(tx.category?.name || tx.description)} size={15} />
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-xs reports-tx-name dark:text-[#f1f5f9]">
                                {tx.description || tx.category?.name || 'Chi tiêu'}
                              </strong>
                              <small className="block truncate text-[11px] reports-tx-meta dark:text-[#94a3b8]">
                                {tx.category?.name || 'Chưa phân loại'} · {formatDateToVN(tx.transactionDate)} {tx.accountName ? `· ${tx.accountName}` : ''}
                              </small>
                            </span>
                          </span>
                          <strong className="shrink-0 text-right text-xs font-extrabold text-[#e11d48] dark:text-rose-400">
                            -{formatCurrency(tx.amount)}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <footer className="mt-3 border-t border-[#edf2ee] pt-2.5 text-[11.5px] reports-tx-footer dark:border-[#1e293b]">
                  Hiển thị {visibleTransactions.length} khoản chi lớn nhất trong kỳ
                </footer>
              </article>
            </div>
          </section>
        )}
      </div>

    </main>
  );
}

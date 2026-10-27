import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [dateRange, setDateRange] = useState<{ fromDate: string; toDate: string }>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      fromDate: firstDay.toISOString().split('T')[0],
      toDate: lastDay.toISOString().split('T')[0],
    };
  });

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<TransactionSummaryResponse | null>(null);
  const [trendData, setTrendData] = useState<PeriodFlowItem[]>([]);
  const [topTransactions, setTopTransactions] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
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
      from = first.toISOString().split('T')[0];
      to = last.toISOString().split('T')[0];
    } else if (val === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      from = first.toISOString().split('T')[0];
      to = last.toISOString().split('T')[0];
    } else if (val === '3_months') {
      const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      from = first.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (val === '6_months') {
      const first = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      from = first.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (val === 'this_year') {
      const first = new Date(now.getFullYear(), 0, 1);
      from = first.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    }

    if (from && to) {
      setDateRange({ fromDate: from, toDate: to });
    }
  };

  // Tải danh sách ví / tài khoản phục vụ bộ lọc
  useEffect(() => {
    accountApi.getAccounts().then((res) => {
      setAccounts(res || []);
    }).catch(() => {});
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

  // Năm hiện tại của khoảng thời gian đang xem
  const currentReportYear = useMemo(() => {
    if (dateRange.toDate) {
      return dateRange.toDate.split('-')[0];
    }
    return new Date().getFullYear().toString();
  }, [dateRange.toDate]);

  // Tải dữ liệu báo cáo chính
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const activeGroupBy = isSingleMonthPeriod ? 'day' : 'month';
      const [sumRes, trendRes, txListRes] = await Promise.all([
        reportApi.getSummary({
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          groupBy: activeGroupBy,
          accountId: selectedAccountId || undefined,
        }),
        reportApi.getTrends('6months'),
        transactionApi.getTransactions({
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          accountId: selectedAccountId || undefined,
          transactionType: 'EXPENSE',
          pageSize: 10,
          sortBy: 'amount',
          sortOrder: 'desc',
        })
      ]);

      setSummaryData(sumRes);
      
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
    return (summaryData?.byCategory || []).map((cat, idx) => ({
      ...cat,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      icon: getCategoryIcon(cat.categoryName),
    }));
  }, [summaryData]);

  // Tính Conic Gradient cho biểu đồ Donut
  const conicGradient = useMemo(() => {
    if (!categories.length || summary.totalExpense === 0) {
      return '#e2e8f0';
    }
    let currentDeg = 0;
    const slices = categories.map((cat) => {
      const slicePct = Math.max(0, Number(cat.percentage) || 0);
      const startDeg = currentDeg;
      const endDeg = currentDeg + (slicePct / 100) * 360;
      currentDeg = endDeg;
      return `${cat.color} ${startDeg.toFixed(1)}deg ${endDeg.toFixed(1)}deg`;
    });
    return `conic-gradient(${slices.join(', ')})`;
  }, [categories, summary.totalExpense]);

  // Xuất file Excel (XLS) & PDF chụp nguyên bản màn hình chuẩn 100%
  const handleExport = async (format: 'Excel' | 'PDF') => {
    if (format === 'PDF') {
      const container = reportContainerRef.current;
      if (!container) {
        onNotify('Không tìm thấy nội dung để xuất PDF.');
        return;
      }

      setIsExportingPdf(true);
      onNotify('Đang khởi tạo chụp báo cáo và xuất PDF...');

      try {
        // Tạm mở rộng tất cả danh sách để trang in đầy đủ
        const wasShowAll = showAllTransactions;
        if (!wasShowAll && topTransactions.length > 4) {
          setShowAllTransactions(true);
          await new Promise(r => setTimeout(r, 200));
        }

        // Chụp màn hình vùng báo cáo bằng html2canvas với scale cao (sắc nét)
        const canvas = await html2canvas(container, {
          scale: 2, // 2x resolution cho file PDF cực kỳ sắc nét
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff', // Luôn xuất nền trắng trang nhã
          windowWidth: 1400, // Đảm bảo độ rộng tiêu chuẩn của desktop
        });

        // Tạo tài liệu PDF theo tỉ lệ ảnh chụp
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = 210; // Chiều rộng chuẩn khổ A4 (mm)
        const pageHeight = 297; // Chiều cao chuẩn khổ A4 (mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const doc = new jsPDF('p', 'mm', 'a4');
        let heightLeft = imgHeight;
        let position = 0;

        // Trang đầu tiên
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Nếu nội dung dài hơn 1 trang A4, tự động thêm trang tiếp theo
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        doc.save(`Bao_cao_tai_chinh_${dateRange.fromDate}_${dateRange.toDate}.pdf`);
        onNotify('Đã tải thành công bản PDF chụp nguyên bản giao diện!');

        // Phục hồi trạng thái cũ nếu trước đó có thu gọn
        if (!wasShowAll && topTransactions.length > 4) {
          setShowAllTransactions(false);
        }
      } catch (err) {
        console.error('Lỗi khi chụp màn hình xuất PDF:', err);
        onNotify('Không thể tạo file PDF. Vui lòng thử lại.');
      } finally {
        setIsExportingPdf(false);
      }
      return;
    }

    // Export Excel định dạng bảng HTML (.xls) có màu sắc và format tiền tệ sang trọng
    try {
      const categoryRowsHtml = categories.map((c, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8faf9'};">
          <td style="padding: 10px 14px; border: 1px solid #dbe5df; font-weight: bold; color: #1c2e24;">${c.categoryName}</td>
          <td style="padding: 10px 14px; border: 1px solid #dbe5df; text-align: right; color: #dc2626; font-weight: bold;">${Math.round(c.totalAmount).toLocaleString('vi-VN')} đ</td>
          <td style="padding: 10px 14px; border: 1px solid #dbe5df; text-align: center; color: #047857; font-weight: bold;">${c.percentage.toFixed(2)}%</td>
          <td style="padding: 10px 14px; border: 1px solid #dbe5df; text-align: center;">${c.transactionCount}</td>
          <td style="padding: 10px 14px; border: 1px solid #dbe5df; text-align: right;">${Math.round(c.averageAmount).toLocaleString('vi-VN')} đ</td>
        </tr>
      `).join('');

      const flowRowsHtml = trendData.map((t, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8faf9'};">
          <td style="padding: 9px 14px; border: 1px solid #dbe5df; font-weight: bold; text-align: center;">${t.date}</td>
          <td style="padding: 9px 14px; border: 1px solid #dbe5df; text-align: right; color: #047857; font-weight: bold;">${Math.round(t.income).toLocaleString('vi-VN')} đ</td>
          <td style="padding: 9px 14px; border: 1px solid #dbe5df; text-align: right; color: #dc2626; font-weight: bold;">${Math.round(t.expense).toLocaleString('vi-VN')} đ</td>
          <td style="padding: 9px 14px; border: 1px solid #dbe5df; text-align: right; font-weight: bold; color: ${t.net >= 0 ? '#047857' : '#dc2626'};">${Math.round(t.net).toLocaleString('vi-VN')} đ</td>
          <td style="padding: 9px 14px; border: 1px solid #dbe5df; text-align: center;">${t.transactionCount}</td>
        </tr>
      `).join('');

      const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .header-title { font-size: 18pt; font-weight: bold; color: #07543f; text-align: center; padding: 15px 0 5px 0; }
            .sub-title { font-size: 11pt; color: #536b5e; text-align: center; padding-bottom: 20px; }
            .kpi-table { margin-bottom: 25px; border-collapse: collapse; width: 100%; }
            .kpi-header { background-color: #07543f; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #07543f; }
            .kpi-value { padding: 12px; font-size: 13pt; font-weight: bold; text-align: center; border: 1px solid #cfe0d7; }
            .section-title { font-size: 14pt; font-weight: bold; color: #07543f; margin-top: 25px; margin-bottom: 8px; }
            .data-table { border-collapse: collapse; width: 100%; margin-bottom: 25px; }
            .th-header { background-color: #116850; color: #ffffff; font-weight: bold; padding: 10px 14px; border: 1px solid #0d5440; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header-title">BÁO CÁO THỐNG KÊ TÀI CHÍNH CÁ NHÂN</div>
          <div class="sub-title">Khoảng thời gian: ${dateRange.fromDate} đến ${dateRange.toDate} (Năm: ${currentReportYear})</div>

          <table class="kpi-table">
            <tr>
              <th class="kpi-header">TỔNG THU NHẬP</th>
              <th class="kpi-header">TỔNG CHI TIÊU</th>
              <th class="kpi-header">DÒNG TIỀN RÒNG</th>
              <th class="kpi-header">TỔNG GIAO DỊCH</th>
            </tr>
            <tr>
              <td class="kpi-value" style="color: #047857;">${formatCurrency(summary.totalIncome)}</td>
              <td class="kpi-value" style="color: #dc2626;">${formatCurrency(summary.totalExpense)}</td>
              <td class="kpi-value" style="color: ${summary.netCashFlow >= 0 ? '#047857' : '#dc2626'};">${formatCurrency(summary.netCashFlow)}</td>
              <td class="kpi-value" style="color: #1a2c22;">${summary.transactionCount} GD</td>
            </tr>
          </table>

          <div class="section-title">1. Bảng Cơ Cấu Chi Tiêu Theo Danh Mục</div>
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-header" style="text-align: left;">Danh mục chi tiêu</th>
                <th class="th-header" style="text-align: right;">Tổng số tiền</th>
                <th class="th-header">Tỷ trọng (%)</th>
                <th class="th-header">Số giao dịch</th>
                <th class="th-header" style="text-align: right;">Trung bình / GD</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 15px;">Chưa có dữ liệu chi tiêu</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">2. Chi Tiết Biến Động Thu - Chi (${isSingleMonthPeriod ? 'Theo Ngày' : 'Theo Tháng'})</div>
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-header">Thời gian</th>
                <th class="th-header" style="text-align: right;">Thu nhập</th>
                <th class="th-header" style="text-align: right;">Chi tiêu</th>
                <th class="th-header" style="text-align: right;">Chênh lệch</th>
                <th class="th-header">Số GD</th>
              </tr>
            </thead>
            <tbody>
              ${flowRowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 15px;">Chưa có dữ liệu biến động</td></tr>'}
            </tbody>
          </table>

          <div style="font-size: 9pt; color: #738a7c; font-style: italic; margin-top: 20px;">
            Xuất báo cáo từ FinAI Financial Management System vào lúc ${new Date().toLocaleString('vi-VN')}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bao_cao_tai_chinh_${dateRange.fromDate}_${dateRange.toDate}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify('Đã xuất báo cáo Excel thành công!');
    } catch {
      onNotify('Có lỗi khi tạo file Excel báo cáo.');
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

  const visibleTransactions = showAllTransactions ? topTransactions : topTransactions.slice(0, 4);

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
          <input 
            type="date" 
            value={dateRange.fromDate}
            onChange={(e) => {
              setSelectedPeriod('custom');
              setDateRange(prev => ({ ...prev, fromDate: e.target.value }));
            }}
            className="w-full text-center"
          />
          <span className="text-[#07543f] dark:text-[#34d399] font-bold select-none">→</span>
          <input 
            type="date" 
            value={dateRange.toDate}
            onChange={(e) => {
              setSelectedPeriod('custom');
              setDateRange(prev => ({ ...prev, toDate: e.target.value }));
            }}
            className="w-full text-center"
          />
        </div>

        {/* Nhóm 3: Account / Wallet Filter (theo phong cách select chuẩn không cần nút X) */}
        <div className="md:col-span-3">
          <div className="reports-wallet-select-box">
            <FinanceIcon name="wallet" size={16} className="text-[#07543f] dark:text-[#34d399] shrink-0" />
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              aria-label="Lọc theo tài khoản hoặc ví"
            >
              <option value="">Tất cả tài khoản / ví ({accounts.length})</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5d7568] dark:text-[#8da6b8]">▼</span>
          </div>
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
        {/* 3. BẢNG 4 CHỈ SỐ KPI CHÍNH - THIẾT KẾ CARD HIỆN ĐẠI CÙNG CHIỀU CAO */}
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
      {activeTab === 'So sánh' ? (
        /* TAB 3: BẢNG SO SÁNH DANH MỤC */
        <section className="reports-card overflow-hidden">
          <header className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-[#14251f] dark:text-white">Chi Tiết Cơ Cấu Theo Danh Mục</h2>
              <p className="text-xs text-[#718478] dark:text-[#94a3b8]">Bảng phân bổ chi phí, tỷ trọng phần trăm và tần suất giao dịch</p>
            </div>
            <span className="text-xs font-semibold text-[#07543f] dark:text-[#34d399]">
              {categories.length} nhóm danh mục phát sinh
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>Tổng chi tiêu</th>
                  <th>Tỷ trọng</th>
                  <th>Số lần giao dịch</th>
                  <th>Trung bình / lần</th>
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
                      <td className="font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="reports-cat-name dark:text-[#e2e8f0]">{item.categoryName}</span>
                        </span>
                      </td>
                      <td className="font-extrabold text-[#0f172a] dark:text-white">{formatCurrency(item.totalAmount)}</td>
                      <td>
                        <span className="inline-flex items-center rounded-md reports-percentage-badge px-2.5 py-1 text-xs dark:bg-[#07543f]/30 dark:text-[#34d399]">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="font-semibold text-[#334155] dark:text-[#94a3b8]">{item.transactionCount} lần</td>
                      <td className="font-semibold text-[#334155] dark:text-[#94a3b8]">{formatCurrency(item.averageAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* TAB 1 & 2: BIỂU ĐỒ BIẾN ĐỘNG THU - CHI TRẢI RỘNG TOÀN CHIỀU NGANG */
        <section className="space-y-4">
          {activeTab === 'Thu - Chi' && (
            <article className="reports-card flex flex-col justify-between">
              <div>
                <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="reports-title-dark text-base sm:text-lg">
                      {isSingleMonthPeriod ? `Biến động Thu - Chi Theo Ngày (${dateRange.fromDate} → ${dateRange.toDate})` : `Biến động Thu - Chi Theo Tháng (Năm ${currentReportYear})`}
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

                {/* BIỂU ĐỒ BAR CHART RỘNG RÃI - CỘT TRẢI ĐỀU THEO TOÀN CHIỀU NGANG VỪA VẶN MÀN HÌNH */}
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

                  {/* Vùng cột dữ liệu trải đều toàn bộ chiều rộng (không bị cuộn) */}
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
                            {/* Cột Thu: Xanh đậm đồng bộ KPI #047857 */}
                            <span 
                              className="w-[45%] rounded-t-sm transition-all group-hover:brightness-110 shadow-xs" 
                              style={{ 
                                height: item.income > 0 ? `${incomePct}%` : '2px', 
                                backgroundColor: item.income > 0 ? '#047857' : '#d1fae5',
                                opacity: item.income > 0 ? 1 : 0.4
                              }}
                            />
                            {/* Cột Chi: Đỏ đồng bộ KPI #e11d48 */}
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

                  {/* Trục hoành nhãn mốc ngày/tháng tinh tế không bị chi chít chữ (như màn hình Dự báo tài chính) */}
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
          )}

          {/* HÀNG DƯỚI: ĐƯA CƠ CẤU CHI TIÊU XUỐNG ĐỨNG CẠNH TOP KHOẢN CHI LỚN NHẤT */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            {/* CƠ CẤU CHI TIÊU DONUT & DANH MỤC (5 CỘT) */}
            <article className="reports-card flex flex-col justify-between lg:col-span-5">
              <div>
                <header className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="reports-title-dark text-base sm:text-lg">Cơ Cấu Chi Tiêu (Năm {currentReportYear})</h2>
                    <p className="reports-subtitle text-xs">Phân bổ theo nhóm danh mục</p>
                  </div>
                  <span className="reports-category-count-badge">
                    {categories.length} nhóm
                  </span>
                </header>

                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  {/* Vòng Donut */}
                  <div className="shrink-0 flex justify-center py-1">
                    <div 
                      className="relative grid size-32 place-items-center rounded-full shadow-inner" 
                      style={{ background: conicGradient }}
                    >
                      <div className="reports-donut-center grid size-20 place-content-center rounded-full text-center">
                        <strong className="text-xs font-black">{formatShortCurrency(summary.totalExpense)}</strong>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#07543f] dark:text-[#34d399]">{currentReportYear}</span>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách danh mục */}
                  <div className="w-full flex-1 max-h-[170px] overflow-y-auto pr-1">
                    {categories.length === 0 ? (
                      <p className="py-6 text-center text-xs font-semibold text-[#334155] dark:text-[#64748b]">Chưa có khoản chi trong kỳ</p>
                    ) : (
                      <div className="divide-y divide-[#e8eee9] dark:divide-[#1e293b]">
                        {categories.map((item) => (
                          <div key={item.categoryId || item.categoryName} className="flex items-center justify-between py-2 text-xs">
                            <span className="flex items-center gap-2 truncate max-w-[130px]">
                              <i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="truncate reports-cat-name dark:text-[#e2e8f0]">{item.categoryName}</span>
                            </span>
                            <span className="text-right font-extrabold text-[#0f172a] dark:text-white">
                              {formatShortCurrency(item.totalAmount)} <span className="font-extrabold text-[#047857] dark:text-[#34d399]">({item.percentage.toFixed(0)}%)</span>
                            </span>
                          </div>
                        ))}
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

            {/* TOP GIAO DỊCH CHI TIÊU LỚN NHẤT (7 CỘT) */}
            <article className="reports-card flex flex-col justify-between lg:col-span-7">
              <div>
                <header className="flex items-center justify-between gap-3 border-b border-[#edf2ee] pb-3 dark:border-[#1e293b]">
                  <div>
                    <h2 className="reports-title-dark text-base sm:text-lg">Các Khoản Chi Tiêu Lớn Nhất</h2>
                    <p className="reports-subtitle text-xs">Các giao dịch phát sinh đáng chú ý trong kỳ</p>
                  </div>
                  {topTransactions.length > 4 && (
                    <button 
                      type="button" 
                      onClick={() => setShowAllTransactions(v => !v)} 
                      className="text-xs font-bold text-[#07543f] hover:underline dark:text-[#34d399] cursor-pointer"
                    >
                      {showAllTransactions ? 'Thu gọn' : `Xem thêm (${topTransactions.length})`}
                    </button>
                  )}
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
                              {tx.category?.name || 'Chưa phân loại'} · {tx.transactionDate} {tx.accountName ? `· ${tx.accountName}` : ''}
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
                Hiển thị {visibleTransactions.length} trên {summary.transactionCount} giao dịch ghi nhận
              </footer>
            </article>
          </div>
        </section>
      )}
      </div>

    </main>
  );
}

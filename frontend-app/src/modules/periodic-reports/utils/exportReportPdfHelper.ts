import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform, Alert } from 'react-native';
import type { ReportSummaryData } from '../api/periodicReportsApi';
import { API_BASE_URL, authStorage } from '../../auth/api/authApi';

/**
 * Tạo tài liệu Báo cáo Tài chính Đẳng Cấp như bản Web:
 * - Header nhận diện thương hiệu Finora sang trọng
 * - 4 Khối thẻ KPI tài chính chỉ số lớn với icon & badge màu sắc
 * - FinAI Nhận định chuyên sâu
 * - PHẦN 1: Biểu đồ cột Thu - Chi trực quan theo thời gian (Daily Trend Bar Chart)
 * - PHẦN 2: Biểu đồ Donut SVG & Bảng cơ cấu chi tiêu từng danh mục
 * - PHẦN 3: Top 5 giao dịch chi tiêu lớn nhất trong kỳ
 * - PHẦN 4: Bảng đối chiếu so sánh kỳ này vs kỳ trước (% biến động chuẩn)
 */
export function generateReportHtmlDocument(
  report: ReportSummaryData,
  dateRangeDisplay: string,
  walletName: string
): string {
  const formatVND = (num: number = 0) => num.toLocaleString('vi-VN') + ' đ';
  const nowStr = new Date().toLocaleString('vi-VN');

  // 1. Dữ liệu Bar Chart Thu - Chi
  const trend = report.dailyTrend || [];
  let maxBar = 100000;
  trend.forEach((t) => {
    if (t.income > maxBar) maxBar = t.income;
    if (t.expense > maxBar) maxBar = t.expense;
  });

  const barChartHtml = trend.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Biến Động Thu - Chi Theo Thời Gian</h2>
          <p class="card-sub">Chi tiết dòng tiền vào và ra toàn bộ các ngày trong kỳ</p>
        </div>
        <div class="legend-box">
          <span class="legend-item"><span class="legend-dot" style="background: #047857;"></span>Thu nhập</span>
          <span class="legend-item"><span class="legend-dot" style="background: #e11d48;"></span>Chi tiêu</span>
        </div>
      </div>
      <div class="chart-wrapper">
        <div class="chart-y-axis">
          <span>${(maxBar >= 1000000 ? (maxBar / 1000000).toFixed(1) + 'M' : Math.round(maxBar / 1000) + 'K')}</span>
          <span>${((maxBar * 0.75) >= 1000000 ? ((maxBar * 0.75) / 1000000).toFixed(1) + 'M' : Math.round((maxBar * 0.75) / 1000) + 'K')}</span>
          <span>${((maxBar * 0.5) >= 1000000 ? ((maxBar * 0.5) / 1000000).toFixed(1) + 'M' : Math.round((maxBar * 0.5) / 1000) + 'K')}</span>
          <span>${((maxBar * 0.25) >= 1000000 ? ((maxBar * 0.25) / 1000000).toFixed(1) + 'M' : Math.round((maxBar * 0.25) / 1000) + 'K')}</span>
          <span>0</span>
        </div>
        <div class="bars-container">
          ${trend.map((t) => {
            const incH = Math.min(100, Math.max(3, (t.income / maxBar) * 100));
            const expH = Math.min(100, Math.max(3, (t.expense / maxBar) * 100));
            return `
              <div class="bar-col-group" title="${t.date}: Thu +${formatVND(t.income)} | Chi -${formatVND(t.expense)}">
                <div class="bar-pair">
                  <div class="bar-col bar-income" style="height: ${t.income > 0 ? incH : 0}%;"></div>
                  <div class="bar-col bar-expense" style="height: ${t.expense > 0 ? expH : 0}%;"></div>
                </div>
                <div class="bar-date">${t.date}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  ` : '';

  // 2. Dữ liệu Donut SVG
  let cumulativeAngle = 0;
  const donutPaths = report.categories.map((c) => {
    const angle = (c.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const radStart = ((startAngle - 90) * Math.PI) / 180;
    const radEnd = ((endAngle - 90) * Math.PI) / 180;
    const cx = 70, cy = 70, rOuter = 58, rInner = 36;

    const x1 = cx + rOuter * Math.cos(radStart);
    const y1 = cy + rOuter * Math.sin(radStart);
    const x2 = cx + rOuter * Math.cos(radEnd);
    const y2 = cy + rOuter * Math.sin(radEnd);
    const x3 = cx + rInner * Math.cos(radEnd);
    const y3 = cy + rInner * Math.sin(radEnd);
    const x4 = cx + rInner * Math.cos(radStart);
    const y4 = cy + rInner * Math.sin(radStart);

    const largeArc = angle > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return `<path d="${d}" fill="${c.color}"><title>${c.name}: ${formatVND(c.amount)} (${c.percentage}%)</title></path>`;
  }).join('');

  // 3. Bảng cơ cấu danh mục
  const categoryRows = report.categories.map((cat, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td>
        <span class="dot" style="background: ${cat.color};"></span>
        <strong style="color: #0f172a;">${cat.name}</strong>
      </td>
      <td style="text-align: right; color: #e11d48; font-weight: 700;">-${formatVND(cat.amount)}</td>
      <td style="text-align: center;">
        <span class="badge" style="background: #ecfdf5; color: #047857;">${cat.percentage}%</span>
      </td>
      <td style="text-align: center; color: #475569;">${cat.count}</td>
      <td style="text-align: right; color: #334155;">${formatVND(cat.avgPerTx)}</td>
    </tr>
  `).join('');

  // 4. Top giao dịch
  const topTxRows = report.topTransactions.map((tx, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td>
        <strong style="color: #0f172a;">${tx.title}</strong>
      </td>
      <td style="text-align: right; font-weight: 700; color: #e11d48;">-${formatVND(tx.amount)}</td>
      <td style="color: #475569;">${tx.categoryName || 'Chi tiêu'}</td>
      <td style="color: #64748b; font-size: 11.5px;">${tx.date || (tx.sub ? tx.sub.split('•')[0]?.trim() : '-')}</td>
      <td style="color: #64748b; font-size: 11.5px;">${tx.wallet || (tx.sub ? tx.sub.split('•')[1]?.trim() : '-')}</td>
    </tr>
  `).join('');

  // 5. Đối chiếu kỳ trước
  const compRows = (report.comparison?.categoryComparisons || []).map((c) => {
    const isUp = c.percentChange > 0;
    const isSame = c.percentChange === 0;
    const color = isUp ? '#e11d48' : isSame ? '#64748b' : '#059669';
    const bg = isUp ? '#fee2e2' : isSame ? '#f1f5f9' : '#ecfdf5';
    const statusText = isUp ? 'Tăng chi tiêu' : isSame ? 'Ổn định' : 'Tiết kiệm tốt';

    return `
      <tr>
        <td>
          <span class="dot" style="background: ${c.color};"></span>
          <strong style="color: #0f172a;">${c.name}</strong>
        </td>
        <td style="text-align: right; color: #64748b;">${formatVND(c.prevAmount)}</td>
        <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatVND(c.currentAmount)}</td>
        <td style="text-align: right; font-weight: 600; color: ${color};">
          ${isUp ? '+' : ''}${formatVND(c.diffAmount)}
        </td>
        <td style="text-align: center;">
          <span class="badge" style="background: ${bg}; color: ${color};">
            ${isUp ? '↑ +' : isSame ? '' : '↓ '}${c.percentChange}%
          </span>
        </td>
        <td style="text-align: center; font-size: 11px; font-weight: 600; color: ${color};">
          ${statusText}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Báo Cáo Tài Chính Finora - ${dateRangeDisplay}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background: #ffffff;
      color: #0f172a;
      line-height: 1.45;
      font-size: 12.5px;
    }
    .header-card {
      background: linear-gradient(135deg, #07543f 0%, #064030 100%);
      color: #ffffff;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(7, 84, 63, 0.15);
    }
    .brand-title {
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 700;
      color: #a7f3d0;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -0.3px;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.9);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 10px;
    }
    .grid-kpi {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
    }
    .kpi-label {
      font-size: 10.5px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 19px;
      font-weight: 800;
      margin-bottom: 3px;
    }
    .kpi-sub {
      font-size: 10.5px;
      color: #64748b;
    }
    .ai-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-icon {
      background: #059669;
      color: #ffffff;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: bold;
      font-size: 13px;
      flex-shrink: 0;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      color: #07543f;
      margin: 0;
    }
    .card-sub {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .legend-box {
      display: flex;
      gap: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    /* Chart */
    .chart-wrapper {
      display: flex;
      height: 180px;
      gap: 10px;
    }
    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-align: right;
      width: 40px;
      padding-bottom: 20px;
    }
    .bars-container {
      flex: 1;
      display: flex;
      align-items: flex-end;
      border-bottom: 1.5px solid #cbd5e1;
      gap: 4px;
      padding-bottom: 2px;
    }
    .bar-col-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }
    .bar-pair {
      width: 100%;
      height: calc(100% - 20px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
    }
    .bar-col {
      width: 42%;
      max-width: 12px;
      border-radius: 3px 3px 0 0;
    }
    .bar-income { background: #047857; }
    .bar-expense { background: #e11d48; }
    .bar-date {
      font-size: 9px;
      color: #64748b;
      margin-top: 5px;
      text-align: center;
      white-space: nowrap;
    }
    /* Grid 2 Cột Danh mục */
    .category-grid {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 16px;
      align-items: flex-start;
    }
    .donut-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .donut-center-text {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
      margin-top: 8px;
    }
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      font-size: 11.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 9px 12px;
      border-bottom: 2px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 8.5px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #fafafa; }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 10.5px;
    }
  </style>
</head>
<body>

  <!-- HEADER BRAND FINORA -->
  <div class="header-card">
    <div class="brand-title">Finora · Hệ thống quản lý tài chính thông minh</div>
    <div class="report-title">BÁO CÁO TÀI CHÍNH TOÀN DIỆN (${dateRangeDisplay.toUpperCase()})</div>
    <div class="meta-bar">
      <div>Kỳ báo cáo: <strong>${dateRangeDisplay}</strong></div>
      <div>Ví tài khoản: <strong>${walletName}</strong></div>
      <div>Thời gian xuất: <strong>${nowStr}</strong></div>
    </div>
  </div>

  <!-- 4 CHỈ SỐ KPI CHÍNH -->
  <div class="grid-kpi">
    <div class="kpi-card">
      <div class="kpi-label">Tổng thu nhập</div>
      <div class="kpi-value" style="color: #047857;">+${formatVND(report.totalIncome)}</div>
      <div class="kpi-sub">Thu thực tế ghi nhận</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tổng chi tiêu</div>
      <div class="kpi-value" style="color: #e11d48;">-${formatVND(report.totalExpense)}</div>
      <div class="kpi-sub">TB ${formatVND(report.averageDailyExpense)}/ngày</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Dòng tiền ròng</div>
      <div class="kpi-value" style="color: ${report.netCashFlow >= 0 ? '#047857' : '#e11d48'};">
        ${report.netCashFlow >= 0 ? '+' : ''}${formatVND(report.netCashFlow)}
      </div>
      <div class="kpi-sub">${report.netCashFlow >= 0 ? 'Thặng dư tích lũy' : 'Thâm hụt chi tiêu'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tỷ lệ tiết kiệm</div>
      <div class="kpi-value" style="color: #0f172a;">${report.savingRate}%</div>
      <div class="kpi-sub">Tổng cộng ${report.transactionCount} giao dịch</div>
    </div>
  </div>

  <!-- FINAI INSIGHTS -->
  ${report.aiInsight ? `
    <div class="ai-card">
      <div class="ai-icon">✦</div>
      <div>
        <strong style="color: #065f46; font-size: 12.5px;">FinAI Nhận định chuyên sâu:</strong>
        <div style="color: #047857; margin-top: 3px;">${report.aiInsight.text}</div>
      </div>
    </div>
  ` : ''}

  <!-- PHẦN 1: BIỂU ĐỒ DIỄN BIẾN THU - CHI -->
  ${barChartHtml}

  <!-- PHẦN 2: CƠ CẤU CHI TIÊU (VÒNG DONUT & BẢNG DANH MỤC) -->
  <div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">Cơ Cấu Chi Tiêu Theo Từng Danh Mục</h2>
        <p class="card-sub">Phân bổ tỷ trọng số tiền, số lần chi và mức chi tiêu trung bình</p>
      </div>
      <span class="badge" style="background: #ecfdf5; color: #047857;">${report.categories.length} nhóm danh mục</span>
    </div>

    <div class="category-grid">
      <div class="donut-container">
        <svg viewBox="0 0 140 140" width="160" height="160">
          ${donutPaths}
        </svg>
        <div class="donut-center-text">
          <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Tổng chi tiêu</div>
          <div style="color: #e11d48; font-size: 16px;">-${formatVND(report.totalExpense)}</div>
        </div>
      </div>

      <div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>Danh mục</th>
              <th style="text-align: right;">Tổng chi</th>
              <th style="text-align: center;">Tỷ trọng</th>
              <th style="text-align: center;">Số lần</th>
              <th style="text-align: right;">TB / Lần</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- PHẦN 3: TOP 5 KHOẢN CHI LỚN NHẤT -->
  <div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">5 Khoản Chi Tiêu Lớn Nhất Trong Kỳ</h2>
        <p class="card-sub">Các khoản mục có giá trị giao dịch cao nhất cần chú ý</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">STT</th>
          <th>Khoản chi</th>
          <th style="text-align: right;">Số tiền</th>
          <th>Danh mục</th>
          <th>Ngày</th>
          <th>Ví giao dịch</th>
        </tr>
      </thead>
      <tbody>
        ${topTxRows}
      </tbody>
    </table>
  </div>

  <!-- PHẦN 4: ĐỐI CHIẾU SO SÁNH VỚI KỲ TRƯỚC -->
  ${compRows ? `
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Đối Chiếu Chi Tiêu Với Kỳ Trước (Period-over-Period)</h2>
          <p class="card-sub">Biến động tăng giảm số tiền và tỷ lệ % theo từng danh mục</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Danh mục</th>
            <th style="text-align: right;">Kỳ trước</th>
            <th style="text-align: right;">Kỳ này</th>
            <th style="text-align: right;">Chênh lệch</th>
            <th style="text-align: center;">% Biến động</th>
            <th style="text-align: center;">Đánh giá</th>
          </tr>
        </thead>
        <tbody>
          ${compRows}
        </tbody>
      </table>
    </div>
  ` : ''}

  <div class="footer">
    <div>Hệ thống Quản lý Tài chính Finora · Xuất từ ứng dụng di động</div>
    <div>Trang 1/1 · finora.app</div>
  </div>

</body>
</html>`;
}

/**
 * Xuất tài liệu Báo cáo PDF (chuẩn HTML/PDF in ấn sang trọng như Web)
 */
export async function exportReportToPdfHtmlFile(
  report: ReportSummaryData,
  dateRangeDisplay: string,
  walletName: string
): Promise<boolean> {
  try {
    const cleanDateStr = dateRangeDisplay.replace(/[\/\s→-]/g, '_');
    const fileName = `BaoCao_TaiChinh_Finora_${cleanDateStr}.pdf`;
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${docDir}${fileName}`;

    let isSuccess = false;
    try {
      const token = await authStorage.getToken();
      const response = await fetch(`${API_BASE_URL}/reports/export-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          dateRangeDisplay,
          walletName,
          totalIncome: report.totalIncome,
          totalExpense: report.totalExpense,
          netCashFlow: report.netCashFlow,
          savingRate: report.savingRate,
          aiInsight: report.aiInsight?.text || null,
          categories: report.categories,
          topExpenses: report.topTransactions,
          comparisons: report.comparison?.categoryComparisons || [],
          dailyTrend: report.dailyTrend || [],
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const resStr = (reader.result as string) || '';
            const base64 = resStr.includes(',') ? resStr.split(',')[1] : resStr;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        isSuccess = true;
      }
    } catch (apiErr) {
      console.warn('Loi goi API backend render PDF, fallback sang in HTML:', apiErr);
    }

    if (!isSuccess) {
      const htmlContent = generateReportHtmlDocument(report, dateRangeDisplay, walletName);
      await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    let shareUri = fileUri;
    if (Platform.OS === 'android') {
      try {
        shareUri = await FileSystem.getContentUriAsync(fileUri);
      } catch (cErr) {
        console.warn('getContentUriAsync warning:', cErr);
      }
    }

    const summaryMsg = `📄 BÁO CÁO TÀI CHÍNH TOÀN DIỆN FINORA (${dateRangeDisplay.toUpperCase()})\nVí: ${walletName}\n• Thu nhập: ${report.totalIncome.toLocaleString('vi-VN')} đ\n• Chi tiêu: ${report.totalExpense.toLocaleString('vi-VN')} đ\n• Dòng tiền ròng: ${report.netCashFlow.toLocaleString('vi-VN')} đ\n• Tỷ lệ tiết kiệm: ${report.savingRate}%\n(Bản in PDF đồ họa chuẩn A4: ${fileName})`;

    let res;
    try {
      res = await Share.share(
        Platform.OS === 'ios'
          ? {
              url: fileUri,
            }
          : {
              title: `Báo cáo tài chính PDF Finora (${dateRangeDisplay})`,
              message: summaryMsg,
            },
        {
          dialogTitle: 'Chia sẻ Báo cáo tài chính PDF',
        }
      );
    } catch (shareErr) {
      console.warn('Lần 1 chia sẻ PDF thất bại, fallback sang chia sẻ nội dung tóm tắt:', shareErr);
      res = await Share.share(
        {
          title: `Báo cáo tài chính PDF Finora (${dateRangeDisplay})`,
          message: summaryMsg,
        },
        {
          dialogTitle: 'Chia sẻ Báo cáo tài chính PDF',
        }
      );
    }

    if (res && res.action === Share.sharedAction) {
      Alert.alert('Thành công', `Đã chia sẻ báo cáo PDF:\n${fileName}`);
    }

    return true;
  } catch (err: any) {
    console.error('Lỗi chia sẻ tài liệu PDF:', err);
    Alert.alert(
      'Thông báo chia sẻ',
      `Không thể mở menu chia sẻ (${err?.message || 'Lỗi không xác định'}).\nBạn có thể thử lại.`
    );
    return false;
  }
}

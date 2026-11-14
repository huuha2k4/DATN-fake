import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform, Alert } from 'react-native';
import type { ReportSummaryData } from '../api/periodicReportsApi';

/**
 * Tạo nội dung file Excel XML (SpreadsheetML) chuẩn Microsoft Excel
 * Khi mở bằng Microsoft Excel hoặc Google Sheets:
 * - Tự động có màu nền header Emerald (#07543F) sang trọng
 * - Kẻ viền (border), căn lề, in đậm, đổi màu số âm đỏ / số dương xanh
 * - Cột có độ rộng tối ưu, định dạng số có dấu phân cách hàng nghìn chuẩn tài chính
 * Đẹp y hệt bản Web!
 */
export function generateExcelXmlContent(
  report: ReportSummaryData,
  dateRangeDisplay: string,
  walletName: string
): string {
  const formatNum = (n: number = 0) => Math.round(n);
  const nowStr = new Date().toLocaleString('vi-VN');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Finora</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <!-- Brand & Title -->
  <Style ss:ID="BrandHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#07543F"/>
  </Style>
  <Style ss:ID="MainTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#07543F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Italic="1" ss:Color="#334155"/>
   <Interior ss:Color="#E6F4EA" ss:Pattern="Solid"/>
  </Style>
  <!-- Section Headers -->
  <Style ss:ID="SectionHeader">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#07543F"/>
  </Style>
  <!-- Table Column Headers (Đồng bộ chuẩn Web: Primary #164E63 & Secondary #0F766E) -->
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#164E63" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0E7490"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0E7490"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0E7490"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0E7490"/>
   </Borders>
  </Style>
  <Style ss:ID="ColHeaderTeal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
   </Borders>
  </Style>
  <!-- Data cells -->
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Color="#1E293B"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellLeftBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Bold="1" ss:Color="#1E293B"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Color="#334155"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;đ&quot;"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellExpense">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;đ&quot;"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Bold="1" ss:Color="#F43F5E"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellIncome">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;đ&quot;"/>
   <Font ss:FontName="Arial" ss:Size="9.5" ss:Bold="1" ss:Color="#10B981"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="BaoCaoTaiChinh">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="45"/>
   <Column ss:Width="160"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="120"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>

   <!-- Brand Header -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="6" ss:StyleID="BrandHeader"><Data ss:Type="String">FINORA · NỀN TẢNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN</Data></Cell>
   </Row>

   <!-- Title -->
   <Row ss:Height="36">
    <Cell ss:MergeAcross="6" ss:StyleID="MainTitle"><Data ss:Type="String">BÁO CÁO TÀI CHÍNH VÀ CHI TIÊU (${dateRangeDisplay.toUpperCase()})</Data></Cell>
   </Row>

   <!-- Subtitle -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="SubTitle"><Data ss:Type="String">Kỳ: ${dateRangeDisplay}   |   Ví tài khoản: ${walletName}   |   Xuất lúc: ${nowStr}</Data></Cell>
   </Row>

   <!-- Empty row -->
   <Row ss:Height="12"></Row>

   <!-- Section 1: KPI CHỈ SỐ CHÍNH (Đồng bộ cấu trúc bảng 5 chỉ số Web) -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="SectionHeader"><Data ss:Type="String">I. TỔNG QUAN CHỈ SỐ TÀI CHÍNH</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">STT</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">CHỈ SỐ</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">GIÁ TRỊ (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">TỶ LỆ / TẦN SUẤT</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="ColHeaderTeal"><Data ss:Type="String">GHI CHÚ / ĐÁNH GIÁ</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">TRẠNG THÁI</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">1</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">Tổng thu nhập</Data></Cell>
    <Cell ss:StyleID="CellIncome"><Data ss:Type="Number">${formatNum(report.totalIncome)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">100.0%</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellLeft"><Data ss:Type="String">Nguồn thu nhận được trong kỳ</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">Tích cực</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">2</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">Tổng chi tiêu</Data></Cell>
    <Cell ss:StyleID="CellExpense"><Data ss:Type="Number">-${formatNum(report.totalExpense)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.totalIncome > 0 ? ((report.totalExpense / report.totalIncome) * 100).toFixed(1) + '% thu nhập' : '100.0%'}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellLeft"><Data ss:Type="String">TB ${formatNum(report.averageDailyExpense)} đ/ngày</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">Cần kiểm soát</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">3</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">Dòng tiền ròng</Data></Cell>
    <Cell ss:StyleID="${report.netCashFlow >= 0 ? 'CellIncome' : 'CellExpense'}"><Data ss:Type="Number">${formatNum(report.netCashFlow)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.totalIncome > 0 ? ((report.netCashFlow / report.totalIncome) * 100).toFixed(1) + '%' : '-'}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellLeft"><Data ss:Type="String">${report.netCashFlow >= 0 ? 'Thặng dư an toàn' : 'Thâm hụt ngân sách'}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.netCashFlow >= 0 ? 'Tốt' : 'Cảnh báo'}</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">4</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">Tỷ lệ tiết kiệm</Data></Cell>
    <Cell ss:StyleID="CellAmount"><Data ss:Type="String">${report.savingRate}%</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.savingRate >= 20 ? 'Đạt chuẩn 50/30/20' : 'Dưới mức 20%'}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellLeft"><Data ss:Type="String">Mục tiêu tài chính dài hạn</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.savingRate >= 20 ? 'Đạt' : 'Chưa đạt'}</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">5</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">Tổng số giao dịch</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.transactionCount} GD</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${report.transactionCount > 0 ? formatNum(report.totalExpense / report.transactionCount).toLocaleString('vi-VN') + ' đ/GD' : '0 đ'}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellLeft"><Data ss:Type="String">Tần suất chi tiêu trung bình</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">Bình thường</Data></Cell>
   </Row>

   <!-- Empty row -->
   <Row ss:Height="14"></Row>

   <!-- Section 2: CƠ CẤU CHI TIÊU THEO TỪNG DANH MỤC -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="SectionHeader"><Data ss:Type="String">II. CƠ CẤU CHI TIÊU THEO TỪNG DANH MỤC (BẢNG THỐNG KÊ CHI TIẾT)</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">STT</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">DANH MỤC</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">TỔNG TIỀN CHI (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">TỶ TRỌNG (%)</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">SỐ LẦN CHI</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="ColHeader"><Data ss:Type="String">TB MỖI LẦN CHI (VNĐ)</Data></Cell>
   </Row>
   ${report.categories.map((c, idx) => `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">${c.name}</Data></Cell>
    <Cell ss:StyleID="CellExpense"><Data ss:Type="Number">-${formatNum(c.amount)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${c.percentage}%</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${c.count}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellAmount"><Data ss:Type="Number">${formatNum(c.avgPerTx)}</Data></Cell>
   </Row>
   `).join('')}

   ${report.comparison?.categoryComparisons?.length ? `
   <!-- Empty row -->
   <Row ss:Height="14"></Row>

   <!-- Section 3: ĐỐI CHIẾU SO SÁNH VỚI KỲ TRƯỚC (PERIOD-OVER-PERIOD) -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="SectionHeader"><Data ss:Type="String">III. ĐỐI CHIẾU CHI TIÊU DANH MỤC (KỲ NÀY VS KỲ TRƯỚC)</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">STT</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">DANH MỤC</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">KỲ TRƯỚC (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">KỲ NÀY (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">CHÊNH LỆCH (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">% BIẾN ĐỘNG</Data></Cell>
    <Cell ss:StyleID="ColHeaderTeal"><Data ss:Type="String">ĐÁNH GIÁ</Data></Cell>
   </Row>
   ${report.comparison.categoryComparisons.map((comp, idx) => {
     const isUp = comp.diffAmount > 0;
     const isSame = comp.diffAmount === 0;
     const status = isUp ? 'Tăng chi tiêu' : isSame ? 'Ổn định' : 'Tiết kiệm tốt';
     return `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">${comp.name}</Data></Cell>
    <Cell ss:StyleID="CellAmount"><Data ss:Type="Number">${formatNum(comp.prevAmount)}</Data></Cell>
    <Cell ss:StyleID="CellExpense"><Data ss:Type="Number">${formatNum(comp.currentAmount)}</Data></Cell>
    <Cell ss:StyleID="${isUp ? 'CellExpense' : isSame ? 'CellAmount' : 'CellIncome'}"><Data ss:Type="Number">${formatNum(comp.diffAmount)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${comp.percentChange >= 0 ? '+' : ''}${comp.percentChange}%</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${status}</Data></Cell>
   </Row>`;
   }).join('')}
   ` : ''}

   ${report.dailyTrend?.length ? `
   <!-- Empty row -->
   <Row ss:Height="14"></Row>

   <!-- Section 4: BIẾN ĐỘNG DÒNG TIỀN THEO THỜI GIAN -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="SectionHeader"><Data ss:Type="String">IV. BIẾN ĐỘNG DÒNG TIỀN THEO MỐC THỜI GIAN</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">STT</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">THỜI GIAN (dd/mm/yyyy)</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">THU NHẬP (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">CHI TIÊU (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">CHÊNH LỆCH RÒNG</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="ColHeader"><Data ss:Type="String">TRẠNG THÁI</Data></Cell>
   </Row>
   ${report.dailyTrend.map((t, idx) => {
     const net = t.income - t.expense;
     const status = net > 0 ? 'Thặng dư' : net < 0 ? 'Thâm hụt' : 'Cân bằng';
     // Định dạng ngày chuẩn dd/mm/yyyy trong file Excel (VD: 01/11/2026 hoặc 01/11)
     let displayDate = t.date;
     if (t.fullDate) {
       const parts = t.fullDate.split('-');
       if (parts.length === 3) {
         displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
       } else if (parts.length === 2) {
         displayDate = `Tháng ${parts[1]}/${parts[0]}`;
       }
     }
     return `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${displayDate}</Data></Cell>
    <Cell ss:StyleID="CellIncome"><Data ss:Type="Number">${formatNum(t.income)}</Data></Cell>
    <Cell ss:StyleID="CellExpense"><Data ss:Type="Number">-${formatNum(t.expense)}</Data></Cell>
    <Cell ss:StyleID="${net >= 0 ? 'CellIncome' : 'CellExpense'}"><Data ss:Type="Number">${formatNum(net)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="CellCenter"><Data ss:Type="String">${status}</Data></Cell>
   </Row>`;
   }).join('')}
   ` : ''}

   <!-- Empty row -->
   <Row ss:Height="14"></Row>

   <!-- Section 5: TOP 5 KHOẢN CHI LỚN NHẤT (Tách cột Ngày và Ví riêng biệt) -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="6" ss:StyleID="SectionHeader"><Data ss:Type="String">V. TOP 5 KHOẢN CHI TIÊU LỚN ĐÁNG CHÚ Ý</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">STT</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">NỘI DUNG GIAO DỊCH</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">SỐ TIỀN CHI (VNĐ)</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">DANH MỤC</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">NGÀY GIAO DỊCH</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">VÍ / NGUỒN TIỀN</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">GHI CHÚ</Data></Cell>
   </Row>
   ${report.topTransactions.map((tx, idx) => `
   <Row ss:Height="22">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellLeftBold"><Data ss:Type="String">${tx.title}</Data></Cell>
    <Cell ss:StyleID="CellExpense"><Data ss:Type="Number">-${formatNum(tx.amount)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${tx.categoryName || 'Chi tiêu'}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${tx.date || (tx.sub ? tx.sub.split('•')[0]?.trim() : '-')}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${tx.wallet || (tx.sub ? tx.sub.split('•')[1]?.trim() : '-')}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">Khoản chi lớn</Data></Cell>
   </Row>
   `).join('')}
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * Xuất file Excel (.xls đầy đủ định dạng màu sắc theo Web) và mở Share Sheet để gửi qua Zalo, Drive, Files...
 */
export async function exportReportToExcelFile(
  report: ReportSummaryData,
  dateRangeDisplay: string,
  walletName: string
): Promise<boolean> {
  try {
    const excelXmlContent = generateExcelXmlContent(report, dateRangeDisplay, walletName);
    const cleanDateStr = dateRangeDisplay.replace(/[\/\s→-]/g, '_');
    const fileName = `BaoCao_TaiChinh_${cleanDateStr}.xls`;
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${docDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, excelXmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Lấy contentUri trên Android (content://) nếu có thể
    let shareUri = fileUri;
    if (Platform.OS === 'android') {
      try {
        shareUri = await FileSystem.getContentUriAsync(fileUri);
      } catch (cErr) {
        console.warn('getContentUriAsync warning:', cErr);
      }
    }

    const summaryMsg = `📊 BÁO CÁO TÀI CHÍNH FINORA (${dateRangeDisplay.toUpperCase()})\nVí: ${walletName}\n• Thu nhập: ${report.totalIncome.toLocaleString('vi-VN')} đ\n• Chi tiêu: ${report.totalExpense.toLocaleString('vi-VN')} đ\n• Dòng tiền ròng: ${report.netCashFlow.toLocaleString('vi-VN')} đ\n• Tỷ lệ tiết kiệm: ${report.savingRate}%\n(Bảng tính chi tiết: ${fileName})`;

    // Trên iOS:
    // Thử chia sẻ trực tiếp URL file. Nếu thiết bị iOS chặn URL file:// không thuộc sandbox public, fallback sang message văn bản đầy đủ.
    let res;
    try {
      res = await Share.share(
        Platform.OS === 'ios'
          ? {
              url: fileUri,
            }
          : {
              title: `Báo cáo tài chính Finora (${dateRangeDisplay})`,
              message: summaryMsg,
            },
        {
          dialogTitle: 'Chia sẻ Báo cáo tài chính Excel',
        }
      );
    } catch (shareErr) {
      console.warn('Lần 1 chia sẻ file thất bại, fallback sang chia sẻ nội dung:', shareErr);
      res = await Share.share(
        {
          title: `Báo cáo tài chính Finora (${dateRangeDisplay})`,
          message: summaryMsg,
        },
        {
          dialogTitle: 'Chia sẻ Báo cáo tài chính Excel',
        }
      );
    }

    if (res && res.action === Share.sharedAction) {
      Alert.alert('Thành công', `Đã chia sẻ báo cáo Excel:\n${fileName}`);
    }

    return true;
  } catch (err: any) {
    console.error('Lỗi chia sẻ file Excel:', err);
    Alert.alert(
      'Thông báo chia sẻ',
      `Không thể mở menu chia sẻ (${err?.message || 'Lỗi không xác định'}).\nBạn có thể thử lại.`
    );
    return false;
  }
}


import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform, Alert } from 'react-native';
import type { TransactionItem } from '../api/transactionsApi';

interface ExportFilterOptions {
  monthLabel: string;
  walletLabel: string;
  tabLabel: string;
  searchQuery?: string;
  activeTab: 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER';
  selectedMonth: string;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    transactionCount: number;
  };
}

/**
 * Xuất Excel Lịch sử Thu & Chi y hệt 100% bản Web (CashFlowManagementScreen.tsx):
 * - Hàng 1: FINORA · NỀN TẢNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN (chữ xanh lá Emerald #07543f, nền trắng, viền)
 * - Hàng 2: BÁO CÁO LỊCH SỬ THU & CHI CHI TIẾT (nền xanh lá đậm Emerald #08503C, chữ trắng in đậm)
 * - Hàng 3: Kỳ: ... | Ví: ... | Phân loại: ... | Xuất lúc: ... (nền xanh ngọc nhạt #E6F4EA, chữ nghiêng)
 * - Header bảng màu xanh dương đậm (#1d4ed8) nổi bật
 * - 6 cột: STT, GIAO DỊCH & HẠNG MỤC, TÀI KHOẢN / NGUỒN TIỀN, THỜI GIAN, PHÂN LOẠI, SỐ TIỀN (VND)
 * - tfoot chân bảng:
 *    + TỔNG THU: nền xanh nhạt #f0fdf4, chữ xanh lá #166534 / #16a34a
 *    + TỔNG CHI: nền đỏ nhạt #fef2f2, chữ đỏ #991b1b / #dc2626
 *    + THẶNG DƯ RÒNG (THU - CHI): nền xanh xám/xanh dương nhạt #e2e8f0, chữ xanh dương #1e3a8a
 */
export function generateCashFlowExcelHtml(
  exportList: TransactionItem[],
  options: ExportFilterOptions
): string {
  // Xác định tiêu đề báo cáo linh hoạt theo bộ lọc y hệt ảnh người dùng gửi
  let baseTitle = 'BÁO CÁO LỊCH SỬ THU & CHI CHI TIẾT';
  if (options.activeTab === 'INCOME') {
    baseTitle = 'BÁO CÁO KHOẢN THU CHI TIẾT';
  } else if (options.activeTab === 'EXPENSE') {
    baseTitle = 'BÁO CÁO KHOẢN CHI CHI TIẾT';
  } else if (options.activeTab === 'TRANSFER') {
    baseTitle = 'BÁO CÁO CHUYỂN VÍ CHI TIẾT';
  }

  // Tính toán tổng thu, tổng chi và chuyển khoản
  const totalIncome = exportList
    .filter((tx) => tx.transactionType === 'INCOME')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalExpense = exportList
    .filter((tx) => tx.transactionType === 'EXPENSE')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalTransfer = exportList
    .filter((tx) => tx.transactionType === 'TRANSFER')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;
  const exportTime = new Date().toLocaleString('vi-VN');

  // Xây dựng phần tfoot chân bảng theo thiết kế chuẩn đẹp có màu sắc (Bảng 7 cột)
  let footerRows = '';
  if (options.activeTab === 'INCOME') {
    footerRows = `
    <tr class="total-row" style="background-color: #f0fdf4;">
      <td colspan="6" style="text-align: right; padding-right: 14px; font-weight: bold; border: 1px solid #86efac; color: #166534; height: 38px; white-space: nowrap; background-color: #f0fdf4; font-size: 11pt;">TỔNG THU:</td>
      <td class="td-amount" style="border: 1px solid #86efac; font-size: 12pt; color: #16a34a; font-weight: bold; background-color: #f0fdf4;">+${Math.round(totalIncome).toLocaleString('vi-VN')} đ</td>
    </tr>`;
  } else if (options.activeTab === 'EXPENSE') {
    footerRows = `
    <tr class="total-row" style="background-color: #fef2f2;">
      <td colspan="6" style="text-align: right; padding-right: 14px; font-weight: bold; border: 1px solid #fca5a5; color: #991b1b; height: 38px; white-space: nowrap; background-color: #fef2f2; font-size: 11pt;">TỔNG CHI:</td>
      <td class="td-amount" style="border: 1px solid #fca5a5; font-size: 12pt; color: #dc2626; font-weight: bold; background-color: #fef2f2;">-${Math.round(totalExpense).toLocaleString('vi-VN')} đ</td>
    </tr>`;
  } else if (options.activeTab === 'TRANSFER') {
    footerRows = `
    <tr class="total-row" style="background-color: #f0f9ff;">
      <td colspan="6" style="text-align: right; padding-right: 14px; font-weight: bold; border: 1px solid #7dd3fc; color: #075985; height: 38px; white-space: nowrap; background-color: #f0f9ff; font-size: 11pt;">TỔNG TIỀN CHUYỂN VÍ:</td>
      <td class="td-amount" style="border: 1px solid #7dd3fc; font-size: 12pt; color: #0284c7; font-weight: bold; background-color: #f0f9ff;">${Math.round(totalTransfer).toLocaleString('vi-VN')} đ</td>
    </tr>`;
  } else {
    // Cả thu và chi: hiển thị 3 hàng màu sắc sắc nét, colspan="6" để hiển thị trọn vẹn nhãn
    footerRows = `
    <tr class="total-row" style="background-color: #f0fdf4;">
      <td colspan="6" style="text-align: right; padding-right: 14px; font-weight: bold; border: 1px solid #86efac; color: #166534; height: 38px; white-space: nowrap; background-color: #f0fdf4; font-size: 11pt;">TỔNG THU:</td>
      <td class="td-amount" style="border: 1px solid #86efac; font-size: 12pt; color: #16a34a; font-weight: bold; background-color: #f0fdf4;">+${Math.round(totalIncome).toLocaleString('vi-VN')} đ</td>
    </tr>
    <tr class="total-row" style="background-color: #fef2f2;">
      <td colspan="6" style="text-align: right; padding-right: 14px; font-weight: bold; border: 1px solid #fca5a5; color: #991b1b; height: 38px; white-space: nowrap; background-color: #fef2f2; font-size: 11pt;">TỔNG CHI:</td>
      <td class="td-amount" style="border: 1px solid #fca5a5; font-size: 12pt; color: #dc2626; font-weight: bold; background-color: #fef2f2;">-${Math.round(totalExpense).toLocaleString('vi-VN')} đ</td>
    </tr>
    <tr class="total-row" style="background-color: #f1f5f9;">
      <td colspan="6" style="text-align: right; padding-right: 14px; font-weight: bold; border: 1px solid #94a3b8; color: #1e3a8a; height: 40px; white-space: nowrap; background-color: #e2e8f0; font-size: 11pt;">THẶNG DƯ RÒNG (THU - CHI):</td>
      <td class="td-amount" style="border: 1px solid #94a3b8; font-size: 12.5pt; color: ${netBalance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; background-color: #e2e8f0;">${netBalance >= 0 ? '+' : ''}${Math.round(netBalance).toLocaleString('vi-VN')} đ</td>
    </tr>`;
  }

  const subInfo = `Kỳ: ${options.monthLabel}  |  Ví: ${options.walletLabel}  |  Phân loại: ${options.tabLabel}  |  Xuất lúc: ${exportTime}`;

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>BaoCaoLichSuThuChi</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1E293B; }
    .brand-title { font-size: 11pt; font-weight: bold; color: #08503C; text-align: center; height: 32px; vertical-align: middle; background-color: #FFFFFF; border: 2px solid #08503C; letter-spacing: 0.5px; }
    .main-title { font-size: 16pt; font-weight: bold; color: #FFFFFF; text-align: center; height: 48px; vertical-align: middle; background-color: #08503C; letter-spacing: 1px; }
    .sub-title { font-size: 9.5pt; font-style: italic; color: #334155; text-align: center; height: 30px; vertical-align: middle; background-color: #E6F4EA; border-bottom: 1px solid #A7F3D0; }
    .th-blue { background-color: #1d4ed8; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #1e40af; height: 40px; vertical-align: middle; font-size: 11pt; }
    .td-stt { text-align: center; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; color: #64748B; }
    .td-text { text-align: left; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; padding-left: 12px; padding-right: 8px; color: #0F172A; }
    .td-cat { text-align: left; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; padding-left: 10px; padding-right: 8px; color: #0369A1; font-weight: 600; }
    .td-wallet { text-align: left; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; padding-left: 10px; padding-right: 8px; color: #334155; }
    .td-center { text-align: center; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; }
    .td-date { text-align: center; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; color: #047857; font-weight: 600; mso-number-format: "\\@"; }
    .td-type { text-align: center; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; font-weight: 600; }
    .td-amount { text-align: right; border: 1px solid #e2e8f0; height: 36px; vertical-align: middle; padding-right: 12px; font-weight: bold; }
    .row-even { background-color: #FFFFFF; }
    .row-odd { background-color: #F8FAFC; }
    .total-row { font-weight: bold; height: 38px; vertical-align: middle; }
  </style>
</head>
<body>
  <table>
    <!-- Hàng 1: Brand Title FINORA chuẩn theo ảnh đính kèm -->
    <tr>
      <td colspan="7" class="brand-title">FINORA · NỀN TẢNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN</td>
    </tr>
    <!-- Hàng 2: Main Title Nền Xanh Đậm Emerald chuẩn ảnh -->
    <tr>
      <td colspan="7" class="main-title">${baseTitle}</td>
    </tr>
    <!-- Hàng 3: Subtitle Kỳ | Ví | Phân loại | Xuất lúc -->
    <tr>
      <td colspan="7" class="sub-title">${subInfo}</td>
    </tr>
    <tr><td colspan="7" style="height: 14px;"></td></tr>

    <!-- Hàng Tiêu đề Cột: 7 Cột Độc Lập - Giao Dịch & Hạng Mục Tách Rời, Thời Gian (Giờ trước Ngày sau) -->
    <thead>
      <tr>
        <th class="th-blue" style="width: 50px;">STT</th>
        <th class="th-blue" style="width: 250px;">GIAO DỊCH</th>
        <th class="th-blue" style="width: 170px;">HẠNG MỤC</th>
        <th class="th-blue" style="width: 210px;">TÀI KHOẢN / VÍ</th>
        <th class="th-blue" style="width: 160px;">THỜI GIAN</th>
        <th class="th-blue" style="width: 130px;">PHÂN LOẠI</th>
        <th class="th-blue" style="width: 180px;">SỐ TIỀN (VND)</th>
      </tr>
    </thead>
    <tbody>
      ${exportList.map((tx, index) => {
        const typeLabel = tx.transactionType === 'INCOME'
          ? 'Thu nhập'
          : tx.transactionType === 'EXPENSE'
            ? 'Chi tiêu'
            : 'Chuyển ví';
        const formattedAmount = Math.round(tx.amount || 0).toLocaleString('vi-VN') + ' đ';
        const desc = tx.description || (tx.transactionType === 'INCOME' ? 'Khoản thu' : tx.transactionType === 'TRANSFER' ? 'Chuyển ví' : 'Khoản chi');
        const catName = tx.category?.name || 'Khác';
        const accInfo = tx.accountName
          ? (tx.transactionType === 'TRANSFER' && tx.toAccountName ? `${tx.accountName} → ${tx.toAccountName}` : tx.accountName)
          : 'Tài khoản chính';

        // Format ngày giờ: GIỜ TRƯỚC - NGÀY SAU (VD: 14:41 02/11/2026)
        let formattedDate = tx.transactionDate || '';
        if (formattedDate.includes('-')) {
          const p = formattedDate.split('-');
          if (p.length === 3) formattedDate = `${p[2]}/${p[1]}/${p[0]}`;
        }

        let formattedTime = '';
        if (tx.transactionTime) {
          const rawTime = String(tx.transactionTime).trim();
          const timeParts = rawTime.split(':');
          if (timeParts.length >= 2) {
            formattedTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
          } else {
            formattedTime = rawTime.slice(0, 5);
          }
        }

        const timeDisplay = formattedTime
          ? `${formattedTime}  ${formattedDate}`
          : formattedDate;

        const amtColor = tx.transactionType === 'INCOME'
          ? '#16a34a'
          : tx.transactionType === 'EXPENSE'
            ? '#dc2626'
            : '#0284c7';
        const sign = tx.transactionType === 'INCOME' ? '+' : tx.transactionType === 'EXPENSE' ? '-' : '';
        const rowBgClass = index % 2 === 0 ? 'row-even' : 'row-odd';

        return `
        <tr class="${rowBgClass}">
          <td class="td-stt">${index + 1}</td>
          <td class="td-text" style="font-weight: 500;">${desc}</td>
          <td class="td-cat">${catName}</td>
          <td class="td-wallet">${accInfo}</td>
          <td class="td-date" style="mso-number-format: '\\@';">${timeDisplay}</td>
          <td class="td-type" style="color: ${amtColor};">${typeLabel}</td>
          <td class="td-amount" style="color: ${amtColor};">${sign}${formattedAmount}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
    <tfoot>
      ${footerRows}
    </tfoot>
  </table>
</body>
</html>
  `;
}

/**
 * Xuất file Excel lịch sử thu chi theo bộ lọc đang chọn và mở Share Sheet (giống bản Web 100%)
 */
export async function exportTransactionHistoryToExcel(
  transactions: TransactionItem[],
  options: ExportFilterOptions
): Promise<boolean> {
  try {
    if (transactions.length === 0) {
      Alert.alert('Thông báo', 'Không có giao dịch nào phù hợp với bộ lọc hiện tại để xuất báo cáo.');
      return false;
    }

    const excelHtml = generateCashFlowExcelHtml(transactions, options);

    let filePrefix = 'Bao_cao_lich_su_thu_chi';
    if (options.activeTab === 'INCOME') filePrefix = 'Bao_cao_khoan_thu';
    else if (options.activeTab === 'EXPENSE') filePrefix = 'Bao_cao_khoan_chi';
    else if (options.activeTab === 'TRANSFER') filePrefix = 'Bao_cao_chuyen_vi';

    const cleanMonth = (options.selectedMonth && options.selectedMonth !== 'ALL')
      ? options.selectedMonth.replace(/-/g, '_')
      : 'Tat_ca';
    const timeStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
    const fileName = `${filePrefix}_${cleanMonth}_${timeStamp}.xls`;

    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${docDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, excelHtml, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let shareUri = fileUri;
    if (Platform.OS === 'android') {
      try {
        shareUri = await FileSystem.getContentUriAsync(fileUri);
      } catch (cErr) {
        console.warn('getContentUriAsync warning:', cErr);
      }
    }

    const summaryMsg = `📊 BÁO CÁO LỊCH SỬ THU & CHI FINORA (${options.monthLabel})\nVí: ${options.walletLabel} • Tab: ${options.tabLabel}\n• Thu nhập: ${options.summary.totalIncome.toLocaleString('vi-VN')} đ\n• Chi tiêu: ${options.summary.totalExpense.toLocaleString('vi-VN')} đ\n• Số giao dịch: ${transactions.length}\n(Tập tin: ${fileName})`;

    let res;
    try {
      res = await Share.share(
        Platform.OS === 'ios'
          ? {
              url: fileUri,
            }
          : {
              title: `Báo cáo thu chi Finora (${options.monthLabel})`,
              message: summaryMsg,
            },
        {
          dialogTitle: 'Chia sẻ file Excel Báo cáo Thu Chi',
        }
      );
    } catch (shareErr) {
      console.warn('Lần 1 chia sẻ file thất bại, fallback sang message:', shareErr);
      res = await Share.share(
        {
          title: `Báo cáo thu chi Finora (${options.monthLabel})`,
          message: summaryMsg,
        },
        {
          dialogTitle: 'Chia sẻ file Excel Báo cáo Thu Chi',
        }
      );
    }

    if (res && res.action === Share.sharedAction) {
      Alert.alert('Thành công', `Đã xuất file Excel chuẩn Web:\n${fileName}`);
    }

    return true;
  } catch (err: any) {
    console.error('Lỗi xuất Excel lịch sử giao dịch:', err);
    Alert.alert('Lỗi', `Không thể xuất file Excel (${err?.message || 'Lỗi không xác định'}).`);
    return false;
  }
}

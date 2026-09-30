export type AnalysisTab = 'Tổng quan' | 'Chi tiêu' | 'Khuyến nghị';

export const analysisTabs: AnalysisTab[] = ['Tổng quan', 'Chi tiêu', 'Khuyến nghị'];

export const recommendations = [
  { title: 'CẮT GIẢM NGÂN SÁCH', meta: 'Ưu tiên cao', accent: '#047857', action: 'Áp dụng hạn mức tự động', body: 'Bạn nên giảm chi tiêu ăn uống khoảng 15% và tăng mức tiết kiệm lên 20% thu nhập hàng tháng để kịp tiến độ mua laptop.' },
  { title: 'TỐI ƯU ĐĂNG KÝ', meta: 'Tiết kiệm ~240k/tháng', accent: '#0369A1', action: 'Kiểm tra danh sách định kỳ', body: 'AI nhận thấy bạn có 2 dịch vụ giải trí ít sử dụng trong 30 ngày qua. Xem xét tạm dừng để tiết kiệm thêm vào Quỹ dự phòng.' },
];
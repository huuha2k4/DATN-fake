export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  kind: 'budget' | 'reminder' | 'goal' | 'security';
  unread: boolean;
};

export const notifications: NotificationItem[] = [
  { id: 1, title: 'Sắp vượt ngân sách', message: 'Danh mục Ăn uống đã sử dụng 84% ngân sách tháng này.', time: '10 phút trước', kind: 'budget', unread: true },
  { id: 2, title: 'Nhắc nhở thanh toán', message: 'Tiền điện 300.000 đ sẽ đến hạn vào ngày 12/09/2025.', time: '2 giờ trước', kind: 'reminder', unread: true },
  { id: 3, title: 'Mục tiêu đang tiến triển', message: 'Bạn đã hoàn thành 60% mục tiêu Mua laptop.', time: 'Hôm qua', kind: 'goal', unread: false },
  { id: 4, title: 'Đăng nhập mới', message: 'Tài khoản của bạn vừa được đăng nhập trên thiết bị mới.', time: 'Hôm qua', kind: 'security', unread: false },
];
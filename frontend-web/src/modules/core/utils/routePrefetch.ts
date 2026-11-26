const prefetchedKeys = new Set<string>();

const routeLoadersByLabel: Record<string, () => Promise<unknown>> = {
  'Tổng quan': () => import('../../dashboard/screen/DashboardScreen'),
  'Thêm giao dịch': () => import('../../add-transaction/screen/AddTransactionScreen'),
  'Quản lý Ví': () => import('../../account-management/screen/AccountManagementScreen'),
  'Quản lý Thu & Chi': () => import('../../cash-flow-management/screen/CashFlowManagementScreen'),
  'Quản lý Ngân sách': () => import('../../budget-management/screen/BudgetManagementScreen'),
  'Mục tiêu & Tiết kiệm': () => import('../../budget-goals/screen/GoalsManagementScreen'),
  'Lịch tài chính': () => import('../../financial-reminders/screen/FinancialRemindersScreen'),
  'Quản lý Nợ': () => import('../../debt-management/screen/DebtManagementScreen'),
  'Chi tiêu Nhóm': () => import('../../group/screen/GroupManagementScreen'),
  'Báo cáo & Thống kê': () => import('../../financial-reports/screen/FinancialReportsDashboardScreen'),
  'Phân tích hành vi chi tiêu': () => import('../../spending-analysis/screen/SpendingAnalysisScreen'),
  'AI Thông minh': () => import('../../ai-assistant/screen/AIAssistantScreen'),
  'Dự báo tài chính': () => import('../../financial-forecast/screen/FinancialForecastScreen'),
  'Ví của bé': () => import('../../child-wallet/screen/ChildWalletScreen'),
  'Nhiệm vụ nhận thưởng': () => import('../../child-wallet/screen/ChildChoresScreen'),
  'Xin tiền bố mẹ': () => import('../../child-wallet/screen/ChildMoneyRequestsScreen'),
};

export function prefetchRouteByLabel(label: string): void {
  if (prefetchedKeys.has(label)) return;
  const loader = routeLoadersByLabel[label];
  if (!loader) return;
  prefetchedKeys.add(label);
  loader().catch(() => {
    prefetchedKeys.delete(label);
  });
}

export function prefetchCoreRoutesOnIdle(isAdmin: boolean): () => void {
  if (isAdmin) return () => {};

  const coreLabels = ['Tổng quan', 'Quản lý Thu & Chi', 'Quản lý Ví'];
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(() => {
      coreLabels.forEach(prefetchRouteByLabel);
    }, { timeout: 2000 });
    return () => win.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(() => {
    coreLabels.forEach(prefetchRouteByLabel);
  }, 1200);
  return () => window.clearTimeout(timer);
}

import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AddTransactionScreen } from '../../add-transaction/screen/AddTransactionScreen'
import { AccountManagementScreen } from '../../account-management/screen/AccountManagementScreen'
import { AIAssistantScreen } from '../../ai-assistant/screen/AIAssistantScreen'
import { BudgetManagementScreen } from '../../budget-management/screen/BudgetManagementScreen'
import { GoalsManagementScreen } from '../../budget-goals/screen/GoalsManagementScreen'
import { CashFlowManagementScreen } from '../../cash-flow-management/screen/CashFlowManagementScreen'
import { DashboardScreen } from '../../dashboard/screen/DashboardScreen'
import { FinancialReportsDashboardScreen } from '../../financial-reports/screen/FinancialReportsDashboardScreen'
import { FinancialForecastScreen } from '../../financial-forecast/screen/FinancialForecastScreen'
import { FinancialRemindersScreen } from '../../financial-reminders/screen/FinancialRemindersScreen'
import { InvoiceOcrScreen } from '../../invoice-ocr/screen/InvoiceOcrScreen'
import { SpendingAnalysisScreen } from '../../spending-analysis/screen/SpendingAnalysisScreen'
import { DebtManagementScreen } from '../../debt-management/screen/DebtManagementScreen'
import { GroupManagementScreen } from '../../group/screen/GroupManagementScreen'
import { DashboardHeaderSection } from '../../core/components/DashboardHeaderSection'
import { FinancialNavigationSection } from '../../core/components/FinancialNavigationSection'
import { FloatingActions } from '../../core/components/FloatingActions'
import { LandingScreen } from '../../auth/screen/LandingScreen'
import { ProfileScreen } from '../../profile/screen/ProfileScreen'
import { ChangePasswordModal } from '../../profile/components/ChangePasswordModal'
import { NotificationScreen } from '../../notification/screen/NotificationScreen'
import { ChildWalletScreen } from '../../child-wallet/screen/ChildWalletScreen'
import { UserFeedbackScreen } from '../../feedback/screen/UserFeedbackScreen'
import { PricingScreen } from '../../pricing/screen/PricingScreen'
import { AdminGuard } from '../../admin/components/AdminGuard'
import { AdminLayout } from '../../admin/components/AdminLayout'
import { AdminDashboardScreen } from '../../admin/screen/AdminDashboardScreen'
import { AdminUserManagementScreen } from '../../admin/screen/AdminUserManagementScreen'
import { AdminRolesScreen } from '../../admin/screen/AdminRolesScreen'
import { AdminCategoriesScreen } from '../../admin/screen/AdminCategoriesScreen'
import { AdminOcrManagementScreen } from '../../admin/screen/AdminOcrManagementScreen'
import { AdminAnalyticsScreen } from '../../admin/screen/AdminAnalyticsScreen'
import { AdminFeedbacksScreen } from '../../admin/screen/AdminFeedbacksScreen'
import { AdminBroadcastScreen } from '../../admin/screen/AdminBroadcastScreen'
import { AdminAuditLogsScreen } from '../../admin/screen/AdminAuditLogsScreen'
import { AdminSystemHealthScreen } from '../../admin/screen/AdminSystemHealthScreen'
import { AdminSettingsScreen } from '../../admin/screen/AdminSettingsScreen'
import { AdminPlaceholderScreen } from '../../admin/screen/AdminPlaceholderScreen'
import { isAuthenticated, clearAuthData, getStoredUser } from '../../auth/api/authApi'

export default function AppScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [notice, setNotice] = useState('')
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [walletCount, setWalletCount] = useState<number | null>(null)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const navigate = useNavigate()
  const location = useLocation()
  const isChildAccount = Boolean(getStoredUser()?.childAccount)
  const childAllowedRoutes = new Set(['/dashboard', '/child-wallet', '/add-transaction', '/transactions', '/groups', '/profile', '/notifications'])

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileNavOpen(prev => !prev)
    } else {
      setIsSidebarCollapsed(prev => {
        const next = !prev
        localStorage.setItem('sidebar_collapsed', String(next))
        return next
      })
    }
  }

  // Check auth state on mount and listen to storage changes
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsLoggedIn(authenticated)
    }
    
    checkAuth()
    
    // Listen to custom auth events and storage events
    window.addEventListener('storage', checkAuth)
    window.addEventListener('auth:logout', checkAuth)
    
    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth:logout', checkAuth)
    }
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname])

  const handleAuthenticated = () => {
    setIsLoggedIn(true)
    const currentUser = getStoredUser()
    if (currentUser?.systemRole === 'ADMIN') {
      navigate('/admin')
    } else {
      navigate('/dashboard')
    }
  }

  const handleLogout = () => {
    clearAuthData()
    setIsLoggedIn(false)
    navigate('/')
  }

  if (!isLoggedIn) {
    return <LandingScreen onAuthenticated={handleAuthenticated} />
  }

  const storedUser = getStoredUser()
  const isAdminAccount = storedUser?.systemRole === 'ADMIN'

  // Nếu là tài khoản Admin: Cố định toàn quyền tại không gian quản trị /admin, không hiển thị không gian chi tiêu cá nhân
  if (isAdminAccount) {
    return (
      <AdminGuard>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardScreen />} />
            <Route path="users" element={<AdminUserManagementScreen />} />
            <Route path="roles" element={<AdminRolesScreen />} />
            <Route path="categories" element={<AdminCategoriesScreen />} />
            <Route path="ai-management" element={<AdminPlaceholderScreen title="Quản lý AI (FinAI)" description="Giám sát lượng token tiêu thụ, mô hình Gemini và hiệu năng phản hồi." />} />
            <Route path="ocr-management" element={<AdminOcrManagementScreen />} />
            <Route path="analytics" element={<AdminAnalyticsScreen />} />
            <Route path="feedbacks" element={<AdminFeedbacksScreen />} />
            <Route path="broadcast" element={<AdminBroadcastScreen />} />
            <Route path="audit-logs" element={<AdminAuditLogsScreen />} />
            <Route path="system-health" element={<AdminSystemHealthScreen />} />
            <Route path="settings" element={<AdminSettingsScreen />} />
            <Route path="profile" element={<ProfileScreen onLogout={handleLogout} />} />
          </Route>
          {/* Mọi route khác khi Admin đăng nhập đều tự động chuyển về /admin */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminGuard>
    )
  }

  // Map route to active sidebar section
  const pathToSection: Record<string, string> = {
    '/': 'Tổng quan',
    '/dashboard': 'Tổng quan',
    '/child-wallet': 'Ví của em',
    '/add-transaction': 'Thêm giao dịch',
    '/transactions': 'Quản lý Thu & Chi',
    '/budget': 'Quản lý Ngân sách',
    '/goals': 'Mục tiêu Tài chính',
    '/schedules': 'Lịch tài chính',
    '/reminders': 'Lịch tài chính',
    '/debts': 'Quản lý Nợ',
    '/groups': 'Chi tiêu Nhóm',
    '/reports': 'Báo cáo & Thống kê',
    '/ai-assistant': 'AI Thông minh',
    '/forecast': 'Dự báo tài chính',
    '/analysis': 'Phân tích hành vi chi tiêu',
    '/wallets': 'Quản lý Ví',
    '/accounts': 'Quản lý Ví',
  }

  const activeSection = pathToSection[location.pathname] || 'Tổng quan'

  return (
    <div className="dashboard-layout">
      <FinancialNavigationSection 
        active={activeSection} 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        isCollapsed={isSidebarCollapsed}
        isChildAccount={isChildAccount}
        onNavigate={(section) => {
          const routes: Record<string, string> = {
            'Ví của em': '/child-wallet',
            '__CHILD_WALLET__': '/child-wallet',
            'Tổng quan': '/dashboard',
            'Thêm giao dịch': '/add-transaction',
            'Quản lý Ví': '/wallets',
            'Quản lý Thu & Chi': '/transactions',
            'Quản lý Ngân sách': '/budget',
            'Mục tiêu Tài chính': '/goals',
            'Lịch tài chính': '/schedules',
            'Quản lý Nợ': '/debts',
            'Chi tiêu Nhóm': '/groups',
            'Báo cáo & Thống kê': '/reports',
            'AI Thông minh': '/ai-assistant',
            'Dự báo tài chính': '/forecast',
            'Phân tích hành vi chi tiêu': '/analysis',
            'Phản hồi & Trợ giúp': '/feedback',
          }
          if (routes[section]) {
            navigate(routes[section])
          }
        }} 
      />
      
      <div className={`main-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <DashboardHeaderSection 
          onNotify={setNotice} 
          onOpenProfile={() => navigate('/profile')}
          onOpenChangePassword={() => setIsPasswordModalOpen(true)}
          onLogout={handleLogout}
          walletCount={walletCount}
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        
        <Routes>
          {isChildAccount && !childAllowedRoutes.has(location.pathname) && <Route path="*" element={<Navigate to="/dashboard" replace />} />}
          <Route path="/" element={<DashboardScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          <Route path="/dashboard" element={<DashboardScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          {isChildAccount && <Route path="/child-wallet" element={<ChildWalletScreen onNotify={setNotice} />} />}
          <Route path="/profile" element={<ProfileScreen onLogout={handleLogout} />} />
          <Route path="/notifications" element={<NotificationScreen onNotify={setNotice} />} />
          <Route path="/feedback" element={<UserFeedbackScreen onNotify={setNotice} />} />
          <Route path="/pricing" element={<PricingScreen onNotify={setNotice} />} />
          <Route path="/add-transaction" element={<AddTransactionScreen onCancel={() => navigate(-1)} onNotify={setNotice} onOpenInvoiceScanner={() => navigate('/scan-invoice')} />} />
          {!isChildAccount && <Route path="/scan-invoice" element={<InvoiceOcrScreen onCancel={() => navigate(-1)} onNotify={setNotice} />} />}
          <Route path="/transactions" element={<CashFlowManagementScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          {!isChildAccount && <Route path="/budget" element={<BudgetManagementScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/goals" element={<GoalsManagementScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/schedules" element={<FinancialRemindersScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/reminders" element={<FinancialRemindersScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/debts" element={<DebtManagementScreen onNotify={setNotice} />} />}
          <Route path="/groups" element={<GroupManagementScreen onNotify={setNotice} />} />
          {!isChildAccount && <Route path="/reports" element={<FinancialReportsDashboardScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/ai-assistant" element={<AIAssistantScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/forecast" element={<FinancialForecastScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/analysis" element={<SpendingAnalysisScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/wallets" element={<AccountManagementScreen onNotify={setNotice} onAccountsChange={setWalletCount} />} />}
          {!isChildAccount && <Route path="/accounts" element={<AccountManagementScreen onNotify={setNotice} onAccountsChange={setWalletCount} />} />}
        </Routes>
      </div>

      {/* Floating Action Buttons */}
      {location.pathname !== '/scan-invoice' && (
        <FloatingActions 
          onAddTransaction={() => navigate('/add-transaction')}
          onOpenInvoiceScanner={() => navigate('/scan-invoice')}
          onOpenAIAssistant={() => navigate('/ai-assistant')}
          isChildAccount={isChildAccount}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(msg) => setNotice(msg)}
      />
      
      {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
    </div>
  )
}

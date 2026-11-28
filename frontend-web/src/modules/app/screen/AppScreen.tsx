import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { DashboardHeaderSection } from '../../core/components/DashboardHeaderSection'
import { FinancialNavigationSection } from '../../core/components/FinancialNavigationSection'
import { FloatingActions } from '../../core/components/FloatingActions'
import { LandingScreen } from '../../auth/screen/LandingScreen'
import { ChangePasswordModal } from '../../profile/components/ChangePasswordModal'
import { AdminGuard } from '../../admin/components/AdminGuard'
import { AdminLayout } from '../../admin/components/AdminLayout'
import { isAuthenticated, clearAuthData, getStoredUser } from '../../auth/api/authApi'
import { accountApi } from '../../account-management/api/accountApi'
import { FinoraOnboardingWalkthroughWeb } from '../../onboarding/components/FinoraOnboardingWalkthrough'
import { CompleteProfileModalWeb } from '../../onboarding/components/CompleteProfileModal'
import { prefetchCoreRoutesOnIdle } from '../../core/utils/routePrefetch'

const AddTransactionScreen = lazy(() => import('../../add-transaction/screen/AddTransactionScreen').then(m => ({ default: m.AddTransactionScreen })))
const AccountManagementScreen = lazy(() => import('../../account-management/screen/AccountManagementScreen').then(m => ({ default: m.AccountManagementScreen })))
const AIAssistantScreen = lazy(() => import('../../ai-assistant/screen/AIAssistantScreen').then(m => ({ default: m.AIAssistantScreen })))
const BudgetManagementScreen = lazy(() => import('../../budget-management/screen/BudgetManagementScreen').then(m => ({ default: m.BudgetManagementScreen })))
const GoalsManagementScreen = lazy(() => import('../../budget-goals/screen/GoalsManagementScreen').then(m => ({ default: m.GoalsManagementScreen })))
const CashFlowManagementScreen = lazy(() => import('../../cash-flow-management/screen/CashFlowManagementScreen').then(m => ({ default: m.CashFlowManagementScreen })))
const DashboardScreen = lazy(() => import('../../dashboard/screen/DashboardScreen').then(m => ({ default: m.DashboardScreen })))
const FinancialReportsDashboardScreen = lazy(() => import('../../financial-reports/screen/FinancialReportsDashboardScreen').then(m => ({ default: m.FinancialReportsDashboardScreen })))
const FinancialForecastScreen = lazy(() => import('../../financial-forecast/screen/FinancialForecastScreen').then(m => ({ default: m.FinancialForecastScreen })))
const FinancialRemindersScreen = lazy(() => import('../../financial-reminders/screen/FinancialRemindersScreen').then(m => ({ default: m.FinancialRemindersScreen })))
const InvoiceOcrScreen = lazy(() => import('../../invoice-ocr/screen/InvoiceOcrScreen').then(m => ({ default: m.InvoiceOcrScreen })))
const SpendingAnalysisScreen = lazy(() => import('../../spending-analysis/screen/SpendingAnalysisScreen').then(m => ({ default: m.SpendingAnalysisScreen })))
const DebtManagementScreen = lazy(() => import('../../debt-management/screen/DebtManagementScreen').then(m => ({ default: m.DebtManagementScreen })))
const GroupManagementScreen = lazy(() => import('../../group/screen/GroupManagementScreen').then(m => ({ default: m.GroupManagementScreen })))
const ProfileScreen = lazy(() => import('../../profile/screen/ProfileScreen').then(m => ({ default: m.ProfileScreen })))
const NotificationScreen = lazy(() => import('../../notification/screen/NotificationScreen').then(m => ({ default: m.NotificationScreen })))
const ChildWalletScreen = lazy(() => import('../../child-wallet/screen/ChildWalletScreen').then(m => ({ default: m.ChildWalletScreen })))
const ChildChoresScreen = lazy(() => import('../../child-wallet/screen/ChildChoresScreen').then(m => ({ default: m.ChildChoresScreen })))
const ChildMoneyRequestsScreen = lazy(() => import('../../child-wallet/screen/ChildMoneyRequestsScreen').then(m => ({ default: m.ChildMoneyRequestsScreen })))
const UserFeedbackScreen = lazy(() => import('../../feedback/screen/UserFeedbackScreen').then(m => ({ default: m.UserFeedbackScreen })))
const PricingScreen = lazy(() => import('../../pricing/screen/PricingScreen').then(m => ({ default: m.PricingScreen })))
const PrivacyPolicyScreen = lazy(() => import('../../legal/screen/PrivacyPolicyScreen').then(m => ({ default: m.PrivacyPolicyScreen })))
const TermsOfServiceScreen = lazy(() => import('../../legal/screen/TermsOfServiceScreen').then(m => ({ default: m.TermsOfServiceScreen })))
const AdminDashboardScreen = lazy(() => import('../../admin/screen/AdminDashboardScreen').then(m => ({ default: m.AdminDashboardScreen })))
const AdminUserManagementScreen = lazy(() => import('../../admin/screen/AdminUserManagementScreen').then(m => ({ default: m.AdminUserManagementScreen })))
const AdminCategoriesScreen = lazy(() => import('../../admin/screen/AdminCategoriesScreen').then(m => ({ default: m.AdminCategoriesScreen })))
const AdminAIManagementScreen = lazy(() => import('../../admin/screen/AdminAIManagementScreen').then(m => ({ default: m.AdminAIManagementScreen })))
const AdminOcrManagementScreen = lazy(() => import('../../admin/screen/AdminOcrManagementScreen').then(m => ({ default: m.AdminOcrManagementScreen })))
const AdminAnalyticsScreen = lazy(() => import('../../admin/screen/AdminAnalyticsScreen').then(m => ({ default: m.AdminAnalyticsScreen })))
const AdminFeedbacksScreen = lazy(() => import('../../admin/screen/AdminFeedbacksScreen').then(m => ({ default: m.AdminFeedbacksScreen })))
const AdminBroadcastScreen = lazy(() => import('../../admin/screen/AdminBroadcastScreen').then(m => ({ default: m.AdminBroadcastScreen })))
const AdminAuditLogsScreen = lazy(() => import('../../admin/screen/AdminAuditLogsScreen').then(m => ({ default: m.AdminAuditLogsScreen })))
const AdminSystemHealthScreen = lazy(() => import('../../admin/screen/AdminSystemHealthScreen').then(m => ({ default: m.AdminSystemHealthScreen })))
const AdminSettingsScreen = lazy(() => import('../../admin/screen/AdminSettingsScreen').then(m => ({ default: m.AdminSettingsScreen })))

const RouteSuspenseFallback = () => (
  <div className="w-full space-y-5 p-4 md:p-6 animate-pulse" aria-busy="true" aria-label="Đang tải nội dung">
    <div className="h-8 w-56 rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
    </div>
    <div className="h-72 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
  </div>
)

export default function AppScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [notice, setNotice] = useState('')
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [walletCount, setWalletCount] = useState<number | null>(null)
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const navigate = useNavigate()
  const location = useLocation()
  const isChildAccount = Boolean(getStoredUser()?.childAccount)
  const childAllowedRoutes = new Set([
    '/dashboard',
    '/child-wallet',
    '/child-chores',
    '/child-requests',
    '/add-transaction',
    '/transactions',
    '/goals',
    '/reports',
    '/groups',
    '/ai-assistant',
    '/scan-invoice',
    '/profile',
    '/notifications',
  ])

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
      if (authenticated) {
        checkOnboardingStatus()
      }
    }
    
    checkAuth()

    const cancelIdlePrefetch = isAuthenticated()
      ? prefetchCoreRoutesOnIdle(getStoredUser()?.systemRole === 'ADMIN')
      : () => {}
    
    // Listen to custom auth events and storage events
    window.addEventListener('storage', checkAuth)
    window.addEventListener('auth:logout', checkAuth)
    
    return () => {
      cancelIdlePrefetch()
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth:logout', checkAuth)
    }
  }, [])

  const checkOnboardingStatus = async () => {
    const user = getStoredUser()
    if (!user || user.systemRole === 'ADMIN' || user.childAccount) return

    try {
      const accounts = await accountApi.getAccounts()
      // Nếu user chưa có ví nào (accounts rỗng hoặc 0), luôn luôn bật Onboarding Walkthrough để thiết lập ví
      if (!accounts || accounts.length === 0) {
        localStorage.removeItem(`finora_onboarding_done_${user.id}`)
        setShowOnboardingWizard(true)
      } else {
        setShowOnboardingWizard(false)
        localStorage.setItem(`finora_onboarding_done_${user.id}`, 'true')
      }
    } catch {
      // Ignored
    }
  }

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname])

  // Auto-dismiss notice toast after 5 seconds
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const handleAuthenticated = (authRes?: any) => {
    setIsLoggedIn(true)
    const currentUser = getStoredUser()
    if (currentUser?.systemRole === 'ADMIN') {
      navigate('/admin')
    } else {
      navigate('/dashboard')
      if (authRes?.data?.isNewUser) {
        setShowCompleteProfile(true)
      } else {
        setTimeout(() => {
          checkOnboardingStatus()
        }, 300)
      }
    }
  }

  const handleLogout = () => {
    clearAuthData()
    setIsLoggedIn(false)
    navigate('/')
  }

  // 1. Cho phép các trang công khai truy cập mà KHÔNG cần đăng nhập
  if (location.pathname === '/privacy') {
    return <PrivacyPolicyScreen />
  }
  if (location.pathname === '/terms') {
    return <TermsOfServiceScreen />
  }
  if (location.pathname === '/pricing') {
    return <Suspense fallback={<RouteSuspenseFallback />}><PricingScreen onNotify={setNotice} /></Suspense>
  }

  // 2. Nếu chưa đăng nhập thì hiển thị Landing Page
  if (!isLoggedIn) {
    return <LandingScreen onAuthenticated={handleAuthenticated} />
  }

  const storedUser = getStoredUser()
  const isAdminAccount = storedUser?.systemRole === 'ADMIN'

  // Nếu là tài khoản Admin: Cố định toàn quyền tại không gian quản trị /admin, không hiển thị không gian chi tiêu cá nhân
  if (isAdminAccount) {
    return (
      <AdminGuard>
        <Suspense fallback={<RouteSuspenseFallback />}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardScreen />} />
            <Route path="users" element={<AdminUserManagementScreen />} />
            <Route path="roles" element={<Navigate to="/admin/users?tab=access" replace />} />
            <Route path="categories" element={<AdminCategoriesScreen />} />
            <Route path="ai-management" element={<AdminAIManagementScreen />} />
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
        </Suspense>
      </AdminGuard>
    )
  }

  // Map route to active sidebar section
  const pathToSection: Record<string, string> = {
    '/': 'Tổng quan',
    '/dashboard': 'Tổng quan',
    '/child-wallet': 'Ví của em',
    '/child-chores': 'Nhiệm vụ nhận thưởng',
    '/child-requests': 'Xin tiền bố mẹ',
    '/add-transaction': 'Thêm giao dịch',
    '/scan-invoice': 'Thêm giao dịch',
    '/transactions': 'Quản lý Thu & Chi',
    '/budget': 'Quản lý Ngân sách',
    '/goals': 'Mục tiêu & Tiết kiệm',
    '/schedules': 'Lịch tài chính',
    '/reminders': 'Lịch tài chính',
    '/debts': 'Quản lý Nợ',
    '/groups': isChildAccount ? 'Gia đình của em' : 'Chi tiêu Nhóm',
    '/reports': 'Báo cáo & Thống kê',
    '/ai-assistant': 'AI Thông minh',
    '/forecast': 'Dự báo tài chính',
    '/analysis': 'Phân tích hành vi chi tiêu',
    '/wallets': 'Quản lý Ví',
    '/accounts': 'Quản lý Ví',
    '/feedback': '',
    '/profile': '',
    '/notifications': '',
    '/pricing': '',
  }

  const activeSection = pathToSection[location.pathname] !== undefined 
    ? pathToSection[location.pathname] 
    : 'Tổng quan'

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
            'Nhiệm vụ nhận thưởng': '/child-chores',
            'Xin tiền bố mẹ': '/child-requests',
            'Tổng quan': '/dashboard',
            'Thêm giao dịch': '/add-transaction',
            'Quản lý Ví': '/wallets',
            'Quản lý Thu & Chi': '/transactions',
            'Quản lý Ngân sách': '/budget',
            'Mục tiêu & Tiết kiệm': '/goals',
            'Lịch tài chính': '/schedules',
            'Quản lý Nợ': '/debts',
            'Chi tiêu Nhóm': '/groups',
            'Gia đình của em': '/groups',
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
          onOpenFeedback={() => navigate('/feedback')}
          onLogout={handleLogout}
          walletCount={walletCount}
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        
        <Suspense fallback={<RouteSuspenseFallback />}>
        <Routes>
          {isChildAccount && !childAllowedRoutes.has(location.pathname) && <Route path="*" element={<Navigate to="/dashboard" replace />} />}
          <Route path="/" element={<DashboardScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          <Route path="/dashboard" element={<DashboardScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          {isChildAccount && <Route path="/child-wallet" element={<ChildWalletScreen onNotify={setNotice} />} />}
          {isChildAccount && <Route path="/child-chores" element={<ChildChoresScreen onNotify={setNotice} />} />}
          {isChildAccount && <Route path="/child-requests" element={<ChildMoneyRequestsScreen onNotify={setNotice} />} />}
          <Route path="/profile" element={<ProfileScreen onLogout={handleLogout} />} />
          <Route path="/notifications" element={<NotificationScreen onNotify={setNotice} />} />
          <Route path="/feedback" element={<UserFeedbackScreen onNotify={setNotice} />} />
          <Route path="/pricing" element={<PricingScreen onNotify={setNotice} />} />
          <Route path="/privacy" element={<PrivacyPolicyScreen />} />
          <Route path="/terms" element={<TermsOfServiceScreen />} />
          <Route path="/add-transaction" element={<AddTransactionScreen onCancel={() => navigate(-1)} onNotify={setNotice} onOpenInvoiceScanner={() => navigate('/scan-invoice')} />} />
          <Route path="/scan-invoice" element={<InvoiceOcrScreen onCancel={() => navigate(-1)} onNotify={setNotice} />} />
          <Route path="/transactions" element={<CashFlowManagementScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          {!isChildAccount && <Route path="/budget" element={<BudgetManagementScreen onNotify={setNotice} />} />}
          <Route path="/goals" element={<GoalsManagementScreen onNotify={setNotice} />} />
          {!isChildAccount && <Route path="/schedules" element={<FinancialRemindersScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/reminders" element={<FinancialRemindersScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/debts" element={<DebtManagementScreen onNotify={setNotice} />} />}
          <Route path="/groups" element={<GroupManagementScreen onNotify={setNotice} />} />
          <Route path="/reports" element={<FinancialReportsDashboardScreen onNotify={setNotice} />} />
          <Route path="/ai-assistant" element={<AIAssistantScreen onNotify={setNotice} />} />
          {!isChildAccount && <Route path="/forecast" element={<FinancialForecastScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/analysis" element={<SpendingAnalysisScreen onNotify={setNotice} />} />}
          {!isChildAccount && <Route path="/wallets" element={<AccountManagementScreen onNotify={setNotice} onAccountsChange={setWalletCount} />} />}
          {!isChildAccount && <Route path="/accounts" element={<AccountManagementScreen onNotify={setNotice} onAccountsChange={setWalletCount} />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </div>

      {/* Floating Action Buttons */}
      {location.pathname !== '/scan-invoice' && location.pathname !== '/ai-assistant' && (
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

      {/* Hoàn thiện hồ sơ khi đăng ký mới bằng Google */}
      <CompleteProfileModalWeb
        isOpen={showCompleteProfile}
        onSuccess={() => {
          setShowCompleteProfile(false)
          setTimeout(() => {
            checkOnboardingStatus()
          }, 300)
        }}
        onSkip={() => {
          setShowCompleteProfile(false)
          setTimeout(() => {
            checkOnboardingStatus()
          }, 300)
        }}
      />

      {/* Onboarding Setup Walkthrough 7 bước chuẩn Finora */}
      <FinoraOnboardingWalkthroughWeb
        isOpen={showOnboardingWizard}
        userName={storedUser?.fullName}
        onClose={() => {
          setShowOnboardingWizard(false)
          // Kích hoạt cập nhật lại số lượng ví trên thanh header / dashboard
          accountApi.getAccounts().then((accs) => {
            setWalletCount(accs.length)
            if (storedUser?.id && accs.length > 0) {
              localStorage.setItem(`finora_onboarding_done_${storedUser.id}`, 'true')
            }
          })
        }}
      />
      
      {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
    </div>
  )
}

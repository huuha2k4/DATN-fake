import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
import { DashboardHeaderSection } from '../../core/components/DashboardHeaderSection'
import { FinancialNavigationSection } from '../../core/components/FinancialNavigationSection'
import { FloatingActions } from '../../core/components/FloatingActions'
import { LandingScreen } from '../../auth/screen/LandingScreen'
import { ProfileScreen } from '../../profile/screen/ProfileScreen'
import { ChangePasswordModal } from '../../profile/components/ChangePasswordModal'
import { isAuthenticated, clearAuthData } from '../../auth/api/authApi'

export default function AppScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [notice, setNotice] = useState('')
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [walletCount, setWalletCount] = useState<number | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setIsLoggedIn(isAuthenticated())
  }, [])

  // Auto-dismiss notice after 5 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [notice])

  const handleAuthenticated = () => {
    setIsLoggedIn(true)
    navigate('/dashboard')
  }

  const handleLogout = () => {
    clearAuthData()
    setIsLoggedIn(false)
    navigate('/')
  }

  if (!isLoggedIn) {
    return <LandingScreen onAuthenticated={handleAuthenticated} />
  }

  // Map route to active sidebar section
  const pathToSection: Record<string, string> = {
    '/': 'Tổng quan',
    '/dashboard': 'Tổng quan',
    '/add-transaction': 'Thêm giao dịch',
    '/wallets': 'Quản lý Ví',
    '/accounts': 'Quản lý Ví',
    '/transactions': 'Quản lý Thu & Chi',
    '/budget': 'Quản lý Ngân sách',
    '/goals': 'Mục tiêu Tài chính',
    '/reminders': 'Nhắc nhở tài chính',
    '/reports': 'Báo cáo & Thống kê',
    '/ai-assistant': 'AI Thông minh',
    '/forecast': 'Dự báo tài chính',
    '/analysis': 'Phân tích hành vi chi tiêu',
    '/profile': 'Quản lý Hồ sơ & Tài khoản',
  }
  const activeSection = pathToSection[location.pathname] || 'Tổng quan'

  return (
    <div className="finance-app">
      <FinancialNavigationSection 
        active={activeSection} 
        onNavigate={(section) => {
          // Map sections to routes
          const routes: Record<string, string> = {
            'Tổng quan': '/dashboard',
            'Thêm giao dịch': '/add-transaction',
            'Quản lý Ví': '/wallets',
            'Quản lý Thu & Chi': '/transactions',
            'Quản lý Ngân sách': '/budget',
            'Mục tiêu Tài chính': '/goals',
            'Nhắc nhở tài chính': '/reminders',
            'Báo cáo & Thống kê': '/reports',
            'AI Thông minh': '/ai-assistant',
            'Dự báo tài chính': '/forecast',
            'Phân tích hành vi chi tiêu': '/analysis',
          }
          if (routes[section]) {
            navigate(routes[section])
          }
        }} 
      />
      
      <div className="main-shell">
        <DashboardHeaderSection 
          onNotify={setNotice} 
          onOpenProfile={() => navigate('/profile')}
          onOpenChangePassword={() => setIsPasswordModalOpen(true)}
          onLogout={handleLogout}
          walletCount={walletCount}
        />
        
        <Routes>
          <Route path="/" element={<DashboardScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          <Route path="/dashboard" element={<DashboardScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          <Route path="/profile" element={<ProfileScreen onLogout={handleLogout} />} />
          <Route path="/add-transaction" element={<AddTransactionScreen onCancel={() => navigate(-1)} onNotify={setNotice} onOpenInvoiceScanner={() => navigate('/scan-invoice')} />} />
          <Route path="/scan-invoice" element={<InvoiceOcrScreen onCancel={() => navigate(-1)} onNotify={setNotice} />} />
          <Route path="/transactions" element={<CashFlowManagementScreen onNotify={setNotice} onAddTransaction={() => navigate('/add-transaction')} />} />
          <Route path="/budget" element={<BudgetManagementScreen onNotify={setNotice} />} />
          <Route path="/goals" element={<GoalsManagementScreen onNotify={setNotice} />} />
          <Route path="/reminders" element={<FinancialRemindersScreen onNotify={setNotice} />} />
          <Route path="/reports" element={<FinancialReportsDashboardScreen onNotify={setNotice} />} />
          <Route path="/ai-assistant" element={<AIAssistantScreen onNotify={setNotice} />} />
          <Route path="/forecast" element={<FinancialForecastScreen onNotify={setNotice} />} />
          <Route path="/analysis" element={<SpendingAnalysisScreen onNotify={setNotice} />} />
          <Route path="/wallets" element={<AccountManagementScreen onNotify={setNotice} onAccountsChange={setWalletCount} />} />
          <Route path="/accounts" element={<AccountManagementScreen onNotify={setNotice} onAccountsChange={setWalletCount} />} />
        </Routes>
      </div>

      {/* Floating Action Buttons dock at bottom right */}
      <FloatingActions 
        onAddTransaction={() => navigate('/add-transaction')}
        onOpenInvoiceScanner={() => navigate('/scan-invoice')}
        onOpenAIAssistant={() => navigate('/ai-assistant')}
      />

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

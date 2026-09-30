import { useState } from 'react'
import { AddTransactionScreen } from '../../add-transaction/screen/AddTransactionScreen'
import { AccountManagementScreen } from '../../account-management/screen/AccountManagementScreen'
import { AIAssistantScreen } from '../../ai-assistant/screen/AIAssistantScreen'
import { BudgetAndGoalsScreen } from '../../budget-goals/screen/BudgetAndGoalsScreen'
import { CashFlowManagementScreen } from '../../cash-flow-management/screen/CashFlowManagementScreen'
import { DashboardScreen } from '../../dashboard/screen/DashboardScreen'
import { FinancialReportsDashboardScreen } from '../../financial-reports/screen/FinancialReportsDashboardScreen'
import { FinancialForecastScreen } from '../../financial-forecast/screen/FinancialForecastScreen'
import { FinancialRemindersScreen } from '../../financial-reminders/screen/FinancialRemindersScreen'
import { InvoiceOcrScreen } from '../../invoice-ocr/screen/InvoiceOcrScreen'
import { SpendingAnalysisScreen } from '../../spending-analysis/screen/SpendingAnalysisScreen'
import { DashboardHeaderSection } from '../../core/components/DashboardHeaderSection'
import { FinancialNavigationSection } from '../../core/components/FinancialNavigationSection'

export default function AppScreen() {
  const [notice, setNotice] = useState('')
  const [activeSection, setActiveSection] = useState('Tổng quan')
  const [returnSection, setReturnSection] = useState('Tổng quan')

  const openAddTransaction = () => {
    setReturnSection(activeSection)
    setActiveSection('Thêm giao dịch')
  }

  const closeAddTransaction = () => setActiveSection(returnSection)

  const openInvoiceScanner = () => {
    setReturnSection(activeSection)
    setActiveSection('Quét hóa đơn OCR')
  }

  const closeInvoiceScanner = () => setActiveSection(returnSection)

  return <div className="finance-app">
    <FinancialNavigationSection active={activeSection} onNavigate={setActiveSection} />
    <div className="main-shell"><DashboardHeaderSection onNotify={setNotice} onAddTransaction={openAddTransaction} onOpenInvoiceScanner={openInvoiceScanner} />{activeSection === 'Quét hóa đơn OCR' ? <InvoiceOcrScreen onCancel={closeInvoiceScanner} onNotify={setNotice} /> : activeSection === 'Thêm giao dịch' ? <AddTransactionScreen onCancel={closeAddTransaction} onNotify={setNotice} onOpenInvoiceScanner={openInvoiceScanner} /> : activeSection === 'Quản lý Thu & Chi' ? <CashFlowManagementScreen onNotify={setNotice} onAddTransaction={openAddTransaction} /> : activeSection === 'Ngân sách & Mục tiêu' ? <BudgetAndGoalsScreen onNotify={setNotice} /> : activeSection === 'Nhắc nhở tài chính' ? <FinancialRemindersScreen onNotify={setNotice} /> : activeSection === 'Báo cáo & Thống kê' ? <FinancialReportsDashboardScreen onNotify={setNotice} /> : activeSection === 'AI Thông minh' ? <AIAssistantScreen onNotify={setNotice} /> : activeSection === 'Dự báo tài chính' ? <FinancialForecastScreen onNotify={setNotice} /> : activeSection === 'Phân tích hành vi chi tiêu' ? <SpendingAnalysisScreen onNotify={setNotice} /> : activeSection === 'Quản lý Hồ sơ & Tài khoản' ? <AccountManagementScreen onNotify={setNotice} /> : <DashboardScreen onNotify={setNotice} onAddTransaction={openAddTransaction} />}</div>
    {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
  </div>
}

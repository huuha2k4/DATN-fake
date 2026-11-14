import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { AddTransactionScreen } from './src/modules/add-transaction/screen/AddTransactionScreen';
import { AccountsScreen } from './src/modules/accounts/screen/AccountsScreen';
import { AiAssistantScreen } from './src/modules/ai-assistant/screen/AiAssistantScreen';
import { BudgetScreen } from './src/modules/budget/screen/BudgetScreen';
import { HomeScreen } from './src/modules/dashboard/screen/HomeScreen';
import { GoalsScreen } from './src/modules/goals/screen/GoalsScreen';
import { SplashScreen } from './src/modules/onboarding/screen/SplashScreen';
import { LoginScreen } from './src/modules/auth/screen/LoginScreen';
import { RegisterScreen } from './src/modules/auth/screen/RegisterScreen';
import { ForgotPasswordScreen } from './src/modules/auth/screen/ForgotPasswordScreen';
import { authApi, authStorage } from './src/modules/auth/api/authApi';
import { ScanInvoiceScreen } from './src/modules/scan-invoice/screen/ScanInvoiceScreen';
import { SpendingAnalysisScreen } from './src/modules/spending-analysis/screen/SpendingAnalysisScreen';
import { PeriodicReportsScreen } from './src/modules/periodic-reports/screen/PeriodicReportsScreen';
import { BalanceForecastScreen } from './src/modules/balance-forecast/screen/BalanceForecastScreen';
import { NotificationsScreen } from './src/modules/notifications/screen/NotificationsScreen';
import { ProfileScreen } from './src/modules/profile/screen/ProfileScreen';
import { RemindersScreen } from './src/modules/reminders/screen/RemindersScreen';
import { TransactionsScreen } from './src/modules/transactions/screen/TransactionsScreen';
import { GroupScreen } from './src/modules/group/screen/GroupScreen';
import { DebtScreen } from './src/modules/debts';
import { colors } from './src/theme';

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [hasStarted, setHasStarted] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>('home');
  const [showAddTransaction, setShowAddTransaction] = React.useState(false);
  const [showScanInvoice, setShowScanInvoice] = React.useState(false);
  const [scanInvoiceInitialStep, setScanInvoiceInitialStep] = React.useState<'HOME' | 'CAMERA'>('HOME');
  const [showReminders, setShowReminders] = React.useState(false);
  const [showAiAssistant, setShowAiAssistant] = React.useState(false);
  const [showAccounts, setShowAccounts] = React.useState(false);
  const [showDebts, setShowDebts] = React.useState(false);
  const [showSpendingAnalysis, setShowSpendingAnalysis] = React.useState(false);
  const [showPeriodicReports, setShowPeriodicReports] = React.useState(false);
  const [periodicReportsInitialParams, setPeriodicReportsInitialParams] = React.useState<{
    presetId?: 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR';
    fromDate?: string;
    toDate?: string;
  } | null>(null);
  const [showBalanceForecast, setShowBalanceForecast] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [isProfileSubPageOpen, setIsProfileSubPageOpen] = React.useState(false);
  const [isGroupDetailOpen, setIsGroupDetailOpen] = React.useState(false);
  const [groupNavTarget, setGroupNavTarget] = React.useState<{
    groupId?: string;
    groupName?: string;
    tab?: 'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'MEMBERS' | 'KIDS' | 'SETTINGS';
    kidWalletId?: string;
    kidSubTab?: 'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS';
  } | null>(null);

  // Tự động nạp phiên đăng nhập bền vững (duy trì phiên, tự thu hồi nếu sau 3 ngày không vào)
  React.useEffect(() => {
    // Đăng ký bộ xử lý khi phiên hết hạn hoàn toàn -> Tự động đưa về màn hình Đăng nhập
    authStorage.setOnSessionExpired(() => {
      setHasStarted(false);
      setShowLogin(true);
    });

    authStorage.loadPersistedSession().then((session) => {
      if (session && session.user && session.tokens) {
        setHasStarted(true);
      }
    });
  }, []);

  if (showRegister) {
    return (
      <RegisterScreen
        onBack={() => setShowRegister(false)}
        onSuccess={() => {
          setShowRegister(false);
          setHasStarted(true);
        }}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
      />
    );
  }

  if (showLogin) {
    return (
      <LoginScreen
        onBack={() => setShowLogin(false)}
        onSuccess={() => {
          setShowLogin(false);
          setHasStarted(true);
        }}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
      />
    );
  }

  if (!hasStarted) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFCFB" }}>
        <SplashScreen
          onStart={() => setShowRegister(true)}
          onLogin={() => setShowLogin(true)}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (showAddTransaction) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F6F8FA' }}>
        <StatusBar style="dark" />
        <AddTransactionScreen
          onBack={() => setShowAddTransaction(false)}
          onSaved={() => {
            setShowAddTransaction(false);
            setActiveTab('transactions');
          }}
          onOpenInvoiceScanner={() => {
            setShowAddTransaction(false);
            setScanInvoiceInitialStep('HOME');
            setShowScanInvoice(true);
          }}
        />
      </View>
    );
  }

  if (showScanInvoice) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <ScanInvoiceScreen
          initialStep={scanInvoiceInitialStep}
          onBack={() => setShowScanInvoice(false)}
          onAddTransaction={() => {
            setShowScanInvoice(false);
            setShowAddTransaction(true);
          }}
          onTransactionCreated={() => {
            setShowScanInvoice(false);
            setActiveTab('transactions');
          }}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (showReminders) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFCFB' }}>
        <RemindersScreen
          onBack={() => setShowReminders(false)}
          onNavigateToDebts={() => {
            setShowReminders(false);
            setShowDebts(true);
          }}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (showAiAssistant) {
    return (
      <View style={{ flex: 1, backgroundColor: '#074838' }}>
        <StatusBar style="light" />
        <AiAssistantScreen onBack={() => setShowAiAssistant(false)} />
      </View>
    );
  }

  if (showAccounts) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F6F8FA' }}>
        <StatusBar style="dark" />
        <AccountsScreen
          onBack={() => setShowAccounts(false)}
          onAddTransaction={() => {
            setShowAccounts(false);
            setShowAddTransaction(true);
          }}
        />
      </View>
    );
  }

  if (showDebts) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <DebtScreen onBack={() => setShowDebts(false)} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (showSpendingAnalysis) {
    return <SafeAreaView style={styles.container}>
      <SpendingAnalysisScreen onBack={() => setShowSpendingAnalysis(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showPeriodicReports) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <PeriodicReportsScreen
          onBack={() => {
            setShowPeriodicReports(false);
            setPeriodicReportsInitialParams(null);
          }}
          initialPresetId={periodicReportsInitialParams?.presetId}
          initialFromDate={periodicReportsInitialParams?.fromDate}
          initialToDate={periodicReportsInitialParams?.toDate}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (showBalanceForecast) {
    return <SafeAreaView style={styles.container}>
      <BalanceForecastScreen onBack={() => setShowBalanceForecast(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showNotifications) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <NotificationsScreen
          onBack={() => setShowNotifications(false)}
          onNavigate={(target) => {
            setShowNotifications(false);
            if (target.tab) {
              setActiveTab(target.tab);
            }
            if (target.groupTarget) {
              setGroupNavTarget(target.groupTarget);
            } else {
              setGroupNavTarget(null);
            }
            if (target.action === 'reminders') {
              setShowReminders(true);
            } else if (target.action === 'periodic-reports') {
              setPeriodicReportsInitialParams(target.params || { presetId: 'LAST_WEEK' });
              setShowPeriodicReports(true);
            } else if (target.action === 'spending-analysis') {
              setShowSpendingAnalysis(true);
            } else if (target.action === 'balance-forecast') {
              setShowBalanceForecast(true);
            } else if (target.action === 'debts') {
              setShowDebts(true);
            } else if (target.action === 'add-transaction') {
              setShowAddTransaction(true);
            } else if (target.action === 'security') {
              setShowProfile(true);
            }
          }}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (showProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.content}>
          <ProfileScreen
            onLogout={async () => {
              try {
                await authApi.logout();
              } catch (e) {
                // Đảm bảo luôn xóa auth cache cục bộ
                authStorage.clear();
              }
              // Reset toàn bộ navigation state về màn hình Đăng nhập
              setShowProfile(false);
              setShowNotifications(false);
              setShowAddTransaction(false);
              setShowScanInvoice(false);
              setShowReminders(false);
              setShowAiAssistant(false);
              setShowAccounts(false);
              setShowSpendingAnalysis(false);
              setShowPeriodicReports(false);
              setShowBalanceForecast(false);
              setShowRegister(false);
              setShowForgotPassword(false);
              setActiveTab('home');
              setHasStarted(false);
              setShowLogin(true);
            }}
            onNotifications={() => {
              setShowProfile(false);
              setShowNotifications(true);
            }}
            onOpenAiAssistant={() => {
              setShowProfile(false);
              setShowAiAssistant(true);
            }}
            onSubPageChange={setIsProfileSubPageOpen}
          />
        </View>
        {!isProfileSubPageOpen && (
          <BottomNav
            activeTab={activeTab}
            onChange={(tab) => {
              setShowProfile(false);
              setGroupNavTarget(null);
              setActiveTab(tab);
            }}
            onScanInvoice={() => {
              setShowProfile(false);
              setScanInvoiceInitialStep('CAMERA');
              setShowScanInvoice(true);
            }}
            onProfile={() => setShowProfile(true)}
            isProfileActive
          />
        )}
        <StatusBar style="dark" />
      </View>
    );
  }

  const screen = {
    home: (
      <HomeScreen
        onViewTransactions={() => setActiveTab('transactions')}
        onAddTransaction={() => setShowAddTransaction(true)}
        onScanInvoice={() => setShowScanInvoice(true)}
        onViewGoals={() => setActiveTab('goals')}
        onViewBudget={() => setActiveTab('budget')}
        onViewDebts={() => setShowDebts(true)}
        onViewReminders={() => setShowReminders(true)}
        onViewAiAssistant={() => setShowAiAssistant(true)}
        onViewAccounts={() => setShowAccounts(true)}
        onViewSpendingAnalysis={() => setShowSpendingAnalysis(true)}
        onViewPeriodicReports={() => setShowPeriodicReports(true)}
        onViewBalanceForecast={() => setShowBalanceForecast(true)}
        onNotifications={() => setShowNotifications(true)}
        onProfile={() => setShowProfile(true)}
      />
    ),
    transactions: (
      <TransactionsScreen
        onBack={() => setActiveTab('home')}
        onAddTransaction={() => setShowAddTransaction(true)}
      />
    ),
    group: (
      <GroupScreen
        onGroupDetailChange={(isOpen) => {
          setIsGroupDetailOpen(isOpen);
        }}
        onConsumeInitialNav={() => {
          setGroupNavTarget(null);
        }}
        initialGroupId={groupNavTarget?.groupId}
        initialGroupName={groupNavTarget?.groupName}
        initialTab={groupNavTarget?.tab}
        initialKidWalletId={groupNavTarget?.kidWalletId}
        initialKidSubTab={groupNavTarget?.kidSubTab}
      />
    ),
    budget: (
      <BudgetScreen
        onBack={() => setActiveTab('home')}
        onNavigateToReports={() => setShowPeriodicReports(true)}
        onNavigateToSettings={() => setShowProfile(true)}
      />
    ),
    goals: <GoalsScreen onBack={() => setActiveTab('home')} />,
  }[activeTab];

  const isDarkStatusBar = (activeTab === 'group') || activeTab === 'budget' || activeTab === 'goals';

  return (
    <View style={styles.container}>
      <View style={styles.content}>{screen}</View>
      {/* Ẩn thanh 5 nút điều hướng đáy khi đang ở ngân sách, mục tiêu hoặc mở chi tiết nhóm */}
      {!(activeTab === 'group' && isGroupDetailOpen) && activeTab !== 'budget' && activeTab !== 'goals' && (
        <BottomNav
          activeTab={activeTab}
          onChange={(tab) => {
            setGroupNavTarget(null);
            setActiveTab(tab);
          }}
          onScanInvoice={() => {
            setScanInvoiceInitialStep('CAMERA');
            setShowScanInvoice(true);
          }}
          onProfile={() => setShowProfile(true)}
        />
      )}
      <StatusBar style={isDarkStatusBar ? 'dark' : 'light'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1 },
});


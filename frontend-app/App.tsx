import { StatusBar } from 'expo-status-bar';
import React from 'react';
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
import { ScanInvoiceScreen } from './src/modules/scan-invoice/screen/ScanInvoiceScreen';
import { SpendingAnalysisScreen } from './src/modules/spending-analysis/screen/SpendingAnalysisScreen';
import { PeriodicReportsScreen } from './src/modules/periodic-reports/screen/PeriodicReportsScreen';
import { BalanceForecastScreen } from './src/modules/balance-forecast/screen/BalanceForecastScreen';
import { NotificationsScreen } from './src/modules/notifications/screen/NotificationsScreen';
import { ProfileScreen } from './src/modules/profile/screen/ProfileScreen';
import { RemindersScreen } from './src/modules/reminders/screen/RemindersScreen';
import { TransactionsScreen } from './src/modules/transactions/screen/TransactionsScreen';
import { GroupScreen } from './src/modules/group/screen/GroupScreen';
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
  const [showReminders, setShowReminders] = React.useState(false);
  const [showAiAssistant, setShowAiAssistant] = React.useState(false);
  const [showAccounts, setShowAccounts] = React.useState(false);
  const [showSpendingAnalysis, setShowSpendingAnalysis] = React.useState(false);
  const [showPeriodicReports, setShowPeriodicReports] = React.useState(false);
  const [showBalanceForecast, setShowBalanceForecast] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);

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
      <View style={{ flex: 1, backgroundColor: '#074838' }}>
        <StatusBar style="light" />
        <AddTransactionScreen
          onBack={() => setShowAddTransaction(false)}
          onSaved={() => {
            setShowAddTransaction(false);
            setActiveTab('transactions');
          }}
          onOpenInvoiceScanner={() => {
            setShowAddTransaction(false);
            setShowScanInvoice(true);
          }}
        />
      </View>
    );
  }

  if (showScanInvoice) {
    return <SafeAreaView style={styles.container}>
      <ScanInvoiceScreen
        onBack={() => setShowScanInvoice(false)}
        onAddTransaction={() => {
          setShowScanInvoice(false);
          setShowAddTransaction(true);
        }}
      />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showReminders) {
    return <SafeAreaView style={styles.container}>
      <RemindersScreen onBack={() => setShowReminders(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
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
      <View style={{ flex: 1, backgroundColor: '#074838' }}>
        <StatusBar style="light" />
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

  if (showSpendingAnalysis) {
    return <SafeAreaView style={styles.container}>
      <SpendingAnalysisScreen onBack={() => setShowSpendingAnalysis(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showPeriodicReports) {
    return <SafeAreaView style={styles.container}>
      <PeriodicReportsScreen onBack={() => setShowPeriodicReports(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showBalanceForecast) {
    return <SafeAreaView style={styles.container}>
      <BalanceForecastScreen onBack={() => setShowBalanceForecast(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showNotifications) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <NotificationsScreen />
        </View>
        <BottomNav
          activeTab={activeTab}
          onChange={(tab) => {
            setShowNotifications(false);
            setActiveTab(tab);
          }}
          onScanInvoice={() => {
            setShowNotifications(false);
            setShowScanInvoice(true);
          }}
          onProfile={() => {
            setShowNotifications(false);
            setShowProfile(true);
          }}
        />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (showProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.content}>
          <ProfileScreen
            onLogout={() => {
              authStorage.clear();
              setShowProfile(false);
              setShowLogin(true);
            }}
            onNotifications={() => {
              setShowProfile(false);
              setShowNotifications(true);
            }}
          />
        </View>
        <BottomNav
          activeTab={activeTab}
          onChange={(tab) => {
            setShowProfile(false);
            setActiveTab(tab);
          }}
          onScanInvoice={() => {
            setShowProfile(false);
            setShowScanInvoice(true);
          }}
          onProfile={() => setShowProfile(true)}
          isProfileActive
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  const [isGroupDetailOpen, setIsGroupDetailOpen] = useState(false);

  const screen = {
    home: (
      <HomeScreen
        onViewTransactions={() => setActiveTab('transactions')}
        onAddTransaction={() => setShowAddTransaction(true)}
        onScanInvoice={() => setShowScanInvoice(true)}
        onViewGoals={() => setActiveTab('goals')}
        onViewBudget={() => setActiveTab('budget')}
        onViewDebts={() => Alert.alert('Sổ nợ & Cho vay', 'Tính năng đang kết nối dữ liệu.')}
        onViewReminders={() => setShowReminders(true)}
        onViewAiAssistant={() => setShowAiAssistant(true)}
        onViewAccounts={() => setShowAccounts(true)}
        onViewSpendingAnalysis={() => setShowSpendingAnalysis(true)}
        onViewPeriodicReports={() => setShowPeriodicReports(true)}
        onViewBalanceForecast={() => setShowBalanceForecast(true)}
        onNotifications={() => setShowNotifications(true)}
      />
    ),
    transactions: (
      <TransactionsScreen
        onBack={() => setActiveTab('home')}
        onAddTransaction={() => setShowAddTransaction(true)}
      />
    ),
    group: <GroupScreen onGroupDetailChange={setIsGroupDetailOpen} />,
    budget: <BudgetScreen />,
    goals: <GoalsScreen onBack={() => setActiveTab('home')} />,
  }[activeTab];

  const isDarkStatusBar = (activeTab === 'group' && isGroupDetailOpen);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{screen}</View>
      {/* Ẩn thanh 5 nút điều hướng đáy khi đang mở chi tiết nhóm để nhường toàn bộ không gian cho giao diện chat/chi tiết */}
      {!(activeTab === 'group' && isGroupDetailOpen) && (
        <BottomNav
          activeTab={activeTab}
          onChange={setActiveTab}
          onScanInvoice={() => setShowScanInvoice(true)}
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


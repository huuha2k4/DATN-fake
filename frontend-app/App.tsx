import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { AddTransactionScreen } from './src/modules/add-transaction/screen/AddTransactionScreen';
import { AccountsScreen } from './src/modules/accounts/screen/AccountsScreen';
import { AiAssistantScreen } from './src/modules/ai-assistant/screen/AiAssistantScreen';
import { BudgetScreen } from './src/modules/budget/screen/BudgetScreen';
import { HomeScreen } from './src/modules/dashboard/screen/HomeScreen';
import { GoalsScreen } from './src/modules/goals/screen/GoalsScreen';
import { SplashScreen } from './src/modules/onboarding/screen/SplashScreen';
import { ScanInvoiceScreen } from './src/modules/scan-invoice/screen/ScanInvoiceScreen';
import { SpendingAnalysisScreen } from './src/modules/spending-analysis/screen/SpendingAnalysisScreen';
import { PeriodicReportsScreen } from './src/modules/periodic-reports/screen/PeriodicReportsScreen';
import { BalanceForecastScreen } from './src/modules/balance-forecast/screen/BalanceForecastScreen';
import { NotificationsScreen } from './src/modules/notifications/screen/NotificationsScreen';
import { ProfileScreen } from './src/modules/profile/screen/ProfileScreen';
import { RemindersScreen } from './src/modules/reminders/screen/RemindersScreen';
import { TransactionsScreen } from './src/modules/transactions/screen/TransactionsScreen';
import { colors } from './src/theme';

export default function App() {
  const [hasStarted, setHasStarted] = React.useState(false);
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

  if (!hasStarted) {
    return <SafeAreaView style={styles.container}>
      <SplashScreen onStart={() => setHasStarted(true)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showAddTransaction) {
    return <SafeAreaView style={styles.container}>
      <AddTransactionScreen
        onBack={() => setShowAddTransaction(false)}
        onSaved={() => {
          setShowAddTransaction(false);
          setActiveTab('transactions');
        }}
      />
      <StatusBar style="dark" />
    </SafeAreaView>;
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
    return <SafeAreaView style={styles.container}>
      <AiAssistantScreen onBack={() => setShowAiAssistant(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showAccounts) {
    return <SafeAreaView style={styles.container}>
      <AccountsScreen onBack={() => setShowAccounts(false)} />
      <StatusBar style="dark" />
    </SafeAreaView>;
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
    return <SafeAreaView style={styles.container}>
      <View style={styles.content}><NotificationsScreen /></View>
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
        onNotifications={() => setShowNotifications(true)}
        onProfile={() => {
          setShowNotifications(false);
          setShowProfile(true);
        }}
        isNotificationsActive
      />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  if (showProfile) {
    return <SafeAreaView style={styles.container}>
      <View style={styles.content}><ProfileScreen /></View>
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
        onNotifications={() => {
          setShowProfile(false);
          setShowNotifications(true);
        }}
        onProfile={() => setShowProfile(true)}
        isProfileActive
      />
      <StatusBar style="dark" />
    </SafeAreaView>;
  }

  const screen = {
    home: <HomeScreen
      onViewTransactions={() => setActiveTab('transactions')}
      onAddTransaction={() => setShowAddTransaction(true)}
      onScanInvoice={() => setShowScanInvoice(true)}
      onViewGoals={() => setActiveTab('goals')}
      onViewReminders={() => setShowReminders(true)}
      onViewAiAssistant={() => setShowAiAssistant(true)}
      onViewAccounts={() => setShowAccounts(true)}
      onViewSpendingAnalysis={() => setShowSpendingAnalysis(true)}
      onViewPeriodicReports={() => setShowPeriodicReports(true)}
      onViewBalanceForecast={() => setShowBalanceForecast(true)}
    />,
    transactions: <TransactionsScreen onBack={() => setActiveTab('home')} onAddTransaction={() => setShowAddTransaction(true)} />,
    budget: <BudgetScreen />,
    goals: <GoalsScreen onBack={() => setActiveTab('home')} />,
  }[activeTab];

  return <SafeAreaView style={styles.container}>
    <View style={styles.content}>{screen}</View>
    <BottomNav activeTab={activeTab} onChange={setActiveTab} onScanInvoice={() => setShowScanInvoice(true)} onNotifications={() => setShowNotifications(true)} onProfile={() => setShowProfile(true)} />
    <StatusBar style="dark" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1 },
});

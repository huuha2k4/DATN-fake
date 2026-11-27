import React, { useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { FloatingChatIcons } from './src/components/FloatingChatIcons';
import { floatingChatEmitter } from './src/components/floatingChatEmitter';
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
import { accountApi } from './src/modules/accounts/api/accountApi';
import { FinoraOnboardingWalkthrough } from './src/modules/onboarding/components/FinoraOnboardingWalkthrough';
import { CompleteProfileModal } from './src/modules/onboarding/components/CompleteProfileModal';
import { Modal } from 'react-native';
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
import { ChildWalletScreen } from './src/modules/child-wallet/screen/ChildWalletScreen';
import { ChildChoresScreen } from './src/modules/child-wallet/screen/ChildChoresScreen';
import { ChildMoneyRequestsScreen } from './src/modules/child-wallet/screen/ChildMoneyRequestsScreen';
import { colors } from './src/theme';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { DialogProvider } from './src/context/DialogContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DialogProvider>
          <AppContent />
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { isDark, colors: themeColors } = useAppTheme();
  const [hasStarted, setHasStarted] = React.useState(false);
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>('home');
  const [showAddTransaction, setShowAddTransaction] = React.useState(false);
  const [showChildWallet, setShowChildWallet] = React.useState(false);
  const [showChildChores, setShowChildChores] = React.useState(false);
  const [showChildRequests, setShowChildRequests] = React.useState(false);
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
  const [openFeedbackInbox, setOpenFeedbackInbox] = React.useState(false);
  const [isProfileSubPageOpen, setIsProfileSubPageOpen] = React.useState(false);
  const [isGroupDetailOpen, setIsGroupDetailOpen] = React.useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = React.useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = React.useState(false);
  const [groupNavTarget, setGroupNavTarget] = React.useState<{
    groupId?: string;
    groupName?: string;
    tab?: 'OVERVIEW' | 'EXPENSES' | 'CHAT' | 'BALANCES' | 'MEMBERS' | 'KIDS' | 'SETTINGS';
    kidWalletId?: string;
    kidSubTab?: 'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS';
  } | null>(null);

  const checkInitialOnboarding = React.useCallback(async (user?: any) => {
    try {
      const curUser = user || authStorage.getUser();
      // Không áp dụng cho tài khoản trẻ em
      if (curUser?.childAccount) return;

      const accounts = await accountApi.getAccounts();
      console.log('[Onboarding] checkInitialOnboarding accounts:', accounts?.length);
      if (!accounts || accounts.length === 0) {
        setShowOnboardingWizard(true);
      }
    } catch (e) {
      console.log('[Onboarding] checkInitialOnboarding error:', e);
    }
  }, []);

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
        // Delay nhẹ để đảm bảo token đã sẵn sàng trong bộ nhớ
        setTimeout(() => {
          checkInitialOnboarding(session.user);
        }, 200);
      }
    });
  }, [checkInitialOnboarding]);

  // Chuẩn hóa nút Back phần cứng Android: quay lại màn hình trước thay vì thoát thẳng app
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showForgotPassword) { setShowForgotPassword(false); return true; }
      if (showRegister) { setShowRegister(false); return true; }
      if (showLogin) { setShowLogin(false); return true; }
      if (showChildWallet) { setShowChildWallet(false); return true; }
      if (showChildChores) { setShowChildChores(false); return true; }
      if (showChildRequests) { setShowChildRequests(false); return true; }
      if (showAddTransaction) { setShowAddTransaction(false); return true; }
      if (showScanInvoice) { setShowScanInvoice(false); return true; }
      if (showReminders) { setShowReminders(false); return true; }
      if (showAiAssistant) { setShowAiAssistant(false); return true; }
      if (showAccounts) { setShowAccounts(false); return true; }
      if (showDebts) { setShowDebts(false); return true; }
      if (showSpendingAnalysis) { setShowSpendingAnalysis(false); return true; }
      if (showPeriodicReports) {
        setShowPeriodicReports(false);
        setPeriodicReportsInitialParams(null);
        return true;
      }
      if (showBalanceForecast) { setShowBalanceForecast(false); return true; }
      if (showNotifications) { setShowNotifications(false); return true; }
      if (showProfile && !isProfileSubPageOpen) { setShowProfile(false); return true; }
      if (hasStarted && activeTab !== 'home' && !isGroupDetailOpen) {
        setActiveTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    hasStarted, activeTab, isGroupDetailOpen, isProfileSubPageOpen,
    showForgotPassword, showRegister, showLogin,
    showChildWallet, showChildChores, showChildRequests,
    showAddTransaction, showScanInvoice, showReminders,
    showAiAssistant, showAccounts, showDebts,
    showSpendingAnalysis, showPeriodicReports, showBalanceForecast,
    showNotifications, showProfile,
  ]);

  if (showRegister) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#ffffff' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RegisterScreen
          onBack={() => setShowRegister(false)}
          onSuccess={(authResult?: any) => {
            setShowRegister(false);
            setHasStarted(true);
            if (authResult?.data?.isNewUser) {
              setShowCompleteProfile(true);
            } else {
              setTimeout(() => {
                checkInitialOnboarding();
              }, 300);
            }
          }}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      </View>
    );
  }

  if (showLogin) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#ffffff' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LoginScreen
          onBack={() => setShowLogin(false)}
          onSuccess={(authResult?: any) => {
            setShowLogin(false);
            setHasStarted(true);
            if (authResult?.data?.isNewUser) {
              setShowCompleteProfile(true);
            } else {
              setTimeout(() => {
                checkInitialOnboarding();
              }, 300);
            }
          }}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      </View>
    );
  }

  if (!hasStarted) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#FAFCFB' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SplashScreen
          onStart={() => setShowRegister(true)}
          onLogin={() => setShowLogin(true)}
        />
      </View>
    );
  }

  if (showChildWallet) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#F8FAFC' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ChildWalletScreen
          onBack={() => setShowChildWallet(false)}
          onAddTransaction={() => {
            setShowChildWallet(false);
            setShowAddTransaction(true);
          }}
          onViewChores={() => {
            setShowChildWallet(false);
            setShowChildChores(true);
          }}
          onViewRequests={() => {
            setShowChildWallet(false);
            setShowChildRequests(true);
          }}
          onViewAllTransactions={() => {
            setShowChildWallet(false);
            setActiveTab('transactions');
          }}
        />
      </View>
    );
  }

  if (showChildChores) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ChildChoresScreen onBack={() => setShowChildChores(false)} />
      </View>
    );
  }

  if (showChildRequests) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ChildMoneyRequestsScreen onBack={() => setShowChildRequests(false)} />
      </View>
    );
  }

  if (showAddTransaction) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#F6F8FA' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (showAiAssistant) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#FAFCFB' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AiAssistantScreen onBack={() => setShowAiAssistant(false)} />
      </View>
    );
  }

  if (showAccounts) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#F6F8FA' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
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
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#FFFFFF' }}>
        <DebtScreen onBack={() => setShowDebts(false)} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (showSpendingAnalysis) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#F7FBF9' }}>
        <SpendingAnalysisScreen onBack={() => setShowSpendingAnalysis(false)} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (showPeriodicReports) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#FFFFFF' }}>
        <PeriodicReportsScreen
          onBack={() => {
            setShowPeriodicReports(false);
            setPeriodicReportsInitialParams(null);
          }}
          initialPresetId={periodicReportsInitialParams?.presetId}
          initialFromDate={periodicReportsInitialParams?.fromDate}
          initialToDate={periodicReportsInitialParams?.toDate}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (showBalanceForecast) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#F7FBF9' }}>
        <BalanceForecastScreen onBack={() => setShowBalanceForecast(false)} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (showNotifications) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <NotificationsScreen
          onBack={() => setShowNotifications(false)}
          onNavigate={(target) => {
            setShowNotifications(false);
            if (target.tab) {
              if (target.tab === 'profile') {
                setShowProfile(true);
              } else {
                setActiveTab(target.tab as TabKey);
              }
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
            } else if (target.action === 'feedback') {
              setOpenFeedbackInbox(true);
              setShowProfile(true);
            } else if (target.action === 'security') {
              setShowProfile(true);
            }
          }}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (showProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : '#FFFFFF' }}>
        <View style={styles.content}>
          <ProfileScreen
            initiallyShowFeedback={openFeedbackInbox}
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
            onSubPageChange={(open) => {
              setIsProfileSubPageOpen(open);
              if (!open) setOpenFeedbackInbox(false);
            }}
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  const screen = {
    home: (
      <HomeScreen
        onViewTransactions={() => {
          floatingChatEmitter.emitClose();
          setActiveTab('transactions');
        }}
        onAddTransaction={() => {
          floatingChatEmitter.emitClose();
          setShowAddTransaction(true);
        }}
        onScanInvoice={() => {
          floatingChatEmitter.emitClose();
          setShowScanInvoice(true);
        }}
        onViewGoals={() => {
          floatingChatEmitter.emitClose();
          setActiveTab('goals');
        }}
        onViewBudget={() => {
          floatingChatEmitter.emitClose();
          setActiveTab('budget');
        }}
        onViewDebts={() => {
          floatingChatEmitter.emitClose();
          setShowDebts(true);
        }}
        onViewReminders={() => {
          floatingChatEmitter.emitClose();
          setShowReminders(true);
        }}
        onViewAiAssistant={() => {
          floatingChatEmitter.emitClose();
          setShowAiAssistant(true);
        }}
        onViewAccounts={() => {
          floatingChatEmitter.emitClose();
          setShowAccounts(true);
        }}
        onViewSpendingAnalysis={() => {
          floatingChatEmitter.emitClose();
          setShowSpendingAnalysis(true);
        }}
        onViewPeriodicReports={() => {
          floatingChatEmitter.emitClose();
          setShowPeriodicReports(true);
        }}
        onViewBalanceForecast={() => {
          floatingChatEmitter.emitClose();
          setShowBalanceForecast(true);
        }}
        onViewChildWallet={() => {
          floatingChatEmitter.emitClose();
          setShowChildWallet(true);
        }}
        onViewChildChores={() => {
          floatingChatEmitter.emitClose();
          setShowChildChores(true);
        }}
        onViewChildRequests={() => {
          floatingChatEmitter.emitClose();
          setShowChildRequests(true);
        }}
        onViewGroupFamily={() => {
          floatingChatEmitter.emitClose();
          const user = authStorage.getUser();
          if (user?.childAccount && user.childWalletGroupId) {
            setGroupNavTarget({
              groupId: user.childWalletGroupId,
              tab: 'CHAT',
            });
          }
          setActiveTab('group');
        }}
        onNotifications={() => {
          floatingChatEmitter.emitClose();
          setShowNotifications(true);
        }}
        onProfile={() => {
          floatingChatEmitter.emitClose();
          setShowProfile(true);
        }}
      />
    ),
    transactions: (
      <TransactionsScreen
        onBack={() => setActiveTab('home')}
        onAddTransaction={() => {
          floatingChatEmitter.emitClose();
          setShowAddTransaction(true);
        }}
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
        onNavigateToReports={() => {
          floatingChatEmitter.emitClose();
          setShowPeriodicReports(true);
        }}
        onNavigateToSettings={() => {
          floatingChatEmitter.emitClose();
          setShowProfile(true);
        }}
      />
    ),
    goals: <GoalsScreen onBack={() => setActiveTab('home')} />,
  }[activeTab];

  const isDarkStatusBar = isDark ? false : ((activeTab === 'group') || activeTab === 'budget' || activeTab === 'goals');

  const user = authStorage.getUser();
  const isChildAccount = Boolean(user?.childAccount && user?.childWalletGroupId);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>{screen}</View>
      {/* Ẩn thanh 5 nút điều hướng đáy khi đang ở ngân sách, mục tiêu hoặc mở chi tiết nhóm (đối với tài khoản bé thì luôn giữ 5 nút dưới cùng) */}
      {(isChildAccount || (!(activeTab === 'group' && isGroupDetailOpen) && activeTab !== 'budget' && activeTab !== 'goals')) && (
        <BottomNav
          activeTab={activeTab}
          onChange={(tab) => {
            floatingChatEmitter.emitClose();
            const curUser = authStorage.getUser();
            if (tab === 'group' && curUser?.childAccount && curUser.childWalletGroupId) {
              setGroupNavTarget({
                groupId: curUser.childWalletGroupId,
                tab: 'CHAT',
              });
            } else {
              setGroupNavTarget(null);
            }
            setActiveTab(tab);
          }}
          onScanInvoice={() => {
            floatingChatEmitter.emitClose();
            setScanInvoiceInitialStep('CAMERA');
            setShowScanInvoice(true);
          }}
          onProfile={() => {
            floatingChatEmitter.emitClose();
            setShowProfile(true);
          }}
        />
      )}

      {/* 2 Icon tròn nổi ở góc dưới: Chat Nhóm (trên) & Chat AI FinAI (dưới) */}
      <FloatingChatIcons
        visible={!showOnboardingWizard && !(activeTab === 'group' && isGroupDetailOpen)}
        onOpenAiChat={() => setShowAiAssistant(true)}
        onOpenGroupChat={(groupId, groupName) => {
          setGroupNavTarget({
            groupId,
            groupName,
            tab: 'CHAT',
          });
          setActiveTab('group');
        }}
      />

      {/* Modal Hoàn thiện hồ sơ khi đăng ký mới bằng Google */}
      <Modal
        visible={showCompleteProfile}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {}}
      >
        <CompleteProfileModal
          visible={showCompleteProfile}
          onSuccess={() => {
            setShowCompleteProfile(false);
            setTimeout(() => {
              checkInitialOnboarding();
            }, 300);
          }}
          onSkip={() => {
            setShowCompleteProfile(false);
            setTimeout(() => {
              checkInitialOnboarding();
            }, 300);
          }}
        />
      </Modal>

      {/* Onboarding Walkthrough 7 màn hình sóng chuẩn Finora */}
      <Modal
        visible={showOnboardingWizard}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {}}
      >
        <FinoraOnboardingWalkthrough
          userName={authStorage.getUser()?.fullName}
          onComplete={() => {
            setShowOnboardingWizard(false);
          }}
        />
      </Modal>
      <StatusBar style={isDarkStatusBar ? 'dark' : 'light'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1 },
});


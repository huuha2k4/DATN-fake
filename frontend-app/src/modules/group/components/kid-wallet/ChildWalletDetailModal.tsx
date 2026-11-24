import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FinanceIcon, resolveCategoryIconName } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import { ChildWalletResponse, GroupMemberResponse, groupApi } from '../../api/groupApi';
import { AccountItem } from '../../../add-transaction/api/transactionApi';
import { AccountBadge } from '../../../accounts/components/AccountBadge';
import {
  OFFICIAL_KID_AVATARS,
  resolveKidAvatarSource,
  BOY_AVATAR_IMAGE,
  GIRL_AVATAR_IMAGE,
} from './kidAvatarPresets';
import { CHORE_ICONS, resolveChoreIconSource } from '../../../child-wallet/components/choreIcons';
import { useAppTheme } from '../../../../context/ThemeContext';
import { useAppDialog } from '../../../../context/DialogContext';
import { Alert } from 'react-native';

export interface ChildWalletDetailModalProps {
  visible: boolean;
  wallet: ChildWalletResponse | null;
  groupId: string;
  isOwnerOrAdmin: boolean;
  accounts: AccountItem[];
  fundBalance?: number;
  initialTab?: 'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS';
  members?: GroupMemberResponse[];
  onClose: () => void;
  onRefreshWallet: () => void;
}

function formatVND(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
}

const KID_BOY_IMG = require('../../../../assets/icons/groups/kid_avatar_boy.png');

export const ChildWalletDetailModal: React.FC<ChildWalletDetailModalProps> = ({
  visible,
  wallet,
  groupId,
  isOwnerOrAdmin,
  accounts,
  fundBalance = 0,
  initialTab,
  members = [],
  onClose,
  onRefreshWallet,
}) => {
  const { isDark, colors: themeColors } = useAppTheme();
  const { confirmDelete, showSuccess, showError } = useAppDialog();
  // Phân biệt chế độ ví:
  // - Bố mẹ tự quản lý (MODE_1): wallet.userId / childUsername không có -> KHÔNG có chức năng Yêu cầu xin tiền và Nhiệm vụ
  // - Bé có tài khoản riêng (MODE_2): có userId hoặc childUsername -> Đầy đủ tính năng
  const isParentManagedOnly = !wallet?.userId && !wallet?.childUsername;

  // 5 Tabs:
  // 1. REQUESTS: Yêu cầu xin tiền (PENDING / [MONEY_REQUEST]) - Chỉ cho tài khoản riêng của bé
  // 2. SPENDS: Lịch sử thu & chi (Nạp tiền, Thưởng nhiệm vụ, Đã chi tiêu)
  // 3. CHORES: Nhiệm vụ việc nhà kiếm tiền thưởng - Chỉ cho tài khoản riêng của bé
  // 4. DEPOSIT: Nạp tiền vào ví
  // 5. SETTINGS: Cài đặt ví (Sửa thông tin hoặc Xóa ví)
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS'>(initialTab || 'SPENDS');

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Form Cài đặt ví (Chỉnh sửa hạn mức, tên, allowance, avatar)
  const [editName, setEditName] = useState('');
  const [editAvatarKey, setEditAvatarKey] = useState<string | null>(null);
  const [uploadingEditAvatar, setUploadingEditAvatar] = useState(false);
  const [editAllowance, setEditAllowance] = useState('');
  const [editDailyLimit, setEditDailyLimit] = useState('');
  const [editWeeklyLimit, setEditWeeklyLimit] = useState('');
  const [editRequireApprovalAbove, setEditRequireApprovalAbove] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeletingWallet, setIsDeletingWallet] = useState(false);

  // Modal Đặt lại mật khẩu cho tài khoản bé (Kids Mode)
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [newKidPassword, setNewKidPassword] = useState('');
  const [isSubmittingResetPass, setIsSubmittingResetPass] = useState(false);
  const [resetPassSuccessMsg, setResetPassSuccessMsg] = useState('');
  const [resetPassErrorMsg, setResetPassErrorMsg] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Dữ liệu Spend Requests & Spends
  const [spendRequests, setSpendRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Dữ liệu Nhiệm vụ việc nhà (Chores)
  const [chores, setChores] = useState<any[]>([]);
  const [loadingChores, setLoadingChores] = useState(false);

  // State Modal Duyệt cấp tiền (chọn nguồn: Ví cá nhân hoặc Quỹ nhóm)
  const [approvingReq, setApprovingReq] = useState<any | null>(null);
  const [approvalSource, setApprovalSource] = useState<'PERSONAL_ACCOUNT' | 'GROUP_FUND'>('PERSONAL_ACCOUNT');
  const [approvalSourceAccountId, setApprovalSourceAccountId] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // State Modal Từ chối yêu cầu (kèm lý do)
  const [rejectingReq, setRejectingReq] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // State Giao nhiệm vụ mới (Create Chore)
  const [isCreateChoreOpen, setIsCreateChoreOpen] = useState(false);
  const [choreTitle, setChoreTitle] = useState('');
  const [choreDesc, setChoreDesc] = useState('');
  const [choreReward, setChoreReward] = useState('');
  const [choreSelectedIcon, setChoreSelectedIcon] = useState<string | null>(null);
  const [isSubmittingChore, setIsSubmittingChore] = useState(false);

  // State Ghi chi tiêu cho bé (Create Direct Spend - chuẩn bản Web)
  const [isCreateSpendOpen, setIsCreateSpendOpen] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendDesc, setSpendDesc] = useState('');
  const [isSubmittingSpend, setIsSubmittingSpend] = useState(false);

  // Form nạp tiền vào ví cho con (mặc định Quỹ chung nhóm ở trước)
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositSource, setDepositSource] = useState<'GROUP_FUND' | 'PERSONAL_ACCOUNT'>('GROUP_FUND');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showAccountPickerModal, setShowAccountPickerModal] = useState(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  useEffect(() => {
    if (visible && wallet && groupId) {
      if (!isParentManagedOnly) {
        loadRequests();
        loadChores();
        setActiveTab('REQUESTS');
      } else {
        loadRequests(); // Vẫn load để lấy lịch sử spends (đã lọc)
        setActiveTab('SPENDS');
      }
      // Khởi tạo giá trị form cài đặt theo thông tin ví hiện tại
      setEditName(wallet.childName || '');
      const linkedMem = (members || []).find((m) => (wallet.userId && m.userId === wallet.userId) || (m.user?.id && m.user.id === wallet.userId));
      const initAvatar = linkedMem?.user?.avatarUrl || linkedMem?.user?.avatarKey || wallet.avatarKey || (wallet as any).avatarUrl || null;
      setEditAvatarKey(initAvatar);
      setEditAllowance(wallet.weeklyAllowance ? formatVND(wallet.weeklyAllowance) : '');
      setEditDailyLimit(wallet.dailySpendingLimit ? formatVND(wallet.dailySpendingLimit) : '');
      setEditWeeklyLimit(wallet.monthlySpendingLimit ? formatVND(wallet.monthlySpendingLimit) : '');
      setEditRequireApprovalAbove(wallet.requireApprovalAbove ? formatVND(wallet.requireApprovalAbove) : '');
      setEditNotes(wallet.notes || '');
      setSaveSuccessMsg('');
    }
  }, [visible, wallet?.id, groupId, isParentManagedOnly, members]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
      setApprovalSourceAccountId(accounts[0].id);
    }
  }, [accounts]);

  const loadRequests = async () => {
    if (!wallet) return;
    setLoadingRequests(true);
    try {
      const res = await groupApi.getSpendRequests(groupId, wallet.id);
      setSpendRequests(res || []);
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadChores = async () => {
    if (!wallet) return;
    setLoadingChores(true);
    try {
      const res = await groupApi.getChores(groupId, wallet.id);
      setChores(res || []);
    } catch {
      // ignore
    } finally {
      setLoadingChores(false);
    }
  };

  // Xác nhận Duyệt yêu cầu xin tiền (chuẩn web: trừ quỹ hoặc ví cá nhân)
  const handleConfirmApprove = async () => {
    if (!approvingReq) return;
    setIsSubmittingApproval(true);
    try {
      await groupApi.approveSpendRequest(groupId, wallet!.id, approvingReq.id, 'Đồng ý cấp tiền');
      Alert.alert('Thành công 🎉', `Đã duyệt cấp ${formatVND(approvingReq.amount)} đ cho bé ${wallet?.childName}!`);
      setApprovingReq(null);
      await loadRequests();
      onRefreshWallet();
    } catch (err: any) {
      Alert.alert('Lỗi duyệt cấp', err?.message || 'Không thể duyệt yêu cầu');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Xác nhận Từ chối yêu cầu xin tiền
  const handleConfirmReject = async () => {
    if (!rejectingReq) return;
    setIsSubmittingRejection(true);
    try {
      await groupApi.rejectSpendRequest(
        groupId,
        wallet!.id,
        rejectingReq.id,
        rejectionReason.trim() || 'Chưa phù hợp'
      );
      Alert.alert('Đã từ chối', 'Đã gửi phản hồi từ chối đến bé.');
      setRejectingReq(null);
      setRejectionReason('');
      await loadRequests();
      onRefreshWallet();
    } catch (err: any) {
      Alert.alert('Lỗi từ chối', err?.message || 'Không thể từ chối yêu cầu');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Giao nhiệm vụ mới cho bé
  const handleCreateChoreSubmit = async () => {
    const rawVal = Number(choreReward.replace(/\D/g, ''));
    if (!choreTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên nhiệm vụ cho bé!');
      return;
    }
    if (!rawVal || rawVal <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiền thưởng hợp lệ!');
      return;
    }

    setIsSubmittingChore(true);
    try {
      await groupApi.createChore(groupId, wallet!.id, {
        title: choreTitle.trim(),
        description: choreDesc.trim() || undefined,
        rewardAmount: rawVal,
        icon: choreSelectedIcon || undefined,
      });
      Alert.alert('Thành công ⭐', `Đã giao nhiệm vụ "${choreTitle}" cho bé!`);
      setChoreTitle('');
      setChoreDesc('');
      setChoreReward('');
      setChoreSelectedIcon(null);
      setIsCreateChoreOpen(false);
      await loadChores();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo nhiệm vụ');
    } finally {
      setIsSubmittingChore(false);
    }
  };

  // Ghi khoản chi tiêu trực tiếp cho ví của bé (chuẩn bản Web)
  const handleCreateSpendSubmit = async () => {
    const rawVal = Number(spendAmount.replace(/\D/g, ''));
    if (!rawVal || rawVal <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền chi tiêu hợp lệ!');
      return;
    }
    if (!spendDesc.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung chi tiêu của bé!');
      return;
    }

    if (rawVal > (wallet?.balance || 0)) {
      Alert.alert('Thông báo', 'Số dư ví của bé không đủ để ghi khoản chi này!');
      return;
    }

    setIsSubmittingSpend(true);
    try {
      await groupApi.createDirectChildSpend(groupId, wallet!.id, {
        amount: rawVal,
        description: spendDesc.trim(),
      });
      Alert.alert('Thành công 🎉', `Đã ghi nhận khoản chi ${formatVND(rawVal)} đ vào ví của bé!`);
      setSpendAmount('');
      setSpendDesc('');
      setIsCreateSpendOpen(false);
      onRefreshWallet();
      await loadRequests();
    } catch (err: any) {
      Alert.alert('Lỗi ghi chi tiêu', err?.message || 'Không thể ghi nhận khoản chi');
    } finally {
      setIsSubmittingSpend(false);
    }
  };

  // Nạp tiền vào ví cho con (từ Quỹ nhóm hoặc Ví cá nhân)
  const handleDepositSubmit = async () => {
    const rawVal = Number(depositAmount.replace(/\D/g, ''));
    if (!rawVal || rawVal <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hợp lệ để nạp cho bé!');
      return;
    }

    if (depositSource === 'PERSONAL_ACCOUNT' && !selectedAccountId) {
      Alert.alert('Thông báo', 'Vui lòng chọn ví cá nhân để trích tiền!');
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      await groupApi.depositToChildWallet(groupId, wallet!.id, {
        amount: rawVal,
        source: depositSource,
        sourceAccountId: depositSource === 'PERSONAL_ACCOUNT' ? selectedAccountId : undefined,
        description: depositNotes.trim() || 'Nạp tiền tiêu vặt cho con',
      });
      const sourceName = depositSource === 'GROUP_FUND' ? 'Quỹ chung nhóm' : 'Ví cá nhân';
      Alert.alert('Thành công 🎉', `Đã nạp ${formatVND(rawVal)} đ từ ${sourceName} vào ví của bé ${wallet?.childName}!`);
      setDepositAmount('');
      setDepositNotes('');
      setActiveTab('SPENDS');
      onRefreshWallet();
      await loadRequests();
    } catch (err: any) {
      Alert.alert('Lỗi nạp tiền', err?.message || 'Không thể nạp tiền vào ví của bé');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // Chọn ảnh avatar mới từ máy trong Cài đặt ví
  const handlePickEditAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để đổi avatar cho bé.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingEditAvatar(true);

        const fileName = asset.fileName || `kid_avatar_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        const avatarUrl = await groupApi.uploadChildWalletAvatar(groupId, {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });

        if (avatarUrl) {
          setEditAvatarKey(avatarUrl);
        } else {
          Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên máy chủ.');
        }
      }
    } catch (err: any) {
      console.warn('Lỗi chọn ảnh avatar ví bé:', err);
      Alert.alert('Lỗi chọn ảnh', err?.message || 'Không thể chọn ảnh từ máy.');
    } finally {
      setUploadingEditAvatar(false);
    }
  };

  // Cập nhật thông tin cài đặt ví
  const handleUpdateWalletSubmit = async () => {
    if (!editName.trim()) {
      Alert.alert('Thông báo', 'Tên bé không được để trống!');
      return;
    }

    const allowanceVal = Number(editAllowance.replace(/\D/g, ''));

    setIsSubmittingEdit(true);
    setSaveSuccessMsg('');
    try {
      const updated = await groupApi.updateChildWallet(groupId, wallet!.id, {
        childName: editName.trim(),
        avatarKey: editAvatarKey || undefined,
        weeklyAllowance: allowanceVal >= 0 ? allowanceVal : undefined,
      });
      if (updated?.avatarKey) {
        setEditAvatarKey(updated.avatarKey);
      }
      setSaveSuccessMsg('✓ Đã cập nhật cài đặt ví thành công!');
      setTimeout(() => {
        setSaveSuccessMsg('');
      }, 3000);
      onRefreshWallet();
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật', err?.message || 'Không thể lưu cài đặt ví');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Xóa ví trẻ em
  const handleDeleteWallet = async () => {
    Alert.alert(
      'Xóa ví của bé',
      `Bạn có chắc chắn muốn xóa ví của bé ${wallet?.childName}? Toàn bộ lịch sử chi tiêu và số dư sẽ bị gỡ khỏi nhóm.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ví',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingWallet(true);
            try {
              await groupApi.deleteChildWallet(groupId, wallet!.id);
              onClose();
              onRefreshWallet();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xóa ví của bé');
            } finally {
              setIsDeletingWallet(false);
            }
          },
        },
      ]
    );
  };

  // Đặt lại mật khẩu tài khoản của bé
  const handleResetPasswordSubmit = async () => {
    setResetPassErrorMsg('');
    setResetPassSuccessMsg('');
    if (!newKidPassword || newKidPassword.length < 6) {
      setResetPassErrorMsg('Mật khẩu mới của con phải có ít nhất 6 ký tự');
      return;
    }
    setIsSubmittingResetPass(true);
    try {
      await groupApi.resetChildPassword(groupId, wallet!.id, newKidPassword);
      setResetPassSuccessMsg('✓ Đã đổi mật khẩu thành công! Bé có thể đăng nhập bằng mật khẩu mới ngay.');
      setNewKidPassword('');
      setTimeout(() => {
        setResetPassSuccessMsg('');
        setIsResetPassModalOpen(false);
      }, 1800);
    } catch (err: any) {
      setResetPassErrorMsg(err?.message || 'Không thể đặt lại mật khẩu cho con');
    } finally {
      setIsSubmittingResetPass(false);
    }
  };

  if (!wallet) return null;

  const linkedMember = members.find((m) => (wallet.userId && m.userId === wallet.userId) || (m.user?.id && m.user.id === wallet.userId));
  const effectiveAvatarKey = wallet.avatarKey || (wallet as any).avatarUrl || linkedMember?.user?.avatarUrl || linkedMember?.user?.avatarKey;
  const isGirl = effectiveAvatarKey === 'kid_girl' || effectiveAvatarKey?.includes('girl');
  const headerAvatarSource = resolveKidAvatarSource(effectiveAvatarKey, isGirl);

  // Lọc chuẩn bản Web
  const requestsList = spendRequests.filter(
    (r) => r.description?.startsWith('[MONEY_REQUEST] ') || r.status === 'PENDING'
  );
  const pendingCount = spendRequests.filter((r) => r.status === 'PENDING').length;

  const spendsList = spendRequests.filter(
    (r) => !r.description?.startsWith('[MONEY_REQUEST] ') && r.status !== 'PENDING'
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={[styles.sheetContainer, isDark && { backgroundColor: themeColors.surface }]}>
          {/* Thanh kéo / Drag handle */}
          <View style={[styles.dragHandle, isDark && { backgroundColor: themeColors.cardBorder }]} />

          {/* Header Modal chuẩn bản Web */}
          <View
            style={[
              styles.modalHeader,
              isDark && {
                backgroundColor: themeColors.headerBackground,
                borderBottomColor: themeColors.divider,
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.avatarWrap,
                  isGirl
                    ? { backgroundColor: '#FDF2F8', borderColor: '#FBCFE8' }
                    : { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                ]}
              >
                <Image source={headerAvatarSource} style={styles.avatarImg} resizeMode="cover" />
              </View>
              <View style={styles.headerNameCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.headerTopLabel, isDark && { color: themeColors.accentGreen }]}>Ví của bé</Text>
                  {isParentManagedOnly && (
                    <View
                      style={[
                        styles.parentManagedPill,
                        isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                      ]}
                    >
                      <Text style={[styles.parentManagedPillText, isDark && { color: themeColors.textSecondary }]}>Bố mẹ quản</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.headerChildName, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {wallet.childName}
                </Text>
                <Text style={[styles.headerSubtitle, isDark && { color: themeColors.textSecondary }]}>
                  Số dư: <Text style={[styles.headerBalanceBold, isDark && { color: themeColors.accentGreen }]}>{formatVND(wallet.balance)} đ</Text>
                </Text>
              </View>
            </View>

            {/* Cụm Nút bên phải: Nút Nạp tiền luôn đặt cạnh nút Đóng */}
            <View style={styles.headerRightActions}>
              <Pressable
                onPress={() => setActiveTab('DEPOSIT')}
                style={({ pressed }) => [
                  styles.headerDepositBtn,
                  isDark && { backgroundColor: themeColors.accentGreen },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <FinanceIcon name="plus" size={12} color="#FFFFFF" />
                <Text style={styles.headerDepositBtnText}>Nạp tiền</Text>
              </Pressable>

              <Pressable
                hitSlop={10}
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  isDark && { backgroundColor: themeColors.surfaceSubtle },
                ]}
              >
                <FinanceIcon name="close" size={16} color={isDark ? themeColors.textSecondary : '#64748B'} />
              </Pressable>
            </View>
          </View>

          {/* Sub Navigation Tabs */}
          <View
            style={[
              styles.tabBar,
              isDark && {
                backgroundColor: themeColors.surface,
                borderBottomColor: themeColors.divider,
              },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollWrap}>
              {/* TAB 1: YÊU CẦU XIN TIỀN - Chỉ hiển thị khi bé có tài khoản riêng */}
              {!isParentManagedOnly && (
                <Pressable
                  onPress={() => setActiveTab('REQUESTS')}
                  style={[
                    styles.tabItem,
                    activeTab === 'REQUESTS' && [
                      styles.tabItemActive,
                      isDark && { borderBottomColor: themeColors.accentGreen },
                    ],
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text
                      style={[
                        styles.tabLabel,
                        isDark && { color: themeColors.textSecondary },
                        activeTab === 'REQUESTS' && [styles.tabLabelActive, isDark && { color: themeColors.accentGreen }],
                      ]}
                    >
                      Yêu cầu xin tiền
                    </Text>
                    {pendingCount > 0 && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{pendingCount}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={() => setActiveTab('SPENDS')}
                style={[
                  styles.tabItem,
                  activeTab === 'SPENDS' && [
                    styles.tabItemActive,
                    isDark && { borderBottomColor: themeColors.accentGreen },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isDark && { color: themeColors.textSecondary },
                    activeTab === 'SPENDS' && [styles.tabLabelActive, isDark && { color: themeColors.accentGreen }],
                  ]}
                >
                  Lịch sử thu & chi ({spendsList.length})
                </Text>
              </Pressable>

              {/* TAB 3: NHIỆM VỤ - Chỉ hiển thị khi bé có tài khoản riêng để nhận nhiệm vụ */}
              {!isParentManagedOnly && (
                <Pressable
                  onPress={() => setActiveTab('CHORES')}
                  style={[
                    styles.tabItem,
                    activeTab === 'CHORES' && [
                      styles.tabItemActive,
                      isDark && { borderBottomColor: themeColors.accentGreen },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      isDark && { color: themeColors.textSecondary },
                      activeTab === 'CHORES' && [styles.tabLabelActive, isDark && { color: themeColors.accentGreen }],
                    ]}
                  >
                    Nhiệm vụ ⭐
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => setActiveTab('DEPOSIT')}
                style={[
                  styles.tabItem,
                  activeTab === 'DEPOSIT' && [
                    styles.tabItemActive,
                    isDark && { borderBottomColor: themeColors.accentGreen },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isDark && { color: themeColors.textSecondary },
                    activeTab === 'DEPOSIT' && [styles.tabLabelActive, isDark && { color: themeColors.accentGreen }],
                  ]}
                >
                  + Nạp tiền
                </Text>
              </Pressable>

              {/* TAB 5: CÀI ĐẶT VÍ (SỬA & XÓA) */}
              {isOwnerOrAdmin && (
                <Pressable
                  onPress={() => setActiveTab('SETTINGS')}
                  style={[
                    styles.tabItem,
                    activeTab === 'SETTINGS' && [
                      styles.tabItemActive,
                      isDark && { borderBottomColor: themeColors.accentGreen },
                    ],
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FinanceIcon
                      name="settings"
                      size={13}
                      color={
                        activeTab === 'SETTINGS'
                          ? (isDark ? themeColors.accentGreen : '#059669')
                          : (isDark ? themeColors.textMuted : '#64748B')
                      }
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        isDark && { color: themeColors.textSecondary },
                        activeTab === 'SETTINGS' && [styles.tabLabelActive, isDark && { color: themeColors.accentGreen }],
                      ]}
                    >
                      Cài đặt
                    </Text>
                  </View>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <ScrollView
            style={[styles.bodyScroll, isDark && { backgroundColor: themeColors.background }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* TAB 1: YÊU CẦU XIN TIỀN (CHUẨN WEB) */}
            {activeTab === 'REQUESTS' && (
              <View style={styles.tabContentWrap}>
                {loadingRequests ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.loadingText}>Đang tải danh sách yêu cầu...</Text>
                  </View>
                ) : requestsList.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <FinanceIcon name="spark" size={32} color={isDark ? themeColors.textMuted : '#94A3B8'} />
                    <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>
                      Chưa có yêu cầu xin tiền nào từ bé
                    </Text>
                    <Text style={[styles.emptySub, isDark && { color: themeColors.textSecondary }]}>
                      Khi bé gửi yêu cầu xin cấp thêm tiền hoặc mua đồ dùng, danh sách sẽ hiển thị tại đây để bố mẹ duyệt.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemList}>
                    {requestsList.map((req) => {
                      const isPending = req.status === 'PENDING';
                      const isApproved = req.status === 'APPROVED';
                      const isRejected = req.status === 'REJECTED';
                      const cleanDesc = req.description?.replace(/^\[MONEY_REQUEST\]\s*/, '') || 'Xin tiền chi tiêu';
                      const reqIcon = resolveCategoryIconName(req.categoryIcon || req.category?.icon, 'EXPENSE', `${req.categoryName || req.category?.name || ''} ${cleanDesc}`);

                      return (
                        <View
                          key={req.id}
                          style={[
                            styles.itemCard,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          <View style={styles.itemRowTop}>
                            <View style={styles.itemLeftGroup}>
                              <View
                                style={[
                                  styles.iconCircle,
                                  { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' },
                                ]}
                              >
                                <FinanceIcon name={reqIcon || 'wallet'} size={20} color={isDark ? '#FBBF24' : '#D97706'} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={[styles.amountText, isDark && { color: themeColors.textPrimary }]}>
                                    {formatVND(req.amount)} đ
                                  </Text>
                                  <View
                                    style={[
                                      styles.badgeStatus,
                                      isPending && styles.badgePending,
                                      isApproved && styles.badgeApproved,
                                      isRejected && styles.badgeRejected,
                                      isDark && isPending && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                                      isDark && isApproved && { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
                                      isDark && isRejected && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.badgeStatusText,
                                        isPending && { color: isDark ? '#FBBF24' : '#B45309' },
                                        isApproved && { color: isDark ? themeColors.accentGreen : '#15803D' },
                                        isRejected && { color: isDark ? '#F87171' : '#DC2626' },
                                      ]}
                                    >
                                      {isPending ? 'Chờ bố mẹ duyệt' : isApproved ? 'Đã duyệt' : 'Từ chối'}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.cleanDescText, isDark && { color: themeColors.textPrimary }]}>{cleanDesc}</Text>
                                {req.rejectionReason && (
                                  <Text style={[styles.rejectReasonText, isDark && { color: '#F87171' }]}>
                                    Lý do từ chối: {req.rejectionReason}
                                  </Text>
                                )}
                                <Text style={[styles.itemDateText, isDark && { color: themeColors.textSecondary }]}>
                                  {req.createdAt
                                    ? new Date(req.createdAt).toLocaleString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })
                                    : 'Vừa xong'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Action Buttons nếu đang Chờ duyệt (Pending) */}
                          {isPending && isOwnerOrAdmin && (
                            <View style={styles.actionBtnRow}>
                              <Pressable
                                onPress={() => {
                                  setRejectingReq(req);
                                  setRejectionReason('');
                                }}
                                style={({ pressed }) => [styles.btnRejectOutline, pressed && { opacity: 0.8 }]}
                              >
                                <Text style={styles.btnRejectOutlineText}>Từ chối</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => setApprovingReq(req)}
                                style={({ pressed }) => [styles.btnApproveSolid, pressed && { opacity: 0.8 }]}
                              >
                                <FinanceIcon name="check" size={14} color="#FFFFFF" />
                                <Text style={styles.btnApproveSolidText}>Duyệt cấp tiền</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: LỊCH SỬ THU & CHI (CHUẨN WEB) */}
            {activeTab === 'SPENDS' && (
              <View style={styles.tabContentWrap}>
                {/* Nút Ghi khoản chi tiêu (chuẩn bản Web) */}
                <Pressable
                  onPress={() => setIsCreateSpendOpen(true)}
                  style={({ pressed }) => [
                    styles.btnCreateSpendBar,
                    isDark && { backgroundColor: themeColors.accentGreen },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <FinanceIcon name="minus" size={15} color="#FFFFFF" />
                  <Text style={styles.btnCreateSpendText}>Ghi khoản chi cho ví của bé</Text>
                </Pressable>

                {spendsList.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <FinanceIcon name="receipt" size={32} color={isDark ? themeColors.textMuted : '#94A3B8'} />
                    <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>
                      Chưa có lịch sử thu chi nào của bé
                    </Text>
                    <Text style={[styles.emptySub, isDark && { color: themeColors.textSecondary }]}>
                      Các khoản nạp tiền, thưởng nhiệm vụ hoặc chi tiêu của bé sẽ được ghi nhận chi tiết tại đây.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemList}>
                    {spendsList.map((req) => {
                      const isDeposit = req.description?.startsWith('[INCOME_DEPOSIT] ');
                      const isChoreReward = req.description?.startsWith('[INCOME_CHORE] ');
                      const isIncome = isDeposit || isChoreReward;

                      const cleanDesc = req.description
                        ?.replace(/^\[MONEY_REQUEST\]\s*/, '')
                        ?.replace(/^\[INCOME_DEPOSIT\]\s*/, '')
                        ?.replace(/^\[INCOME_CHORE\]\s*/, '') || '';

                      // Xác định icon chuẩn theo danh mục chi tiêu / nguồn thu
                      const iconName = isDeposit
                        ? 'wallet'
                        : isChoreReward
                        ? 'star'
                        : resolveCategoryIconName(req.categoryIcon || req.category?.icon, 'EXPENSE', `${req.categoryName || req.category?.name || ''} ${cleanDesc}`);

                      return (
                        <View
                          key={req.id}
                          style={[
                            styles.itemCard,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          <View style={styles.itemRowTop}>
                            <View
                              style={[
                                styles.iconCircle,
                                isIncome
                                  ? { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7' }
                                  : { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FFE4E6' },
                              ]}
                            >
                              {isChoreReward ? (
                                <Text style={{ fontSize: 18 }}>⭐</Text>
                              ) : isDeposit ? (
                                <Text style={{ fontSize: 18 }}>💰</Text>
                              ) : (
                                <FinanceIcon name={iconName} size={20} color={isDark ? '#F87171' : '#E11D48'} />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text
                                  style={[
                                    styles.amountText,
                                    isIncome
                                      ? { color: isDark ? themeColors.accentGreen : '#16A34A' }
                                      : { color: isDark ? '#F87171' : '#E11D48' },
                                  ]}
                                >
                                  {isIncome ? '+' : '-'}{formatVND(req.amount)} đ
                                </Text>
                                <View
                                  style={[
                                    styles.badgeStatus,
                                    isIncome ? styles.badgeApproved : styles.badgeExpense,
                                    isDark && (isIncome ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : { backgroundColor: 'rgba(239, 68, 68, 0.15)' }),
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeStatusText,
                                      isIncome
                                        ? { color: isDark ? themeColors.accentGreen : '#15803D' }
                                        : { color: isDark ? '#F87171' : '#BE123C' },
                                    ]}
                                  >
                                    {isDeposit ? 'Nạp tiền vào ví' : isChoreReward ? 'Thưởng việc nhà' : 'Đã chi tiêu'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={[styles.cleanDescText, isDark && { color: themeColors.textPrimary }]}>{cleanDesc}</Text>

                              {req.respondedByUserName && isIncome && (
                                <Text style={[styles.byUserTag, isDark && { color: themeColors.accentGreen }]}>
                                  ✓ Người duyệt: {req.respondedByUserName}
                                </Text>
                              )}

                              <Text style={[styles.itemDateText, isDark && { color: themeColors.textSecondary }]}>
                                {req.createdAt
                                  ? new Date(req.createdAt).toLocaleString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })
                                  : 'Gần đây'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* TAB 3: NHIỆM VỤ VIỆC NHÀ (CHORES) */}
            {activeTab === 'CHORES' && (
              <View style={styles.tabContentWrap}>
                {/* Header Action Giao việc */}
                {isOwnerOrAdmin && (
                  <Pressable
                    onPress={() => setIsCreateChoreOpen(true)}
                    style={({ pressed }) => [
                      styles.btnCreateChoreBar,
                      isDark && { backgroundColor: themeColors.accentGreen },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <FinanceIcon name="plus" size={16} color="#FFFFFF" />
                    <Text style={styles.btnCreateChoreText}>Giao nhiệm vụ mới cho bé</Text>
                  </Pressable>
                )}

                {loadingChores ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={isDark ? themeColors.accentGreen : '#D97706'} />
                    <Text style={[styles.loadingText, isDark && { color: themeColors.textSecondary }]}>Đang tải nhiệm vụ...</Text>
                  </View>
                ) : chores.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 32 }}>⭐</Text>
                    <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>Chưa có nhiệm vụ nào được giao</Text>
                    <Text style={[styles.emptySub, isDark && { color: themeColors.textSecondary }]}>
                      Giao việc nhà (rửa bát, quét nhà, đạt điểm 10,...) kèm tiền thưởng để giúp bé rèn luyện tính tự lập và chăm chỉ!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemList}>
                    {chores.map((chore) => {
                      const isCompleted = chore.status === 'COMPLETED' || chore.status === 'APPROVED';
                      const iconSource = resolveChoreIconSource(chore.icon, chore.id || chore.title);
                      return (
                        <View
                          key={chore.id}
                          style={[
                            styles.itemCard,
                            isDark && {
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.cardBorder,
                            },
                          ]}
                        >
                          <View style={styles.itemRowTop}>
                            <Image
                              source={iconSource}
                              style={{ width: 42, height: 42, marginRight: 10 }}
                              resizeMode="contain"
                            />
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[styles.choreTitleText, isDark && { color: themeColors.textPrimary }]}>{chore.title}</Text>
                                <Text style={[styles.choreRewardAmount, isDark && { color: themeColors.accentGreen }]}>+{formatVND(chore.rewardAmount)} đ</Text>
                              </View>
                              {chore.description ? (
                                <Text style={[styles.cleanDescText, isDark && { color: themeColors.textSecondary }]}>{chore.description}</Text>
                              ) : null}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <View
                                  style={[
                                    styles.badgeStatus,
                                    isCompleted ? styles.badgeApproved : styles.badgePending,
                                    isDark && (isCompleted ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : { backgroundColor: 'rgba(245, 158, 11, 0.15)' }),
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeStatusText,
                                      isCompleted
                                        ? { color: isDark ? themeColors.accentGreen : '#15803D' }
                                        : { color: isDark ? '#FBBF24' : '#B45309' },
                                    ]}
                                  >
                                    {isCompleted ? 'Đã hoàn thành' : 'Đang làm'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* TAB 4: NẠP TIỀN CHO CON */}
            {activeTab === 'DEPOSIT' && (
              <View style={styles.tabContentWrap}>
                <View style={[styles.depositFormCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                  <Text style={[styles.formSectionTitle, isDark && { color: themeColors.textPrimary }]}>Nạp tiền vào ví cho con</Text>
                  <Text style={[styles.formSectionSub, isDark && { color: themeColors.textSecondary }]}>
                    Số tiền nạp sẽ được chuyển từ ví của bạn vào ví tiêu vặt của bé để rèn luyện thói quen tự lập.
                  </Text>

                  {/* Nhập số tiền */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Số tiền nạp (VND) *</Text>
                    <TextInput
                      style={[
                        styles.amountInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="VD: 50.000"
                      placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                      value={depositAmount}
                      onChangeText={(text) => {
                        const num = text.replace(/\D/g, '');
                        setDepositAmount(num ? formatVND(Number(num)) : '');
                      }}
                    />
                  </View>

                  {/* Chọn nguồn trích tiền: Quỹ chung nhóm (ở trước) & Ví cá nhân (thả xuống đẹp mắt) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Nguồn trích tiền *</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, marginBottom: 10 }}>
                      {/* 1. QUỸ CHUNG NHÓM Ở TRƯỚC */}
                      <Pressable
                        onPress={() => {
                          setDepositSource('GROUP_FUND');
                          setShowAccountDropdown(false);
                        }}
                        style={[
                          styles.sourceSelectBtn,
                          isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                          depositSource === 'GROUP_FUND' && [
                            styles.sourceSelectBtnActive,
                            isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: themeColors.accentGreen },
                          ],
                        ]}
                      >
                        <FinanceIcon
                          name="users"
                          size={15}
                          color={depositSource === 'GROUP_FUND' ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.textMuted : '#64748B')}
                        />
                        <Text
                          style={[
                            styles.sourceSelectText,
                            isDark && { color: themeColors.textSecondary },
                            depositSource === 'GROUP_FUND' && [styles.sourceSelectTextActive, isDark && { color: themeColors.accentGreen }],
                          ]}
                        >
                          Quỹ chung nhóm
                        </Text>
                      </Pressable>

                      {/* 2. VÍ CÁ NHÂN */}
                      <Pressable
                        onPress={() => setDepositSource('PERSONAL_ACCOUNT')}
                        style={[
                          styles.sourceSelectBtn,
                          isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                          depositSource === 'PERSONAL_ACCOUNT' && [
                            styles.sourceSelectBtnActive,
                            isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: themeColors.accentGreen },
                          ],
                        ]}
                      >
                        <FinanceIcon
                          name="wallet"
                          size={15}
                          color={depositSource === 'PERSONAL_ACCOUNT' ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.textMuted : '#64748B')}
                        />
                        <Text
                          style={[
                            styles.sourceSelectText,
                            isDark && { color: themeColors.textSecondary },
                            depositSource === 'PERSONAL_ACCOUNT' && [styles.sourceSelectTextActive, isDark && { color: themeColors.accentGreen }],
                          ]}
                        >
                          Ví cá nhân
                        </Text>
                      </Pressable>
                    </View>

                    {/* Hiển thị chi tiết nguồn tiền */}
                    {depositSource === 'GROUP_FUND' ? (
                      /* Thẻ thông tin Quỹ chung nhóm tích hợp có badge tích xanh và số dư thực tế */
                      <View style={[styles.dropdownSelectorCard, isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.selectIconWrap, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7' }]}>
                            <FinanceIcon name="users" size={18} color={isDark ? themeColors.accentGreen : '#059669'} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.dropdownSelectorTitle, isDark && { color: themeColors.textPrimary }]}>Quỹ chung nhóm</Text>
                            <Text style={[styles.dropdownSelectorSub, isDark && { color: themeColors.textSecondary }]}>
                              Số dư: <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(fundBalance)} đ</Text>
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.sourceFundCheckBadge, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                          <FinanceIcon name="check" size={14} color={isDark ? themeColors.accentGreen : '#059669'} />
                        </View>
                      </View>
                    ) : (
                      /* Thẻ chọn Ví cá nhân kiểu THẢ XUỐNG (Dropdown Modal) chuẩn như trang Quản lý nợ */
                      (() => {
                        const selAcc = (accounts || []).find((a) => a.id === selectedAccountId) || (accounts && accounts[0]);
                        return (
                          <Pressable
                            onPress={() => setShowAccountPickerModal(true)}
                            style={[
                              styles.modernSelectDropdown,
                              isDark && {
                                backgroundColor: themeColors.surfaceSubtle,
                                borderColor: themeColors.cardBorder,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <AccountBadge account={selAcc} size={28} />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.modernSelectTextBold, isDark && { color: themeColors.textPrimary }]} numberOfLines={1}>
                                  {selAcc?.name || 'Chọn ví thanh toán'}
                                </Text>
                                <Text style={[styles.modernSelectSub, isDark && { color: themeColors.textSecondary }]}>
                                  Số dư: <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(selAcc?.balance || 0)} đ</Text>
                                </Text>
                              </View>
                            </View>
                            <FinanceIcon name="chevron-down" size={18} color={isDark ? themeColors.accentGreen : '#047857'} />
                          </Pressable>
                        );
                      })()
                    )}
                  </View>

                  {/* Lời nhắn gửi con */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Lời nhắn gửi bé</Text>
                    <TextInput
                      style={[
                        styles.notesInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                      placeholder="VD: Tiền tiêu vặt tuần này con nhé!"
                      placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                      value={depositNotes}
                      onChangeText={setDepositNotes}
                    />
                  </View>

                  {/* Nút xác nhận nạp */}
                  <Pressable
                    onPress={handleDepositSubmit}
                    disabled={isSubmittingDeposit}
                    style={({ pressed }) => [
                      styles.submitDepositBtn,
                      isDark && { backgroundColor: themeColors.accentGreen },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {isSubmittingDeposit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitDepositBtnText}>Xác nhận nạp tiền</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* TAB 5: CÀI ĐẶT VÍ (SỬA & XÓA VÍ) */}
            {activeTab === 'SETTINGS' && (
              <View style={styles.tabContentWrap}>
                <View style={[styles.depositFormCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
                  <Text style={[styles.formSectionTitle, isDark && { color: themeColors.textPrimary }]}>Cài đặt & Giám sát ví</Text>
                  <Text style={[styles.formSectionSub, isDark && { color: themeColors.textSecondary }]}>
                    Tùy chỉnh thông tin bé, tiền tiêu vặt định kỳ và hạn mức kiểm soát chi tiêu.
                  </Text>

                  {/* CHỌN & CHỈNH SỬA AVATAR VÍ CỦA BÉ */}
                  <View
                    style={[
                      styles.settingsAvatarCard,
                      isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    ]}
                  >
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Ảnh đại diện ví của bé</Text>
                    
                    <View style={styles.avatarPreviewRow}>
                      <View style={styles.avatarCircleWrap}>
                        <Image
                          source={resolveKidAvatarSource(editAvatarKey, isGirl)}
                          style={styles.avatarPreviewImg}
                          resizeMode="cover"
                        />
                        {uploadingEditAvatar && (
                          <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={[styles.avatarHintTitle, isDark && { color: themeColors.textPrimary }]}>Đổi ảnh đại diện</Text>
                        <Text style={[styles.avatarHintSub, isDark && { color: themeColors.textSecondary }]}>
                          Ảnh sẽ tự động cập nhật sang tài khoản riêng của bé khi bé đăng nhập.
                        </Text>

                        <Pressable
                          onPress={handlePickEditAvatar}
                          disabled={uploadingEditAvatar}
                          style={({ pressed }) => [
                            styles.btnUploadImage,
                            isDark && {
                              backgroundColor: 'rgba(52, 211, 153, 0.15)',
                              borderColor: 'rgba(52, 211, 153, 0.3)',
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <FinanceIcon name="camera" size={14} color={isDark ? themeColors.accentGreen : '#059669'} />
                          <Text style={[styles.btnUploadImageText, isDark && { color: themeColors.accentGreen }]}>
                            {uploadingEditAvatar ? 'Đang tải ảnh...' : 'Tải ảnh khác từ máy'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Mẫu avatar Bé Trai / Bé Gái */}
                    <Text style={[styles.presetListTitle, isDark && { color: themeColors.textSecondary }]}>Chọn mẫu ảnh có sẵn:</Text>
                    <View style={styles.officialAvatarRow}>
                      {OFFICIAL_KID_AVATARS.map((preset) => {
                        const isSelected = editAvatarKey === preset.key;
                        return (
                          <Pressable
                            key={preset.id}
                            onPress={() => {
                              setEditAvatarKey(preset.key);
                            }}
                            style={[
                              styles.officialAvatarCard,
                              isDark && {
                                backgroundColor: themeColors.surface,
                                borderColor: themeColors.cardBorder,
                              },
                              isSelected && [
                                styles.officialAvatarCardActive,
                                isDark && {
                                  borderColor: themeColors.accentGreen,
                                  backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                },
                              ],
                            ]}
                          >
                            <View style={styles.officialAvatarWrap}>
                              <Image source={preset.localSource} style={styles.officialAvatarImg} />
                            </View>
                            <Text
                              style={[
                                styles.officialAvatarName,
                                isDark && { color: themeColors.textSecondary },
                                isSelected && [styles.officialAvatarNameActive, isDark && { color: themeColors.accentGreen }],
                              ]}
                            >
                              {preset.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Khu vực Tài khoản đăng nhập của con & Đặt lại mật khẩu (đưa lên ngay dưới Avatar) */}
                  {(wallet.userId || wallet.childUsername) && (
                    <View
                      style={[
                        styles.settingsAvatarCard,
                        { padding: 12, marginBottom: 14 },
                        isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={[styles.inputLabel, { marginBottom: 2 }, isDark && { color: themeColors.textPrimary }]}>
                            Tài khoản của con
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? themeColors.accentGreen : '#059669' }}>
                            @{wallet.childUsername || 'Tài khoản liên kết'}
                          </Text>
                          <Text style={{ fontSize: 11, color: isDark ? themeColors.textMuted : '#64748B', marginTop: 2 }}>
                            Con dùng tài khoản này để đăng nhập vào app Finora
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setNewKidPassword('');
                            setIsResetPassModalOpen(true);
                          }}
                          style={({ pressed }) => [
                            styles.btnUploadImage,
                            { paddingHorizontal: 12, paddingVertical: 8 },
                            isDark && {
                              backgroundColor: 'rgba(52, 211, 153, 0.15)',
                              borderColor: 'rgba(52, 211, 153, 0.3)',
                            },
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <FinanceIcon name="lock" size={13} color={isDark ? themeColors.accentGreen : '#059669'} />
                          <Text style={[styles.btnUploadImageText, isDark && { color: themeColors.accentGreen }]}>
                            Đổi mật khẩu
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* Tên bé */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Tên của bé *</Text>
                    <TextInput
                      style={[
                        styles.notesInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                      placeholder="VD: Nguyễn Minh Đức"
                      placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                      value={editName}
                      onChangeText={setEditName}
                    />
                  </View>

                  {/* Tiền tiêu vặt mỗi tuần */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>
                      Tiền tiêu vặt định kỳ mỗi tuần (VND)
                    </Text>
                    <TextInput
                      style={[
                        styles.notesInput,
                        isDark && {
                          backgroundColor: themeColors.surfaceSubtle,
                          borderColor: themeColors.cardBorder,
                          color: themeColors.textPrimary,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="VD: 50.000"
                      placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                      value={editAllowance}
                      onChangeText={(t) => {
                        const num = t.replace(/\D/g, '');
                        setEditAllowance(num ? formatVND(Number(num)) : '');
                      }}
                    />
                  </View>

                  {/* Thông báo cập nhật thành công trực tiếp không bị đơ modal */}
                  {!!saveSuccessMsg && (
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7',
                        borderColor: isDark ? themeColors.accentGreen : '#86EFAC',
                        borderWidth: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        marginBottom: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: isDark ? themeColors.accentGreen : '#15803D',
                          fontSize: 13,
                          fontWeight: '700',
                        }}
                      >
                        {saveSuccessMsg}
                      </Text>
                    </View>
                  )}

                  {/* Nút lưu cài đặt */}
                  <Pressable
                    onPress={handleUpdateWalletSubmit}
                    disabled={isSubmittingEdit}
                    style={({ pressed }) => [
                      styles.submitDepositBtn,
                      isDark && { backgroundColor: themeColors.accentGreen },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {isSubmittingEdit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitDepositBtnText}>Lưu thay đổi</Text>
                    )}
                  </Pressable>

                  {/* Phân cách khu vực nguy hiểm */}
                  <View style={{ height: 1, backgroundColor: isDark ? themeColors.divider : '#F1F5F9', marginVertical: 8 }} />

                  {/* Nút Xóa ví */}
                  <Pressable
                    onPress={handleDeleteWallet}
                    disabled={isDeletingWallet}
                    style={({ pressed }) => [
                      styles.deleteWalletBtn,
                      isDark && { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {isDeletingWallet ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <FinanceIcon name="trash" size={15} color="#DC2626" />
                        <Text style={styles.deleteWalletBtnText}>Xóa ví trẻ em này</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL DUYỆT CẤP TIỀN CHO BÉ (CHUẨN WEB: CHỌN NGUỒN TIỀN) */}
      {approvingReq && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setApprovingReq(null)}>
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <Text style={[styles.subModalTitle, isDark && { color: themeColors.textPrimary }]}>
                Duyệt cấp tiền cho bé {wallet.childName}
              </Text>
              <Text style={[styles.subModalSub, isDark && { color: themeColors.textSecondary }]}>
                Mục đích: <Text style={{ fontWeight: '700' }}>{approvingReq.description?.replace(/^\[MONEY_REQUEST\]\s*/, '')}</Text> • Số tiền:{' '}
                <Text style={{ fontWeight: '800', color: isDark ? themeColors.accentGreen : '#059669' }}>{formatVND(approvingReq.amount)} đ</Text>
              </Text>

              <Text style={[styles.inputLabel, { marginTop: 14 }, isDark && { color: themeColors.textSecondary }]}>Nguồn tiền chi trả *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 }}>
                <Pressable
                  onPress={() => setApprovalSource('PERSONAL_ACCOUNT')}
                  style={[
                    styles.sourceSelectBtn,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    approvalSource === 'PERSONAL_ACCOUNT' && [
                      styles.sourceSelectBtnActive,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: themeColors.accentGreen },
                    ],
                  ]}
                >
                  <FinanceIcon
                    name="wallet"
                    size={14}
                    color={approvalSource === 'PERSONAL_ACCOUNT' ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.textMuted : '#64748B')}
                  />
                  <Text
                    style={[
                      styles.sourceSelectText,
                      isDark && { color: themeColors.textSecondary },
                      approvalSource === 'PERSONAL_ACCOUNT' && [styles.sourceSelectTextActive, isDark && { color: themeColors.accentGreen }],
                    ]}
                  >
                    Ví cá nhân
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setApprovalSource('GROUP_FUND')}
                  style={[
                    styles.sourceSelectBtn,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    approvalSource === 'GROUP_FUND' && [
                      styles.sourceSelectBtnActive,
                      isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: themeColors.accentGreen },
                    ],
                  ]}
                >
                  <FinanceIcon
                    name="users"
                    size={14}
                    color={approvalSource === 'GROUP_FUND' ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.textMuted : '#64748B')}
                  />
                  <Text
                    style={[
                      styles.sourceSelectText,
                      isDark && { color: themeColors.textSecondary },
                      approvalSource === 'GROUP_FUND' && [styles.sourceSelectTextActive, isDark && { color: themeColors.accentGreen }],
                    ]}
                  >
                    Quỹ chung nhóm
                  </Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => setApprovingReq(null)}
                  style={[styles.subModalCancelBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <Text style={[styles.subModalCancelText, isDark && { color: themeColors.textSecondary }]}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmApprove}
                  disabled={isSubmittingApproval}
                  style={[styles.subModalConfirmBtn, isDark && { backgroundColor: themeColors.accentGreen }]}
                >
                  {isSubmittingApproval ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.subModalConfirmText}>Xác nhận duyệt</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL TỪ CHỐI YÊU CẦU (KÈM LÝ DO) */}
      {rejectingReq && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setRejectingReq(null)}>
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <Text style={[styles.subModalTitle, isDark && { color: themeColors.textPrimary }]}>Từ chối yêu cầu xin tiền</Text>
              <Text style={[styles.subModalSub, isDark && { color: themeColors.textSecondary }]}>
                Bạn có chắc muốn từ chối yêu cầu xin {formatVND(rejectingReq.amount)} đ của bé không?
              </Text>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Lý do từ chối gửi bé *</Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                  placeholder="VD: Tuần này con đã tiêu hết hạn mức..."
                  placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => setRejectingReq(null)}
                  style={[styles.subModalCancelBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <Text style={[styles.subModalCancelText, isDark && { color: themeColors.textSecondary }]}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmReject}
                  disabled={isSubmittingRejection}
                  style={[styles.subModalConfirmBtn, { backgroundColor: '#DC2626' }]}
                >
                  {isSubmittingRejection ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.subModalConfirmText}>Xác nhận từ chối</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL GIAO NHIỆM VỤ MỚI CHO BÉ */}
      {isCreateChoreOpen && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setIsCreateChoreOpen(false)}>
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <Text style={[styles.subModalTitle, isDark && { color: themeColors.textPrimary }]}>
                Giao nhiệm vụ cho bé {wallet.childName} ⭐
              </Text>
              <Text style={[styles.subModalSub, isDark && { color: themeColors.textSecondary }]}>
                Hoàn thành việc nhà để nhận thưởng vào ví
              </Text>

              <View style={{ gap: 10, marginTop: 12 }}>
                <View>
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Tên nhiệm vụ *</Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                    placeholder="VD: Rửa bát, Quét nhà, Điểm 10 môn Toán..."
                    placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                    value={choreTitle}
                    onChangeText={setChoreTitle}
                  />
                </View>

                <View>
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Mô tả chi tiết</Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                    placeholder="VD: Rửa sạch và úp bát gọn gàng sau bữa tối"
                    placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                    value={choreDesc}
                    onChangeText={setChoreDesc}
                  />
                </View>

                <View>
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>
                    Tiền thưởng hoàn thành (VND) *
                  </Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="VD: 20.000"
                    placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                    value={choreReward}
                    onChangeText={(text) => {
                      const num = text.replace(/\D/g, '');
                      setChoreReward(num ? formatVND(Number(num)) : '');
                    }}
                  />
                </View>

                {/* Chọn biểu tượng nhiệm vụ */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Biểu tượng nhiệm vụ</Text>
                    <Text style={{ fontSize: 11, color: isDark ? themeColors.textMuted : '#64748B' }}>
                      {choreSelectedIcon ? 'Đã chọn' : 'Tự động ngẫu nhiên'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <Pressable
                      onPress={() => setChoreSelectedIcon(null)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: choreSelectedIcon === null ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                        backgroundColor: choreSelectedIcon === null ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: choreSelectedIcon === null ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.textSecondary : '#64748B'),
                        }}
                      >
                        🎲 Ngẫu nhiên
                      </Text>
                    </Pressable>
                    {CHORE_ICONS.map((ic) => {
                      const isSelected = choreSelectedIcon === ic.key;
                      return (
                        <Pressable
                          key={ic.key}
                          onPress={() => setChoreSelectedIcon(ic.key)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? (isDark ? themeColors.accentGreen : '#059669') : (isDark ? themeColors.cardBorder : '#E2E8F0'),
                            backgroundColor: isSelected ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? themeColors.surfaceSubtle : '#F8FAFC'),
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 3,
                          }}
                        >
                          <Image source={ic.source} style={{ width: 32, height: 32 }} resizeMode="contain" />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => setIsCreateChoreOpen(false)}
                  style={[styles.subModalCancelBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <Text style={[styles.subModalCancelText, isDark && { color: themeColors.textSecondary }]}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleCreateChoreSubmit}
                  disabled={isSubmittingChore}
                  style={[styles.subModalConfirmBtn, { backgroundColor: isDark ? themeColors.accentGreen : '#D97706' }]}
                >
                  {isSubmittingChore ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.subModalConfirmText}>Giao nhiệm vụ</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL GHI CHI TIÊU CHO BÉ (CHUẨN BẢN WEB) */}
      {isCreateSpendOpen && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setIsCreateSpendOpen(false)}>
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <Text style={[styles.subModalTitle, isDark && { color: themeColors.textPrimary }]}>
                Ghi khoản chi cho ví bé {wallet.childName} 🛍️
              </Text>
              <Text style={[styles.subModalSub, isDark && { color: themeColors.textSecondary }]}>
                Khoản chi sẽ được trừ trực tiếp vào số dư ví của bé và lưu vào lịch sử.
              </Text>

              <View style={{ gap: 12, marginTop: 14 }}>
                <View>
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Số tiền chi tiêu (VNĐ) *</Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="VD: 20.000"
                    placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                    value={spendAmount}
                    onChangeText={(t) => {
                      const num = t.replace(/\D/g, '');
                      setSpendAmount(num ? formatVND(Number(num)) : '');
                    }}
                  />
                </View>

                <View>
                  <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>
                    Nội dung chi tiêu (bé mua gì, ăn gì...) *
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      isDark && {
                        backgroundColor: themeColors.surfaceSubtle,
                        borderColor: themeColors.cardBorder,
                        color: themeColors.textPrimary,
                      },
                    ]}
                    placeholder="VD: Mua trà sữa, Mua bút màu, Ăn sáng..."
                    placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                    value={spendDesc}
                    onChangeText={setSpendDesc}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <Pressable
                  onPress={() => setIsCreateSpendOpen(false)}
                  style={[styles.subModalCancelBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
                >
                  <Text style={[styles.subModalCancelText, isDark && { color: themeColors.textSecondary }]}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleCreateSpendSubmit}
                  disabled={isSubmittingSpend}
                  style={styles.subModalConfirmBtn}
                >
                  {isSubmittingSpend ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.subModalConfirmText}>Lưu chi tiêu</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* OVERLAY POPUP DROPDOWN CHỌN VÍ CÁ NHÂN (CHUẨN FORM TRANG NỢ) */}
      {showAccountPickerModal && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowAccountPickerModal(false)}>
          <View style={[StyleSheet.absoluteFill, styles.pickerModalBackdrop, { zIndex: 9999, elevation: 9999 }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAccountPickerModal(false)}
            />
            <View
              style={[
                styles.pickerModalBox,
                isDark && {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.cardBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.pickerModalHeader,
                  isDark && { borderBottomColor: themeColors.divider },
                ]}
              >
                <Text style={[styles.pickerModalTitle, isDark && { color: themeColors.textPrimary }]}>
                  Chọn nguồn ví trích tiền
                </Text>
                <Pressable onPress={() => setShowAccountPickerModal(false)} hitSlop={10}>
                  <FinanceIcon name="close" size={18} color={isDark ? themeColors.textSecondary : '#64748B'} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {(accounts || []).map((acc) => {
                  const isSelected = (selectedAccountId || (accounts && accounts[0]?.id)) === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        setSelectedAccountId(acc.id);
                        setShowAccountPickerModal(false);
                      }}
                      style={[
                        styles.pickerItemRow,
                        isDark && { borderBottomColor: themeColors.divider },
                        isSelected && (isDark ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : styles.pickerItemRowActive),
                      ]}
                    >
                      <AccountBadge account={acc} size={36} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={[
                            styles.pickerItemText,
                            isDark && { color: themeColors.textPrimary },
                            isSelected && (isDark ? { color: themeColors.accentGreen, fontWeight: '800' } : styles.pickerItemTextActive),
                          ]}
                        >
                          {acc.name}
                        </Text>
                        <Text style={[styles.pickerItemSub, isDark && { color: themeColors.textSecondary }]}>
                          Số dư: <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(acc.balance)} đ</Text>
                        </Text>
                      </View>
                      {isSelected && (
                        <FinanceIcon name="check" size={18} color={isDark ? themeColors.accentGreen : '#0E964E'} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal 6: Đặt lại mật khẩu cho tài khoản con (Kids Mode) */}
      {isResetPassModalOpen && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setIsResetPassModalOpen(false)}>
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalCard, isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.subModalTitle, isDark && { color: themeColors.textPrimary }]}>
                  Đổi mật khẩu cho bé
                </Text>
                <Pressable
                  onPress={() => setIsResetPassModalOpen(false)}
                  hitSlop={8}
                  style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.6 }]}
                >
                  <FinanceIcon name="x" size={18} color={isDark ? themeColors.textSecondary : '#64748B'} />
                </Pressable>
              </View>

              <Text style={[styles.subModalSub, isDark && { color: themeColors.textSecondary }]}>
                Đặt lại mật khẩu đăng nhập mới cho bé <Text style={{ fontWeight: '700', color: isDark ? themeColors.accentGreen : '#059669' }}>{wallet?.childName}</Text> (Tài khoản: @{wallet?.childUsername}).
              </Text>

              <View style={[styles.inputGroup, { marginTop: 14 }]}>
                <Text style={[styles.inputLabel, isDark && { color: themeColors.textSecondary }]}>Mật khẩu mới của con *</Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    isDark && {
                      backgroundColor: themeColors.surfaceSubtle,
                      borderColor: themeColors.cardBorder,
                      color: themeColors.textPrimary,
                    },
                  ]}
                  placeholder="Nhập ít nhất 6 ký tự"
                  placeholderTextColor={isDark ? themeColors.textMuted : '#94A3B8'}
                  secureTextEntry
                  value={newKidPassword}
                  onChangeText={setNewKidPassword}
                />
              </View>

              {/* Thông báo thành công / lỗi trực tiếp không qua dialog che khuất */}
              {!!resetPassSuccessMsg && (
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#DCFCE7',
                    borderColor: isDark ? themeColors.accentGreen : '#86EFAC',
                    borderWidth: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    marginTop: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isDark ? themeColors.accentGreen : '#15803D', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                    {resetPassSuccessMsg}
                  </Text>
                </View>
              )}

              {!!resetPassErrorMsg && (
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                    borderColor: isDark ? '#F87171' : '#FCA5A5',
                    borderWidth: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    marginTop: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isDark ? '#F87171' : '#DC2626', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    {resetPassErrorMsg}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <Pressable
                  onPress={() => setIsResetPassModalOpen(false)}
                  style={({ pressed }) => [
                    styles.btnRejectOutline,
                    isDark && { backgroundColor: themeColors.surfaceSubtle, borderColor: themeColors.cardBorder },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.btnRejectOutlineText, isDark && { color: themeColors.textSecondary }]}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleResetPasswordSubmit}
                  disabled={isSubmittingResetPass}
                  style={({ pressed }) => [
                    styles.btnApproveSolid,
                    isDark && { backgroundColor: themeColors.accentGreen },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {isSubmittingResetPass ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnApproveSolidText}>Xác nhận đổi</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
  },
  avatarDefault: {
    width: 32,
    height: 32,
  },
  headerNameCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerChildName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
    marginBottom: 2,
  },
  parentManagedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  parentManagedPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flexWrap: 'wrap',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  headerDepositBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  headerBalanceBold: {
    fontWeight: '800',
    color: '#059669',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabScrollWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#059669',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
  badgePill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  bodyScroll: {
    padding: 16,
  },
  tabContentWrap: {
    paddingBottom: 60,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  itemList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemRowTop: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLeftGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cleanDescText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginTop: 3,
  },
  rejectReasonText: {
    fontSize: 11.5,
    color: '#DC2626',
    marginTop: 2,
    fontWeight: '500',
  },
  byUserTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 3,
  },
  itemDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeApproved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  badgeExpense: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  badgeStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btnRejectOutline: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  btnRejectOutlineText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '700',
  },
  btnApproveSolid: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  btnApproveSolidText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  btnCreateChoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  btnCreateChoreText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  btnCreateSpendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  btnCreateSpendText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  choreTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  choreRewardAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#D97706',
  },
  depositFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSectionSub: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  amountInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#059669',
  },
  notesInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: '#0F172A',
  },
  accOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accOptionPillSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  accOptionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  accOptionTextSelected: {
    color: '#059669',
    fontWeight: '700',
  },
  submitDepositBtn: {
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitDepositBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  /* Sub-Modal Popups */
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subModalSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  sourceSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sourceSelectBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  sourceSelectText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  sourceSelectTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  subModalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  subModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  subModalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subModalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Dropdown selector & Modern Select (Chuẩn trang Nợ) */
  modernSelectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modernSelectTextBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  modernSelectSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pickerModalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    borderRadius: 12,
  },
  pickerItemRowActive: {
    backgroundColor: '#F0FDF4',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  pickerItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownSelectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownSelectorSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sourceFundCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '800',
  },
  inlinePickerDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginTop: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  inlinePickerHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inlinePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 10,
  },
  inlinePickerRowActive: {
    backgroundColor: '#F0FDF4',
  },
  inlinePickerItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  inlinePickerItemTitleActive: {
    color: '#059669',
    fontWeight: '800',
  },
  inlinePickerItemSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkmarkIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  /* Nút xóa ví */
  deleteWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
  },
  deleteWalletBtnText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '700',
  },
  /* Settings Avatar Picker Styles */
  settingsAvatarCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  avatarCircleWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#10B981',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  avatarHintSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  btnUploadImage: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 2,
  },
  btnUploadImageText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  presetListTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
    marginBottom: 8,
  },
  officialAvatarRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  officialAvatarCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  officialAvatarCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  officialAvatarWrap: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  officialAvatarImg: {
    width: '100%',
    height: '100%',
  },
  officialAvatarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  officialAvatarNameActive: {
    color: '#059669',
    fontWeight: '800',
  },
  presetCheckBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

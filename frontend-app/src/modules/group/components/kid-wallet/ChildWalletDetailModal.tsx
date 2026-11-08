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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FinanceIcon, resolveCategoryIconName } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import { ChildWalletResponse, groupApi } from '../../api/groupApi';
import { AccountItem } from '../../../add-transaction/api/transactionApi';
import {
  OFFICIAL_KID_AVATARS,
  resolveKidAvatarSource,
  BOY_AVATAR_IMAGE,
  GIRL_AVATAR_IMAGE,
} from './kidAvatarPresets';

export interface ChildWalletDetailModalProps {
  visible: boolean;
  wallet: ChildWalletResponse | null;
  groupId: string;
  isOwnerOrAdmin: boolean;
  accounts: AccountItem[];
  fundBalance?: number;
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
  onClose,
  onRefreshWallet,
}) => {
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
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'SPENDS' | 'CHORES' | 'DEPOSIT' | 'SETTINGS'>('SPENDS');

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
      setEditAvatarKey(wallet.avatarKey || null);
      setEditAllowance(wallet.weeklyAllowance ? formatVND(wallet.weeklyAllowance) : '');
      setEditDailyLimit(wallet.dailySpendingLimit ? formatVND(wallet.dailySpendingLimit) : '');
      setEditWeeklyLimit(wallet.monthlySpendingLimit ? formatVND(wallet.monthlySpendingLimit) : '');
      setEditRequireApprovalAbove(wallet.requireApprovalAbove ? formatVND(wallet.requireApprovalAbove) : '');
      setEditNotes(wallet.notes || '');
    }
  }, [visible, wallet?.id, groupId, isParentManagedOnly]);

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
      });
      Alert.alert('Thành công ⭐', `Đã giao nhiệm vụ "${choreTitle}" cho bé!`);
      setChoreTitle('');
      setChoreDesc('');
      setChoreReward('');
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingEditAvatar(true);

        const fileName = asset.fileName || `kid_avatar_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        const uploaded = await groupApi.uploadMessageAttachment(groupId, {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });

        if (uploaded && uploaded.fileKey) {
          setEditAvatarKey(uploaded.fileKey);
        } else {
          Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên máy chủ.');
        }
      }
    } catch (err: any) {
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
    const dailyLimitVal = Number(editDailyLimit.replace(/\D/g, ''));
    const weeklyLimitVal = Number(editWeeklyLimit.replace(/\D/g, ''));
    const requireApprovalVal = Number(editRequireApprovalAbove.replace(/\D/g, ''));

    setIsSubmittingEdit(true);
    try {
      await groupApi.updateChildWallet(groupId, wallet!.id, {
        childName: editName.trim(),
        avatarKey: editAvatarKey || undefined,
        weeklyAllowance: allowanceVal >= 0 ? allowanceVal : undefined,
        spendLimitDaily: dailyLimitVal > 0 ? dailyLimitVal : undefined,
        spendLimitWeekly: weeklyLimitVal > 0 ? weeklyLimitVal : undefined,
        requireApprovalAbove: requireApprovalVal > 0 ? requireApprovalVal : undefined,
        notes: editNotes.trim() || undefined,
      });
      Alert.alert('Thành công 🎉', 'Đã cập nhật cài đặt ví và đồng bộ avatar cho bé!');
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
              Alert.alert('Đã xóa ví', `Đã xóa ví của bé ${wallet?.childName} thành công.`);
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

  if (!wallet) return null;

  const isGirl = wallet.avatarKey === 'kid_girl' || wallet.avatarKey?.includes('girl') || wallet.avatarUrl?.includes('girl');
  const headerAvatarSource = resolveKidAvatarSource(wallet.avatarKey || wallet.avatarUrl, isGirl);

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

        <View style={styles.sheetContainer}>
          {/* Thanh kéo / Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header Modal chuẩn bản Web */}
          <View style={styles.modalHeader}>
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
                  <Text style={styles.headerTopLabel}>Ví của bé</Text>
                  {isParentManagedOnly && (
                    <View style={styles.parentManagedPill}>
                      <Text style={styles.parentManagedPillText}>Bố mẹ quản</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerChildName} numberOfLines={1}>
                  {wallet.childName}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Số dư: <Text style={styles.headerBalanceBold}>{formatVND(wallet.balance)} đ</Text>
                </Text>
              </View>
            </View>

            {/* Cụm Nút bên phải: Nút Nạp tiền luôn đặt cạnh nút Đóng */}
            <View style={styles.headerRightActions}>
              <Pressable
                onPress={() => setActiveTab('DEPOSIT')}
                style={({ pressed }) => [styles.headerDepositBtn, pressed && { opacity: 0.85 }]}
              >
                <FinanceIcon name="plus" size={12} color="#FFFFFF" />
                <Text style={styles.headerDepositBtnText}>Nạp tiền</Text>
              </Pressable>

              <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
                <FinanceIcon name="close" size={16} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {/* Sub Navigation Tabs */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollWrap}>
              {/* TAB 1: YÊU CẦU XIN TIỀN - Chỉ hiển thị khi bé có tài khoản riêng */}
              {!isParentManagedOnly && (
                <Pressable
                  onPress={() => setActiveTab('REQUESTS')}
                  style={[styles.tabItem, activeTab === 'REQUESTS' && styles.tabItemActive]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={[styles.tabLabel, activeTab === 'REQUESTS' && styles.tabLabelActive]}>
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
                style={[styles.tabItem, activeTab === 'SPENDS' && styles.tabItemActive]}
              >
                <Text style={[styles.tabLabel, activeTab === 'SPENDS' && styles.tabLabelActive]}>
                  Lịch sử thu & chi ({spendsList.length})
                </Text>
              </Pressable>

              {/* TAB 3: NHIỆM VỤ - Chỉ hiển thị khi bé có tài khoản riêng để nhận nhiệm vụ */}
              {!isParentManagedOnly && (
                <Pressable
                  onPress={() => setActiveTab('CHORES')}
                  style={[styles.tabItem, activeTab === 'CHORES' && styles.tabItemActive]}
                >
                  <Text style={[styles.tabLabel, activeTab === 'CHORES' && styles.tabLabelActive]}>
                    Nhiệm vụ ⭐
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => setActiveTab('DEPOSIT')}
                style={[styles.tabItem, activeTab === 'DEPOSIT' && styles.tabItemActive]}
              >
                <Text style={[styles.tabLabel, activeTab === 'DEPOSIT' && styles.tabLabelActive]}>
                  + Nạp tiền
                </Text>
              </Pressable>

              {/* TAB 5: CÀI ĐẶT VÍ (SỬA & XÓA) */}
              {isOwnerOrAdmin && (
                <Pressable
                  onPress={() => setActiveTab('SETTINGS')}
                  style={[styles.tabItem, activeTab === 'SETTINGS' && styles.tabItemActive]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FinanceIcon name="settings" size={13} color={activeTab === 'SETTINGS' ? '#059669' : '#64748B'} />
                    <Text style={[styles.tabLabel, activeTab === 'SETTINGS' && styles.tabLabelActive]}>
                      Cài đặt
                    </Text>
                  </View>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.bodyScroll}
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
                  <View style={styles.emptyBox}>
                    <FinanceIcon name="spark" size={32} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>Chưa có yêu cầu xin tiền nào từ bé</Text>
                    <Text style={styles.emptySub}>
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
                        <View key={req.id} style={styles.itemCard}>
                          <View style={styles.itemRowTop}>
                            <View style={styles.itemLeftGroup}>
                              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                                <FinanceIcon name={reqIcon || 'wallet'} size={20} color="#D97706" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={styles.amountText}>{formatVND(req.amount)} đ</Text>
                                  <View
                                    style={[
                                      styles.badgeStatus,
                                      isPending && styles.badgePending,
                                      isApproved && styles.badgeApproved,
                                      isRejected && styles.badgeRejected,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.badgeStatusText,
                                        isPending && { color: '#B45309' },
                                        isApproved && { color: '#15803D' },
                                        isRejected && { color: '#DC2626' },
                                      ]}
                                    >
                                      {isPending ? 'Chờ bố mẹ duyệt' : isApproved ? 'Đã duyệt' : 'Từ chối'}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.cleanDescText}>{cleanDesc}</Text>
                                {req.rejectionReason && (
                                  <Text style={styles.rejectReasonText}>
                                    Lý do từ chối: {req.rejectionReason}
                                  </Text>
                                )}
                                <Text style={styles.itemDateText}>
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
                  style={({ pressed }) => [styles.btnCreateSpendBar, pressed && { opacity: 0.85 }]}
                >
                  <FinanceIcon name="minus" size={15} color="#FFFFFF" />
                  <Text style={styles.btnCreateSpendText}>Ghi khoản chi cho ví của bé</Text>
                </Pressable>

                {spendsList.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <FinanceIcon name="receipt" size={32} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>Chưa có lịch sử thu chi nào của bé</Text>
                    <Text style={styles.emptySub}>
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
                        <View key={req.id} style={styles.itemCard}>
                          <View style={styles.itemRowTop}>
                            <View style={[styles.iconCircle, isIncome ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#FFE4E6' }]}>
                              {isChoreReward ? (
                                <Text style={{ fontSize: 18 }}>⭐</Text>
                              ) : isDeposit ? (
                                <Text style={{ fontSize: 18 }}>💰</Text>
                              ) : (
                                <FinanceIcon name={iconName} size={20} color="#E11D48" />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[styles.amountText, isIncome ? { color: '#16A34A' } : { color: '#E11D48' }]}>
                                  {isIncome ? '+' : '-'}{formatVND(req.amount)} đ
                                </Text>
                                <View style={[styles.badgeStatus, isIncome ? styles.badgeApproved : styles.badgeExpense]}>
                                  <Text style={[styles.badgeStatusText, isIncome ? { color: '#15803D' } : { color: '#BE123C' }]}>
                                    {isDeposit ? 'Nạp tiền vào ví' : isChoreReward ? 'Thưởng việc nhà' : 'Đã chi tiêu'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.cleanDescText}>{cleanDesc}</Text>

                              {req.respondedByUserName && isIncome && (
                                <Text style={styles.byUserTag}>
                                  ✓ Người duyệt: {req.respondedByUserName}
                                </Text>
                              )}

                              <Text style={styles.itemDateText}>
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
                    style={({ pressed }) => [styles.btnCreateChoreBar, pressed && { opacity: 0.85 }]}
                  >
                    <FinanceIcon name="plus" size={16} color="#FFFFFF" />
                    <Text style={styles.btnCreateChoreText}>Giao nhiệm vụ mới cho bé</Text>
                  </Pressable>
                )}

                {loadingChores ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#D97706" />
                    <Text style={styles.loadingText}>Đang tải nhiệm vụ...</Text>
                  </View>
                ) : chores.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 32 }}>⭐</Text>
                    <Text style={styles.emptyTitle}>Chưa có nhiệm vụ nào được giao</Text>
                    <Text style={styles.emptySub}>
                      Giao việc nhà (rửa bát, quét nhà, đạt điểm 10,...) kèm tiền thưởng để giúp bé rèn luyện tính tự lập và chăm chỉ!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemList}>
                    {chores.map((chore) => {
                      const isCompleted = chore.status === 'COMPLETED' || chore.status === 'APPROVED';
                      return (
                        <View key={chore.id} style={styles.itemCard}>
                          <View style={styles.itemRowTop}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                              <Text style={{ fontSize: 18 }}>⭐</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={styles.choreTitleText}>{chore.title}</Text>
                                <Text style={styles.choreRewardAmount}>+{formatVND(chore.rewardAmount)} đ</Text>
                              </View>
                              {chore.description ? (
                                <Text style={styles.cleanDescText}>{chore.description}</Text>
                              ) : null}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <View style={[styles.badgeStatus, isCompleted ? styles.badgeApproved : styles.badgePending]}>
                                  <Text style={[styles.badgeStatusText, isCompleted ? { color: '#15803D' } : { color: '#B45309' }]}>
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
                <View style={styles.depositFormCard}>
                  <Text style={styles.formSectionTitle}>Nạp tiền vào ví cho con</Text>
                  <Text style={styles.formSectionSub}>
                    Số tiền nạp sẽ được chuyển từ ví của bạn vào ví tiêu vặt của bé để rèn luyện thói quen tự lập.
                  </Text>

                  {/* Nhập số tiền */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Số tiền nạp (VND) *</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholder="VD: 50.000"
                      placeholderTextColor="#94A3B8"
                      value={depositAmount}
                      onChangeText={(text) => {
                        const num = text.replace(/\D/g, '');
                        setDepositAmount(num ? formatVND(Number(num)) : '');
                      }}
                    />
                  </View>

                  {/* Chọn nguồn trích tiền: Quỹ chung nhóm (ở trước) & Ví cá nhân (thả xuống đẹp mắt) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nguồn trích tiền *</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, marginBottom: 10 }}>
                      {/* 1. QUỸ CHUNG NHÓM Ở TRƯỚC */}
                      <Pressable
                        onPress={() => {
                          setDepositSource('GROUP_FUND');
                          setShowAccountDropdown(false);
                        }}
                        style={[
                          styles.sourceSelectBtn,
                          depositSource === 'GROUP_FUND' && styles.sourceSelectBtnActive,
                        ]}
                      >
                        <FinanceIcon name="users" size={15} color={depositSource === 'GROUP_FUND' ? '#059669' : '#64748B'} />
                        <Text style={[styles.sourceSelectText, depositSource === 'GROUP_FUND' && styles.sourceSelectTextActive]}>
                          Quỹ chung nhóm
                        </Text>
                      </Pressable>

                      {/* 2. VÍ CÁ NHÂN */}
                      <Pressable
                        onPress={() => setDepositSource('PERSONAL_ACCOUNT')}
                        style={[
                          styles.sourceSelectBtn,
                          depositSource === 'PERSONAL_ACCOUNT' && styles.sourceSelectBtnActive,
                        ]}
                      >
                        <FinanceIcon name="wallet" size={15} color={depositSource === 'PERSONAL_ACCOUNT' ? '#059669' : '#64748B'} />
                        <Text style={[styles.sourceSelectText, depositSource === 'PERSONAL_ACCOUNT' && styles.sourceSelectTextActive]}>
                          Ví cá nhân
                        </Text>
                      </Pressable>
                    </View>

                    {/* Hiển thị chi tiết nguồn tiền */}
                    {depositSource === 'GROUP_FUND' ? (
                      /* Thẻ thông tin Quỹ chung nhóm tích hợp có badge tích xanh và số dư thực tế */
                      <View style={styles.dropdownSelectorCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.selectIconWrap, { backgroundColor: '#DCFCE7' }]}>
                            <FinanceIcon name="users" size={18} color="#059669" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dropdownSelectorTitle}>Quỹ chung nhóm</Text>
                            <Text style={styles.dropdownSelectorSub}>
                              Số dư: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(fundBalance)} đ</Text>
                            </Text>
                          </View>
                        </View>
                        <View style={styles.sourceFundCheckBadge}>
                          <FinanceIcon name="check" size={14} color="#059669" />
                        </View>
                      </View>
                    ) : (
                      /* Thẻ chọn Ví cá nhân kiểu THẢ XUỐNG (Dropdown) chuẩn như thêm giao dịch */
                      (() => {
                        const selAcc = (accounts || []).find((a) => a.id === selectedAccountId) || (accounts && accounts[0]);
                        return (
                          <View>
                            <Pressable
                              onPress={() => setShowAccountDropdown((prev) => !prev)}
                              style={styles.dropdownSelectorCard}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={[styles.selectIconWrap, { backgroundColor: '#E0F2FE' }]}>
                                  <FinanceIcon name="wallet" size={18} color="#0284C7" />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.dropdownSelectorTitle} numberOfLines={1}>
                                    {selAcc?.name || 'Chọn ví thanh toán'}
                                  </Text>
                                  <Text style={styles.dropdownSelectorSub}>
                                    Số dư: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(selAcc?.balance || 0)} đ</Text>
                                  </Text>
                                </View>
                              </View>
                              <Text style={[styles.chevronIcon, showAccountDropdown && { transform: [{ rotate: '180deg' }] }]}>⌄</Text>
                            </Pressable>

                            {/* Bảng thả xuống chọn ví tích hợp trực tiếp ngay bên dưới */}
                            {showAccountDropdown && (
                              <View style={styles.inlinePickerDropdownContainer}>
                                <Text style={styles.inlinePickerHeaderTitle}>CHỌN VÍ TRÍCH TIỀN</Text>
                                {(accounts || []).map((acc) => {
                                  const isSelected = (selectedAccountId || selAcc?.id) === acc.id;
                                  return (
                                    <Pressable
                                      key={acc.id}
                                      onPress={() => {
                                        setSelectedAccountId(acc.id);
                                        setShowAccountDropdown(false);
                                      }}
                                      style={[styles.inlinePickerRow, isSelected && styles.inlinePickerRowActive]}
                                    >
                                      <View style={[styles.selectIconWrap, { backgroundColor: '#E0F2FE' }]}>
                                        <FinanceIcon name="wallet" size={16} color="#0284C7" />
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={[styles.inlinePickerItemTitle, isSelected && styles.inlinePickerItemTitleActive]}>
                                          {acc.name}
                                        </Text>
                                        <Text style={styles.inlinePickerItemSub}>
                                          Số dư: <Text style={{ color: '#059669', fontWeight: '800' }}>{formatVND(acc.balance)} đ</Text>
                                        </Text>
                                      </View>
                                      {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                                    </Pressable>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })()
                    )}
                  </View>

                  {/* Lời nhắn gửi con */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Lời nhắn gửi bé</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="VD: Tiền tiêu vặt tuần này con nhé!"
                      placeholderTextColor="#94A3B8"
                      value={depositNotes}
                      onChangeText={setDepositNotes}
                    />
                  </View>

                  {/* Nút xác nhận nạp */}
                  <Pressable
                    onPress={handleDepositSubmit}
                    disabled={isSubmittingDeposit}
                    style={({ pressed }) => [styles.submitDepositBtn, pressed && { opacity: 0.85 }]}
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
                <View style={styles.depositFormCard}>
                  <Text style={styles.formSectionTitle}>Cài đặt & Giám sát ví</Text>
                  <Text style={styles.formSectionSub}>
                    Tùy chỉnh thông tin bé, tiền tiêu vặt định kỳ và hạn mức kiểm soát chi tiêu.
                  </Text>

                  {/* CHỌN & CHỈNH SỬA AVATAR VÍ CỦA BÉ */}
                  <View style={styles.settingsAvatarCard}>
                    <Text style={styles.inputLabel}>Ảnh đại diện ví của bé</Text>
                    
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
                        <Text style={styles.avatarHintTitle}>Đổi ảnh đại diện</Text>
                        <Text style={styles.avatarHintSub}>
                          Ảnh sẽ tự động cập nhật sang tài khoản riêng của bé khi bé đăng nhập.
                        </Text>

                        <Pressable
                          onPress={handlePickEditAvatar}
                          disabled={uploadingEditAvatar}
                          style={({ pressed }) => [styles.btnUploadImage, pressed && { opacity: 0.85 }]}
                        >
                          <FinanceIcon name="camera" size={14} color="#059669" />
                          <Text style={styles.btnUploadImageText}>
                            {uploadingEditAvatar ? 'Đang tải ảnh...' : 'Tải ảnh khác từ máy'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Mẫu avatar Bé Trai / Bé Gái */}
                    <Text style={styles.presetListTitle}>Chọn mẫu ảnh có sẵn:</Text>
                    <View style={styles.officialAvatarRow}>
                      {OFFICIAL_KID_AVATARS.map((preset) => {
                        const isSelected = editAvatarKey === preset.key;
                        return (
                          <Pressable
                            key={preset.id}
                            onPress={() => setEditAvatarKey(preset.key)}
                            style={[styles.officialAvatarCard, isSelected && styles.officialAvatarCardActive]}
                          >
                            <View style={styles.officialAvatarWrap}>
                              <Image source={preset.localSource} style={styles.officialAvatarImg} />
                              {isSelected && (
                                <View style={styles.presetCheckBadge}>
                                  <FinanceIcon name="check" size={11} color="#FFFFFF" />
                                </View>
                              )}
                            </View>
                            <Text style={[styles.officialAvatarName, isSelected && styles.officialAvatarNameActive]}>
                              {preset.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Tên bé */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tên của bé *</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="VD: Nguyễn Minh Đức"
                      placeholderTextColor="#94A3B8"
                      value={editName}
                      onChangeText={setEditName}
                    />
                  </View>

                  {/* Tiền tiêu vặt mỗi tuần */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tiền tiêu vặt định kỳ mỗi tuần (VND)</Text>
                    <TextInput
                      style={styles.notesInput}
                      keyboardType="numeric"
                      placeholder="VD: 50.000"
                      placeholderTextColor="#94A3B8"
                      value={editAllowance}
                      onChangeText={(t) => {
                        const num = t.replace(/\D/g, '');
                        setEditAllowance(num ? formatVND(Number(num)) : '');
                      }}
                    />
                  </View>

                  {/* Hạn mức ngày & tuần */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Hạn mức ngày</Text>
                      <TextInput
                        style={styles.notesInput}
                        keyboardType="numeric"
                        placeholder="VD: 30.000"
                        placeholderTextColor="#94A3B8"
                        value={editDailyLimit}
                        onChangeText={(t) => {
                          const num = t.replace(/\D/g, '');
                          setEditDailyLimit(num ? formatVND(Number(num)) : '');
                        }}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Hạn mức tháng</Text>
                      <TextInput
                        style={styles.notesInput}
                        keyboardType="numeric"
                        placeholder="VD: 500.000"
                        placeholderTextColor="#94A3B8"
                        value={editWeeklyLimit}
                        onChangeText={(t) => {
                          const num = t.replace(/\D/g, '');
                          setEditWeeklyLimit(num ? formatVND(Number(num)) : '');
                        }}
                      />
                    </View>
                  </View>

                  {/* Yêu cầu duyệt khi chi trên */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cần bố mẹ duyệt khi chi tiêu vượt quá (VND)</Text>
                    <TextInput
                      style={styles.notesInput}
                      keyboardType="numeric"
                      placeholder="VD: 20.000 (0 là luôn duyệt)"
                      placeholderTextColor="#94A3B8"
                      value={editRequireApprovalAbove}
                      onChangeText={(t) => {
                        const num = t.replace(/\D/g, '');
                        setEditRequireApprovalAbove(num ? formatVND(Number(num)) : '');
                      }}
                    />
                  </View>

                  {/* Ghi chú */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ghi chú nhắc nhở bé</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Lời nhắc nhở chi tiêu thông minh..."
                      placeholderTextColor="#94A3B8"
                      value={editNotes}
                      onChangeText={setEditNotes}
                    />
                  </View>

                  {/* Nút lưu cài đặt */}
                  <Pressable
                    onPress={handleUpdateWalletSubmit}
                    disabled={isSubmittingEdit}
                    style={({ pressed }) => [styles.submitDepositBtn, pressed && { opacity: 0.85 }]}
                  >
                    {isSubmittingEdit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitDepositBtnText}>Lưu thay đổi</Text>
                    )}
                  </Pressable>

                  {/* Phân cách khu vực nguy hiểm */}
                  <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }} />

                  {/* Nút Xóa ví */}
                  <Pressable
                    onPress={handleDeleteWallet}
                    disabled={isDeletingWallet}
                    style={({ pressed }) => [styles.deleteWalletBtn, pressed && { opacity: 0.85 }]}
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
            <View style={styles.subModalCard}>
              <Text style={styles.subModalTitle}>Duyệt cấp tiền cho bé {wallet.childName}</Text>
              <Text style={styles.subModalSub}>
                Mục đích: <Text style={{ fontWeight: '700' }}>{approvingReq.description?.replace(/^\[MONEY_REQUEST\]\s*/, '')}</Text> • Số tiền:{' '}
                <Text style={{ fontWeight: '800', color: '#059669' }}>{formatVND(approvingReq.amount)} đ</Text>
              </Text>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Nguồn tiền chi trả *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 12 }}>
                <Pressable
                  onPress={() => setApprovalSource('PERSONAL_ACCOUNT')}
                  style={[
                    styles.sourceSelectBtn,
                    approvalSource === 'PERSONAL_ACCOUNT' && styles.sourceSelectBtnActive,
                  ]}
                >
                  <FinanceIcon name="wallet" size={14} color={approvalSource === 'PERSONAL_ACCOUNT' ? '#059669' : '#64748B'} />
                  <Text style={[styles.sourceSelectText, approvalSource === 'PERSONAL_ACCOUNT' && styles.sourceSelectTextActive]}>
                    Ví cá nhân
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setApprovalSource('GROUP_FUND')}
                  style={[
                    styles.sourceSelectBtn,
                    approvalSource === 'GROUP_FUND' && styles.sourceSelectBtnActive,
                  ]}
                >
                  <FinanceIcon name="users" size={14} color={approvalSource === 'GROUP_FUND' ? '#059669' : '#64748B'} />
                  <Text style={[styles.sourceSelectText, approvalSource === 'GROUP_FUND' && styles.sourceSelectTextActive]}>
                    Quỹ chung nhóm
                  </Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Pressable
                  onPress={() => setApprovingReq(null)}
                  style={styles.subModalCancelBtn}
                >
                  <Text style={styles.subModalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmApprove}
                  disabled={isSubmittingApproval}
                  style={styles.subModalConfirmBtn}
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
            <View style={styles.subModalCard}>
              <Text style={styles.subModalTitle}>Từ chối yêu cầu xin tiền</Text>
              <Text style={styles.subModalSub}>
                Bạn có chắc muốn từ chối yêu cầu xin {formatVND(rejectingReq.amount)} đ của bé không?
              </Text>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Lý do từ chối gửi bé *</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="VD: Tuần này con đã tiêu hết hạn mức..."
                  placeholderTextColor="#94A3B8"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => setRejectingReq(null)}
                  style={styles.subModalCancelBtn}
                >
                  <Text style={styles.subModalCancelText}>Hủy</Text>
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
            <View style={styles.subModalCard}>
              <Text style={styles.subModalTitle}>Giao nhiệm vụ cho bé {wallet.childName} ⭐</Text>
              <Text style={styles.subModalSub}>Hoàn thành việc nhà để nhận thưởng vào ví</Text>

              <View style={{ gap: 10, marginTop: 12 }}>
                <View>
                  <Text style={styles.inputLabel}>Tên nhiệm vụ *</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="VD: Rửa bát, Quét nhà, Điểm 10 môn Toán..."
                    placeholderTextColor="#94A3B8"
                    value={choreTitle}
                    onChangeText={setChoreTitle}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Mô tả chi tiết</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="VD: Rửa sạch và úp bát gọn gàng sau bữa tối"
                    placeholderTextColor="#94A3B8"
                    value={choreDesc}
                    onChangeText={setChoreDesc}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Tiền thưởng hoàn thành (VND) *</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    placeholder="VD: 20.000"
                    placeholderTextColor="#94A3B8"
                    value={choreReward}
                    onChangeText={(text) => {
                      const num = text.replace(/\D/g, '');
                      setChoreReward(num ? formatVND(Number(num)) : '');
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => setIsCreateChoreOpen(false)}
                  style={styles.subModalCancelBtn}
                >
                  <Text style={styles.subModalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={handleCreateChoreSubmit}
                  disabled={isSubmittingChore}
                  style={[styles.subModalConfirmBtn, { backgroundColor: '#D97706' }]}
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
            <View style={styles.subModalCard}>
              <Text style={styles.subModalTitle}>Ghi khoản chi cho ví bé {wallet.childName} 🛍️</Text>
              <Text style={styles.subModalSub}>
                Khoản chi sẽ được trừ trực tiếp vào số dư ví của bé và lưu vào lịch sử.
              </Text>

              <View style={{ gap: 12, marginTop: 14 }}>
                <View>
                  <Text style={styles.inputLabel}>Số tiền chi tiêu (VNĐ) *</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    placeholder="VD: 20.000"
                    placeholderTextColor="#94A3B8"
                    value={spendAmount}
                    onChangeText={(t) => {
                      const num = t.replace(/\D/g, '');
                      setSpendAmount(num ? formatVND(Number(num)) : '');
                    }}
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Nội dung chi tiêu (bé mua gì, ăn gì...) *</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="VD: Mua trà sữa, Mua bút màu, Ăn sáng..."
                    placeholderTextColor="#94A3B8"
                    value={spendDesc}
                    onChangeText={setSpendDesc}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <Pressable
                  onPress={() => setIsCreateSpendOpen(false)}
                  style={styles.subModalCancelBtn}
                >
                  <Text style={styles.subModalCancelText}>Hủy</Text>
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
  /* Dropdown selector & Inline Picker */
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
    ...StyleSheet.absoluteFillObject,
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

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Image, Platform, Modal } from 'react-native';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import { GroupInvitationResponse, GroupMemberResponse, GroupResponse } from '../../api/groupApi';

export interface GroupMembersTabProps {
  members: GroupMemberResponse[];
  selectedGroup: GroupResponse;
  currentUser: { id?: string; email?: string; fullName?: string; username?: string; avatarUrl?: string } | null;
  sentPendingInvitations?: GroupInvitationResponse[];
  onCancelInvitation?: (invitationId: string, inviteeName?: string) => void;
  onInvitePress: () => void;
  onRemoveMember?: (userId: string, name: string) => void;
  onMemberOptionsPress?: (member: GroupMemberResponse) => void;
  onUpdateMemberRole?: (member: GroupMemberResponse, newRole: 'ADMIN' | 'MEMBER') => void;
  onOpenGroupSettings?: () => void;
  onToggleNotification?: (val: boolean) => void;
  notificationEnabled?: boolean;
  onOpenPermissions?: () => void;
}

export const GroupMembersTab: React.FC<GroupMembersTabProps> = ({
  members,
  selectedGroup,
  currentUser,
  sentPendingInvitations = [],
  onCancelInvitation,
  onInvitePress,
  onRemoveMember,
  onMemberOptionsPress,
  onUpdateMemberRole,
  onOpenGroupSettings,
  onToggleNotification,
  notificationEnabled = true,
  onOpenPermissions,
}) => {
  // Trạng thái modal dropdown phân quyền
  const [dropdownMember, setDropdownMember] = useState<GroupMemberResponse | null>(null);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);

  const isCurrentUserLeader =
    selectedGroup.myRole === 'OWNER' || selectedGroup.myRole === 'ADMIN' || selectedGroup.ownerId === currentUser?.id;

  const isCoupleGroup = selectedGroup.groupType === 'COUPLE';
  const totalCoupleCount = members.length + (sentPendingInvitations?.length || 0);
  const isCoupleMaxed = isCoupleGroup && totalCoupleCount >= 2;

  return (
    <View style={styles.container}>
      {/* KHỐI 1: THÀNH VIÊN NHÓM */}
      <View style={styles.cardContainer}>
        {/* Header thành viên */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Thành viên nhóm ({members.length}{isCoupleGroup ? '/2' : ''})
          </Text>
          {isCoupleMaxed ? (
            <View style={[styles.inviteBtn, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
              <FinanceIcon name="check" size={14} color="#64748B" />
              <Text style={[styles.inviteBtnText, { color: '#64748B' }]}>Đã đủ 2 người</Text>
            </View>
          ) : (
            <Pressable
              onPress={onInvitePress}
              style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.8 }]}
            >
              <FinanceIcon name="plus" size={14} color="#059669" />
              <Text style={styles.inviteBtnText}>Mời thêm</Text>
            </Pressable>
          )}
        </View>

        {/* Danh sách thành viên */}
        <View style={styles.memberList}>
          {members.map((m, index) => {
            const isOwner = m.role === 'OWNER';
            const isAdmin = m.role === 'ADMIN';
            const isSelf = String(m.userId).toLowerCase() === String(currentUser?.id).toLowerCase();

            // Lấy tên hiển thị theo đúng thứ tự ưu tiên
            const rawName =
              m.user?.fullName ||
              m.nickname ||
              m.fullName ||
              m.user?.displayName ||
              m.displayName ||
              m.username ||
              (isSelf ? (currentUser?.fullName || currentUser?.username) : null);
            const displayName = rawName || 'Thành viên';

            // Lấy email
            const email =
              m.user?.email ||
              m.email ||
              (isSelf ? currentUser?.email : null) ||
              '';

            // Lấy avatar url từ userProfileApi
            const rawAvatar = isSelf
              ? (currentUser?.avatarUrl || m.user?.avatarUrl || m.user?.avatarKey || m.avatarUrl)
              : (m.user?.avatarUrl || m.user?.avatarKey || m.avatarUrl);
            const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;

            const avatarLetter = (displayName || 'U').slice(0, 1).toUpperCase();

            return (
              <View
                key={m.id || m.userId || index}
                style={[
                  styles.memberRow,
                  index < members.length - 1 && styles.memberRowBorder,
                ]}
              >
                {/* Avatar */}
                <View style={styles.avatarWrapper}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        isOwner
                          ? { backgroundColor: '#10B981' }
                          : isAdmin
                          ? { backgroundColor: '#6366F1' }
                          : { backgroundColor: '#38BDF8' },
                      ]}
                    >
                      <Text style={styles.avatarText}>{avatarLetter}</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {isSelf && <Text style={styles.selfLabel}> (Bạn)</Text>}
                  </View>
                  {!!email && (
                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {email}
                    </Text>
                  )}
                </View>

                {/* Badge vai trò cố định: Trưởng nhóm / Quản trị viên / Thành viên (chỉ xem, không sửa trực tiếp ở đây) */}
                <View
                  style={[
                    styles.roleBadge,
                    isOwner
                      ? styles.ownerBadge
                      : isAdmin
                      ? styles.adminBadge
                      : styles.normalBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      isOwner
                        ? styles.ownerBadgeText
                        : isAdmin
                        ? styles.adminBadgeText
                        : styles.normalBadgeText,
                    ]}
                  >
                    {isOwner ? 'Trưởng nhóm' : isAdmin ? 'Quản trị viên' : 'Thành viên'}
                  </Text>
                </View>

                {/* Nút 3 chấm options */}
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    if (onMemberOptionsPress) {
                      onMemberOptionsPress(m);
                    } else if (onRemoveMember && !isSelf && !isOwner) {
                      onRemoveMember(m.userId, displayName);
                    }
                  }}
                  style={({ pressed }) => [styles.dotsBtn, pressed && { opacity: 0.6 }]}
                >
                  <FinanceIcon name="more-horizontal" size={18} color="#94A3B8" />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* ── DANH SÁCH LỜI MỜI CHƯA XÁC NHẬN (CÓ NÚT HỦY) ── */}
        {sentPendingInvitations.length > 0 && (
          <View style={styles.pendingInvitationsSection}>
            <View style={styles.pendingHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>⏳</Text>
                <Text style={styles.pendingSectionTitle}>
                  Lời mời đang chờ ({sentPendingInvitations.length})
                </Text>
              </View>
              <Text style={styles.pendingSectionSub}>Chờ người dùng xác nhận</Text>
            </View>

            <View style={styles.pendingList}>
              {sentPendingInvitations.map((inv) => {
                const rawAvatar = inv.inviteeAvatarUrl;
                const avatarUri = rawAvatar ? userProfileApi.formatAvatarUrl(rawAvatar) : null;
                const invName = inv.inviteeName || inv.inviteeEmail || 'Người dùng';
                const invLetter = invName.slice(0, 1).toUpperCase();

                return (
                  <View key={inv.id} style={styles.pendingItemCard}>
                    <View style={styles.pendingLeftInfo}>
                      <View style={styles.pendingAvatarWrapper}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.pendingAvatarPlaceholder}>
                            <Text style={styles.pendingAvatarText}>{invLetter}</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.pendingName} numberOfLines={1}>
                            {invName}
                          </Text>
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>
                              {inv.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.pendingEmail} numberOfLines={1}>
                          {inv.inviteeEmail || 'Đã gửi lời mời tham gia'}
                        </Text>
                      </View>
                    </View>

                    {/* Nút Hủy lời mời */}
                    {onCancelInvitation && (
                      <Pressable
                        onPress={() => onCancelInvitation(inv.id, invName)}
                        style={({ pressed }) => [styles.cancelInviteBtn, pressed && { opacity: 0.75 }]}
                        hitSlop={6}
                      >
                        <FinanceIcon name="close" size={13} color="#DC2626" />
                        <Text style={styles.cancelInviteBtnText}>Hủy</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* KHỐI 2: QUẢN LÝ NHÓM */}
      <View style={styles.cardContainer}>
        <View style={styles.sectionHeaderNoBtn}>
          <Text style={styles.sectionTitle}>Quản lý nhóm</Text>
        </View>

        <View style={styles.manageList}>
          {/* Cài đặt nhóm */}
          <Pressable
            style={({ pressed }) => [styles.manageRow, pressed && { opacity: 0.7 }]}
            onPress={onOpenGroupSettings}
          >
            <View style={styles.manageRowLeft}>
              <View style={styles.manageIconWrap}>
                <FinanceIcon name="settings" size={18} color="#059669" />
              </View>
              <Text style={styles.manageRowText}>Cài đặt nhóm</Text>
            </View>
            <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
          </Pressable>

          <View style={styles.manageDivider} />

          {/* Thông báo nhóm */}
          <View style={styles.manageRow}>
            <View style={styles.manageRowLeft}>
              <View style={styles.manageIconWrap}>
                <FinanceIcon name="bell" size={18} color="#059669" />
              </View>
              <Text style={styles.manageRowText}>Thông báo nhóm</Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={onToggleNotification}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              ios_backgroundColor="#E2E8F0"
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>

          <View style={styles.manageDivider} />

          {/* Phân quyền */}
          <Pressable
            style={({ pressed }) => [styles.manageRow, pressed && { opacity: 0.7 }]}
            onPress={() => setPermissionsModalVisible(true)}
          >
            <View style={styles.manageRowLeft}>
              <View style={styles.manageIconWrap}>
                <FinanceIcon name="shield" size={18} color="#059669" />
              </View>
              <Text style={styles.manageRowText}>Phân quyền</Text>
            </View>
            <FinanceIcon name="chevron-right" size={16} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      {/* MODAL DANH SÁCH PHÂN QUYỀN TOÀN NHÓM (KHI BẤM "PHÂN QUYỀN") */}
      <Modal
        visible={permissionsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPermissionsModalVisible(false)}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setPermissionsModalVisible(false)}>
          <Pressable style={[styles.dropdownSheet, { maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownTitle}>Phân quyền nhóm</Text>
                <Text style={styles.dropdownSubtitle}>
                  Chạm vào vai trò của thành viên để thay đổi
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setPermissionsModalVisible(false)} style={styles.dropdownCloseBtn}>
                <FinanceIcon name="close" size={16} color="#64748B" />
              </Pressable>
            </View>

            <View style={{ marginTop: 12 }}>
              {members.map((mem, mIdx) => {
                const isMemOwner = mem.role === 'OWNER';
                const isMemAdmin = mem.role === 'ADMIN';
                const isMemSelf = String(mem.userId).toLowerCase() === String(currentUser?.id).toLowerCase();
                const memName = mem.user?.fullName || mem.nickname || mem.fullName || 'Thành viên';
                const memAvatar = mem.user?.avatarUrl ? userProfileApi.formatAvatarUrl(mem.user.avatarUrl) : null;
                const memLetter = memName.slice(0, 1).toUpperCase();

                return (
                  <View
                    key={mem.userId || mIdx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: mIdx < members.length - 1 ? 1 : 0,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                        {memAvatar ? (
                          <Image source={{ uri: memAvatar }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{memLetter}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }} numberOfLines={1}>
                          {memName}{isMemSelf && ' (Bạn)'}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          {isMemOwner ? 'Toàn quyền nhóm' : isMemAdmin ? 'Quản lý & Duyệt' : 'Thành viên'}
                        </Text>
                      </View>
                    </View>

                    {/* Nút dropdown vai trò */}
                    {isCurrentUserLeader && !isMemOwner && !isMemSelf && onUpdateMemberRole ? (
                      <Pressable
                        onPress={() => {
                          setPermissionsModalVisible(false);
                          setTimeout(() => setDropdownMember(mem), 200);
                        }}
                        style={[
                          styles.roleDropdownBtn,
                          isMemAdmin ? styles.adminDropdownBtn : styles.memberDropdownBtn,
                        ]}
                      >
                        <Text style={[styles.roleBadgeText, isMemAdmin ? styles.adminBadgeText : styles.normalBadgeText]}>
                          {isMemAdmin ? 'Quản trị' : 'Thành viên'}
                        </Text>
                        <FinanceIcon name="chevron-down" size={12} color={isMemAdmin ? '#6366F1' : '#64748B'} />
                      </Pressable>
                    ) : (
                      <View style={[styles.roleBadge, isMemOwner ? styles.ownerBadge : isMemAdmin ? styles.adminBadge : styles.normalBadge]}>
                        <Text style={[styles.roleBadgeText, isMemOwner ? styles.ownerBadgeText : isMemAdmin ? styles.adminBadgeText : styles.normalBadgeText]}>
                          {isMemOwner ? 'Trưởng nhóm' : isMemAdmin ? 'Quản trị' : 'Thành viên'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL DROPDOWN PHÂN QUYỀN THÀNH VIÊN */}
      <Modal
        visible={dropdownMember !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownMember(null)}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setDropdownMember(null)}>
          <Pressable style={styles.dropdownSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownTitle}>Phân quyền thành viên</Text>
                <Text style={styles.dropdownSubtitle} numberOfLines={1}>
                  {dropdownMember?.user?.fullName || dropdownMember?.nickname || dropdownMember?.fullName || 'Thành viên'}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setDropdownMember(null)} style={styles.dropdownCloseBtn}>
                <FinanceIcon name="close" size={16} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.dropdownOptionsList}>
              {/* Option 1: Thành viên */}
              <Pressable
                style={({ pressed }) => [
                  styles.dropdownOptionItem,
                  dropdownMember?.role === 'MEMBER' && styles.dropdownOptionItemActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  if (dropdownMember && onUpdateMemberRole) {
                    onUpdateMemberRole(dropdownMember, 'MEMBER');
                  }
                  setDropdownMember(null);
                }}
              >
                <View style={[styles.dropdownIconCircle, { backgroundColor: '#F1F5F9' }]}>
                  <FinanceIcon name="user" size={16} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownOptionName, dropdownMember?.role === 'MEMBER' && styles.dropdownOptionNameActive]}>
                    Thành viên
                  </Text>
                  <Text style={styles.dropdownOptionDesc}>
                    Ghi nhận chi tiêu và thanh toán nợ cá nhân
                  </Text>
                </View>
                {dropdownMember?.role === 'MEMBER' && (
                  <FinanceIcon name="check" size={16} color="#059669" />
                )}
              </Pressable>

              {/* Option 2: Quản trị viên */}
              <Pressable
                style={({ pressed }) => [
                  styles.dropdownOptionItem,
                  dropdownMember?.role === 'ADMIN' && styles.dropdownOptionItemActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  if (dropdownMember && onUpdateMemberRole) {
                    onUpdateMemberRole(dropdownMember, 'ADMIN');
                  }
                  setDropdownMember(null);
                }}
              >
                <View style={[styles.dropdownIconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <FinanceIcon name="shield" size={16} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownOptionName, dropdownMember?.role === 'ADMIN' && { color: '#6366F1' }]}>
                    Quản trị viên
                  </Text>
                  <Text style={styles.dropdownOptionDesc}>
                    Quản lý thành viên, xét duyệt chi phí và quỹ nhóm
                  </Text>
                </View>
                {dropdownMember?.role === 'ADMIN' && (
                  <FinanceIcon name="check" size={16} color="#6366F1" />
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  sectionHeaderNoBtn: {
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inviteBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  memberList: {
    flexDirection: 'column',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 150,
  },
  selfLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  memberEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  roleDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  adminDropdownBtn: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  memberDropdownBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
  },
  ownerBadgeText: {
    color: '#D97706',
    fontSize: 11.5,
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: '#EEF2FF',
  },
  adminBadgeText: {
    color: '#6366F1',
    fontSize: 11.5,
    fontWeight: '700',
  },
  normalBadge: {
    backgroundColor: '#F1F5F9',
  },
  normalBadgeText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  roleBadgeText: {
    fontSize: 11.5,
  },
  dotsBtn: {
    padding: 6,
    marginLeft: 2,
  },
  manageList: {
    flexDirection: 'column',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  manageRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manageIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  manageDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  /* Pending Invitations Styles */
  pendingInvitationsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pendingSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  pendingSectionSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pendingList: {
    gap: 8,
  },
  pendingItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FCD34D',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  pendingAvatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  pendingAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 130,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
  },
  pendingEmail: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  cancelInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
  },
  cancelInviteBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  /* Dropdown phân quyền Modal */
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dropdownSubtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  dropdownCloseBtn: {
    padding: 4,
  },
  dropdownOptionsList: {
    marginTop: 12,
    gap: 10,
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dropdownOptionItemActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  dropdownIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOptionName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownOptionNameActive: {
    color: '#059669',
  },
  dropdownOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
});

export default GroupMembersTab;

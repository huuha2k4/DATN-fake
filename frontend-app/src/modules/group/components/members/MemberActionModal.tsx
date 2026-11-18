import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { GroupMemberResponse } from '../../api/groupApi';

export interface MemberActionModalProps {
  visible: boolean;
  member: GroupMemberResponse | null;
  canManage: boolean;
  onClose: () => void;
  onUpdateRole: (member: GroupMemberResponse, newRole: 'ADMIN' | 'MEMBER') => void;
  onRemoveMember: (member: GroupMemberResponse) => void;
}

export const MemberActionModal: React.FC<MemberActionModalProps> = ({
  visible,
  member,
  canManage,
  onClose,
  onUpdateRole,
  onRemoveMember,
}) => {
  if (!member) return null;

  const displayName =
    member.user?.fullName ||
    member.nickname ||
    member.fullName ||
    member.user?.displayName ||
    member.username ||
    'Thành viên';
  const email = member.user?.email || member.email || '';
  const isOwner = member.role === 'OWNER';
  const isAdmin = member.role === 'ADMIN';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
              {!!email && <Text style={styles.subtitle} numberOfLines={1}>{email}</Text>}
            </View>
            <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : isAdmin ? styles.adminBadge : styles.memberBadge]}>
              <Text style={[styles.roleBadgeText, isOwner ? styles.ownerBadgeText : isAdmin ? styles.adminBadgeText : styles.memberBadgeText]}>
                {isOwner ? 'Trưởng nhóm' : isAdmin ? 'Quản trị' : 'Thành viên'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Các nút thao tác */}
          {canManage && !isOwner ? (
            <View style={styles.actionList}>
              {/* Phân quyền / Đổi vai trò */}
              {isAdmin ? (
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: '#F8FAFC' }]}
                  onPress={() => {
                    onClose();
                    onUpdateRole(member, 'MEMBER');
                  }}
                >
                  <View style={[styles.iconWrap, { backgroundColor: '#F1F5F9' }]}>
                    <FinanceIcon name="shield" size={18} color="#64748B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>Chuyển thành Thành viên</Text>
                    <Text style={styles.actionDesc}>Hạ quyền quản trị viên của người này</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: '#F8FAFC' }]}
                  onPress={() => {
                    onClose();
                    onUpdateRole(member, 'ADMIN');
                  }}
                >
                  <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <FinanceIcon name="shield" size={18} color="#6366F1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>Thăng quyền Quản trị viên</Text>
                    <Text style={styles.actionDesc}>Cho phép quản lý thành viên và duyệt chi tiêu</Text>
                  </View>
                </Pressable>
              )}

              {/* Nút Xóa khỏi nhóm */}
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && { backgroundColor: '#FEF2F2' }]}
                onPress={() => {
                  onClose();
                  onRemoveMember(member);
                }}
              >
                <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <FinanceIcon name="trash" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Xóa khỏi nhóm</Text>
                  <Text style={styles.actionDesc}>Loại thành viên này ra khỏi danh sách nhóm</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noPermBox}>
              <Text style={styles.noPermText}>
                {isOwner
                  ? 'Đây là Trưởng nhóm sáng lập, không thể chỉnh sửa hoặc xóa.'
                  : 'Bạn không có quyền quản trị để thao tác với thành viên này.'}
              </Text>
            </View>
          )}

          {/* Nút Đóng */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  ownerBadge: { backgroundColor: '#FEF3C7' },
  ownerBadgeText: { color: '#D97706', fontSize: 11.5, fontWeight: '700' },
  adminBadge: { backgroundColor: '#EEF2FF' },
  adminBadgeText: { color: '#6366F1', fontSize: 11.5, fontWeight: '700' },
  memberBadge: { backgroundColor: '#F1F5F9' },
  memberBadgeText: { color: '#64748B', fontSize: 11.5, fontWeight: '700' },
  roleBadgeText: { fontSize: 11.5 },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  actionList: {
    gap: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  noPermBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noPermText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});

export default MemberActionModal;

